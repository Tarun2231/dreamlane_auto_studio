-- ============================================================================
-- DREAMLANE AUTO STUDIO / BLACKLANE AUTO STUDIO - SUPABASE POSTGRESQL SCHEMA
-- Migration: scripts/supabase_schema.sql
-- Run this in the Supabase Dashboard -> SQL Editor (New query) -> Run
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SERVICES CATALOG
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT NOT NULL DEFAULT '',
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 60,
    follow_up_months INTEGER DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

-- 2. BOOKINGS
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID DEFAULT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name TEXT DEFAULT '',
    vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Hatchback', 'Sedan', 'SUV')),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Completed', 'Cancelled')),
    customer_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    car_make TEXT DEFAULT '',
    car_model TEXT NOT NULL,
    registration_number TEXT DEFAULT '',
    chassis_number TEXT DEFAULT '',
    vehicle_year INTEGER DEFAULT NULL,
    final_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT '',
    payment_reference TEXT DEFAULT '',
    payment_received_ymd TEXT DEFAULT '',
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'waived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(date);
CREATE INDEX IF NOT EXISTS idx_bookings_phone ON public.bookings(phone);
CREATE INDEX IF NOT EXISTS idx_bookings_email ON public.bookings(email);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- 3. QUOTES & QUICK ENQUIRIES
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_kind TEXT NOT NULL DEFAULT 'quotation' CHECK (request_kind IN ('enquiry', 'quotation')),
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_hint TEXT DEFAULT '',
    vehicle_type TEXT DEFAULT NULL CHECK (vehicle_type IS NULL OR vehicle_type IN ('Hatchback', 'Sedan', 'SUV')),
    car_make TEXT DEFAULT '',
    car_model TEXT DEFAULT '',
    vehicle_year INTEGER DEFAULT NULL,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_name_snapshot TEXT DEFAULT '',
    service_description TEXT DEFAULT '',
    parts_notes TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Pending', 'Quoted', 'Accepted', 'Declined', 'Closed')),
    quoted_amount NUMERIC(10,2) DEFAULT NULL,
    quote_notes TEXT DEFAULT '',
    quoted_at TIMESTAMPTZ DEFAULT NULL,
    enquiry_topic TEXT DEFAULT '',
    preferred_contact TEXT DEFAULT 'either' CHECK (preferred_contact IN ('email', 'phone', 'either')),
    urgency TEXT DEFAULT 'routine' CHECK (urgency IN ('routine', 'soon', 'urgent')),
    messages JSONB DEFAULT '[]'::jsonb,
    last_thread_activity_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_quotes_phone ON public.quotes(phone);
CREATE INDEX IF NOT EXISTS idx_quotes_email ON public.quotes(email);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);

-- 4. SHOP PRODUCTS
CREATE TABLE IF NOT EXISTS public.shop_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    product_group TEXT NOT NULL DEFAULT 'accessory' CHECK (product_group IN ('machine', 'accessory', 'other')),
    category TEXT NOT NULL DEFAULT 'General',
    image TEXT DEFAULT '',
    base_price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (base_price >= 0),
    discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
    stock INTEGER DEFAULT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_shop_products_slug ON public.shop_products(slug);
CREATE INDEX IF NOT EXISTS idx_shop_products_active_sort ON public.shop_products(is_active, sort_order DESC, created_at DESC);

-- 5. SHOP ORDERS
CREATE TABLE IF NOT EXISTS public.shop_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    order_date_ymd TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT DEFAULT '',
    customer_note TEXT DEFAULT '',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal_list_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'fulfilled', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_shop_orders_order_number ON public.shop_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_shop_orders_created_at ON public.shop_orders(created_at DESC);

-- 6. REVIEWS
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    quote TEXT NOT NULL,
    author_display TEXT NOT NULL,
    context TEXT DEFAULT '',
    rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

-- 7. SLOTS
CREATE TABLE IF NOT EXISTS public.slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_slot_datetime UNIQUE (date, time)
);
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);

-- 8. EMPLOYEES
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    name TEXT DEFAULT '',
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    role_title TEXT DEFAULT '',
    joined_on TEXT DEFAULT '',
    details TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    monthly_salary_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    salary_ledger JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. INSPECTIONS
CREATE TABLE IF NOT EXISTS public.inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    before_images JSONB DEFAULT '[]'::jsonb,
    after_images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. JOB CARDS
CREATE TABLE IF NOT EXISTS public.job_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
    services_done TEXT[] DEFAULT ARRAY[]::TEXT[],
    parts_used TEXT[] DEFAULT ARRAY[]::TEXT[],
    extra_charges NUMERIC(10,2) NOT NULL DEFAULT 0,
    parts_cost_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    misc_costs_inr NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. TEST RECORDS
