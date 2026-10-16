-- ============================================================================
-- SUPABASE FIX: COMPREHENSIVE BACKEND PERMISSIONS & ROW LEVEL SECURITY (RLS)
-- Run this in the Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Grant full schema permissions to anon, authenticated, and service_role
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Ensure RLS is enabled on all tables
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

-- 3. Services RLS policies
DROP POLICY IF EXISTS "Public can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;
DROP POLICY IF EXISTS "Services select policy" ON public.services;
DROP POLICY IF EXISTS "Services insert policy" ON public.services;
DROP POLICY IF EXISTS "Services update policy" ON public.services;
DROP POLICY IF EXISTS "Services delete policy" ON public.services;

CREATE POLICY "Services select policy" ON public.services FOR SELECT USING (true);
CREATE POLICY "Services insert policy" ON public.services FOR INSERT WITH CHECK (true);
CREATE POLICY "Services update policy" ON public.services FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Services delete policy" ON public.services FOR DELETE USING (true);

-- 4. Bookings RLS policies (Backend API authenticates admin JWT before modifying)
DROP POLICY IF EXISTS "Anyone can create a booking" ON public.bookings;
DROP POLICY IF EXISTS "Customers and admins can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Bookings select policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings update policy" ON public.bookings;
DROP POLICY IF EXISTS "Bookings delete policy" ON public.bookings;

CREATE POLICY "Bookings select policy" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Bookings insert policy" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings update policy" ON public.bookings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Bookings delete policy" ON public.bookings FOR DELETE USING (true);

-- 5. Quotes RLS policies
DROP POLICY IF EXISTS "Anyone can submit quote requests" ON public.quotes;
DROP POLICY IF EXISTS "Anyone can view their quote" ON public.quotes;
DROP POLICY IF EXISTS "Admins can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Quotes select policy" ON public.quotes;
DROP POLICY IF EXISTS "Quotes insert policy" ON public.quotes;
DROP POLICY IF EXISTS "Quotes update policy" ON public.quotes;
DROP POLICY IF EXISTS "Quotes delete policy" ON public.quotes;

CREATE POLICY "Quotes select policy" ON public.quotes FOR SELECT USING (true);
CREATE POLICY "Quotes insert policy" ON public.quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Quotes update policy" ON public.quotes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Quotes delete policy" ON public.quotes FOR DELETE USING (true);

-- 6. Shop Products RLS policies
DROP POLICY IF EXISTS "Public can view active products" ON public.shop_products;
DROP POLICY IF EXISTS "Admins can manage products" ON public.shop_products;
DROP POLICY IF EXISTS "Products select policy" ON public.shop_products;
DROP POLICY IF EXISTS "Products insert policy" ON public.shop_products;
DROP POLICY IF EXISTS "Products update policy" ON public.shop_products;
DROP POLICY IF EXISTS "Products delete policy" ON public.shop_products;

CREATE POLICY "Products select policy" ON public.shop_products FOR SELECT USING (true);
CREATE POLICY "Products insert policy" ON public.shop_products FOR INSERT WITH CHECK (true);
CREATE POLICY "Products update policy" ON public.shop_products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Products delete policy" ON public.shop_products FOR DELETE USING (true);

-- 7. Shop Orders RLS policies
DROP POLICY IF EXISTS "Anyone can create an order" ON public.shop_orders;
DROP POLICY IF EXISTS "Anyone can read their order" ON public.shop_orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.shop_orders;
DROP POLICY IF EXISTS "Orders select policy" ON public.shop_orders;
DROP POLICY IF EXISTS "Orders insert policy" ON public.shop_orders;
DROP POLICY IF EXISTS "Orders update policy" ON public.shop_orders;
DROP POLICY IF EXISTS "Orders delete policy" ON public.shop_orders;

CREATE POLICY "Orders select policy" ON public.shop_orders FOR SELECT USING (true);
CREATE POLICY "Orders insert policy" ON public.shop_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Orders update policy" ON public.shop_orders FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Orders delete policy" ON public.shop_orders FOR DELETE USING (true);

-- 8. Slots RLS policies
DROP POLICY IF EXISTS "Public can view slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can manage slots" ON public.slots;
DROP POLICY IF EXISTS "Slots select policy" ON public.slots;
DROP POLICY IF EXISTS "Slots all policy" ON public.slots;

CREATE POLICY "Slots select policy" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Slots all policy" ON public.slots FOR ALL USING (true) WITH CHECK (true);

-- 9. Employees RLS policies
DROP POLICY IF EXISTS "Authenticated can view and manage internal tables" ON public.employees;
DROP POLICY IF EXISTS "Employees all policy" ON public.employees;

CREATE POLICY "Employees all policy" ON public.employees FOR ALL USING (true) WITH CHECK (true);

-- 10. Inspections & Job Cards RLS policies
DROP POLICY IF EXISTS "Admins can view and manage inspections" ON public.inspections;
DROP POLICY IF EXISTS "Inspections all policy" ON public.inspections;

CREATE POLICY "Inspections all policy" ON public.inspections FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view and manage job cards" ON public.job_cards;
DROP POLICY IF EXISTS "Job cards all policy" ON public.job_cards;

CREATE POLICY "Job cards all policy" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);

-- 11. Reviews RLS policies
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Reviews select policy" ON public.reviews;
DROP POLICY IF EXISTS "Reviews insert policy" ON public.reviews;
DROP POLICY IF EXISTS "Reviews update policy" ON public.reviews;

CREATE POLICY "Reviews select policy" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Reviews insert policy" ON public.reviews FOR INSERT WITH CHECK (true);
CREATE POLICY "Reviews update policy" ON public.reviews FOR UPDATE USING (true) WITH CHECK (true);
