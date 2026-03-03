# Tonic Career Portal — Product Spec v1

> A modern, embeddable career portal for Bullhorn that fills the gap between "free but broken" and "$600+/yr overkill."

## The Problem

Bullhorn's Open Source Career Portal (OSCP) is functionally abandoned — requires résumé uploads, locked to public API fields, broken WordPress plugin, bugs in compiled bundles going unfixed. The alternatives (Matador, Haley, Shazamme, Staffing Future) start at $600/yr and go up to $12,000+/yr, bundling career portals with full website platforms most small staffing firms don't need.

There's nothing in between.

## The Product

A standalone career portal that connects to Bullhorn, looks great, and just works. Two render modes (standalone or embeddable iframe), two API tiers (public or full REST), two hosting models (self-hosted static files or Tonic-hosted).

---

## Pricing

### Tier 1: Self-Hosted (One-Time Purchase) — $199

- Static file build (HTML/CSS/JS) — host anywhere
- Public API only (corp token + swimlane, no secrets exposed)
- Standalone + embed modes
- Quick apply (no résumé required)
- Configurable theming (colors, logo, fonts via config file)
- Configurable apply form fields
- Google for Jobs structured data (schema.org/JobPosting)
- Mobile-responsive
- Delivered as a zip file or CLI-generated build
- No ongoing cost, no subscription
- Community support (GitHub issues)

### Tier 2: Tonic-Hosted — $249/yr

Everything in Tier 1, plus:

- Hosted on Tonic infrastructure (custom subdomain or client CNAME)
- Full REST API support via secure backend proxy (credentials never exposed to browser)
- Access to any Bullhorn field (read + write)
- Custom candidate creation logic (no résumé requirement, write to any entity)
- Email notifications (applicant confirmation + recruiter notification)
- Automatic updates and maintenance
- Email support
- Analytics dashboard (apply rates, traffic, conversion)

### Tier 3: Tonic-Hosted Pro — $499/yr

Everything in Tier 2, plus:

- Job alerts / saved searches for candidates
- Indeed/ZipRecruiter/Glassdoor XML feed distribution
- A/B testing on apply forms
- Priority support
- Custom field mapping UI
- Multiple career portals per Bullhorn instance (divisional/brand portals)

---

## Competitive Positioning

| | OSCP (Free) | **Tonic Self-Hosted ($199)** | **Tonic Hosted ($249/yr)** | Matador Pro ($599/yr) | Shazamme ($2,340+/yr) | Haley ($3,600+/yr) |
|---|---|---|---|---|---|---|
| Quick Apply (no résumé) | ❌ | ✅ | ✅ | ✅ (via form plugin) | ✅ | ✅ |
| Full REST API access | ❌ | ❌ (public only) | ✅ | ✅ | ✅ | ✅ |
| Works outside WordPress | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ (their platform) |
| Embeddable (iframe) | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Self-hostable | ✅ | ✅ | N/A | ❌ | ❌ | ❌ |
| Google for Jobs schema | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Email notifications | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Job alerts | ❌ | ❌ | ✅ (Pro) | ❌ | ✅ | ✅ |
| Maintained & updated | ❌ | Community | ✅ | ✅ | ✅ | ✅ |
| One-time purchase option | N/A | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## V1 Feature Spec

### Core (Both Tiers)

**Job Listing Page**
- Search by keyword (title, description)
- Filter by category, location (city/state), employment type
- Sort by date published, title, location
- Pagination with configurable page size
- Job count display
- Responsive grid/list view toggle

**Job Detail Page**
- Full job description (HTML rendered)
- Location, employment type, category, salary (if available)
- Published date
- Social sharing (LinkedIn, Facebook, Twitter/X, email)
- Related jobs by category
- Back to search with preserved filters
- Schema.org JobPosting structured data

**Apply Flow**
- **Quick Apply:** First name, last name, email, phone — done. No file required.
- **Full Apply:** Quick apply fields + optional résumé upload + optional cover letter
- Configurable required/optional fields via config
- EEOC fields (gender, race/ethnicity, veteran, disability) — configurable on/off
- Privacy consent checkbox with configurable policy URL
- Success confirmation with toast/modal
- "Already applied" detection (localStorage)
- Source tracking via URL parameter (`?source=linkedin`)

**Theming & Configuration**
- `config.json` file for all settings:
  - Company name, logo URL, website URL
  - Primary color, accent color, font family
  - Bullhorn connection (swimlane, corp token, or full API creds)
  - Fields to display on job cards and detail pages
  - Apply form field configuration
  - EEOC toggles
  - Privacy policy URL
  - Google Analytics ID
  - i18n locale
