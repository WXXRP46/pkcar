import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, TrendingUp, DollarSign, CalendarCheck, Car } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";
import { th } from "date-fns/locale";

interface BookingRaw {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_code: string | null;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
  vans: { name: string } | null;
}

export default function AdminReports() {
  const [bookings, setBookings] = useState<BookingRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("30");

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      const since = period === "all" ? "2020-01-01" : format(subDays(new Date(), Number(period)), "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_phone, booking_code, start_date, end_date, total_price, status, created_at, vans(name)")
        .gte("created_at", since + "T00:00:00")
        .order("created_at", { ascending: false });
      setBookings((data as BookingRaw[]) ?? []);
      setLoading(false);
    };
    fetch();
  }, [period]);

  const completedRevenue = bookings.filter(b => b.status === "completed").reduce((s, b) => s + Number(b.total_price), 0);
  const totalRevenue = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.total_price), 0);
  const totalBookings = bookings.length;
  const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

  // Daily revenue chart
  const dailyData = (() => {
    const days: Record<string, number> = {};
    const numDays = period === "all" ? 90 : Math.min(Number(period), 90);
    for (let i = numDays - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      days[d] = 0;
    }
    bookings.forEach(b => {
      if (b.status !== "cancelled") {
        const d = b.created_at.split("T")[0];
        if (d in days) days[d] += Number(b.total_price);
      }
    });
    return Object.entries(days).map(([date, revenue]) => ({
      date: format(new Date(date), "d MMM", { locale: th }),
      revenue,
    }));
  })();

  // Van revenue breakdown
  const vanRevenue = (() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.status !== "cancelled") {
        const name = b.vans?.name ?? "Unknown";
        map[name] = (map[name] || 0) + Number(b.total_price);
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([name, revenue]) => ({ name, revenue }));
  })();

  const exportCSV = () => {
    const headers = ["รหัส", "ชื่อลูกค้า", "เบอร์โทร", "รถ", "วันเริ่ม", "วันสิ้นสุด", "ราคารวม", "สถานะ", "วันที่จอง"];
    const rows = bookings.map(b => [
      b.booking_code ?? "",
      b.customer_name,
      b.customer_phone,
      b.vans?.name ?? "",
      b.start_date,
      b.end_date,
      b.total_price,
      b.status,
      format(new Date(b.created_at), "yyyy-MM-dd HH:mm"),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">รายงานรายได้</h1>
            <p className="text-muted-foreground text-sm mt-1">สรุปรายได้และการจอง</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 วัน</SelectItem>
                <SelectItem value="30">30 วัน</SelectItem>
                <SelectItem value="90">90 วัน</SelectItem>
                <SelectItem value="365">1 ปี</SelectItem>
                <SelectItem value="all">ทั้งหมด</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} className="gap-2">
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "รายได้ (เสร็จสิ้น)", value: `฿${completedRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
            { label: "รายได้รวม (ไม่รวมยกเลิก)", value: `฿${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-cyan-600", bg: "bg-cyan-50" },
            { label: "จำนวนการจอง", value: totalBookings, icon: CalendarCheck, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "ยกเลิก", value: cancelledCount, icon: Car, color: "text-red-600", bg: "bg-red-50" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase">{s.label}</p>
                      {loading ? <Skeleton className="h-7 w-20 mt-1" /> : <p className="text-xl font-bold mt-1">{s.value}</p>}
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                      <Icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Revenue Chart */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">รายได้รายวัน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-56 w-full" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dailyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0AC4E0" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0AC4E0" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "รายได้"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#0AC4E0" fill="url(#colorRev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Van Revenue */}
        <Card className="shadow-card border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">รายได้ตามรถ</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48 w-full" /> : (
              <ResponsiveContainer width="100%" height={Math.max(200, vanRevenue.length * 40)}>
                <BarChart data={vanRevenue} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `฿${(v / 1000).toFixed(0)}k`} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" width={100} />
                  <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, "รายได้"]} />
                  <Bar dataKey="revenue" fill="#0AC4E0" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
