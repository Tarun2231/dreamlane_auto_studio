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
  carModel: string;
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
  carModel: string;
  finalAmount?: number;
};
