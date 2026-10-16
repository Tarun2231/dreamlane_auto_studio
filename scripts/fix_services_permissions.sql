-- ============================================================================
-- SUPABASE FIX: TABLE PERMISSIONS & SERVICES ROW LEVEL SECURITY (RLS)
-- Run this in the Supabase Dashboard -> SQL Editor -> Run
-- ============================================================================

-- 1. Grant table access to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- 2. Ensure RLS is enabled
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_products ENABLE ROW LEVEL SECURITY;

-- 3. Services RLS policies (Backend API authenticates admin JWT before modifying)
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

-- 4. Shop Products RLS policies
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
