# Market — The Kentegency Studio

## What it is

The Kentegency Studio is a creative intelligence platform for Creative Directors
managing visual projects — film, documentary, brand, music, website, campaign.

It replaces a fragmented stack of tools (Notion for notes, Airtable for shot
lists, Google Drive for assets, WhatsApp for client feedback, email for approvals)
with a single purpose-built environment that maps to how a Creative Director
actually works: as an arc, not a list.

The core metaphor is The Line — a horizontal timeline representing the project's
narrative structure. Scenes are nodes on the arc. Everything else (assets, notes,
shots, team, clients) is organised around those scenes.

## The problem

A Creative Director managing a documentary, brand film, or music video is
simultaneously:
- Developing the creative vision
- Managing a production team (DP, editor, composer, sound designer)
- Tracking scene-by-scene progress and approval status
- Communicating with clients who need to see, react to, and approve work
- Coordinating interview subjects and key people
- Generating deliverables (shot lists, production bibles, wrap documents)

No tool does all of this. The current state of the market forces CDs into
a lowest-common-denominator stack:
- Notion or Coda for internal docs (not visual, not production-specific)
- Airtable for shot lists (a spreadsheet, not a timeline)
- Frame.io for client review (asset-centric, not story-centric)
- Google Drive for asset storage (no context, no approval workflow)
- WhatsApp for client communication (no record, no structure)

The result is context scattered across five tools, approvals buried in chat
threads, and no single source of truth for the project's creative status.

## Competitive landscape

### Frame.io (Adobe)

**What it does:** Asset review and approval. Clients comment on video frames.
**Where it is strong:** Video-centric workflows, large media teams.
**Where it is weak:** Not a production management tool. No arc/story structure.
No shot list. No interview subject tracking. No brief. Client interaction is
limited to video annotation.
**Pricing:** $15–$82/user/month.
**Kentegency edge:** The arc metaphor, the Production Bible, the brief-to-wrap
pipeline. Frame.io owns the asset review moment; Kentegency owns the entire
creative development process.

### Milanote

**What it does:** Visual moodboard and planning tool. Infinite canvas with cards.
**Where it is strong:** Early creative ideation, moodboarding.
**Where it is weak:** Not a production tool. No approval workflow. No client
portal with controlled access. No shot list. No status tracking.
**Pricing:** Free–$9.99/user/month.
**Kentegency edge:** Production-grade structure vs. an aesthetic whiteboard.

### Celtx / StudioBinder

**What it does:** Script breakdown, scheduling, call sheets for film production.
**Where it is strong:** Feature film pre-production, scheduling.
**Where it is weak:** Built for large productions with a line producer. Not
designed for a single CD managing a documentary or brand film. No visual arc.
No client portal.
**Pricing:** $15–$29/user/month.
**Kentegency edge:** Built for the CD, not the production coordinator.

### Notion

**What it does:** Flexible workspace — docs, databases, project management.
**Where it is strong:** Versatile, teams already use it.
**Where it is weak:** Requires significant setup to become a production tool.
No approval workflow. No client portal. No arc structure.
**Pricing:** Free–$15/user/month.
**Kentegency edge:** Opinionated structure built for creative production vs.
a blank canvas that requires the CD to build their own system.

### Airtable

**What it does:** Structured database with views — grid, gallery, kanban.
**Where it is strong:** Shot list management, production tracking.
**Where it is weak:** Data-centric, not story-centric. No arc. No client portal.
No approval flow. Collaborative but not creative.
**Pricing:** Free–$20/user/month.
**Kentegency edge:** The arc model maps to how stories are structured, not
how data is structured.

## What Kentegency does that no competitor does

**The arc model** — scenes positioned on a horizontal timeline that represents
the narrative structure of the project. Status, completion, and team assignment
all expressed spatially. This is how CDs think about projects; no other tool
reflects this.

**The three-room model** — Studio (internal), Meeting (contributors), Window
(client). Content is published between rooms. The client only sees what the CD
publishes to the Window. Contributors only see what the CD grants them access to.
This controlled access model is built into the architecture, not bolted on.

**The Production Bible as a first-class feature** — interview subjects tracked
through a contact pipeline (Prospect → Contacted → Confirmed → Filmed) with
scene assignments and research notes. No other creative tool for this market
has this.

**The Window client experience** — a client-facing portal accessible without
login, with scene-by-scene approval, reactions, and a two-step confirm flow.
No email required; the CD controls what the client sees.

**The brief-to-wrap pipeline** — a project starts with a Creative Brief
(structured Q&A by project type) and ends with a Wrap document (PDF with
cover, scene overview, shot list, subjects, key decisions, credits). Both
generated from the same live project data.

**The cerebral thriller aesthetic** — the platform has a distinct visual
identity (dark, desaturated teals and grays, amber accents, Bebas Neue
display type) that communicates seriousness and craft. CDs working on
prestige content do not want a tool that looks like a startup SaaS product.

## Market size

**Primary market:** Independent Creative Directors managing documentary, brand film,
and music video projects. Ghana, UK, US, West Africa creative industries.
Estimated 50,000–200,000 working CDs globally in this category.

**Secondary market:** Small production companies and agencies (5–20 person teams)
that need a structured production management tool without the complexity of
enterprise media asset management systems.

**Tertiary market:** Brands and broadcasters with in-house creative teams who need
a structured briefing and approval workflow for commissioned work.

## Business model

**SaaS subscription — per seat, per month**

| Tier | Price | Includes |
|---|---|---|
| Free | $0 | 1 project, 3 scenes, 500MB storage, Window link |
| Pro | $29/month | Unlimited projects, 50GB storage, PDF export, voice notes, live session |
| Agency | $79/month | 5 seats, 200GB storage, organisation workspace, audit log |
| Enterprise | Custom | SSO, SOC 2, dedicated support, custom SLA |

**Services revenue:** The Kentegency retains a service layer for onboarding,
production consulting, and custom workflow configuration for enterprise clients.

## Current status

The platform is in private use by the founding Creative Director (EBAN:
Ghana's Cybersecurity Journey documentary) and has not been opened to external
users. v33 represents a complete, production-ready internal tool. The gap
between the current state and a public beta is primarily:

1. Multi-tenancy (organisations + memberships) — 3–4 days
2. Billing integration (Stripe) — 2–3 days
3. Error monitoring and analytics (Sentry + PostHog) — 1 day
4. Real device testing and accessibility pass — 2–3 days
5. Terms of service, privacy policy, and cookie consent — 1 day

**Estimated time to public beta: 4–6 weeks with one additional developer.**
