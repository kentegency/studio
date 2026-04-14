-- ══════════════════════════════════════════════
-- THE KENTEGENCY — DATABASE SCHEMA v1.0
-- Run this in Supabase SQL Editor
-- ══════════════════════════════════════════════

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── PROFILES ──────────────────────────────────
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  email       text not null,
  avatar_url  text,
  color       text default '#F5920C',
  created_at  timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users see own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

-- ── PROJECTS ──────────────────────────────────
create table projects (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references profiles(id) on delete cascade,
  name          text not null,
  logline       text,
  type          text not null default 'film' check (type in ('film','brand','music','website','campaign','photo','other')),
  mode          text not null default 'finite' check (mode in ('finite','ongoing')),
  status        text not null default 'active' check (status in ('draft','active','completed','archived')),
  accent_color  text default '#F5920C',
  cover_url     text,
  window_token  text unique default encode(gen_random_bytes(32), 'hex'),
  window_expires_at timestamptz default (now() + interval '30 days'),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table projects enable row level security;
create policy "Owners manage their projects" on projects for all using (auth.uid() = owner_id);

-- ── ACTS ──────────────────────────────────────
create table acts (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  name        text not null,
  position    float not null default 0,   -- 0.0 to 1.0 start
  end_pos     float not null default 1,   -- 0.0 to 1.0 end
  color       text default 'teal',
  order_index integer default 0,
  created_at  timestamptz default now()
);

alter table acts enable row level security;
create policy "Project owner manages acts" on acts for all using (
  exists (select 1 from projects where id = acts.project_id and owner_id = auth.uid())
);

-- ── NODES ─────────────────────────────────────
create table nodes (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  act_id      uuid references acts(id) on delete set null,
  name        text not null,
  type        text not null default 'scene' check (type in ('scene','shot','beat','marker','equipment','staging','music','direction')),
  position    float not null default 0,   -- normalized 0-1 on timeline
  emphasis    float not null default 1,   -- visual size multiplier
  status      text not null default 'concept' check (status in ('concept','progress','review','approved','locked')),
  locked      boolean default false,
  locked_by   uuid references profiles(id),
  locked_at   timestamptz,
  pinned      boolean default false,
  order_index integer default 0,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table nodes enable row level security;
create policy "Project owner manages nodes" on nodes for all using (
  exists (select 1 from projects where id = nodes.project_id and owner_id = auth.uid())
);

-- ── ASSETS ────────────────────────────────────
create table assets (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  node_id       uuid references nodes(id) on delete set null,
  uploaded_by   uuid references profiles(id),
  name          text not null,
  type          text not null check (type in ('image','video','gif','audio','document','reference','archival','ai-generated','sketch')),
  file_url      text not null,
  thumbnail_url text,
  size_bytes    bigint,
  duration      float,          -- seconds for audio/video
  pages         integer,        -- for documents
  waveform_data jsonb,          -- amplitude array for audio
  metadata      jsonb default '{}',
  room          text not null default 'studio' check (room in ('studio','meeting','window')),
  version       integer default 1,
  created_at    timestamptz default now()
);

alter table assets enable row level security;
create policy "Project owner manages assets" on assets for all using (
  exists (select 1 from projects where id = assets.project_id and owner_id = auth.uid())
);
-- Public can read window assets via token (handled in app layer)

-- ── NOTES ─────────────────────────────────────
create table notes (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  node_id     uuid references nodes(id) on delete cascade,
  asset_id    uuid references assets(id) on delete set null,
  author_id   uuid references profiles(id),
  body        text not null,
  color       text default '#F5920C',
  room        text not null default 'studio' check (room in ('studio','meeting','window')),
  resolved    boolean default false,
  parent_id   uuid references notes(id),
  -- position anchors
  anchor_page     integer,
  anchor_frame    integer,
  anchor_time     float,
  anchor_x        float,
  anchor_y        float,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table notes enable row level security;
-- Studio notes: owner only
create policy "Owner sees studio notes" on notes for select using (
  room = 'studio' and exists (select 1 from projects where id = notes.project_id and owner_id = auth.uid())
);
-- Meeting notes: owner and contributors
create policy "Owner manages all notes" on notes for all using (
  exists (select 1 from projects where id = notes.project_id and owner_id = auth.uid())
);

-- ── CONTRIBUTORS ──────────────────────────────
create table contributors (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  profile_id  uuid references profiles(id),
  name        text not null,
  role        text not null default 'collaborator',
  color       text default '#1E8A8A',
  room        text not null default 'meeting' check (room in ('meeting','window')),
  node_ids    uuid[] default '{}',     -- scoped node access
  link_token  text unique default encode(gen_random_bytes(24), 'hex'),
  link_expires_at timestamptz default (now() + interval '30 days'),
  invited_at  timestamptz default now(),
  joined_at   timestamptz
);

alter table contributors enable row level security;
create policy "Owner manages contributors" on contributors for all using (
  exists (select 1 from projects where id = contributors.project_id and owner_id = auth.uid())
);

-- ── SHOTS ─────────────────────────────────────
create table shots (
  id          uuid primary key default uuid_generate_v4(),
  node_id     uuid not null references nodes(id) on delete cascade,
  project_id  uuid not null references projects(id) on delete cascade,
  number      integer not null,
  name        text not null,
  shot_type   text,       -- ECU, CU, MS, WS, etc.
  shot_kind   text,       -- archival, drama, candid, staged, animation
  duration    text,       -- "00:08"
  status      text default 'pending' check (status in ('pending','progress','done')),
  notes       text,
  order_index integer default 0,
  created_at  timestamptz default now()
);

alter table shots enable row level security;
create policy "Owner manages shots" on shots for all using (
  exists (select 1 from projects where id = shots.project_id and owner_id = auth.uid())
);

-- ── VERSIONS ──────────────────────────────────
create table versions (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  node_id       uuid references nodes(id) on delete cascade,
  snapshot_data jsonb not null,
  description   text,
  created_by    uuid references profiles(id),
  created_at    timestamptz default now()
);

alter table versions enable row level security;
create policy "Owner manages versions" on versions for all using (
  exists (select 1 from projects where id = versions.project_id and owner_id = auth.uid())
);

-- ── STYLE TOKENS ──────────────────────────────
create table style_tokens (
  id            uuid primary key default uuid_generate_v4(),
  project_id    uuid not null references projects(id) on delete cascade,
  accent_color  text default '#F5920C',
  teal_color    text default '#1E8A8A',
  font_display  text default 'Bebas Neue',
  font_body     text default 'Cormorant Garamond',
  font_mono     text default 'IBM Plex Mono',
  font_labels   text default 'IBM Plex Mono',
  spacing       text default 'normal',
  motion_speed  text default 'cinematic',
  border_radius text default '2px',
  directions    jsonb default '[]',
  active_direction uuid,
  updated_at    timestamptz default now()
);

alter table style_tokens enable row level security;
create policy "Owner manages style" on style_tokens for all using (
  exists (select 1 from projects where id = style_tokens.project_id and owner_id = auth.uid())
);

-- ── BRIEF RESPONSES ───────────────────────────
create table briefs (
  id          uuid primary key default uuid_generate_v4(),
  project_id  uuid not null references projects(id) on delete cascade,
  type        text not null,
  responses   jsonb not null default '{}',
  created_at  timestamptz default now()
);

alter table briefs enable row level security;
create policy "Owner manages briefs" on briefs for all using (
  exists (select 1 from projects where id = briefs.project_id and owner_id = auth.uid())
);

-- ── UPDATED_AT TRIGGERS ───────────────────────
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_projects_updated before update on projects for each row execute function update_updated_at();
create trigger trg_nodes_updated    before update on nodes    for each row execute function update_updated_at();
create trigger trg_notes_updated    before update on notes    for each row execute function update_updated_at();

-- ── STORAGE BUCKETS ───────────────────────────
-- Run these in Supabase dashboard → Storage → New bucket:
-- Bucket name: "assets"   → private
-- Bucket name: "sketches" → private
-- Bucket name: "exports"  → private

-- Sprint 9A: add session_token column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS session_token text;

-- Sprint 9B: subjects (production bible — interview subjects, key people)
create table if not exists subjects (
  id              uuid primary key default uuid_generate_v4(),
  project_id      uuid not null references projects(id) on delete cascade,
  name            text not null,
  title           text,
  organisation    text,
  category        text default 'Other',
  contact_status  text default 'prospect'
    check (contact_status in ('prospect','contacted','confirmed','filmed','declined')),
  contact_info    text,
  node_ids        uuid[] default '{}',
  notes           text,
  color           text default '#1E8A8A',
  created_at      timestamptz default now()
);

alter table subjects enable row level security;
create policy "Project owner manages subjects" on subjects for all using (
  exists (select 1 from projects where id = subjects.project_id and owner_id = auth.uid())
);
