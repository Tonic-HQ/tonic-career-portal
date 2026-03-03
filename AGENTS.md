# Tonic Career Portal — Build Instructions

## What You're Building

A modern, embeddable career portal for Bullhorn ATS. This is the MVP — Phase 1.

## Product Spec

Read the full spec: /Users/dan/clawd/projects/career-portal/PRODUCT-SPEC.md

## MVP Scope (Phase 1 — Today)

Build a working career portal with these features:

### Pages

1. **Job Listing Page** (`/`)
   - Search by keyword (searches title + publicDescription)
   - Filter by category, location (state), employment type
   - Sort by date published (default), title
   - Pagination (configurable page size, default 20)
   - Job count display ("Showing X of Y jobs")
   - Responsive card layout
   - Each card shows: title, location (city, state), employment type, category, posted date
   - Click card → job detail page

2. **Job Detail Page** (`/jobs/[id]`)
   - Job title, location, employment type, category, salary (if available), date published
   - Full HTML job description (rendered safely)
   - "Apply Now" button → opens apply modal
   - "Back to Jobs" link (preserves search/filter state)
   - Social sharing buttons (LinkedIn, Facebook, Twitter/X, email)
   - Schema.org JobPosting JSON-LD structured data
   - Open Graph + Twitter Card meta tags

3. **Apply Modal/Page**
   - Quick Apply mode (default): first name, last name, email, phone (optional) — NO resume required
   - Full Apply mode: quick apply fields + optional resume upload
   - Mode configurable in config
   - Submit → POST to Bullhorn public API /apply/{jobId}/raw
   - Success confirmation message
   - Error handling with user-friendly messages
   - "Already applied" detection via localStorage

### Render Modes

- **Standalone mode** (default): full page with header (logo, company name), footer
- **Embed mode** (`?embed=true`): no header/footer, transparent background
- Auto-detect via query parameter

### Theming

All theming via a config object. Use CSS custom properties for primaryColor, accentColor, fontFamily so they can be changed at runtime.

Config shape:
- companyName, companyLogoUrl, companyUrl
- primaryColor (#2563EB default), accentColor (#10B981 default), fontFamily (Inter default)
- darkMode (false default)
- service.swimlane, service.corpToken, service.fields
- applyForm.mode (quick|full), applyForm.resumeRequired (false), applyForm.showPhone (true)
- privacyPolicyUrl, googleAnalyticsId

### Tech Stack

- **Astro** with React islands for interactive components
- **Tailwind CSS** for styling
- CSS custom properties for runtime theming
- **TypeScript** throughout
- Static build output (npm run build → /dist)

### Bullhorn API

The portal uses the Bullhorn PUBLIC API only (no auth required, just swimlane + corpToken):

Base URL: https://public-rest{swimlane}.bullhornstaffing.com:443/rest-services/{corpToken}

Search Jobs:
GET /search/JobOrder?query=(isOpen:1) AND (isDeleted:0)&fields={fields}&count={pageSize}&start={offset}&sort=-dateLastPublished&showTotalMatched=true

Get Job Detail:
GET /query/JobBoardPost?where=(id={id})&fields={fields}

Apply:
POST /apply/{jobId}/raw?externalID=Resume&type=Resume&firstName={}&lastName={}&email={}&phone={}&format={ext}
Body: FormData with optional resume file

### Demo Mode

Include a demo config that works without a real Bullhorn instance — use mock data so we can see the UI immediately. When service.corpToken is "demo", use mock data instead of API calls. Create realistic mock job data (10-15 jobs across different categories, locations, employment types).

### Quality Standards

- Mobile-first responsive design
- Accessible (ARIA labels, keyboard nav, focus management)
- Fast — target < 100KB JS bundle
- Clean, modern UI — think Linear or Vercel aesthetic, not Bootstrap
- No unnecessary dependencies

### What NOT to Build (Yet)

- No backend/server — pure static for now
- No Supabase, Stripe, email, analytics dashboard
- No WordPress plugin, management UI, SSR, i18n

## Getting Started

npm create astro@latest . -- --template minimal --typescript strict
npx astro add react tailwind

Then build it. Make it look great. Ship it.
