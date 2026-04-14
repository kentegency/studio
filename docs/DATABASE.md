# Database — The Kentegency Studio

PostgreSQL via Supabase. Row Level Security enabled on all tables.
All timestamps are `timestamptz` (UTC).

## Schema diagram

```
profiles ──────────────────────────────────────────────┐
    │ id (= auth.users.id)                             │
    │                                                  │
projects ──────────────────────────────────────────┐  │
    │ owner_id → profiles.id                       │  │
    │                                              │  │
    ├── acts (order_index, color, position range)  │  │
    │                                              │  │
    ├── nodes ─────────────────────────────────┐  │  │
    │       │ project_id → projects.id         │  │  │
    │       │                                  │  │  │
    │       ├── assets (file_url, room, type)  │  │  │
    │       ├── notes  (body, color, room)     │  │  │
    │       └── shots  (number, name, status)  │  │  │
    │                                          │  │  │
    ├── contributors (link_token, role, room)  │  │  │
    │       │ profile_id → profiles.id         │  │  │
    │                                          │  │  │
    ├── subjects (name, category, node_ids[])  │  │  │
    ├── style_tokens (key, value)              │  │  │
    ├── briefs (type, answers jsonb)           │  │  │
    └── versions (label, snapshot jsonb)       │  │  │
                                               │  │  │
sessions ─────────────────────────────────────┘  │  │
    (WebRTC — Supabase Realtime, no DB table)     │  │
                                                  │  │
```

## Tables

---

### profiles

Extends `auth.users`. Created automatically on first login via trigger.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | = auth.users.id |
| name | text | Display name |
| avatar_color | text | Hex — default #1E8A8A |
| created_at | timestamptz | |

**RLS:** Users can only select/update/insert their own row.

---

### projects

The primary entity. Everything belongs to a project.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| owner_id | uuid FK → profiles | Single owner — see TECHNICAL_DEBT.md |
| name | text NOT NULL | |
| type | text | film, brand, music, website, campaign, photo, other |
| logline | text | One-sentence description |
| accent_color | text | Hex — drives --project-accent CSS var |
| window_token | text UNIQUE | 64-char hex — client Window access |
| window_expires_at | timestamptz | Default 30 days from creation |
| session_token | text | 20-char — WebRTC session access |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** Owner only — all operations.

**Tokens:** `window_token` and `session_token` are validated in the application layer, not by RLS. Anonymous users with the Supabase anon key can query the projects table. See SECURITY.md.

---

### acts

Structural zones on the timeline arc. Each project has 3 acts by default.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| name | text | "Act I — Past", custom names allowed |
| color | text | teal, orange, red, purple, green, blue |
| order_index | integer | Sort order — 1, 2, 3 |
| start_pos | real | 0.0–1.0 position on arc |
| end_pos | real | 0.0–1.0 position on arc |
| created_at | timestamptz | |

**RLS:** Owner only via project ownership.

---

### nodes

Scenes on the timeline arc. The core creative unit.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| name | text NOT NULL | Scene name |
| type | text | scene, beat, marker, music |
| status | text | concept, progress, review, approved, locked |
| position | real | 0.0–1.0 — horizontal position on arc |
| emphasis | real | Weight multiplier — affects arc node size |
| act | text | Act label string |
| locked | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** Owner only via project ownership.
**Status flow:** concept → progress → review → approved → locked

---

### assets

Files attached to nodes (scenes). Stored in Supabase Storage.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| node_id | uuid FK → nodes | |
| name | text | Original filename |
| file_url | text | Public Supabase Storage URL |
| file_path | text | Storage bucket path (for deletion) |
| type | text | image, gif, video, audio, document, reference |
| room | text | studio, meeting, window |
| size | bigint | Bytes |
| created_at | timestamptz | |

**RLS:** Owner only via project ownership.
**Storage buckets:** `assets` (public), `sketches` (private), `exports` (private)

---

### notes

Text notes attached to nodes. Also used as an activity/event log.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| node_id | uuid FK → nodes | Nullable |
| author_id | uuid FK → profiles | Nullable (anonymous via Window) |
| body | text NOT NULL | |
| color | text | Hex accent — orange, teal, purple, green |
| room | text | studio, meeting, window |
| resolved | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**RLS:** Two policies — owner can select studio notes; owner can manage all notes.
**Dual use:** Notes serve as both user annotations and system event records (approvals, reactions, session transcripts). Body text carries semantic meaning (e.g. "Client approved this scene via Window link").

---

### contributors

Team members with scoped access via a link token.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| profile_id | uuid FK → profiles | Nullable — set when contributor logs in |
| name | text NOT NULL | |
| role | text | DP, editor, composer, producer, etc. |
| color | text | Hex avatar colour |
| room | text | meeting, window |
| node_ids | uuid[] | Scoped node access — empty = all nodes |
| link_token | text UNIQUE | 48-char hex — access link |
| link_expires_at | timestamptz | Default 30 days |
| invited_at | timestamptz | |
| joined_at | timestamptz | |

**RLS:** Owner only via project ownership.

---

### shots

Individual shots within a scene. Ordered by number.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| node_id | uuid FK → nodes | |
| project_id | uuid FK → projects | |
| number | integer | Shot number within scene |
| name | text NOT NULL | |
| shot_type | text | ECU, CU, MS, WS, OTS, etc. |
| shot_kind | text | archival, drama, candid, staged, animation |
| duration | text | "00:08" — display string |
| status | text | pending, progress, done |
| notes | text | |
| created_at | timestamptz | |

**RLS:** Owner only via project ownership.

---

### subjects

Interview subjects and key people. Production Bible layer.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| name | text NOT NULL | |
| title | text | Job title / role |
| organisation | text | |
| category | text | Academic, Politician, Cybersecurity, Cultural, etc. |
| contact_status | text | prospect, contacted, confirmed, filmed, declined |
| contact_info | text | Email / phone / agent |
| node_ids | uuid[] | Scenes this subject appears in |
| notes | text | Research notes |
| color | text | Hex avatar colour |
| created_at | timestamptz | |

**RLS:** Owner only via project ownership.
**node_ids design note:** Stored as an array rather than a join table for simplicity. At scale (>100 subjects per project), a `subject_nodes` join table would be more performant.

---

### style_tokens

Per-project design tokens. Currently stores accent colour and typography choices.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| key | text | e.g. "accent_color", "font_display" |
| value | text | |
| created_at | timestamptz | |

---

### briefs

Creative brief Q&A per project. Keyed by type (Film, Brand, Music, Website).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| type | text | Film, Brand, Music, Website |
| answers | jsonb | { "question_index": "answer_text" } |
| created_at | timestamptz | |

---

### versions

Project snapshots. Schema present, writes not yet implemented.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| project_id | uuid FK → projects | |
| label | text | "Pre-pitch v2", "Post-shoot" |
| snapshot | jsonb | Full project state at time of version |
| created_at | timestamptz | |

---

## Migrations

Single migration file: `supabase/migrations/001_initial_schema.sql`

Sprints add `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements at the end.
This approach works for a single-environment project. A multi-environment
deployment would use sequentially numbered migration files.

## Known gaps

- No `audit_log` table — no server-side record of who changed what
- No `organisations` or `memberships` tables — no multi-tenancy
- `window_token` access not enforced at RLS level
- `versions` table exists but nothing writes to it
- `node_ids` arrays on `subjects` and `contributors` not validated by FK

See `docs/TECHNICAL_DEBT.md` for full gap analysis and remediation plan.
