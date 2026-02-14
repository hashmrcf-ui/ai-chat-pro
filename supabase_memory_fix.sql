-- Run this SQL in your Supabase SQL Editor to ensure the memory system is configured correctly.

-- 1. Create the user_memories table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    importance INTEGER DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE user_memories ENABLE ROW LEVEL SECURITY;

-- 3. Create policies (Ignore errors if they already exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_memories' AND policyname = 'Users can view their own memories'
    ) THEN
        CREATE POLICY "Users can view their own memories"
            ON user_memories FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_memories' AND policyname = 'Users can insert their own memories'
    ) THEN
        CREATE POLICY "Users can insert their own memories"
            ON user_memories FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. Enable Realtime (optional but helpful for the sidebar)
ALTER PUBLICATION supabase_realtime ADD TABLE user_memories;
