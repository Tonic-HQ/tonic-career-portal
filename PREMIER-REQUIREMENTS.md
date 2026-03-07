# Premier Requirements Tracker

Portal ID: `trtbqyga` | Corp Token: `DLCF0P` | Swimlane: `45` | Tier: Pro
Live at: `careersite.appsforstaffing.com/trtbqyga`
OSCP: `oscp-premier-careers.pages.dev`

## Bullhorn Field Mapping (from Premier's instance)

| Our Field | Bullhorn Field | Bullhorn Label | Data Type |
|-----------|---------------|----------------|-----------|
| salaryLow | salary | Salary Low | BigDecimal |
| salaryHigh | customFloat1 | Salary High | Double |
| payRate | payRate | Pay Rate Low | BigDecimal |
| payRateMax | customFloat2 | Pay Rate Max | Double |
| salaryUnit | salaryUnit | Pay Unit | String (options) |
| onSite | onSite | Location Requirements | String (options: On-Site, Remote, Hybrid) |
| yearsRequired | yearsRequired | Minimum Experience (Years) | Integer (options) |
| N/A | jobType | N/A | NOT A VALID FIELD - caused 400 error |

## Requirements Status

### Colors — ✅ DONE
- [x] Sidebar filter background: `#f3f3f3` (accentColor)
- [x] Apply Now button: `#6d909d` background, white text (primaryColor)
- [x] Modal header: `#6d909d` background, white text (uses primaryColor)
- [x] Apply button on modal: `#6d909d` (uses primaryColor)
- [ ] Cancel button on modal: `#f3f3f3` background, black text — needs specific styling

### Font — ✅ DONE
- [x] Gucci Sans Pro loaded from `/public/fonts/premier/` (4 weights: Light, Book, Medium, Bold)
- [x] Applied via customFont config + dynamic @font-face injection

### Filters (Left Sidebar) — ⚠️ PARTIALLY DONE
- [x] Keyword Search
- [x] Category
- [x] City
- [x] State
- [ ] **Remote Status** (On-Site, Remote, Hybrid) — field is `onSite`, data flows through proxy, need to add as filter
- [ ] **Employment Type** (Contract/Temporary, Contract to Hire, Direct Hire only) — field exists but need to filter displayed options to only their values
- [ ] **Job Type** (Full Time, Part Time) — NOT a standard Bullhorn field. Need to find which field Premier uses for this, or it may be derived from employmentType

### Card Layout — ⚠️ PARTIALLY DONE
- [x] Title, Category, City/State, JD preview
- [x] Employment Type chip
- [x] Date chip
- [x] Salary range chip ($95,000 - $115,000) — NEW, uses RangeChip component
- [x] Pay rate range chip ($43 - $48.50/hr) — NEW, uses RangeChip component
- [x] On-Site/Remote/Hybrid chip — NEW, uses IconChip with RemoteIcon
- [x] Minimum Experience chip (5+ years) — NEW, uses ExperienceChip
- [ ] **Rounded corners (20px)** — easy, add to customCss or card styles

### Pay Rates / Salary Display — ✅ DONE
- [x] Pull from salary (low) + customFloat1 (high) for Direct Hire
- [x] Pull from payRate (low) + customFloat2 (max) for Contract/CTH
- [x] RangeChip handles both formats with smart unit display (/hr, /yr)
- [x] Full REST API proxy provides these fields (public API cannot)

### Published Description — ✅ DONE
- [x] Job body pulls from `publicDescription` field

### Company External Description — 🔧 TODO
- [ ] Append `clientCorporation.companyDescription` to bottom of job detail page
- [ ] Field is already in the REST query and data flows through
- [ ] Just needs to be rendered in JobDetailView component

### General Apply Now Button — 🔧 TODO
- [ ] Non-job-specific Apply button at top of page
- [ ] Opens apply modal without a specific job context
- [ ] Creates a general candidate record in Bullhorn
- [ ] Reference: their current careers page has this

### "Explore Jobs" Heading — 🔧 TODO
- [ ] Change "Open Positions (#)" to "Explore Jobs"
- [ ] Add `labels` config option: `{ heading: "Explore Jobs" }`
- [ ] Quick config change per portal

### Rounded Corners (20px) — 🔧 TODO
- [ ] Add `border-radius: 20px` to job cards
- [ ] Can be done via `customCss` in portal config or a `cardBorderRadius` config option

### Custom Footer — 🔧 TODO
- [ ] They want their own footer (matching their main website)
- [ ] Options: `customFooterHtml` config field, or structured footer config
- [ ] Reference: their website footer (need URL from Premier)
- [ ] If custom footer is added, remove Privacy Policy from sidebar filter panel