- CSS custom properties for easy override
- Dark mode support

**Render Modes**
- **Standalone:** Full page with header (logo, company name, nav), footer, complete branding
- **Embed:** `?embed=true` or loaded via embed script — no header/footer, transparent background, auto-resize via postMessage
- **Embed script:** `<script src="https://portal.tonichq.com/embed.js" data-portal="abc123"></script>` — handles iframe creation, sizing, theming passthrough

**SEO (Standalone + SSR Mode)**
- Individual URLs per job (`/jobs/12345-software-engineer`)
- Schema.org JobPosting JSON-LD on each job page
- Open Graph + Twitter Card meta tags
- XML sitemap generation
- RSS feed for job aggregators

### Tonic-Hosted Only

**Backend Proxy**
- Secure credential storage — API keys never reach the browser
- OAuth token management and refresh
- Full REST API access: read any entity/field, write to any entity/field
- Candidate creation via REST (no parse résumé dependency)
- Rate limiting and caching

**Email Notifications**
- Applicant confirmation email (configurable template)
- Recruiter notification email on new application
- Configurable recipient list per job or globally

**Analytics Dashboard**
- Job views, apply clicks, completion rate
- Traffic sources
- Top performing jobs
- Apply funnel visualization

---

## Tech Stack

| Layer | Tool | Why |
|---|---|---|
| Frontend framework | **Astro + React islands** | Static build for self-hosted, SSR for hosted. Island architecture = minimal JS, fast Core Web Vitals. |
| Styling | **Tailwind + CSS custom properties** | Tailwind for layout/components, CSS vars for theming (colors, fonts via config). Scoped styles for embed mode. |
| Backend / DB | **Supabase** (Postgres + Edge Functions + Auth + Storage) | Tenant management, API proxy, file uploads, RLS for multi-tenancy, auth for management dashboard. |
| Frontend hosting | **Vercel** | Native Astro SSR support, edge rendering, wildcard subdomains (`*.portal.tonichq.com`), custom domain aliases via CNAME. |
| Billing | **Stripe** | One-time payments (Tier 1) + subscriptions (Tier 2/3). Checkout + Customer Portal. Webhooks to Supabase for auto-provisioning. |
| Email | **Resend** | Transactional email for applicant confirmations + recruiter notifications. React Email templates. $20/mo for 50K emails. |
| CLI | **Node.js** (published to npm) | `npx @tonichq/career-portal init` — interactive wizard → config.json → Astro build → static `/dist` output. |

### Architecture Details

**Self-hosted tier (Tier 1):**
Pure static files. The CLI runs an Astro static build with the client's config baked in. Output is HTML/CSS/JS that talks directly to Bullhorn's public API from the browser. Zero backend dependency — no Supabase, no Vercel, no ongoing infrastructure. Client hosts on S3, Netlify, Apache, Nginx, whatever.

**Tonic-hosted tiers (Tier 2/3):**
Astro SSR on Vercel for the frontend. Supabase Edge Functions as the API proxy — receives requests from the frontend, holds OAuth credentials server-side, forwards to Bullhorn REST API. This is the layer that makes full API access secure (credentials never reach the browser).

- **Portal configs** stored in Supabase Postgres with RLS (each tenant only sees their own)
- **Résumé uploads** go to Supabase Storage temporarily → forwarded to Bullhorn → purged (no long-term candidate data = simpler GDPR)
- **Analytics events** written to Postgres, aggregated for the dashboard
- **Domain routing** via Vercel wildcard subdomain + custom domain aliases
- **Tenant provisioning** automated via Stripe webhook → Supabase function → creates tenant record + portal config

### Infrastructure Cost

| Service | Monthly Cost | Notes |
|---|---|---|
| Supabase Pro | $25 | 8GB DB, 250K Edge Function invocations, 100GB storage |
| Vercel Pro | $20 | Unlimited SSR, 1TB bandwidth, custom domains |
| Resend | $20 | 50K emails/mo |
| Domain (portal.tonichq.com) | ~$1 | Already owned |
| **Total** | **~$66/mo** | |

At 100 hosted tenants paying $249/yr ($20.75/mo each):
- Monthly revenue: $2,075
- Monthly cost: $66
- **Margin: 96.8%**

Cost scales sub-linearly — Supabase and Vercel handle thousands of tenants at the Pro tier before needing upgrades.

---

## Build Phases

### Phase 1: MVP (2-3 weeks)
- Job listing + detail + quick apply
- Public API support only
- Standalone render mode
- Basic theming (config.json)
- Static build output
- Schema.org structured data
- Deploy one client as proof of concept

