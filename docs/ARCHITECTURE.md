# Architecture — The Kentegency Studio

## Overview

The Kentegency Studio is a single-page React application backed by Supabase (PostgreSQL + Auth + Storage + Realtime). It is deployed on Vercel and has no custom backend server. All server-side logic runs in Supabase Edge Functions (Deno runtime).

```
┌─────────────────────────────────────────────────────────────┐
│                         Browser                             │
│                                                             │
│   React 19 + Vite                                          │
│   Zustand (state)    ──────────────────────────────────┐   │
│   Hash router                                          │   │
└────────────────────────────────────────────────────────│───┘
                                                         │
                    HTTPS / WSS                          │
                                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        Supabase                             │
│                                                             │
│   Auth (email/password, JWT)                               │
│   PostgreSQL (RLS enforced)                                │
│   Storage (assets bucket — public, sketches — private)     │
│   Realtime (WebRTC signalling channels)                    │
│   Edge Functions (Deno):                                   │
│     └── generate-pdf  → Browserless cloud Chrome          │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼ CDN
┌────────────────────────────┐
│         Vercel             │
│  Static build, global CDN  │
│  studio-tau-five-89        │
└────────────────────────────┘
```

## Frontend Architecture

### Router

Hash-based routing — no server-side routing required. Pattern: `window.location.hash`.

| Route | Component | Auth required |
|---|---|---|
| (default) | Canvas | Yes |
| `#/window/[token]` | Window | No — token-based |
| `#/contributor/[token]` | ContributorView | No — token-based |
| `#/session/[token]` | SessionGuest | No — token-based |

### State management

Six Zustand stores, all in `src/stores/index.js`:

| Store | Owns |
|---|---|
| `useAuthStore` | User session, profile, login/logout |
| `useProjectStore` | Current project, project list |
| `useNodeStore` | Scenes (nodes), selected node |
| `useNotesStore` | Notes for selected node |
| `useAssetsStore` | Assets for selected node |
| `useUIStore` | Screen, room, tab, overlays, toast, offline flag |

### Component hierarchy

```
App.jsx
├── Canvas.jsx (screen: canvas)
│   ├── Sidebar.jsx
│   ├── Topbar.jsx
│   ├── Timeline.jsx          ← arc + scene mode
│   ├── Minimap.jsx
│   ├── RightPanel.jsx
│   │   ├── NodePane.jsx
│   │   ├── ShotsPane.jsx
│   │   ├── TeamPane.jsx
│   │   ├── BiblePane.jsx     ← People / Production Bible
│   │   └── StylePane.jsx
│   ├── QuickCapture.jsx
│   ├── CommandPalette.jsx
│   ├── ShortcutsPanel.jsx
│   ├── SessionTile.jsx       ← WebRTC host tile
│   └── Overlays:
│       SketchOverlay, BriefOverlay, DigestOverlay,
│       StageOverlay, WrapPanel, SettingsPanel,
│       ActsPanel, PublishPanel, VoiceRecorder,
│       Upload, AssetViewer, InvitePanel
├── Dashboard.jsx (screen: dashboard)
├── Auth.jsx (screen: auth)
├── Loader.jsx (screen: loader)
├── Window.jsx (route: #/window/)
├── ContributorView.jsx (route: #/contributor/)
└── SessionGuest.jsx (route: #/session/)
```

### Data flow

```
User action
    │
    ▼
Component calls store action (e.g. useNodeStore().updateNode)
    │
    ▼
Store action calls supabase client
    │
    ▼
Supabase RLS validates auth.uid() against policy
    │
    ├─ Success → store updates local state → component re-renders
    └─ Error   → store returns error → component shows toast
```

**Known deviation:** 15 components also call `supabase` directly rather
than through a store. This is technical debt — see `docs/TECHNICAL_DEBT.md`.

## Database Architecture

See `docs/DATABASE.md` for full schema documentation.

### Key design decisions

**Rooms system** — content is scoped to one of three rooms (`studio`, `meeting`, `window`). Notes, assets, and contributor access are filtered by room. This maps directly to the platform's internal/creative/client space model.

**Token-based anonymous access** — Window and Contributor pages are accessible without authentication using tokens stored on the `projects` and `contributors` tables. Token validation currently happens in the application layer (see Security gap in `docs/SECURITY.md`).

**Single owner per project** — every project has one `owner_id` referencing `auth.users`. There is no multi-owner or organisation model. See `docs/TECHNICAL_DEBT.md` — this is the primary structural gap for enterprise use.

## Edge Functions

### generate-pdf

`supabase/functions/generate-pdf/index.ts`

Receives: `{ html: string, filename: string }`
Returns: PDF binary (application/pdf) or `{ fallback: true }` if not configured

See `supabase/functions/generate-pdf/README.md` for deployment instructions.

## Deployment

### Vercel

- Root directory: `/` (project root, not `/src`)
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables set in Vercel dashboard

### Supabase

- Project: `xehfzjncfbdggtbhsdup.supabase.co`
- Migrations: `supabase/migrations/001_initial_schema.sql`
- Edge Functions: `supabase/functions/`

### Deploy sequence for a new environment

```bash
# 1. Fork/clone the repo
git clone https://github.com/kentegency/studio

# 2. Create a new Supabase project at supabase.com

# 3. Run the migration
supabase db push

# 4. Set environment variables
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 5. Deploy Edge Function (optional — required for PDF)
supabase functions deploy generate-pdf
supabase secrets set BROWSERLESS_TOKEN=your_token

# 6. Deploy to Vercel
vercel --prod
```

## WebRTC Session Architecture

Peer-to-peer video via `RTCPeerConnection`. Supabase Realtime broadcast channels carry the signalling (offer, answer, ICE candidates). The host creates the offer; the guest responds. Session token stored on the project row.

**Known limitation:** No TURN server configured. Connections on corporate networks (which block peer-to-peer UDP) will fail. Production deployment should add a TURN server (Twilio Network Traversal Service or Metered.ca).

## Performance characteristics

- Initial bundle: ~400KB gzipped (React 19 + Zustand + Supabase client)
- No code splitting implemented — full bundle loads on first visit
- No service worker — no offline caching (offline mode is UI-only)
- SVG arc renders up to ~50 nodes comfortably; beyond that, virtualisation needed
