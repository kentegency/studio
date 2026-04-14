# Technical Debt — The Kentegency Studio

This document is an honest, prioritised inventory of the structural gaps between
the current codebase (v33) and enterprise-grade production software. It is
written for developers joining the project and for technical due diligence.

## Priority 1 — Structural (blocks enterprise sales)

### 1.1 Single-owner data model — no multi-tenancy

**What it is:**
Every project is owned by a single `owner_id` (a `profiles.id`). There are no
organisations, workspaces, or team ownership concepts. Two Creative Directors at
the same agency cannot share a project as co-owners.

**Why it matters:**
Any agency or studio with more than one CD requires shared project access. The
current model cannot support this without data duplication.

**Remediation:**
```sql
create table organisations (
  id   uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique,
  plan text default 'free' -- free, pro, enterprise
);

create table memberships (
  id      uuid primary key default uuid_generate_v4(),
  org_id  uuid references organisations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role    text default 'member' -- owner, admin, editor, viewer
);
```
All RLS policies then change from `owner_id = auth.uid()` to
`exists (select 1 from memberships where org_id = projects.org_id and user_id = auth.uid())`.

**Estimated effort:** 3–4 days (schema migration + policy rewrite + UI for org management)

---

### 1.2 Supabase called directly from 15 UI components

**What it is:**
Components like `Timeline.jsx`, `NodePane.jsx`, `BiblePane.jsx`, and `WrapPanel.jsx`
import `supabase` and write queries directly. There is no data access layer.

**Why it matters:**
- No central place to add logging, retry logic, or error normalisation
- Schema changes require hunting for broken queries across the component tree
- Frontend and backend concerns are mixed — impossible to test independently
- A backend engineer cannot own the data layer separately from UI engineers

**Remediation:**
Create `src/lib/api/` with one file per domain:
```
src/lib/api/
  nodes.js       ← all node queries
  assets.js      ← all asset queries
  notes.js       ← all note queries
  shots.js       ← all shot queries
  subjects.js    ← all subject queries
  projects.js    ← all project queries
```
Each file exports typed async functions. Components import from `api/`, never
from `supabase` directly.

**Estimated effort:** 2 days (mechanical extraction, no logic changes)

---

### 1.3 Global variables as inter-component event bus

**What it is:**
`window.__openPalette`, `window.__openViewer`, `window.__openVoice`,
`window.__openShortcuts`, `window.__startSession`, `window.__toastTimer`
are attached to `window` in `Canvas.jsx` and called from other components.

**Why it matters:**
- Not part of the React/module system — invisible to TypeScript, bundlers, and tests
- If Canvas unmounts, the globals are deleted and callers fail silently
- Any browser extension or third-party script can overwrite them
- Impossible to unit test

**Remediation:**
Replace with a React Context or Zustand store action:
```jsx
// UIStore
openModal: (key) => set(s => ({ modals: { ...s.modals, [key]: true } }))

// Usage
const { openModal } = useUIStore()
openModal('palette')
```

**Estimated effort:** Half a day (mechanical replacement)

---

## Priority 2 — Reliability (causes user-visible failures)

### 2.1 No tests

**What it is:**
Zero test files in the codebase. No unit tests, integration tests, or E2E tests.

**Why it matters:**
- Any change can silently break existing functionality
- The undo stack, RLS policies, status cycling, PDF generation, WebRTC
  signalling — none has automated verification
- Cannot confidently refactor for the multi-tenancy migration

