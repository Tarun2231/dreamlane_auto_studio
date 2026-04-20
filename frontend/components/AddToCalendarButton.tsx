"use client";

import { useSiteLocation } from "@/components/SiteLocationProvider";
import { buildBookingIcs } from "@/lib/ics";
import { SITE_NAME } from "@/lib/site";

type Props = {
  bookingId: string;
  serviceName: string;
  vehicleType: string;
  carMake?: string;
  carModel: string;
  vehicleYear?: number;
  chassisNumber?: string;
  /** @deprecated */
  registrationNumber?: string;
  date: string;
  time: string;
  durationMinutes: number;
};

export default function AddToCalendarButton({
  bookingId,
  serviceName,
  vehicleType,
  carMake,
  carModel,
  vehicleYear,
  chassisNumber,
  registrationNumber,
  date,
  time,
  durationMinutes,
}: Props) {
  const { location } = useSiteLocation();

  const download = () => {
    const title = `${SITE_NAME} — ${serviceName}`;
    const vehicleLine = [carMake, carModel].filter(Boolean).join(" ").trim() || carModel;
    const yearPart = vehicleYear != null ? ` (${vehicleYear})` : "";
    const chassisLine = chassisNumber || registrationNumber;
    const chassisPart = chassisLine ? `\nChassis (RC): ${chassisLine}` : "";
    const description = `Booking ID: ${bookingId}\n${vehicleLine}${yearPart}\n${vehicleType}${chassisPart}`;
    const ics = buildBookingIcs({
      uid: bookingId,
      title,
      description,
      location,
      date,
      time,
      durationMinutes,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `appointment-${bookingId.slice(-8)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={download}
      className="rounded-full border border-black/15 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-black/5 dark:border-white/20 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-white/10"
    >
      Add to calendar (.ics)
    </button>
  );
}
