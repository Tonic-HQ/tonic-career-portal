/* global process, fetch */
const fs = require("node:fs");
const path = require("node:path");

class BullhornAuthError extends Error {
	constructor(message, { code, status, errorMessage, details } = {}) {
		super(message);
		this.name = "BullhornAuthError";
		if (code) this.code = code; // e.g., 'INVALID_CREDENTIALS', 'HTTP_ERROR'
		if (status != null) this.status = status; // HTTP status if available
		// Short, user-presentable message from server or detection
		this.errorMessage = errorMessage || message;
		if (details) this.details = details; // optional extra context
	}
}

function extractHtmlErrorMessage(html) {
	try {
		if (!html) return "";
		const m = html.match(
			/<p[^>]*class=["'][^"']*error[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
		);
		const raw = m?.[1] ? m[1] : "";
		const text = raw
			.replace(/<[^>]+>/g, "")
			.replace(/\s+/g, " ")
			.trim();
		if (text) return text;
		// common phrase fallback
		if (/invalid\s+credentials/i.test(html)) return "Invalid credentials.";
		return "";
	} catch {
		return "";
	}
}

/**
 * Create HTTP options with defaults and validation
 * @param {Object} httpCfg - HTTP configuration options
 * @param {number} [httpCfg.timeoutMs=30000] - Request timeout in milliseconds
 * @param {string} [httpCfg.userAgent="bullhorn-auth-client"] - User agent string
 * @param {number} [httpCfg.retries=0] - Number of retry attempts
 * @param {Function} [httpCfg.onRetryAttempt] - Callback function for retry attempts
 * @returns {Object} Validated HTTP options
 */
function createHttpOptions(httpCfg = {}) {
	const timeoutMs = Number.isFinite(httpCfg.timeoutMs)
		? httpCfg.timeoutMs
		: 30000;
	if (timeoutMs <= 0) {
		throw new Error("timeoutMs must be a positive number");
	}

	const retries = Number.isFinite(httpCfg.retries) ? httpCfg.retries : 0;
	if (retries < 0) {
		throw new Error("retries must be a non-negative number");
	}

	return {
		timeoutMs,
		userAgent: httpCfg.userAgent || "bullhorn-auth-client",
		retries,
		onRetryAttempt:
			typeof httpCfg.onRetryAttempt === "function"
				? httpCfg.onRetryAttempt
				: null,
	};
}

async function doFetch(urlStr, init, httpOpts) {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), httpOpts.timeoutMs);
	try {
		const headers = init?.headers;
		const res = await fetch(urlStr, {
			...init,
			headers,
			signal: controller.signal,
		});
		return res;
	} finally {
		clearTimeout(id);
	}
}

async function requestWithRetry(urlStr, init, httpOpts) {
	let attempt = 0;
	let lastError;
	while (attempt <= httpOpts.retries) {
		try {
			const res = await doFetch(urlStr, init, httpOpts);
			if (res.status >= 500 || res.status === 429) {
				throw Object.assign(new Error(`HTTP ${res.status}`), { response: res });
			}
			return res;
		} catch (err) {
			lastError = err;
			attempt += 1;
			if (attempt > httpOpts.retries) break;
			if (httpOpts.onRetryAttempt) {
				try {
					httpOpts.onRetryAttempt({
						attempt,
						status: err?.response?.status,
						error: err.message,
					});
				} catch {
					// Silently ignore callback errors to prevent disrupting retry logic
				}
			}
			const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 4000);
			await new Promise((r) => setTimeout(r, backoffMs));
		}
	}
	throw lastError;
}

function basicLogFromResponse(res) {
	return {
		status: res.status,
		statusText: res.statusText,
		headers: {
			"x-ratelimit-limit-minute": res.headers.get("x-ratelimit-limit-minute"),
			"x-ratelimit-remaining-minute": res.headers.get(
				"x-ratelimit-remaining-minute",
			),
		},
	};
}