CREATE TABLE IF NOT EXISTS public.test_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_records ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
CREATE POLICY "Public can view active services" ON public.services FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
CREATE POLICY "Admins can manage services" ON public.services FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view active products" ON public.shop_products;
CREATE POLICY "Public can view active products" ON public.shop_products FOR SELECT USING (is_active = true OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can manage products" ON public.shop_products;
CREATE POLICY "Admins can manage products" ON public.shop_products FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;
CREATE POLICY "Anyone can create a booking" ON public.bookings FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Customers and admins can view bookings" ON public.bookings;
CREATE POLICY "Customers and admins can view bookings" ON public.bookings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can submit quote requests" ON public.quotes;
CREATE POLICY "Anyone can submit quote requests" ON public.quotes FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view their quote" ON public.quotes;
CREATE POLICY "Anyone can view their quote" ON public.quotes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
CREATE POLICY "Admins can update quotes" ON public.quotes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can create an order" ON public.shop_orders;
CREATE POLICY "Anyone can create an order" ON public.shop_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can read their order" ON public.shop_orders;
CREATE POLICY "Anyone can read their order" ON public.shop_orders FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update orders" ON public.shop_orders;
CREATE POLICY "Admins can update orders" ON public.shop_orders FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews" ON public.reviews FOR SELECT USING (status = 'approved' OR auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Customers can submit reviews" ON public.reviews;
CREATE POLICY "Customers can submit reviews" ON public.reviews FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public can view slots" ON public.slots;
CREATE POLICY "Public can view slots" ON public.slots FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage slots" ON public.slots;
CREATE POLICY "Admins can manage slots" ON public.slots FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated can view and manage internal tables" ON public.employees;
CREATE POLICY "Authenticated can view and manage internal tables" ON public.employees FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins can view and manage inspections" ON public.inspections;
CREATE POLICY "Admins can view and manage inspections" ON public.inspections FOR ALL USING (true);

DROP POLICY IF EXISTS "Admins can view and manage job cards" ON public.job_cards;
CREATE POLICY "Admins can view and manage job cards" ON public.job_cards FOR ALL USING (true);

DROP POLICY IF EXISTS "Public can perform test operations" ON public.test_records;
CREATE POLICY "Public can perform test operations" ON public.test_records FOR ALL USING (true) WITH CHECK (true);

-- Seed Services
INSERT INTO public.services (name, description, image, base_price, duration, follow_up_months, is_active)
VALUES
    ('Signature Foam Wash & Interior Detail', 'Deep exterior snow foam bath, wheel & barrel decontamination, plush drying, vacuum, and interior dashboard dressing.', 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80', 1499.00, 60, 3, TRUE),
    ('Multi-Stage Paint Correction', 'High-grade rotary and dual action polishing removing 85-95% of swirl marks, light scratches, and oxidation.', 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80', 6999.00, 180, 12, TRUE),
    ('Graphene 9H Ceramic Coating', 'Ultra-durable 9H nano ceramic + graphene coating providing up to 3 years of hydrophobic protection and extreme gloss.', 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1200&q=80', 14999.00, 360, 12, TRUE),
    ('Interior Deep Spa & Leather Sanitization', 'Hot water extraction for upholstery and carpets, leather deep cleaning & conditioning, steam disinfection, and anti-bacterial AC fogging.', 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=1200&q=80', 3499.00, 120, 6, TRUE)
ON CONFLICT DO NOTHING;

-- Seed Shop Products
INSERT INTO public.shop_products (name, slug, description, product_group, category, image, base_price, discount_percent, stock, is_active, sort_order)
VALUES
    ('Dreamlane HydroGraphene Detail Spray (500ml)', 'hydro-graphene-detail-spray-500ml', 'Advanced spray sealant with real graphene oxide. Delivers slickness, high contact angle water beading, and UV protection.', 'accessory', 'Protection', 'https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=800&q=80', 899.00, 10, 45, TRUE, 10),
    ('pH Neutral Ultra Snow Foam Shampoo (1L)', 'ph-neutral-ultra-snow-foam-1l', 'High-lubricity formula engineered for ceramic coated and PPF-wrapped cars. Removes road grime without stripping existing wax or sealants.', 'accessory', 'Car Wash', 'https://images.unsplash.com/photo-1607860108855-64acf2078ed9?auto=format&fit=crop&w=800&q=80', 649.00, 0, 80, TRUE, 9),
    ('Dual-Plush Korean Microfiber Towel Set (Pack of 3)', 'dual-plush-microfiber-towel-pack-3', '1000 GSM edgeless microfiber towels crafted for scratch-free buffing, quick detailers, and drying delicate clear coats.', 'accessory', 'Accessories', 'https://images.unsplash.com/photo-1527264935190-14015d729abe?auto=format&fit=crop&w=800&q=80', 549.00, 15, 120, TRUE, 8),
    ('Commercial Ceramic Wash Bay Pressure Washer 2200W', 'commercial-ceramic-wash-bay-pressure-washer', 'Professional-grade auto studio induction pressure pump with quick-connect brass fittings and snow foam cannon.', 'machine', 'Equipment', 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80', 24999.00, 5, 6, TRUE, 7)
ON CONFLICT (slug) DO NOTHING;
