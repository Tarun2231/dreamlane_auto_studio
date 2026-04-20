export type QuoteMessage = {
  _id?: string;
  role: "customer" | "admin";
  body: string;
  attachments?: Array<{
    kind: "image" | "pdf";
    url: string;
    name?: string;
    sizeBytes?: number;
    mimeType?: string;
  }>;
  createdAt?: string;
  adminLabel?: string;
};

export type QuoteRequest = {
  _id: string;
  /** Homepage quick form vs full Get quote flow. */
  requestKind?: "enquiry" | "quotation";
  customerName: string;
  email: string;
  phone: string;
  /** Legacy one-liner when structured vehicle fields were not stored. */
  vehicleHint?: string;
  vehicleType?: string;
  carMake?: string;
  carModel?: string;
  vehicleYear?: number;
  serviceId?: string | Service | null;
  serviceNameSnapshot?: string;
  /** Extra notes for a package, or full text for custom work. */
  serviceDescription: string;
  partsNotes: string;
  status: "Submitted" | "Pending" | "Quoted" | "Accepted" | "Declined" | "Closed";
  quotedAmount?: number;
  quoteNotes: string;
  quotedAt?: string;
  /** Quick enquiry fields (homepage / optional). */
  enquiryTopic?: string;
  preferredContact?: "email" | "phone" | "either";
  urgency?: "routine" | "soon" | "urgent";
  messages?: QuoteMessage[];
  lastThreadActivityAt?: string;
  /** Present on admin list response (messages array omitted). */
  messageCount?: number;
  /** True when latest message came from customer. */
  hasUnreadCustomerMessage?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type Service = {
  _id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  duration: number;
  /** Months until next suggested visit (e.g. 12). Used for automated reminders. */
  followUpMonths?: number | null;
};

export type Slot = {
  _id: string;
  date: string;
  time: string;
  isAvailable: boolean;
};

export type CustomerHistoryBooking = {
  _id: string;
  date: string;
  time: string;
  status: string;
  vehicleType: string;
  /** Manufacturer / brand (e.g. Hyundai). */
  carMake?: string;
  carModel: string;
  /** Chassis number as on RC (parts lookup). */
  chassisNumber?: string;
  /** @deprecated Legacy bookings only. */
  registrationNumber?: string;
  /** Model year (e.g. 2022). */
  vehicleYear?: number;
  finalAmount?: number;
  paymentMethod?: string;
  paymentReference?: string;
  paymentReceivedYmd?: string;
  paymentStatus?: "unpaid" | "partial" | "paid" | "waived" | string;
  service: { _id: string; name: string; followUpMonths: number | null } | null;
};

/** Job sheet / workshop record linked to a booking (admin detail). */
export type JobCardRecord = {
  servicesDone: string[];
  partsUsed: string[];
  extraCharges: number;
  partsCostInr: number;
  miscCostsInr: number;
  notes: string;
};

export type AdminBookingDetailResponse = {
  booking: Booking;
  jobCard: JobCardRecord | null;
};

export type CustomerDirectoryEntry = {
  email: string;
  emailNorm: string;
  customerName: string;
  phone: string;
  bookings: CustomerHistoryBooking[];
  lastServiceDate: string;
  nextServiceDueDate: string | null;
  reminderAnchor: {
    bookingId: string;
    servicedOn: string;
    serviceName: string;
    followUpMonths: number;
  } | null;
  reminderDueToday: boolean;
  reminderOverdue: boolean;
};

/** Admin fleet snapshot: distinct vehicles + recent activity (GET /admin/cars). */
export type FleetRecentRow = {
  source: "booking" | "quote";
  vehicleType?: string;
  carMake?: string;
  carModel?: string;
  vehicleYear?: number;
  lastCustomerName: string;
  lastActivityLabel: string;
  refId: string;
  quoteStatus: string | null;
};

export type FleetSnapshot = {
  stats: {
    distinctFromBookings: number;
    distinctFromQuotes: number;
    distinctUnion: number;
  };
  recent: FleetRecentRow[];
};

/** GET /admin/login-history */
export type AdminLoginHistoryItem = {
  id: string;
  at: string;
  email: string;
  name: string;
  ip: string;
  locationLabel: string;
  userAgent: string;
  isoUtc: string;
  timezoneLine: string;
};

/** GET /admin/quote-stats */
export type AdminQuoteStats = {
  submitted: number;
  pending: number;
  quoted: number;
  accepted: number;
  declined: number;
  closed: number;
  total: number;
};

export type AdminNotificationItem = {
  id: string;
  kind:
    | "booking"
    | "enquiry"
    | "quotation"
    | "payment"
    | "enquiry-message"
    | "quotation-message"
    | string;
  title: string;
  message: string;
  href: string;
  at: string;
};

/** GET /shop-products (public) */
export type ShopProductPublic = {
  _id: string;
  name: string;
  slug: string;
  description: string;
  /** machine = equipment; accessory = lights, batteries, car parts; other */
  productGroup: "machine" | "accessory" | "other";
  category: string;
  image: string;
  basePrice: number;
  discountPercent: number;
  effectivePrice: number;
  /** null = not tracked (unlimited); otherwise units on hand */
  stock: number | null;
};

/** Admin shop product (GET /admin/shop-products) */
export type ShopProductAdmin = ShopProductPublic & {
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
};

/** Line on a placed shop order */
export type ShopOrderLine = {
  productId: string;
  name: string;
  productGroup?: "machine" | "accessory" | "other";
  category: string;
  qty: number;
  unitPriceList: number;
  discountPercent: number;
  unitPriceEffective: number;
  lineTotal: number;
};

/** GET /admin/shop-orders */
export type ShopOrderRecord = {
  _id: string;
  orderNumber: string;
  orderDateYmd: string;
  customerName: string;
  email: string;
  phone: string;
  address?: string;
  customerNote?: string;
  items: ShopOrderLine[];
  subtotalListInr: number;
  discountInr: number;
  totalInr: number;
  status: "pending" | "confirmed" | "fulfilled" | "cancelled";
  createdAt?: string;
};

/** GET /admin/dashboard — product sales (order date in reporting window) */
export type ShopSalesSnapshot = {
  revenueInr: number;
  ordersCount: number;
  machinesRevenueInr: number;
  accessoriesRevenueInr: number;
  otherRevenueInr: number;
};

/** GET /admin/cars/history */
export type VehicleHistoryBookingRow = {
  _id: string;
  customerName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  status: string;
  finalAmount?: number;
  serviceName: string;
};

export type VehicleHistoryQuoteRow = {
  _id: string;
  customerName: string;
  email: string;
  phone: string;
  status: string;
  quotedAmount?: number;
  serviceNameSnapshot: string;
  createdAt?: string;
  updatedAt?: string;
};

export type VehicleHistoryResponse = {
  vehicle: {
    vehicleType: string;
    carMake: string;
    carModel: string;
    vehicleYear: number;
  };
  bookings: VehicleHistoryBookingRow[];
  quotes: VehicleHistoryQuoteRow[];
};

export type Booking = {
  _id: string;
  serviceId: Service;
  vehicleType: string;
  date: string;
  time: string;
  status: "Pending" | "In Progress" | "Completed";
  customerName: string;
  phone: string;
  email: string;
  /** Manufacturer / brand (e.g. Hyundai, Maruti Suzuki). */
  carMake?: string;
  carModel: string;
  /** Chassis number as on RC. */
  chassisNumber?: string;
  /** @deprecated Legacy bookings only. */
  registrationNumber?: string;
  /** Model year (e.g. 2022). */
  vehicleYear?: number;
  finalAmount?: number;
  /** Optional: Cash, UPI, etc. — saved with payment & P&L. */
  paymentMethod?: string;
  /** Optional: transaction / receipt reference. */
  paymentReference?: string;
  /** Optional: YYYY-MM-DD when payment was received. */
  paymentReceivedYmd?: string;
  /** Collection status for completed work (defaults to unpaid for older rows). */
  paymentStatus?: "unpaid" | "partial" | "paid" | "waived";
};