### Privacy Policy — ⚠️ CONDITIONAL
- [ ] If custom footer with privacy link → remove from sidebar
- [ ] If no custom footer → keep in sidebar with their URL (need URL from Premier)

### EEOC / Voluntary Self-ID — ✅ DONE
- [x] "Remove the Voluntary Self-Identification Form" — already off in config

### Candidate Status = "New Lead" — 🔧 TODO (requires apply form work)
- [ ] New candidates created with status "New Lead"
- [ ] Existing candidates: don't change their current status
- [ ] Requires full REST API for candidate creation (not public apply endpoint)
- [ ] Part of the apply form submission rewrite

### Apply Form — Additional Fields — 🔧 TODO (requires apply form work)
- [ ] **Source** dropdown → relabel as "How did you hear about us?"
  - Options from Bullhorn Source field dropdown
  - Maps to Candidate.source
- [ ] **Employment Preference** multi-select dropdown
  - Options from Bullhorn Employment Preference field
  - Allow multiple selections
  - Maps to Candidate.employmentPreference

### Apply Form — General Fixes — 🔧 TODO
- [ ] Remove resume requirement (quick apply mode) — already supported in config
- [ ] Wire apply submission to Bullhorn REST API (currently logs to console)
- [ ] Handle "candidate already exists" logic (don't change status)

## Architecture (Already Built)

- **Bullhorn REST API proxy**: `/api/bh/[...path]` serverless function
  - Authenticates via `bullhorn-auth-client` (colocated as `bullhorn-auth.cjs`)
  - Credentials stored in `ats_credentials` table (not in config JSONB)
  - 24-hour token TTL with ping-first reuse strategy
  - Tested and working: returns full field data for Premier's 2 jobs
- **JobChip component system**: `TextChip`, `IconChip`, `RangeChip`, `ExperienceChip`
  - RangeChip handles salary ($95,000 - $115,000) and hourly ($43 - $48.50/hr)
  - Smart unit formatting (/hr, /yr, /mo)
- **Config-driven API mode**: `apiMode: 'public' | 'rest'` in portal config
  - Public = direct to Bullhorn public API (standard/self-hosted tier)
  - REST = through our server-side proxy with full credentials (Pro tier)
- **ats_credentials table**: Provider-agnostic (bullhorn, jobadder, vincere, loxo, pcrecruiter)
  - RLS: service_role only, zero public access
  - Separate from portal display config (security)

## Priority Order (Suggested)

### Batch 1 — Quick Config Wins
1. ~~Get jobs showing with chips~~ ✅ DONE
2. ~~Guard empty location data~~ ✅ DONE
3. Rounded corners (cardBorderRadius config)
4. "Explore Jobs" heading (labels.heading config)
5. Cancel button styling (accentColor)

### Batch 2 — Data Display (proxy data already flows)
6. Company description on job detail page
7. Remote Status filter (onSite field)
8. Employment Type filter (with optional value restriction)

### Batch 3 — Apply Form (biggest lift)
9. REST API candidate creation (POST /entity/Candidate)
10. Source + Employment Preference custom fields
11. General Apply button (non-job-specific)
12. Candidate status logic (New Lead / preserve existing)
13. Custom footer

---

## Product Roadmap (All Clients)

Features that go beyond Premier's specific requests — platform-level capabilities.

- [ ] **Multi-language support** — i18n for all UI strings (filters, buttons, headings, apply form labels). Language selector or auto-detect from browser. OSCP had `languageDropdownOptions` in config.json5 but it was barely functional.
- [ ] **Job alerts / saved searches** — candidate subscribes to filter criteria, gets email when new jobs match
- [ ] **Analytics dashboard** — page views, apply clicks, source attribution per portal
- [ ] **Stripe billing integration** — self-signup, auto-provisioning on payment
- [ ] **WordPress plugin** — iframe wrapper with shortcode, auto-resize
- [ ] **Email notifications** — Resend integration, notify recruiters on apply
- [ ] **Share to LinkedIn** button on job detail (LinkedIn product already enabled)
- [ ] **Indeed XML feed customization** — per-client field selection, category filters
- [ ] **A/B testing** — compare apply rates across different layouts/colors
- [ ] **Candidate duplicate detection** — before creating a new candidate, check if name + email already exist in Bullhorn. If match found, create the JobSubmission against the existing candidate instead of creating a duplicate. Public API handles this automatically (`candidateAlreadyExisted: true` in response). REST API path needs explicit search-before-create logic (`GET /search/Candidate?query=email:"x" AND firstName:"y"`).
- [ ] **Resume upload** (optional) — for clients who want traditional apply alongside quick apply
- [ ] **Custom domain mapping** — CNAME portal.clientdomain.com to our infrastructure
- [ ] **Static export pipeline** — generate standalone HTML/JS/CSS bundle for $199 tier clients