function ensureTrailingSlash(s) {
	if (!s || typeof s !== "string") return s;
	return s.endsWith("/") ? s : `${s}/`;
}

/**
 * Get OAuth and REST URLs for a Bullhorn username
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} username - Bullhorn username
 * @returns {Promise<Object>} OAuth and REST URLs
 */
async function loginInfo(httpOpts, username) {
	if (!username || typeof username !== "string") {
		throw new Error("username must be a non-empty string");
	}
	const safeUser = encodeURIComponent(username);
	const urlStr = `https://rest.bullhornstaffing.com/rest-services/loginInfo?username=${safeUser}`;
	const response = await requestWithRetry(urlStr, { method: "GET" }, httpOpts);
	let body;
	try {
		body = await response.json();
	} catch (e) {
		let preview = "";
		try {
			const t = await response.clone().text();
			preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
		} catch {}
		throw new BullhornAuthError("loginInfo returned non-JSON response", {
			code: "NON_JSON_RESPONSE",
			status: response.status,
			errorMessage: "Failed to parse loginInfo response",
			details: { preview },
		});
	}
	return {
		oauthUrl: body.oauthUrl,
		restUrl: body.restUrl,
		raw: basicLogFromResponse(response),
	};
}

/**
 * Exchange refresh token for new access token
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} oauthUrl - OAuth server URL
 * @param {string} refreshToken - OAuth refresh token
 * @param {string} clientId - OAuth client ID
 * @param {string} clientSecret - OAuth client secret
 * @returns {Promise<Object>} New access and refresh tokens
 */
async function step0(httpOpts, oauthUrl, refreshToken, clientId, clientSecret) {
	try {
		const urlStr = `${oauthUrl}/token?grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${clientId}&client_secret=${clientSecret}`;
		const response = await requestWithRetry(
			urlStr,
			{ method: "POST" },
			httpOpts,
		);
		const body = await response.json();
		return {
			ok: true,
			accessToken: body.access_token,
			refreshToken: body.refresh_token,
			raw: basicLogFromResponse(response),
		};
	} catch (error) {
		const status = error?.response?.status;
		return {
			ok: false,
			status,
			error: error.message,
			raw: {
				status,
				statusText: error?.response?.statusText,
				error: error.message,
			},
		};
	}
}

/**
 * OAuth2 authorization step - get temporary auth code
 * Note: Bullhorn's headless auth requires credentials in URL for non-interactive flow
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} oauthUrl - OAuth server URL
 * @param {string} clientId - OAuth client ID
 * @param {string} username - Bullhorn username
 * @param {string} password - Bullhorn API password
 * @returns {Promise<Object>} Temporary authorization code
 */
async function step1(httpOpts, oauthUrl, clientId, username, password) {
	const urlStr = `${oauthUrl}/authorize?client_id=${clientId}&response_type=code&action=Login&username=${encodeURIComponent(
		username,
	)}&password=${encodeURIComponent(password)}`;
	let response;
	try {
		response = await requestWithRetry(
			urlStr,
			{
				method: "GET",
				redirect: "manual",
				headers: { "Content-Type": "application/x-www-form-urlencoded" },
			},
			httpOpts,
		);
	} catch (err) {
		if (err?.response) {
			let t = "";
			try {
				t = await err.response.text();
			} catch {}
			const preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
			const htmlMsg = extractHtmlErrorMessage(t);
			const isInvalid = /invalid\s+credentials/i.test(htmlMsg || t || "");
			throw new BullhornAuthError(
				isInvalid ? "Invalid credentials" : "Authorize step failed",
				{
					code: isInvalid ? "INVALID_CREDENTIALS" : "HTTP_ERROR",
					status: err.response.status,
					errorMessage:
						htmlMsg ||
						(isInvalid
							? "Invalid credentials"
							: `Authorize failed with status ${err.response.status}`),
					details: { preview },
				},
			);
		}
		throw err;
	}
	const location = response.headers.get("location");
	if (!location) {
		let t = "";
		try {
			t = await response.clone().text();
		} catch {}
		const preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
		const htmlMsg = extractHtmlErrorMessage(t);
		const isInvalid = /invalid\s+credentials/i.test(htmlMsg || t || "");
		throw new BullhornAuthError(
			isInvalid ? "Invalid credentials" : "Authorize did not redirect",
			{
				code: isInvalid ? "INVALID_CREDENTIALS" : "AUTHORIZE_NO_REDIRECT",
				status: response.status,
				errorMessage:
					htmlMsg ||
					(isInvalid
						? "Invalid credentials"
						: "Authorization step did not return a redirect."),
				details: { preview },
			},
		);
	}
	let parsedURL;
	try {
		parsedURL = new URL(location, oauthUrl);
	} catch {
		throw new Error("authorize step returned an invalid redirect URL");
	}
	const tmpAuthCode = parsedURL.searchParams.get("code");
	if (!tmpAuthCode) {
		throw new BullhornAuthError("Authorize missing code", {
			code: "AUTHORIZE_NO_CODE",
			status: response.status,
			errorMessage: "Authorization step did not include a code.",
		});
	}
	return { tmpAuthCode, raw: basicLogFromResponse(response) };
}

