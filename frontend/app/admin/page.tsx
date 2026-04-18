"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({ totalBookings: 0, todaysBookings: 0, activeServices: 0 });

  useEffect(() => {
    adminApi.get("/dashboard").then((res) => setStats(res.data));
  }, []);

  return (
    <div>
      <h1 className="mb-4 text-3xl font-bold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-gray-500">Total Bookings</p>
          <p className="text-3xl font-bold">{stats.totalBookings}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Today&apos;s Bookings</p>
          <p className="text-3xl font-bold">{stats.todaysBookings}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-gray-500">Active Services</p>
          <p className="text-3xl font-bold">{stats.activeServices}</p>
        </div>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-semibold">Quick actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/admin/services" className="card block p-4 text-sm font-medium hover:bg-black/5">
          Manage services →
        </Link>
        <Link href="/admin/slots" className="card block p-4 text-sm font-medium hover:bg-black/5">
          Manage slots →
        </Link>
        <Link href="/admin/bookings" className="card block p-4 text-sm font-medium hover:bg-black/5">
          View bookings →
        </Link>
        <Link href="/" target="_blank" rel="noopener noreferrer" className="card block p-4 text-sm font-medium hover:bg-black/5">
          Open customer site →
        </Link>
      </div>
    </div>
  );
}
