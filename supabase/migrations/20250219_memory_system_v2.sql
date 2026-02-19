-- Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 1. User Profile Table
create table if not exists user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  language text default 'ar',
  tone text default 'helpful', -- helpful, concise, formal, friendly
  format_prefs jsonb default '{}'::jsonb, -- e.g. {"code_style": "typescript", "use_emojis": true}
  constraints jsonb default '{}'::jsonb, -- e.g. {"avoid_politics": true}
  memory_opt_in boolean default true,
  updated_at timestamptz default now()
);

-- 2. Memory Items Table (Vector Store)
create table if not exists memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text check (type in ('fact', 'preference', 'decision', 'conversation_summary', 'summary')),
  text text not null,
  tags text[],
  importance float default 1.0, -- 1.0 to 10.0
  embedding vector(1536), -- Standard OpenAI text-embedding-3-small dimension
  content_hash text, -- HASH for deduplication
  created_at timestamptz default now(),
  last_used_at timestamptz default now()
);

-- Create Unique Constraint for Deduplication (Upsert)
alter table memory_items
add constraint unique_memory_content unique (user_id, content_hash);


-- 3. Vector Similarity Search Function (RPC)
-- This function allows us to match user memories based on vector similarity
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
  importance float, -- Return importance for sorting
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

-- 4. Enable RLS (Row Level Security)
alter table user_profile enable row level security;
alter table memory_items enable row level security;

-- Policies for user_profile
create policy "Users can view their own profile"
on user_profile for select
using (auth.uid() = user_id);

create policy "Users can update their own profile"
on user_profile for update
using (auth.uid() = user_id);

create policy "Users can insert their own profile"
on user_profile for insert
with check (auth.uid() = user_id);

-- Policies for memory_items
create policy "Users can view their own memories"
on memory_items for select
using (auth.uid() = user_id);

create policy "Users can insert their own memories"
on memory_items for insert
with check (auth.uid() = user_id);

create policy "Users can update their own memories"
on memory_items for update
using (auth.uid() = user_id);

create policy "Users can delete their own memories"
on memory_items for delete
using (auth.uid() = user_id);