/**
 * Exchange authorization code for access token
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} oauthUrl - OAuth server URL
 * @param {string} clientId - OAuth client ID
 * @param {string} clientSecret - OAuth client secret
 * @param {string} tmpAuthCode - Temporary authorization code
 * @returns {Promise<Object>} Access and refresh tokens
 */
async function step2(httpOpts, oauthUrl, clientId, clientSecret, tmpAuthCode) {
	const urlStr = `${oauthUrl}/token?grant_type=authorization_code&client_id=${clientId}&client_secret=${clientSecret}&code=${tmpAuthCode}`;
	let response;
	try {
		response = await requestWithRetry(urlStr, { method: "POST" }, httpOpts);
	} catch (err) {
		if (err?.response) {
			let t = "";
			try {
				t = await err.response.text();
			} catch {}
			const preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
			throw new BullhornAuthError("Token exchange failed", {
				code: "TOKEN_EXCHANGE_FAILED",
				status: err.response.status,
				errorMessage: `Token exchange failed with status ${err.response.status}`,
				details: { preview },
			});
		}
		throw err;
	}
	let body;
	try {
		body = await response.json();
	} catch (e) {
		let preview = "";
		try {
			const t = await response.clone().text();
			preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
		} catch {}
		throw new BullhornAuthError("Non-JSON token response", {
			code: "NON_JSON_RESPONSE",
			status: response.status,
			errorMessage: "Failed to parse token exchange response",
			details: { preview },
		});
	}
	return {
		accessToken: body.access_token,
		refreshToken: body.refresh_token,
		raw: basicLogFromResponse(response),
	};
}

/**
 * Exchange access token for REST session
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} restUrl - REST API URL
 * @param {string} accessToken - OAuth access token
 * @param {number} ttl - Token TTL in minutes
 * @returns {Promise<Object>} REST URL and token
 */
async function step3(httpOpts, restUrl, accessToken, ttl) {
	const ttlValue = Number.isFinite(ttl)
		? ttl
		: Number(process.env.BULLHORN_TTL || 30);
	const urlStr = `${restUrl}/login?version=*&access_token=${accessToken}&ttl=${ttlValue}`;
	let response;
	try {
		response = await requestWithRetry(urlStr, { method: "POST" }, httpOpts);
	} catch (err) {
		if (err?.response) {
			let t = "";
			try {
				t = await err.response.text();
			} catch {}
			const preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
			throw new BullhornAuthError("REST login failed", {
				code: "REST_LOGIN_FAILED",
				status: err.response.status,
				errorMessage: `REST login failed with status ${err.response.status}`,
				details: { preview },
			});
		}
		throw err;
	}
	let body;
	try {
		body = await response.json();
	} catch (e) {
		let preview = "";
		try {
			const t = await response.clone().text();
			preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
		} catch {}
		throw new BullhornAuthError("Non-JSON REST login response", {
			code: "NON_JSON_RESPONSE",
			status: response.status,
			errorMessage: "Failed to parse REST login response",
			details: { preview },
		});
	}
	return {
		restUrl: body.restUrl,
		restToken: body.BhRestToken,
		raw: basicLogFromResponse(response),
	};
}

