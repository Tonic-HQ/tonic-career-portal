# Admin Configuration Page — Build Spec

Build a `/admin` route that lets clients visually configure their career portal with a live preview.

## Layout

Split-screen layout:
- **Left side (60%)**: Configuration form with collapsible sections
- **Right side (40%)**: Live preview iframe showing the portal with current settings applied in real-time

## Sections

### 1. Branding
- Company name (text input)
- Logo (URL input + file upload area with drag-and-drop)
- Favicon (URL input + file upload area)
- Page title template (text input, placeholder: "{{jobTitle}} | {{companyName}} Careers")

### 2. Typography
- Primary font — dropdown with popular Google Fonts: Inter, Roboto, Open Sans, Lato, Poppins, Montserrat, Plus Jakarta Sans, DM Sans, Source Sans 3, Nunito Sans
- Heading font — same dropdown, or "Same as primary"
- Custom Google Fonts URL input (for fonts not in the dropdown)
- Font preview text that updates live

### 3. Colors
- Primary color — color picker input with hex text field
- Accent color — same
- Background color — same (default #FFFFFF)
- Text color — same (default #111827)
- Color preview swatches showing button, link, badge, card examples with the chosen colors

### 4. Content
- Hero heading text (default: "Open Positions")
- Hero subtext (default: "Find your next opportunity")
- Show salary on cards — toggle
- Show employment type badges — toggle  
- Default jobs per page — select: 6, 9, 12, 15, 20
- Default view — toggle: Grid / List

### 5. Apply Form
- Mode — radio: Quick Apply / Full Apply
- Résumé required — toggle (default off)
- Show phone field — toggle (default on)
- Phone required — toggle (default off)
- Privacy policy URL — text input
- Consent checkbox text — text input

### 6. Bullhorn Connection
- Swimlane — text input
- Corp Token — text input
- "Test Connection" button → calls the search API and shows result:
  - Success: green check + "Connected — X jobs found"
  - Failure: red X + error message

### 7. SEO & Analytics
- Google Analytics ID — text input
- Meta description — textarea
- OG Image URL — text input

## Behavior

- All changes update the live preview in real-time (no save button needed for preview)
- "Export Config" button — generates and downloads a `config.json` file with all settings
- "Copy Config" button — copies the JSON to clipboard
- Config is stored in localStorage so it persists across page reloads
- "Reset to Defaults" button

## Design

- Match the portal's design language — same fonts, same color scheme, clean and modern
- Each section is a collapsible card (click header to expand/collapse)
- Sections default to expanded except SEO & Analytics
- Responsive — on mobile, preview goes below the form (stacked layout)
- Use the same Tailwind + CSS custom properties approach

## Technical

- Build as an Astro page at `src/pages/admin.astro` with a React island `src/components/AdminPanel.tsx`
- The live preview is an iframe pointing at `/?preview=true` with config passed via postMessage
- Add a message listener to the main portal that accepts config updates via postMessage and applies them as CSS custom properties + state updates
- No backend needed — everything is client-side
- The "Export Config" generates a JSON file matching the PortalConfig interface from config.ts

## File Structure
```
src/pages/admin.astro          — Admin page layout
src/components/AdminPanel.tsx  — Main admin panel React component
src/components/admin/          — Sub-components (ColorPicker, FontSelector, etc.)
```
