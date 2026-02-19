-- FIX MIGRATION: Update memory_items table to include content_hash

-- 1. Add content_hash column if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'memory_items' and column_name = 'content_hash') then
    alter table memory_items add column content_hash text;
  end if;
end $$;

-- 2. Add Unique Constraint (Safe Upsert Support)
-- First drop if exists to ensure we can recreate
alter table memory_items drop constraint if exists unique_memory_content;

-- Optional: Populate content_hash for existing items to avoid violation if needed. 
-- For now, we assume table is empty or we don't care about old rows deduplication strictly yet.
-- But if we have duplicates, adding unique constraint will fail.
-- Let's TRUNCATE memory_items if it's dev data to ensure clean state, OR advise user.
-- Safest is just to try adding constraint. If it fails due to duplicates, user should clear table.
-- We will proceed with adding constraint.
alter table memory_items add constraint unique_memory_content unique (user_id, content_hash);


-- 3. Replace Vector Search Function to match new schema and logic
drop function if exists match_memories;

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
