export type QuoteRequest = {
  _id: string;
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
  status: "Submitted" | "Quoted" | "Accepted" | "Declined" | "Closed";
  quotedAmount?: number;
  quoteNotes: string;
  quotedAt?: string;
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
  service: { _id: string; name: string; followUpMonths: number | null } | null;
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
  quoted: number;
  accepted: number;
  declined: number;
  closed: number;
  total: number;
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
