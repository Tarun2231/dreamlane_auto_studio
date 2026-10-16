import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "https://zjhlvmssrpcawajhfpfg.supabase.co";

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "sb_publishable_VU8pJ3utws5oeU8meFcAHg_bstYju59";

let cachedClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient;
  if (!supabaseUrl || !supabaseKey) {
    console.warn("[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  cachedClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: typeof window !== "undefined",
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return cachedClient;
}

export const supabase = getSupabase();

export interface DbService {
  id: string;
  name: string;
  description: string;
  image: string;
  base_price: number;
  duration: number;
  follow_up_months?: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbBooking {
  id: string;
  user_id?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  vehicle_type: "Hatchback" | "Sedan" | "SUV" | string;
  date: string;
  time: string;
  status: "Pending" | "In Progress" | "Completed" | "Cancelled" | string;
  customer_name: string;
  phone: string;
  email: string;
  car_make?: string | null;
  car_model: string;
  registration_number?: string | null;
  chassis_number?: string | null;
  vehicle_year?: number | null;
  final_amount: number;
  payment_method?: string | null;
  payment_reference?: string | null;
  payment_received_ymd?: string | null;
  payment_status: "unpaid" | "partial" | "paid" | "waived" | string;
  created_at: string;
  updated_at: string;
}

export interface DbQuoteRequest {
  id: string;
  request_kind: "enquiry" | "quotation" | string;
  customer_name: string;
  email: string;
  phone: string;
  vehicle_hint?: string | null;
  vehicle_type?: "Hatchback" | "Sedan" | "SUV" | string | null;
  car_make?: string | null;
  car_model?: string | null;
  vehicle_year?: number | null;
  service_id?: string | null;
  service_name_snapshot?: string | null;
  service_description?: string | null;
  parts_notes?: string | null;
  status: "Submitted" | "Pending" | "Quoted" | "Accepted" | "Declined" | "Closed" | string;
  quoted_amount?: number | null;
  quote_notes?: string | null;
  quoted_at?: string | null;
  enquiry_topic?: string | null;
  preferred_contact: "email" | "phone" | "either" | string;
  urgency: "routine" | "soon" | "urgent" | string;
  messages?: any[];
  last_thread_activity_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbShopProduct {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  product_group: "machine" | "accessory" | "other" | string;
  category: string;
  image?: string | null;
  base_price: number;
  discount_percent: number;
  stock?: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface DbShopOrder {
  id: string;
  order_number: string;
  order_date_ymd: string;
  customer_name: string;
  email: string;
  phone: string;
  address?: string | null;
  customer_note?: string | null;
  items: any[];
  subtotal_list_inr: number;
  discount_inr: number;
  total_inr: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled" | string;
  created_at: string;
  updated_at: string;
}

export interface DbReview {
  id: string;
  booking_id?: string | null;
  quote: string;
  author_display: string;
  context?: string | null;
  rating?: number | null;
  status: "pending" | "approved" | "rejected" | string;
  created_at: string;
  updated_at: string;
}

export interface DbSlot {
  id: string;
  date: string;
  time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbEmployee {
  id: string;
  full_name: string;
  name?: string | null;
  phone: string;
  email?: string | null;
  role_title?: string | null;
  joined_on?: string | null;
  details?: string | null;
  notes?: string | null;
  monthly_salary_inr: number;
  salary_ledger?: any[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
