# Orbita Landing Page

## Current State
The app has no public landing page. Unauthenticated users see a minimal `Login.tsx` centered card with just a logo, tagline, and Internet Identity sign-in button. The root `/` route redirects directly to `/dashboard` which then forces the login screen.

## Requested Changes (Diff)

### Add
- `src/frontend/src/pages/Landing.tsx` -- full maximalist public landing page
- New `/` route in App.tsx that shows `Landing` when unauthenticated

### Modify
- `src/frontend/src/App.tsx` -- change the root route: when unauthenticated show Landing instead of redirecting to dashboard. When authenticated, `/` still redirects to `/dashboard`. The Landing page embeds sign-in via the `useInternetIdentity` hook.

### Remove
- Nothing removed. Login.tsx can stay as fallback.

## Implementation Plan

1. Create `Landing.tsx` with these sections:
   - **Navbar**: Logo + "Sign in" button (top right)
   - **Hero**: Full-width dark navy/indigo gradient background. Oversized display headline (e.g. "The CRM That Lives On-Chain Forever"). Subheadline about permanent data, encryption, decentralization. Two CTAs: primary "Start Free" (triggers login), secondary "See it in action" (scrolls to features).
   - **Social proof strip**: "Trusted by teams building on ICP" + 3-4 stat counters (contacts encrypted, deals tracked, 100% uptime, on-chain since X)
   - **Feature grid** (6 features, 2 or 3 col): Kanban Pipeline, vetKD Encryption, Contacts & Companies, Reports & Charts, CSV Import/Export, Internet Identity Auth -- each with icon, bold title, 2-line description
   - **"Why On-Chain" differentiator section**: 3-column comparison or callout cards vs traditional CRM ("Your data, not ours", "No vendor lock-in", "Encryption at rest & in transit")
   - **Pipeline showcase**: mock visual or diagram of the Kanban pipeline UI with callouts
   - **CTA banner**: Full-width dark section, bold headline + sign-in button
   - **Footer**: Logo, tagline, built on ICP badge

2. Modify `App.tsx`:
   - Import Landing
   - Change `Root` component: if no identity, render `<Landing />` at `/` (not `<Login />`)
   - The index route `beforeLoad` redirect to `/dashboard` should only fire when authenticated

3. Design direction: maximalist -- oversized type, bold color blocks, layered backgrounds, vivid gradients, generous whitespace mixed with dense content sections, animated hover states. Use existing OKLCH color tokens from index.css (primary indigo, sidebar navy, rich gradients).
