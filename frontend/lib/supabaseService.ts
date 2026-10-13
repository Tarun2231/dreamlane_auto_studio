import { supabase, DbService, DbBooking, DbQuoteRequest, DbShopProduct, DbShopOrder, DbReview, DbSlot } from "./supabase";

/**
 * Service Catalogue Helpers
 */
export async function getServicesFromSupabase(): Promise<DbService[] | null> {
  try {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("base_price", { ascending: true });

    if (error) {
      console.warn("[supabase] getServices error:", error.message);
      return null;
    }
    return data as DbService[];
  } catch (err: any) {
    console.warn("[supabase] getServices exception:", err?.message || err);
    return null;
  }
}

/**
 * Booking Submission Helper
 */
export async function createBookingInSupabase(booking: {
  service_id?: string;
  service_name?: string;
  vehicle_type: string;
  date: string;
  time: string;
  customer_name: string;
  phone: string;
  email: string;
  car_make?: string;
  car_model: string;
  registration_number?: string;
  chassis_number?: string;
  vehicle_year?: number;
  final_amount?: number;
}): Promise<{ success: boolean; data?: DbBooking; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          service_id: booking.service_id || null,
          service_name: booking.service_name || "",
          vehicle_type: booking.vehicle_type,
          date: booking.date,
          time: booking.time,
          customer_name: booking.customer_name,
          phone: booking.phone,
          email: booking.email,
          car_make: booking.car_make || "",
          car_model: booking.car_model,
          registration_number: booking.registration_number || "",
          chassis_number: booking.chassis_number || "",
          vehicle_year: booking.vehicle_year || null,
          final_amount: booking.final_amount || 0,
          status: "Pending",
          payment_status: "unpaid",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DbBooking };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit booking" };
  }
}

/**
 * Quote Request Helper
 */
export async function createQuoteInSupabase(quote: {
  request_kind?: string;
  customer_name: string;
  email: string;
  phone: string;
  vehicle_type?: string;
  car_make?: string;
  car_model?: string;
  vehicle_year?: number;
  service_id?: string;
  service_name_snapshot?: string;
  service_description?: string;
  parts_notes?: string;
  enquiry_topic?: string;
  preferred_contact?: string;
  urgency?: string;
}): Promise<{ success: boolean; data?: DbQuoteRequest; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("quotes")
      .insert([
        {
          request_kind: quote.request_kind || "quotation",
          customer_name: quote.customer_name,
          email: quote.email,
          phone: quote.phone,
          vehicle_type: quote.vehicle_type || null,
          car_make: quote.car_make || "",
          car_model: quote.car_model || "",
          vehicle_year: quote.vehicle_year || null,
          service_id: quote.service_id || null,
          service_name_snapshot: quote.service_name_snapshot || "",
          service_description: quote.service_description || "",
          parts_notes: quote.parts_notes || "",
          enquiry_topic: quote.enquiry_topic || "",
          preferred_contact: quote.preferred_contact || "either",
          urgency: quote.urgency || "routine",
          status: "Submitted",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DbQuoteRequest };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to submit quote request" };
  }
}

/**
 * Shop Products Helper
 */
export async function getShopProductsFromSupabase(): Promise<DbShopProduct[] | null> {
  try {
    const { data, error } = await supabase
      .from("shop_products")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: false });

    if (error) {
      console.warn("[supabase] getShopProducts error:", error.message);
      return null;
    }
    return data as DbShopProduct[];
  } catch (err: any) {
    console.warn("[supabase] getShopProducts exception:", err?.message || err);
    return null;
  }
}

/**
 * Shop Order Placement Helper
 */
export async function createShopOrderInSupabase(order: {
  order_number: string;
  order_date_ymd: string;
  customer_name: string;
  email: string;
  phone: string;
  address?: string;
  customer_note?: string;
  items: any[];
  subtotal_list_inr: number;
  discount_inr: number;
  total_inr: number;
}): Promise<{ success: boolean; data?: DbShopOrder; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("shop_orders")
      .insert([
        {
          order_number: order.order_number,
          order_date_ymd: order.order_date_ymd,
          customer_name: order.customer_name,
          email: order.email,
          phone: order.phone,
          address: order.address || "",
          customer_note: order.customer_note || "",
          items: order.items,
          subtotal_list_inr: order.subtotal_list_inr,
          discount_inr: order.discount_inr,
          total_inr: order.total_inr,
          status: "pending",
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data: data as DbShopOrder };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to place shop order" };
  }
}

/**
 * Approved Customer Reviews Helper
 */
export async function getApprovedReviewsFromSupabase(): Promise<DbReview[] | null> {
  try {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[supabase] getApprovedReviews error:", error.message);
      return null;
    }
    return data as DbReview[];
  } catch (err: any) {
    console.warn("[supabase] getApprovedReviews exception:", err?.message || err);
    return null;
  }
}

/**
 * Calendar Slots Helper
 */
export async function getSlotsFromSupabase(date: string): Promise<DbSlot[] | null> {
  try {
    const { data, error } = await supabase
      .from("slots")
      .select("*")
      .eq("date", date)
      .eq("is_available", true);

    if (error) {
      console.warn("[supabase] getSlots error:", error.message);
      return null;
    }
    return data as DbSlot[];
  } catch (err: any) {
    console.warn("[supabase] getSlots exception:", err?.message || err);
    return null;
  }
}
