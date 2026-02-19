-- ⚠️ FINAL FIX: RESET MEMORY SYSTEM ⚠️
-- This script will DROP the existing memory tables and recreate them cleanly.
-- WARNING: This will delete existing memories. This is necessary to fix the schema corruption.

-- 1. Drop existing objects to clear conflicts
drop function if exists match_memories;
drop table if exists memory_items cascade;
drop table if exists user_profile cascade;

-- 2. Re-create User Profile Table
create table user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text default 'ar',
  tone text default 'helpful',
  format_prefs jsonb default '{}'::jsonb,
  constraints jsonb default '{}'::jsonb,
  memory_opt_in boolean default true,
  updated_at timestamptz default now()
);

-- 3. Re-create Memory Items Table (WITH content_hash)
create table memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text check (type in ('fact', 'preference', 'decision', 'conversation_summary', 'summary')),
  text text not null,
  tags text[],
  importance float default 1.0,
  embedding vector(1536),
  content_hash text, -- Critical for deduplication
  created_at timestamptz default now(),
  last_used_at timestamptz default now(),
  
  -- Add Constraint Immediately
  constraint unique_memory_content unique (user_id, content_hash)
);

-- 4. Re-create Vector Search Function (RPC)
create or replace function match_memories (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  text text,
  type text,
  similarity float,
  importance float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    memory_items.id,
    memory_items.text,
    memory_items.type,
    1 - (memory_items.embedding <=> query_embedding) as similarity,
    memory_items.importance,
    memory_items.created_at
  from memory_items
  where 1 - (memory_items.embedding <=> query_embedding) > match_threshold
  and memory_items.user_id = p_user_id
  order by (1 - (memory_items.embedding <=> query_embedding)) * memory_items.importance desc
  limit match_count;
end;
$$;

-- 5. Enable RLS (Security Policies)
alter table user_profile enable row level security;
alter table memory_items enable row level security;

-- Profile Policies
create policy "Users can view their own profile" on user_profile for select using (auth.uid() = user_id);
create policy "Users can update their own profile" on user_profile for update using (auth.uid() = user_id);
create policy "Users can insert their own profile" on user_profile for insert with check (auth.uid() = user_id);

-- Memory Items Policies
create policy "Users can view their own memories" on memory_items for select using (auth.uid() = user_id);
create policy "Users can insert their own memories" on memory_items for insert with check (auth.uid() = user_id);
create policy "Users can update their own memories" on memory_items for update using (auth.uid() = user_id);
create policy "Users can delete their own memories" on memory_items for delete using (auth.uid() = user_id);

-- Done!