/**
 * Universal Login using only username and password.
 * Returns a REST session (endpoint + BhRestToken) without OAuth tokens.
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} baseUrl - Universal base URL (e.g., https://universal.bullhornstaffing.com)
 * @param {string} username - Bullhorn username
 * @param {string} password - Bullhorn API password
 * @returns {Promise<Object>} REST URL and token
 */
async function universalLogin(httpOpts, baseUrl, username, password) {
	if (!baseUrl) {
		throw new Error("universal baseUrl is required");
	}
	const urlStr = `${ensureTrailingSlash(baseUrl)}universal-login/session/login?username=${encodeURIComponent(
		username,
	)}&password=${encodeURIComponent(password)}`;
	let response;
	try {
		response = await requestWithRetry(urlStr, { method: "GET" }, httpOpts);
	} catch (err) {
		if (err?.response) {
			let t = "";
			try {
				t = await err.response.text();
			} catch {}
			const preview = (t || "").slice(0, 200).replace(/\n/g, "\\n");
			const htmlMsg = extractHtmlErrorMessage(t);
			const isInvalid = /invalid\s+credentials/i.test(htmlMsg || t || "");
			throw new BullhornAuthError(
				isInvalid ? "Invalid credentials" : "Universal login request failed",
				{
					code: isInvalid ? "INVALID_CREDENTIALS" : "HTTP_ERROR",
					status: err.response.status,
					errorMessage:
						htmlMsg ||
						(isInvalid
							? "Invalid credentials"
							: `Universal login failed with status ${err.response.status}`),
					details: { preview },
				},
			);
		}
		throw err;
	}
	// Some environments may return an empty or non-JSON body on failure.
	// Parse defensively to provide a clearer error message.
	const rawText = await response.text();
	let body;
	try {
		body = rawText ? JSON.parse(rawText) : {};
	} catch (e) {
		const ct = response.headers.get("content-type") || "";
		const preview = (rawText || "").slice(0, 200).replace(/\n/g, "\\n");
		const htmlMsg = ct.includes("text/html")
			? extractHtmlErrorMessage(rawText)
			: "";
		const isInvalid =
			response.status === 401 ||
			response.status === 403 ||
			/invalid\s+credentials/i.test(htmlMsg || rawText || "");
		throw new BullhornAuthError(
			isInvalid ? "Invalid credentials" : "Universal login returned non-JSON",
			{
				code: isInvalid ? "INVALID_CREDENTIALS" : "NON_JSON_RESPONSE",
				status: response.status,
				errorMessage:
					htmlMsg ||
					(isInvalid
						? "Invalid credentials"
						: "Failed to parse Universal login response"),
				details: { preview, contentType: ct },
			},
		);
	}
	const sessions = Array.isArray(body?.sessions) ? body.sessions : [];
	const rest = sessions.find((s) => s?.name === "rest")?.value;
	if (!rest?.endpoint || !rest?.token) {
		const preview = rawText.slice(0, 200).replace(/\n/g, "\\n");
		const htmlMsg = extractHtmlErrorMessage(rawText);
		const isInvalid =
			response.status === 401 ||
			response.status === 403 ||
			/invalid\s+credentials/i.test(htmlMsg || rawText || "");
		throw new BullhornAuthError(
			isInvalid
				? "Invalid credentials"
				: "Universal login returned no REST session",
			{
				code: isInvalid ? "INVALID_CREDENTIALS" : "UNIVERSAL_NO_REST_SESSION",
				status: response.status,
				errorMessage:
					htmlMsg ||
					(isInvalid
						? "Invalid credentials"
						: "Universal login did not return a REST session"),
				details: { preview },
			},
		);
	}
	return {
		restUrl: ensureTrailingSlash(rest.endpoint),
		restToken: rest.token,
		raw: basicLogFromResponse(response),
	};
}