### Phase 2: Embed + Hosted (2 weeks)
- Embed mode + embed script
- Backend proxy for full REST API
- Tonic-hosted infrastructure (multi-tenant)
- Email notifications
- Stripe billing integration

### Phase 3: Polish + Launch (2 weeks)
- Analytics dashboard
- WordPress plugin (thin wrapper)
- Marketing site + docs
- Bullhorn Marketplace listing application
- Pro tier features (job alerts, XML feeds)

---

## Distribution Strategy

1. **Bullhorn Marketplace listing** — every Bullhorn customer shops here
2. **Existing Tonic HQ clients** — immediate upsell, you're already configuring their OSCP for free
3. **Bullhorn community forums + Reddit** — the OSCP frustration is well documented
4. **Direct outreach** — staffing firms running the OSCP (identifiable by the default styling)
5. **Content marketing** — "Why We Built a Better Bullhorn Career Portal" blog post

---

## Revenue Model

Conservative assumptions:
- 50 self-hosted sales in year 1: 50 × $199 = **$9,950**
- 100 hosted subscriptions by end of year 1: 100 × $249 = **$24,900/yr ARR**
- 20 Pro subscriptions by end of year 1: 20 × $499 = **$9,980/yr ARR**
- **Year 1 total: ~$45K** (mix of one-time + recurring)
- **Year 2 ARR (renewals + growth): $60-80K**

Infrastructure cost per hosted tenant: ~$2-5/mo (Cloudflare Workers + R2 + email). At $249/yr ($20.75/mo), margins are 75-90%.

The real value isn't the portal revenue — it's removing the OSCP support burden from Dan's plate and creating a product touchpoint with every Bullhorn customer who needs a career portal.

---

## Multi-Portal Architecture (Divisional Portals)

### The Use Case

A staffing firm operates multiple divisions — IT Staffing, Healthcare, Industrial, Executive Search. Each division has its own brand identity, its own website (or section of a website), and only wants to show jobs relevant to that division. But they all run on one Bullhorn instance.

Today, this is a custom project with any competitor. Haley charges for a separate portal setup. Shazamme requires a higher-tier plan. The OSCP doesn't support it at all without forking the entire codebase.

With Tonic Career Portal, it's a config change.

### How It Works

Each portal is a **portal instance** — a distinct configuration that produces a distinct career site. Every portal instance has:

```json
{
  "portalId": "acme-healthcare",
  "displayName": "Acme Healthcare Careers",
  "branding": {
    "logo": "https://cdn.acmestaffing.com/healthcare-logo.svg",
    "primaryColor": "#0066CC",
    "accentColor": "#00AA55",
    "fontFamily": "Inter, sans-serif",
    "favicon": "https://cdn.acmestaffing.com/healthcare-favicon.ico"
  },
  "domain": {
    "type": "subdomain",
    "value": "healthcare-careers.acmestaffing.com"
  },
  "jobFilter": {
    "field": "publishedCategory.name",
    "operator": "IN",
    "values": ["Healthcare", "Nursing", "Allied Health", "Medical"]
  },
  "applyForm": {
    "fields": [
      { "key": "firstName", "required": true },
      { "key": "lastName", "required": true },
      { "key": "email", "required": true },
      { "key": "phone", "required": false },
      { "key": "certifications", "type": "text", "label": "Certifications (RN, LPN, CNA, etc.)", "required": true },
      { "key": "resume", "type": "file", "required": false }
    ]
  },
  "emailNotifications": {
    "recruiterEmails": ["healthcare-recruiting@acmestaffing.com"],
    "applicantConfirmation": true
  },
  "seo": {
    "titleTemplate": "{{jobTitle}} | Acme Healthcare Careers",
    "metaDescription": "Apply for healthcare staffing positions with Acme Staffing."
  }
}
```

A second portal for the same Bullhorn instance:

```json
{
  "portalId": "acme-it",
  "displayName": "Acme Technology Careers",
  "branding": {
    "logo": "https://cdn.acmestaffing.com/tech-logo.svg",
    "primaryColor": "#1A1A2E",
    "accentColor": "#E94560",
    "fontFamily": "JetBrains Mono, monospace"
  },
  "domain": {
    "type": "cname",
    "value": "careers.acmetech.io"
  },
  "jobFilter": {
    "field": "publishedCategory.name",
    "operator": "IN",
    "values": ["Information Technology", "Software", "DevOps", "Cybersecurity"]
  },
  "applyForm": {
    "fields": [
      { "key": "firstName", "required": true },
      { "key": "lastName", "required": true },
      { "key": "email", "required": true },
      { "key": "phone", "required": false },
      { "key": "linkedinUrl", "type": "url", "label": "LinkedIn Profile", "required": false },
      { "key": "githubUrl", "type": "url", "label": "GitHub Profile", "required": false },
      { "key": "resume", "type": "file", "required": false }
    ]
  },
  "emailNotifications": {
    "recruiterEmails": ["it-recruiting@acmestaffing.com"],
    "applicantConfirmation": true
  }
}
```

