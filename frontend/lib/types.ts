export type Service = {
  _id: string;
  name: string;
  description: string;
  image: string;
  basePrice: number;
  duration: number;
};

export type Slot = {
  _id: string;
  date: string;
  time: string;
  isAvailable: boolean;
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