/**
 * Validate existing REST token and check rate limits
 * @private
 * @param {Object} httpOpts - HTTP options
 * @param {string} restUrl - REST API URL
 * @param {string} restToken - REST API token
 * @returns {Promise<Object>} Validation result with rate limit info
 */
async function ping(httpOpts, restUrl, restToken) {
	try {
		const urlStr = `${restUrl}/ping`;
		const response = await requestWithRetry(
			urlStr,
			{ method: "GET", headers: { BhRestToken: restToken } },
			httpOpts,
		);
		const log = basicLogFromResponse(response);
		const minRemaining = response.headers.get("x-ratelimit-remaining-minute");
		return {
			ok: true,
			minRemaining:
				minRemaining ?? log?.headers?.["x-ratelimit-remaining-minute"],
			raw: log,
		};
	} catch (error) {
		const status = error?.response?.status;
		return {
			ok: false,
			status,
			error: error.message,
			raw: {
				status,
				statusText: error?.response?.statusText,
				error: error.message,
			},
		};
	}
}

// Note: This function is kept for potential future use but is not currently called
// All password encoding is done inline with encodeURIComponent()
function _encodePasswordIfNeeded(password) {
	// eslint-disable-line no-unused-vars
	return encodeURIComponent(password);
}

/**
 * Extract Bullhorn credentials from environment variables
 * @param {Object} [env=process.env] - Environment variables object
 * @returns {Object|null} Credentials object or null if incomplete
 */
function credentialsFromEnv(env = process.env) {
	const clientId = env.BH_CLIENT_ID;
	const clientSecret = env.BH_CLIENT_SECRET;
	const username = env.BH_USERNAME;
	const password = env.BH_PASSWORD;
	if (clientId && clientSecret && username && password) {
		return { clientId, clientSecret, username, password };
	}
	return null;
}

/**
 * Extract Bullhorn tokens from environment variables
 * @param {Object} [env=process.env] - Environment variables object
 * @returns {Object} Tokens object (may be empty)
 */
function tokensFromEnv(env = process.env) {
	const tokens = {
		restUrl: env.BH_REST_URL,
		restToken: env.BH_REST_TOKEN,
		refreshToken: env.BH_REFRESH_TOKEN,
		accessToken: env.BH_ACCESS_TOKEN,
	};
	for (const k of Object.keys(tokens)) {
		if (tokens[k] === undefined) delete tokens[k];
	}
	return tokens;
}

/**
 * Login to Bullhorn using the most efficient path available.
 *
 * Attempts authentication in order of efficiency:
 * 1. Ping existing REST token if provided (fastest, no auth needed)
 * 2. Use refresh token if available (avoids username/password)
 * 3. Exchange access token for REST session (if access token provided)
 * 3. Full OAuth2 authentication flow (only when necessary)
 *
 * @param {Object} params - Authentication parameters
 * @param {Object} [params.credentials] - OAuth2 credentials
 * @param {string} [params.credentials.clientId] - OAuth2 client ID
 * @param {string} [params.credentials.clientSecret] - OAuth2 client secret
 * @param {string} [params.credentials.username] - Bullhorn username
 * @param {string} [params.credentials.password] - Bullhorn password
 * @param {Object} [params.tokens] - Existing tokens to validate/use
 * @param {string} [params.tokens.restUrl] - REST API URL
 * @param {string} [params.tokens.restToken] - REST API token
 * @param {string} [params.tokens.refreshToken] - OAuth2 refresh token
 * @param {string} [params.tokens.accessToken] - OAuth2 access token
 * @param {Object} [config] - Configuration options
 * @param {number} [config.minRemainingThreshold=100] - Min requests/minute before re-auth
 * @param {number} [config.ttl=30] - Token TTL in minutes (default 30, recommended: 1440 for 24 hours)
 * // Interactive/browser-based auth is temporarily removed
 * @param {Object} [config.http] - HTTP client configuration
 * @returns {Promise<Object>} Authentication result with tokens and method used
 * @throws {Error} When insufficient credentials provided or all auth methods fail
 */
