# The Kentegency Studio

**Creative Intelligence Platform for Creative Directors**

A purpose-built production management tool for CDs managing visual projects — documentary, brand film, music video, campaign. Replaces the fragmented Notion + Airtable + Frame.io + WhatsApp stack with a single environment built around how stories are actually structured: as an arc.

---

## What it does

- **Arc timeline** — scenes positioned on a horizontal narrative arc. Status, completion, and team assignment expressed spatially.
- **Three-room model** — Studio (internal), Meeting (contributors), Window (client). Content published between rooms with controlled access.
- **Production Bible** — interview subjects tracked through a contact pipeline with scene assignments and research notes.
- **Client Window** — client-facing portal, no login required. Scene-by-scene approval with two-step confirm flow.
- **Live session** — WebRTC video call between CD and client, with session transcript saved to the project.
- **Voice notes** — record, transcribe, and attach audio notes to any scene.
- **Command palette** — ⌘K access to every action, scene, and tool.
- **PDF export** — Wrap document with cover, scene overview, shot list, subjects, decisions, and credits.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Zustand |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Edge Functions | Deno (Supabase) |
| PDF rendering | Browserless (headless Chrome) |
| Hosting | Vercel |

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System diagram, component hierarchy, data flow |
| [Database](docs/DATABASE.md) | Full schema, every table and column, design decisions |
| [Security](docs/SECURITY.md) | RLS policies, token model, known gaps, remediation |
| [Technical Debt](docs/TECHNICAL_DEBT.md) | Honest gap analysis with effort estimates |
| [Contributing](docs/CONTRIBUTING.md) | Setup, workflow, design system, conventions |
| [Roadmap](docs/ROADMAP.md) | Sprint history, current state, next sprints, enterprise path |
| [Market](docs/MARKET.md) | Competitive landscape, positioning, business model |

## Quick start

```bash
git clone https://github.com/kentegency/studio
cd studio && npm install
cp .env.example .env.local
# Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
supabase db push
npm run dev
```

Full setup in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Current version

**v33** — 46 components, ~12,500 lines of source, 9 completed sprints.

Primary gaps before enterprise: multi-tenancy, audit logging, billing, SSO.
See [docs/TECHNICAL_DEBT.md](docs/TECHNICAL_DEBT.md).

## Deployment

- Live: `https://studio-tau-five-89.vercel.app`
- Repo: `https://github.com/kentegency/studio`

---

*Built by E. Nii Ayi Solomon · The Kentegency · Creative Intelligence Studio*
