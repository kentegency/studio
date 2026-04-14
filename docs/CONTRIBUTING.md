# Contributing — The Kentegency Studio

## Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase CLI (`npm install -g supabase`)
- A Supabase project (free tier is sufficient for development)

### Local development

```bash
# Clone
git clone https://github.com/kentegency/studio
cd studio

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Run database migrations against your Supabase project
supabase db push

# Start dev server (hot reload)
npm run dev
```

The app runs at `http://localhost:5173`.

### Supabase local development (optional)

If you want a fully local stack:
```bash
supabase start          # starts local Postgres + Auth + Storage
supabase db reset       # applies migrations to local DB
```
Update `.env.local` with the local URLs printed by `supabase start`.

---

## Project structure

```
src/
  App.jsx                 — root component + hash router
  stores/
    index.js              — all Zustand stores
  lib/
    supabase.js           — Supabase client singleton
    undo.js               — undo stack module
  styles/
    tokens.css            — design system tokens, breakpoints, animations
  components/
    Canvas.jsx            — main app shell
    ErrorBoundary.jsx     — React error boundary
    ConfirmModal.jsx      — shared confirm dialog
    Toast.jsx             — toast notification + offline banner
    EmptyState.jsx        — empty state component
    Cursor.jsx            — custom cursor
    auth/                 — Auth screen
    bible/                — BiblePane (People / Production Bible)
    canvas/               — Timeline, Node (arc + scene mode)
    contributor/          — InvitePanel, ContributorView
    dashboard/            — Dashboard
    entry/                — Entry splash screen
    loader/               — Loader screen
    onboarding/           — Onboarding tooltip tour
    overlays/             — Overlays.jsx (Sketch, Compare, Stage, Brief, Digest)
    palette/              — CommandPalette, ShortcutsPanel
    panel/                — NodePane, ShotsPane, TeamPane, StylePane, WindowPreview
    publish/              — PublishPanel
    session/              — useSession, SessionTile, SessionGuest (WebRTC)
    settings/             — SettingsPanel, ActsPanel
    shell/                — Sidebar, Topbar, RightPanel, Minimap, Notifications
    upload/               — Upload panel
    viewer/               — Asset viewer
    voice/                — VoiceRecorder
    window/               — Window (client portal)
    wrap/                 — WrapPanel (PDF export)
supabase/
  migrations/
    001_initial_schema.sql
  functions/
    generate-pdf/
      index.ts            — Deno Edge Function
      README.md
docs/
  ARCHITECTURE.md
  DATABASE.md
  SECURITY.md
  TECHNICAL_DEBT.md
  ROADMAP.md
  CONTRIBUTING.md         ← this file
  MARKET.md
```

---

## Development workflow

### Branches

| Branch | Purpose |
|---|---|
| `main` | Production — deploys automatically to Vercel |
| `dev` | Integration — merge feature branches here first |
| `sprint/9D-accessibility` | Feature — named after sprint |
| `fix/node-status-cycle` | Bug fix |

### Commit messages

Format: `type(scope): description`

```
feat(bible): add subject category filter
fix(scene-mode): status badge colour not updating on advance
refactor(stores): extract node queries to api/nodes.js
docs(security): add token validation remediation plan
chore(deps): update supabase-js to 2.104.0
```

Types: `feat`, `fix`, `refactor`, `docs`, `style`, `chore`, `test`

### PR checklist

Before opening a PR:
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no new warnings
- [ ] No hardcoded project names (EBAN, George, Kwame) in UI-visible strings
- [ ] No `console.log` left in production code
- [ ] New features have an empty state
- [ ] Any new interactive element has a tooltip or accessible label
- [ ] New DB columns have a corresponding `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` at the bottom of `001_initial_schema.sql`

---

## Design system

### Colours

| Token | Value | Role |
|---|---|---|
| `--black` | `#040402` | Background |
| `--cream` | `#F4EFD8` | Primary text |
| `--dim` | `#A09890` | Secondary text |
| `--mute` | `#6A6258` | Tertiary text — minimum for readable text |
| `--ghost` | `#4A4840` | Decorative only — do not use for readable text |
| `--orange` | `#F5920C` | Primary accent |
| `--teal` | `#1E8A8A` | Secondary accent |
| `--project-accent` | dynamic | Per-project colour injected as CSS var |

Contrast rule: `--mute` passes WCAG AA (4.6:1 on `--black`). `--ghost` does not — use only for separators and decorative dots.

### Typography

| Token | Font | Usage |
|---|---|---|
| `--font-display` | Bebas Neue | Stage mode titles only |
| `--font-body` | Cormorant Garamond | Window loglines, Brief italic body |
| `--font-ui` | Inter / system-ui | All UI labels, buttons, inputs |
| `--font-mono` | IBM Plex Mono | Status codes, timecodes, metadata |

### Spacing

All paddings and margins use: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `40px`.
No arbitrary values.

### Motion tokens

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 120ms | Icon hover, dot transitions |
| `--dur-mid` | 260ms | Panel transitions, button hover |
| `--dur-slow` | 480ms | Modal open, overlay fade |
| `--dur-cinema` | 800ms | Stage mode, full-screen transitions |

---

## Adding a new feature

### New right panel tab

1. Create `src/components/panel/YourPane.jsx` and `YourPane.css`
2. Add to `TABS` array in `RightPanel.jsx`
3. Import and add to `panes` map in `RightPanel.jsx`
4. Add `tab-your-tab` command to `CommandPalette.jsx`
5. Add `setTab('your-tab')` shortcut to `ShortcutsPanel.jsx`

### New overlay

1. Create component in `src/components/overlays/` or its own directory
2. Add key to `overlays` object in `useUIStore` in `stores/index.js`
3. Import and render in `Canvas.jsx` (alongside existing overlays)
4. Add command to `CommandPalette.jsx`
5. Add button/trigger to `Topbar.jsx` or `Sidebar.jsx` with tooltip

### New database table

1. Add `CREATE TABLE IF NOT EXISTS ...` block to the bottom of `001_initial_schema.sql`
2. Add `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
3. Add `CREATE POLICY ...` for the owner
4. Run `supabase db push` to apply to your development project
5. Document the table in `docs/DATABASE.md`

---

## Deployment

### Frontend (Vercel)

Push to `main` triggers automatic deployment.

Manual:
```bash
npm run build
vercel --prod
```

### Edge Functions (Supabase)

```bash
supabase functions deploy generate-pdf
```

### Database migrations

```bash
supabase db push
```

---

## Environment variables reference

See `.env.example` for all variables with descriptions.
