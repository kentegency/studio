-- Add brief_answers jsonb column to projects
alter table projects add column if not exists brief_answers jsonb default '{}';
