-- Scalable Memory Architecture Migration
-- 2025-02-20

-- 1. CLEANUP (Optional: Remove old experimental tables if desired, or keep them)
-- We strictly follow the new schema for the "Production Grade" system.
drop table if exists user_memory cascade;
drop table if exists conversation_summaries cascade;
-- We will reuse/upgrade memory_items if it exists, or drop and recreate to match spec.
drop table if exists memory_items cascade;

-- 2. PROFILE MEMORY (Single JSON blob per user, highly cached)
create table user_memory (
  user_id uuid primary key references auth.users(id) on delete cascade,
  profile_json jsonb default '{"facts": [], "preferences": {}, "constraints": []}'::jsonb,
  updated_at timestamptz default now()
);

-- 3. CONVERSATION SUMMARIES (Episodic Memory)
create table conversation_summaries (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references chats(id) on delete cascade,
  summary_text text not null,
  embedding vector(1536), -- For semantic retrieval of past conversations
  created_at timestamptz default now()
);

-- 4. MEMORY ITEMS (Semantic Memory - Granular)
create table memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text check (type in ('fact', 'preference', 'constraint', 'decision')),
  text text not null,
  embedding vector(1536),
  weight float default 1.0, -- For decay/importance
  created_at timestamptz default now(),
  metadata jsonb default '{}'::jsonb
);

-- 5. INDEXES (Critical for Performance)
-- Profile: Lookup by user_id is PK (fast).

-- Summaries:
create index idx_summaries_conversation_id on conversation_summaries(conversation_id);
create index idx_summaries_embedding on conversation_summaries using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- Memory Items:
create index idx_memory_items_user_id on memory_items(user_id);
create index idx_memory_items_embedding on memory_items using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- 6. RPC: Semantic Search for Summaries
create or replace function match_conversation_summaries (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_conversation_id uuid
)
returns table (
  id uuid,
  summary_text text,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    cs.id,
    cs.summary_text,
    1 - (cs.embedding <=> query_embedding) as similarity,
    cs.created_at
  from conversation_summaries cs
  where 1 - (cs.embedding <=> query_embedding) > match_threshold
  and cs.conversation_id = filter_conversation_id
  order by similarity desc
  limit match_count;
end;
$$;

-- 7. RPC: Semantic Search for Memory Items
create or replace function match_memory_items (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  type text,
  text text,
  weight float,
  similarity float,
  created_at timestamptz
)
language plpgsql
as $$
begin
  return query
  select
    mi.id,
    mi.type,
    mi.text,
    mi.weight,
    1 - (mi.embedding <=> query_embedding) as similarity,
    mi.created_at
  from memory_items mi
  where 1 - (mi.embedding <=> query_embedding) > match_threshold
  and mi.user_id = p_user_id
  order by (1 - (mi.embedding <=> query_embedding)) * mi.weight desc
  limit match_count;
end;
$$;