Same Bullhorn credentials, same API connection, completely different portals. Different logos, colors, fonts, domains, job filters, apply form fields, and notification recipients.

### Filter Capabilities

The `jobFilter` supports filtering on any field available through whichever API tier the client is using:

**Public API filters (Tier 1 & 2):**
- `publishedCategory.name` / `publishedCategory.id` — job category
- `address.state` / `address.city` — location
- `employmentType` — full-time, contract, temp, etc.
- Any field available on the `JobBoardPost` entity

**Full REST API filters (Tier 2 & 3 only):**
- `businessSector` — division/department
- `clientCorporation.name` — by client (for VMS/MSP portals)
- Custom fields (`customText1` through `customText20`, etc.)
- `owner.name` — by recruiter/team
- Any field on `JobOrder` including custom objects

Multiple filters can be combined:

```json
{
  "jobFilter": {
    "conditions": [
      { "field": "publishedCategory.name", "operator": "IN", "values": ["Healthcare"] },
      { "field": "address.state", "operator": "IN", "values": ["CA", "OR", "WA"] },
      { "field": "customText5", "operator": "=", "value": "West Coast Division" }
    ],
    "logic": "AND"
  }
}
```

### Hosting Models for Multi-Portal

**Self-Hosted (Tier 1):**
The client runs the build CLI once per portal. Each build produces a separate `/dist` folder with that portal's config baked in. They deploy each one independently — different S3 buckets, different subdirectories, different servers, whatever they want.

```bash
npx @tonichq/career-portal build --config healthcare-portal.json --out dist/healthcare
npx @tonichq/career-portal build --config tech-portal.json --out dist/tech
npx @tonichq/career-portal build --config industrial-portal.json --out dist/industrial
```

Three folders, three deployments, zero ongoing cost.

**Tonic-Hosted (Tier 2 — single portal only):**
One portal per subscription. Clients who need multiple portals upgrade to Pro.

**Tonic-Hosted Pro (Tier 3 — unlimited portals):**
All portals run on shared infrastructure. Per-tenant routing via subdomain or custom domain (CNAME). Each portal is a config entry in our system — adding a new portal takes 60 seconds through the management UI.

The infrastructure doesn't scale linearly with portals. All portals for a given Bullhorn instance share the same API connection, the same OAuth token, the same job data cache. The only things that differ are the config (branding, filters, form fields) and the domain routing. Hosting cost per additional portal is effectively zero.

### Management UI (Pro Tier)

Pro tier clients get a simple management dashboard:

- **Portal list** — see all active portals, their domains, and status
- **Create portal** — wizard: name it, pick colors/logo, set job filter, configure apply form, assign domain
- **Edit portal** — change any config without redeployment (changes go live immediately)
- **Preview** — see the portal before publishing
- **Analytics** — per-portal traffic, apply rates, and conversion metrics
- **Domain management** — add custom domains, verify DNS, manage SSL

### Pricing Justification

At $499/yr for unlimited divisional portals, a firm with 3 divisions is paying $166/yr per portal. Compare:
- Haley Marketing: $3,600+/yr for a single portal, additional divisions are custom projects at additional cost
- Shazamme: Higher-tier plans ($6,000-12,000/yr) for multi-brand support
- Matador: Doesn't support divisional portals — each WordPress site needs its own license ($599+/yr each)
- OSCP: Would need to fork and deploy the entire Angular app separately per division

This is the feature that makes the Pro tier a no-brainer for any multi-division firm.

---

## Open Questions

1. **Product name?** "Tonic Career Portal"? Something standalone that doesn't tie to THQ branding?
2. **Open source the frontend?** Could drive adoption and marketplace trust, while monetizing the hosted backend + support
3. **Bullhorn Marketplace revenue share?** Need to check if Bullhorn takes a cut on marketplace listings
4. **GDPR / data processing?** Hosted tier stores candidate data briefly — need a DPA template
5. **Multi-language support in v1?** The OSCP supports i18n — should we match that from day one?