async function loginToBullhorn(params, config = {}) {
	// Validate inputs
	if (!params || typeof params !== "object") {
		throw new Error("params must be an object with credentials and/or tokens");
	}

	const httpOpts = createHttpOptions(config.http || {});

	const threshold = Number(
		config.minRemainingThreshold ?? process.env.THRESHOLD_REMAINING_MIN ?? 100,
	);
	if (!Number.isFinite(threshold) || threshold < 0) {
		throw new Error("minRemainingThreshold must be a non-negative number");
	}

	const ttl = Number(config.ttl ?? process.env.BULLHORN_TTL ?? 30);
	if (!Number.isFinite(ttl) || ttl <= 0) {
		throw new Error("ttl must be a positive number (in minutes)");
	}

	const tokens = params.tokens ?? {};
	const creds = params.credentials;

	// If we have a restToken + restUrl, try ping first
	if (tokens.restToken && tokens.restUrl) {
		const pingResult = await ping(httpOpts, tokens.restUrl, tokens.restToken);
		if (pingResult.ok) {
			const remaining = Number.parseInt(pingResult.minRemaining ?? "0", 10);
			if (Number.isFinite(remaining) && remaining > threshold) {
				return {
					restUrl: tokens.restUrl,
					restToken: tokens.restToken,
					refreshToken: tokens.refreshToken,
					accessToken: tokens.accessToken,
					minRemaining: String(pingResult.minRemaining ?? ""),
					method: "existing",
				};
			}
		}
	}

	// If refresh is possible, we need oauth/rest URLs first (loginInfo)
	if (
		tokens.refreshToken &&
		creds?.clientId &&
		creds?.clientSecret &&
		creds?.username
	) {
		const { oauthUrl, restUrl } = await loginInfo(httpOpts, creds.username);
		const r0 = await step0(
			httpOpts,
			oauthUrl,
			tokens.refreshToken,
			creds.clientId,
			creds.clientSecret,
		);
		if (r0.ok) {
			const r3 = await step3(httpOpts, restUrl, r0.accessToken, ttl);
			return {
				restUrl: r3.restUrl,
				restToken: r3.restToken,
				refreshToken: r0.refreshToken,
				accessToken: r0.accessToken,
				method: "refresh",
			};
		}
		// fall through to full login when refresh fails
	}

	// Shortcut: if accessToken is provided, try to exchange it for a REST session
	if (tokens.accessToken) {
		// Prefer provided restUrl; otherwise derive from username via loginInfo
		let restUrl = tokens.restUrl;
		if (!restUrl && creds?.username) {
			const info = await loginInfo(httpOpts, creds.username);
			restUrl = info.restUrl;
		}
		if (!restUrl) {
			throw new Error(
				"accessToken provided but restUrl (or credentials.username to derive it) is missing",
			);
		}
		const s3 = await step3(httpOpts, restUrl, tokens.accessToken, ttl);
		return {
			restUrl: s3.restUrl,
			restToken: s3.restToken,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			method: "access",
		};
	}

	// Username/password-only path via Universal Login (no client secret required)
	if (
		creds?.username &&
		creds?.password &&
		(!creds.clientId || !creds.clientSecret)
	) {
		const universalBase = ensureTrailingSlash(
			config.universalBaseUrl ||
				process.env.BH_UNIVERSAL_BASE ||
				"https://universal.bullhornstaffing.com",
		);
		const uni = await universalLogin(
			httpOpts,
			// universalLogin will add path and ensure slashes
			universalBase.replace(/\/$/, ""),
			creds.username,
			creds.password,
		);
		return {
			restUrl: uni.restUrl,
			restToken: uni.restToken,
			method: "universal",
		};
	}

	// Interactive (browser) mode temporarily disabled

	// Full login requires full credentials
	if (
		!creds ||
		!creds.clientId ||
		!creds.clientSecret ||
		!creds.username ||
		!creds.password
	) {
		throw new Error(
			"Insufficient input: provide either (restUrl+restToken) or (refreshToken+client creds) or full credentials",
		);
	}

	const { oauthUrl, restUrl } = await loginInfo(httpOpts, creds.username);
	const s1 = await step1(
		httpOpts,
		oauthUrl,
		creds.clientId,
		creds.username,
		creds.password,
	);
	const s2 = await step2(
		httpOpts,
		oauthUrl,
		creds.clientId,
		creds.clientSecret,
		s1.tmpAuthCode,
	);
	const s3 = await step3(httpOpts, restUrl, s2.accessToken, ttl);

	return {
		restUrl: s3.restUrl,
		restToken: s3.restToken,
		refreshToken: s2.refreshToken,
		accessToken: s2.accessToken,
		method: "full",
	};
}