**Remediation:**
Start with the highest-value test targets:
- `stores/index.js` — Zustand store logic (pure JS, easy to unit test with Vitest)
- `supabase/migrations/` — RLS policies (testable with Supabase's `pg_prove`)
- `WrapPanel.jsx` — HTML generation (snapshot tests)
- `useSession.js` — WebRTC hook (mock RTCPeerConnection)

Add Vitest (`npm install -D vitest @testing-library/react`) and a CI step
that runs tests on every PR.

**Estimated effort:** 1 week for meaningful coverage of critical paths

---

### 2.2 Offline mode is decorative

**What it is:**
The offline banner appears and a toast says "Working dark — changes will sync
when reconnected." There is no actual offline queue, IndexedDB cache, or
sync mechanism. Changes made while offline are lost.

**Why it matters:**
Users on location (on set, in a studio, in an interview) often have unreliable
connectivity. This is exactly where a CD uses this tool.

**Remediation:**
- Add a Zustand middleware that queues failed mutations
- On reconnect, replay the queue in order
- For full offline: add a service worker with Workbox and cache critical routes

**Estimated effort:** 3–4 days for basic queue-and-retry; 1 week for full offline

---

### 2.3 No TURN server for WebRTC

**What it is:**
The WebRTC session uses only STUN servers (Google's public ones). STUN works
for peers on residential networks but fails on corporate networks with symmetric
NAT (common in offices, agencies, broadcast facilities).

**Why it matters:**
A session between Leonard and a broadcaster client on a corporate network will
fail to connect. This is the exact use case.

**Remediation:**
Add a TURN server. Cheapest options:
- Metered.ca — free tier, $0.40/GB after
- Twilio Network Traversal Service — $0.40/GB

```js
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:relay.metered.ca:80',
    username: process.env.TURN_USERNAME,
    credential: process.env.TURN_CREDENTIAL,
  },
]
```

**Estimated effort:** 2 hours

---

### 2.4 Window/Contributor token validation is application-layer only

**What it is:**
`window_token` and `link_token` are validated in JavaScript inside `Window.jsx`
and `ContributorView.jsx`. There is no database-level enforcement.

**Why it matters:**
Anyone with the Supabase anon key can query projects without a valid token.
For pre-release film content, this is a real exposure.

**Remediation:**
Move Window and Contributor data fetching to Edge Functions that validate tokens
server-side before returning any data. The client receives only the data it needs
for that token, not raw database rows.

**Estimated effort:** 1 day

---

## Priority 3 — Scale and Observability

### 3.1 No error monitoring

No Sentry, Datadog, or equivalent. Errors disappear into the browser console.

**Remediation:** Add Sentry (`npm install @sentry/react`) — 30 minutes.

### 3.2 No analytics

No product analytics. No way to know which features are used, where users drop
off, or what the actual workflow looks like in practice.

**Remediation:** Add PostHog (`npm install posthog-js`) — 1 hour.

### 3.3 No audit log

No server-side record of who did what and when. Approvals, deletions, status
changes, and locks leave no immutable trail.

**Remediation:**
```sql
create table audit_log (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid references projects(id),
  user_id     uuid references auth.users(id),
  action      text,      -- 'node.status_changed', 'scene.locked', etc.
  entity_type text,
  entity_id   uuid,
  before      jsonb,
  after       jsonb,
  created_at  timestamptz default now()
);
```
Write to this table via an Edge Function triggered by significant actions.

**Estimated effort:** 1 day

### 3.4 No billing integration

No Stripe, no plan tiers, no seat limits. Cannot monetise.

**Remediation:** Stripe Checkout + a `billing` table on organisations.
Webhooks update `organisations.plan` on payment success/failure.

**Estimated effort:** 2–3 days for basic billing integration

### 3.5 No code splitting

The full React bundle loads on first visit (~400KB gzipped). Large overlays
(Stage mode, Session components, WrapPanel) are not lazy-loaded.

**Remediation:**
```jsx
const StageOverlay = lazy(() => import('./overlays/StageOverlay'))
const SessionTile  = lazy(() => import('./session/SessionTile'))
const WrapPanel    = lazy(() => import('./wrap/WrapPanel'))
```
Wrap in `<Suspense>` with a loading fallback.

**Estimated effort:** Half a day

---

## Not debt — intentional decisions

**Hash routing over React Router:** Avoids server-side routing configuration on
Vercel. Appropriate for a single-page app with this complexity level.

**Single migration file:** Appropriate for a solo-developer project in early
stage. Multi-environment deployments would switch to sequentially numbered
files.

**Zustand over Redux:** Correct choice at this scale. Zustand's API is
significantly simpler and sufficient for the current state complexity.

**No TypeScript:** A type system would catch interface errors between components
and stores. Not implemented to keep iteration speed high in early sprints.
A TypeScript migration would take 2–3 days of mechanical work.
