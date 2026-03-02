import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarCheck, Clock, Car, TrendingUp, BarChart3, PieChart as PieChartIcon
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

interface Stats {
  todayBookings: number;
  pendingApprovals: number;
  activeRentals: number;
  totalRevenue: number;
}

interface BookingRaw {
  status: string;
  total_price: number;
  created_at: string;
  vans: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#22c55e",
  proceed: "#0AC4E0",
  completed: "#3b82f6",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "รอดำเนินการ",
  confirmed: "ยืนยันแล้ว",
  proceed: "กำลังดำเนินการ",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [allBookings, setAllBookings] = useState<BookingRaw[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [bookingsRes, pendingRes, activeRes, revenueRes, allRes] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact" }).gte("created_at", today + "T00:00:00"),
        supabase.from("bookings").select("id", { count: "exact" }).eq("status", "pending"),
        supabase.from("bookings").select("id", { count: "exact" }).eq("status", "confirmed"),
        supabase.from("bookings").select("total_price").eq("status", "completed"),
        supabase.from("bookings").select("status, total_price, created_at, vans(name)").order("created_at", { ascending: false }),
      ]);

      const revenue = (revenueRes.data ?? []).reduce((sum, b) => sum + Number(b.total_price), 0);

      setStats({
        todayBookings: bookingsRes.count ?? 0,
        pendingApprovals: pendingRes.count ?? 0,
        activeRentals: activeRes.count ?? 0,
        totalRevenue: revenue,
      });
      setAllBookings((allRes.data as BookingRaw[]) ?? []);
      setLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Prepare chart data
  const statusCounts = allBookings.reduce<Record<string, number>>((acc, b) => {
    acc[b.status] = (acc[b.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#6b7280",
  }));

  // Revenue by month (last 6 months)
  const monthlyRevenue = (() => {
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months[key] = 0;
    }
    allBookings.forEach(b => {
      if (b.status === "completed" || b.status === "proceed" || b.status === "confirmed") {
        const d = new Date(b.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        if (key in months) months[key] += Number(b.total_price);
      }
    });
    return Object.entries(months).map(([month, revenue]) => {
      const [y, m] = month.split("-");
      const label = new Date(Number(y), Number(m) - 1).toLocaleDateString("th-TH", { month: "short" });
      return { month: label, revenue };
    });
  })();

  // Bookings per van
  const vanBookings = (() => {
    const counts: Record<string, number> = {};
    allBookings.forEach(b => {
      const name = b.vans?.name ?? "Unknown";
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, bookings: count }));
  })();

  // Daily bookings last 7 days
  const dailyBookings = (() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days[d.toISOString().split("T")[0]] = 0;
    }
    allBookings.forEach(b => {
      const day = b.created_at.split("T")[0];
      if (day in days) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => {
      const d = new Date(date);
      return { day: d.toLocaleDateString("th-TH", { weekday: "short" }), bookings: count };
    });
  })();

  const statCards = [
    { label: "Today's Bookings", value: stats?.todayBookings ?? 0, icon: CalendarCheck, color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: "Pending Approvals", value: stats?.pendingApprovals ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Rentals", value: stats?.activeRentals ?? 0, icon: Car, color: "text-green-600", bg: "bg-green-50" },
    { label: "Total Revenue", value: `฿${(stats?.totalRevenue ?? 0).toLocaleString()}`, icon: TrendingUp, color: "text-cyan-700", bg: "bg-cyan-50", isText: true },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Real-time analytics for GOLDMINE_TRAVEL rentals</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statCards.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Card className="shadow-card border-0">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                        {loading ? <Skeleton className="h-8 w-16 mt-2" /> : <p className="text-3xl font-bold text-foreground mt-1">{stat.value}</p>}
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

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue Area Chart */}
          <Card className="shadow-card border-0 lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" /> รายได้รายเดือน
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={monthlyRevenue}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0AC4E0" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0AC4E0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "รายได้"]} />
                    <Area type="monotone" dataKey="revenue" stroke="#0AC4E0" fill="url(#colorRevenue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Status Pie Chart */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-muted-foreground" /> สถานะการจอง
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-56 w-full" /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [v, "รายการ"]} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Daily Bookings */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" /> การจอง 7 วันล่าสุด
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={dailyBookings}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <Tooltip formatter={(v: number) => [v, "รายการจอง"]} />
                    <Bar dataKey="bookings" fill="#0AC4E0" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Van Popularity */}
          <Card className="shadow-card border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Car className="w-4 h-4 text-muted-foreground" /> รถยอดนิยม
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-48 w-full" /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={vanBookings} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={90} />
                    <Tooltip formatter={(v: number) => [v, "จำนวนจอง"]} />
                    <Bar dataKey="bookings" fill="#0AC4E0" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