module.exports = {
	loginToBullhorn,
	credentialsFromEnv,
	tokensFromEnv,
	BullhornAuthError,
};

/**
 * Persist tokens to a .env file (opt-in helper).
 * Safely upserts BH_REST_URL, BH_REST_TOKEN, BH_REFRESH_TOKEN, BH_ACCESS_TOKEN.
 * Does not log or print token values.
 * @param {string} filePath - Path to .env file (e.g., ".env")
 * @param {Object} tokens - Token values to save
 * @param {Object} [options]
 * @param {boolean} [options.overwrite=true] - Whether to overwrite existing keys
 */
async function saveTokensToEnv(filePath, tokens, options = {}) {
	// eslint-disable-line no-unused-vars
	const overwrite = options.overwrite !== false;
	if (!filePath || typeof filePath !== "string") {
		throw new Error("filePath must be a non-empty string");
	}
	const envPath = path.resolve(process.cwd(), filePath);
	// Define environment variable keys as constants
	const ENV_KEY_REST_URL = "BH_REST_URL";
	const ENV_KEY_REST_TOKEN = "BH_REST_TOKEN";
	const ENV_KEY_REFRESH_TOKEN = "BH_REFRESH_TOKEN";
	const ENV_KEY_ACCESS_TOKEN = "BH_ACCESS_TOKEN";

	const ENV_KEYS = {
		restUrl: ENV_KEY_REST_URL,
		restToken: ENV_KEY_REST_TOKEN,
		refreshToken: ENV_KEY_REFRESH_TOKEN,
		accessToken: ENV_KEY_ACCESS_TOKEN,
	};
	const keyMap = ENV_KEYS;

	const serialize = (val) => {
		const s = String(val ?? "");
		return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	};

	let content = "";
	try {
		content = fs.readFileSync(envPath, "utf8");
	} catch {
		// File may not exist; we'll create it
		content = "";
	}
	const lines = content.length ? content.split(/\r?\n/) : [];

	const upsert = (envKey, value) => {
		if (value == null) return; // skip undefined/null
		const line = `${envKey}=${serialize(value)}`;
		const idx = lines.findIndex((l) =>
			new RegExp(`^\n?s*${envKey}s*=`).test(l),
		);
		if (idx >= 0) {
			if (overwrite) lines[idx] = line;
			// else keep existing
		} else {
			if (lines.length && lines[lines.length - 1] !== "") lines.push("");
			lines.push(line);
		}
	};

	for (const [src, envKey] of Object.entries(keyMap)) {
		if (Object.hasOwn(tokens || {}, src)) {
			upsert(envKey, tokens[src]);
		}
	}

	const finalText = lines.join("\n");
	await fs.promises.mkdir(path.dirname(envPath), { recursive: true });
	await fs.promises.writeFile(
		envPath,
		finalText + (finalText.endsWith("\n") ? "" : "\n"),
		"utf8",
	);
}

// Also export helper on CJS default for ESM wrapper
module.exports.saveTokensToEnv = saveTokensToEnv;
