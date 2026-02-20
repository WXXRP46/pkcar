import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Clock, Car, TrendingUp, ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface Stats {
  todayBookings: number;
  pendingApprovals: number;
  activeRentals: number;
  totalRevenue: number;
}

interface RecentBooking {
  id: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  status: string;
  total_price: number;
  vans: { name: string } | null;
  created_at: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    const today = new Date().toISOString().split("T")[0];

    const [bookingsRes, pendingRes, activeRes, revenueRes, recentRes] = await Promise.all([
      supabase.from("bookings").select("id", { count: "exact" }).gte("created_at", today + "T00:00:00"),
      supabase.from("bookings").select("id", { count: "exact" }).eq("status", "pending"),
      supabase.from("bookings").select("id", { count: "exact" }).eq("status", "confirmed"),
      supabase.from("bookings").select("total_price").eq("status", "completed"),
      supabase.from("bookings").select("*, vans(name)").order("created_at", { ascending: false }).limit(8),
    ]);

    const revenue = (revenueRes.data ?? []).reduce((sum, b) => sum + Number(b.total_price), 0);

    setStats({
      todayBookings: bookingsRes.count ?? 0,
      pendingApprovals: pendingRes.count ?? 0,
      activeRentals: activeRes.count ?? 0,
      totalRevenue: revenue,
    });
    setRecentBookings((recentRes.data as RecentBooking[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel("admin-bookings")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const statCards = [
    { label: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Pending Approvals", value: stats?.pendingApprovals ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Rentals", value: stats?.activeRentals ?? 0, icon: Car, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Revenue", value: `฿${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50", isText: true },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time management for Van Elite rentals</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="shadow-card border-0">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                        {loading ? (
                          <Skeleton className="h-8 w-16 mt-2" />
                        ) : (
                          <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>
                        )}
                      </div>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                        <Icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Recent Bookings */}
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
            <Link to="/admin/bookings" className="text-xs text-gold font-medium flex items-center gap-1 hover:underline">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-3 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Van</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Dates</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="p-3 hidden sm:table-cell"><Skeleton className="h-4 w-24" /></td>
                      <td className="p-3 hidden md:table-cell"><Skeleton className="h-4 w-28" /></td>
                      <td className="p-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    </tr>
                  )) : recentBookings.map((booking) => (
                    <tr key={booking.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <p className="font-medium">{booking.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-muted-foreground">{booking.vans?.name ?? "—"}</td>
                      <td className="p-3 hidden md:table-cell text-muted-foreground text-xs">
                        {format(new Date(booking.start_date), "d MMM")} – {format(new Date(booking.end_date), "d MMM yyyy")}
                      </td>
                      <td className="p-3 font-semibold">฿{Number(booking.total_price).toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColors[booking.status] ?? ""}`}>
                          {booking.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && recentBookings.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No bookings yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
