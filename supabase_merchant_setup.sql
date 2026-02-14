-- 1. Update stores table to link with a user (Owner) and add website link
ALTER TABLE stores ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS website_url TEXT;

-- 2. Create products table for Merchant Catalog
CREATE TABLE IF NOT EXISTS store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add 'role' to users or use a metadata check for 'merchant' status
-- (Assuming we might want a 'user_roles' table or just an app_metadata check)

-- 4. Enable RLS (Row Level Security) so only owners can edit their products
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can manage their own products" 
ON store_products 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM stores 
        WHERE stores.id = store_products.store_id 
        AND stores.owner_id = auth.uid()
    )
);

CREATE POLICY "Public can view products" 
ON store_products 
FOR SELECT 
USING (true);
