-- ⚠️ MEMORY INFRASTRUCTURE V3: PRIVATE MEMORY ARCHITECTURE ⚠️
-- Adds the 'messages' table for raw logging and ensures all memory components are synced.

-- 1. Messages Table (Raw Archive)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chat_id uuid, -- Optional: to group messages into conversations
  role text check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb default '{}'::jsonb, -- Store intents, entities, or model params
  created_at timestamptz default now()
);

-- Enable RLS for messages
alter table messages enable row level security;
create policy "Users can view their own messages" on messages for select using (auth.uid() = user_id);
create policy "Users can insert their own messages" on messages for insert with check (auth.uid() = user_id);

-- 2. Ensure memory_items has the correct schema for 'summary' type
-- (Already in FINAL_RESET, but ensuring consistency)
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'memory_items' and column_name = 'content_hash') then
    alter table memory_items add column content_hash text;
  end if;
end $$;

-- 3. Update match_memories to prioritize recent summaries and high importance
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
  order by 
    (case when memory_items.type = 'summary' then 1.2 else 1.0 end) * -- Boost summaries
    (1 - (memory_items.embedding <=> query_embedding)) * 
    memory_items.importance desc
  limit match_count;
end;
$$;
