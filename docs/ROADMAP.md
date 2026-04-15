# Roadmap — The Kentegency Studio

## Completed sprints (v1 → v33)

| Sprint | Version | What shipped |
|---|---|---|
| 1–3A | v1–v9 | Auth, dashboard, timeline arc, real nodes, status cycling, notes, shot lists, asset upload to Supabase, Publish Panel, Window preview, client Window page, Stage mode |
| 5A–5D | v10–v14 | Shot list hierarchy, undo stack, confirm modals, upload retry, node status rings, completion arc, tooltips, minimap live colours, act stats, Team pane live from DB, Stage reads real nodes |
| 6A–6B | v15–v17 | Settings panel, accent colour system (--project-accent), Acts creator, voice notes (MediaRecorder + Web Speech API), Quick Capture saves real notes |
| 7A–7C | v18–v22 | Shot list deduplication, canvas grid layout, arc fills zone, scene mode rebuilt (status-led), sidebar rebuilt with tooltips, Digest reads real data, Brief with description, touch targets, mobile/tablet breakpoints, error boundaries, browser detection for voice |
| 8 | v28–v30 | Command palette (⌘K), keyboard shortcuts overlay (?), skeleton loading, dead sidebar icons removed, Digest reads real notes and stats, onboarding de-hardcoded |
| 9A | v31 | WebRTC live session — useSession hook, SessionTile (draggable host), SessionGuest (client view), hash routing for /#/session/, session link in NodePane, session join in Window page |
| 9B | v32 | Production Bible — BiblePane (People tab), subjects table, contact status pipeline, scene assignment, detail view, form, search + filter |
| 9C | v33 | Edge Function PDF — generate-pdf Deno function, Browserless integration, graceful fallback, subjects section in Wrap, cover stats updated, progress states |
| Docs | v33 | .env.example, ARCHITECTURE.md, DATABASE.md, SECURITY.md, TECHNICAL_DEBT.md, CONTRIBUTING.md, ROADMAP.md, MARKET.md |

---

## Current state — v33

**Platform score (weighted average): 7.6/10**

| Dimension | Score | Notes |
|---|---|---|
| Visual identity | 9/10 | Cerebral thriller aesthetic, consistent |
| Canvas & arc | 9/10 | Scene mode rebuilt, status-led |
| Error recovery | 8/10 | Undo, boundaries, confirms |
| Navigation | 8/10 | ⌘K palette, shortcuts, responsive |
| People / Bible | 8/10 | Full production bible with contact pipeline |
| PDF export | 7/10 | Edge Function built, needs Browserless token |
| Client UX | 7/10 | Window solid, no email notification yet |
| Live session | 5/10 | Built, no TURN server, untested on mobile |
| Mobile | 5/10 | Breakpoints exist, real device testing needed |
| Accessibility | 4/10 | No focus trap, minimal ARIA |
| Multi-tenancy | 0/10 | Not built — single owner per project |

---

## Next sprints

### Sprint 9D — Accessibility pass
**Priority: High | Estimated: 1 day**

- Focus trap in all modals (ConfirmModal, Brief, Digest, Settings, Voice)
- ARIA labels on all icon-only buttons (sidebar, panel actions)
- Keyboard navigation through right panel tabs (Tab key)
- Skip-to-content link for screen reader users
- Verify `--mute` (4.6:1) used everywhere readable text appears

### Sprint 9E — Node drag reposition
**Priority: Medium | Estimated: 2 days**

- Drag handler on SVG node circles in Timeline
- Position updates to DB on mouseup (debounced)
- Visual snap guide while dragging
- Undo stack entry on drop
- Multi-select drag (stretch goal)

### Sprint 9F — Compare overlay (real)
**Priority: Low-medium | Estimated: 1 day**

Option A: Build it — two-panel asset comparison with a verdict mechanism written as a note.
Option B: Remove the Compare button — a shell feature is worse than an absent feature.
Decision should follow user research on whether comparison is actually needed.

### Sprint 10A — Approval email
**Priority: High | Estimated: 1 day**

- Supabase Database Webhook on `notes` INSERT
- Trigger when `body` contains "approved via Window link"
- Send email to project `owner_id` via Resend API
- Edge Function: `notify-approval`
- Toast in canvas if browser is open (Supabase Realtime)

### Sprint 10B — TURN server for WebRTC
**Priority: High | Estimated: 2 hours**

- Add Metered.ca or Twilio TURN credentials to useSession.js
- Test session connection on a corporate network
- Test on mobile (Safari iOS + Chrome Android)

### Sprint 10C — Real device testing
**Priority: High | Estimated: 2 days**

- Test full workflow on iPhone Safari (voice, WebRTC, touch targets)
- Test on iPad landscape and portrait
- Fix safe-area-inset issues on notched devices
- Verify 44px touch targets throughout
- Test voice notes on Safari iOS (MediaRecorder fallback)

---

## Enterprise roadmap (6–18 months)

These items are required before The Kentegency Studio can be sold to agencies or broadcasters as an enterprise product.

### E1 — Multi-tenancy (organisations + memberships)
**Required for: Any agency client**
Schema: `organisations`, `memberships` (admin/editor/viewer roles). All RLS policies updated. Organisation management UI.

### E2 — API data layer
**Required for: Team development, scale**
Extract all Supabase calls from UI components into `src/lib/api/`. Enables logging, retry logic, independent testing.

### E3 — Audit log
**Required for: Legal/compliance clients**
Server-side record of all significant actions. Who approved what, when, from where.

### E4 — Token validation in Edge Functions
**Required for: Security-conscious clients**
Move Window and Contributor data fetching server-side. Current app-layer validation is insufficient for pre-release content.

### E5 — Billing (Stripe)
**Required for: Monetisation**
Organisation-level billing, seat pricing, plan tiers (Free / Pro / Enterprise). Stripe Checkout + webhooks.

### E6 — SSO (SAML via WorkOS)
**Required for: Enterprise accounts (50+ seat companies)**
Okta, Microsoft Entra, Google Workspace provisioning.

### E7 — Observability stack
**Required for: Production reliability**
Sentry (errors), PostHog (product analytics), Grafana/Datadog (infrastructure).

### E8 — AI creative features
**Differentiator**
OpenAI integration: shot description generation, interview question suggestions from subject profiles, automatic image tagging, "suggest next scene" from arc structure.

### E9 — Offline-first
**Required for: On-location use**
Service worker + Workbox, IndexedDB queue for mutations, sync on reconnect.

### E10 — SOC 2 Type II
**Required for: Broadcaster and studio enterprise contracts**
Audit logging (E3 prerequisite), access control documentation, incident response, vendor security review.

### Sprint 10B — TURN server + Accessibility + Approval email (v38)
**Completed**

- TURN server configured via `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL` env vars (Metered.ca)
- `useFocusTrap` hook applied to: ConfirmModal, BriefOverlay, DigestOverlay, SettingsPanel, VoiceRecorder, WrapPanel
- `role="dialog"` and `aria-modal="true"` on all modal surfaces
- `notify-approval` Edge Function: Resend email to CD on Window approval
- Database Webhook wired to notes INSERT
