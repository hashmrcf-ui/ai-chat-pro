-- SQL Migration for Shopping Feature

-- 1. Stores Table
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    contact_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fake Customers Table (For simulation)
CREATE TABLE IF NOT EXISTS fake_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS shopping_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES auth.users(id), -- Real user
    fake_customer_id UUID REFERENCES fake_customers(id), -- Simulated user
    store_id UUID REFERENCES stores(id),
    product_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, sent, delivered
    distance_km DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Sample Data (Seed)
INSERT INTO stores (name, address, latitude, longitude, contact_info) VALUES
('متجر السعادة - صنعاء', 'شارع حده', 15.3236, 44.1923, '01-234567'),
('نجمة عدن', 'كريتر', 12.7855, 45.0184, '02-345678'),
('مول تعز الدولي', 'شارع جمال', 13.5786, 44.0135, '04-987654');

INSERT INTO fake_customers (full_name, latitude, longitude) VALUES
('أحمد علي', 15.3300, 44.2000), -- Close to Sanaa
('منى صالح', 12.7900, 45.0200); -- Close to Aden
