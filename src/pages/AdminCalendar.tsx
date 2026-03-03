import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { th } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  customer_name: string;
  start_date: string;
  end_date: string;
  status: string;
  booking_code: string | null;
  vans: { name: string } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-green-500",
  proceed: "bg-cyan-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
};

export default function AdminCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      const start = format(startOfMonth(currentMonth), "yyyy-MM-dd");
      const end = format(endOfMonth(currentMonth), "yyyy-MM-dd");
      const { data } = await supabase
        .from("bookings")
        .select("id, customer_name, start_date, end_date, status, booking_code, vans(name)")
        .or(`start_date.lte.${end},end_date.gte.${start}`)
        .not("status", "eq", "cancelled");
      setBookings((data as Booking[]) ?? []);
      setLoading(false);
    };
    fetchBookings();
  }, [currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart); // 0=Sun

  const getBookingsForDay = (day: Date) =>
    bookings.filter((b) => {
      const s = parseISO(b.start_date);
      const e = parseISO(b.end_date);
      return isWithinInterval(day, { start: s, end: e }) || isSameDay(day, s) || isSameDay(day, e);
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ปฏิทินการจอง</h1>
            <p className="text-muted-foreground text-sm mt-1">ภาพรวมการจองรายเดือน</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center">
              {format(currentMonth, "MMMM yyyy", { locale: th })}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <Card className="shadow-card border-0 overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6"><Skeleton className="h-96 w-full" /></div>
            ) : (
              <>
                {/* Header */}
                <div className="grid grid-cols-7 bg-muted/40 border-b">
                  {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
                    <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                  ))}
                </div>
                {/* Days Grid */}
                <div className="grid grid-cols-7">
                  {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-b border-r min-h-[80px] bg-muted/10" />
                  ))}
                  {days.map((day) => {
                    const dayBookings = getBookingsForDay(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "border-b border-r min-h-[80px] p-1",
                          isToday && "bg-accent/30"
                        )}
                      >
                        <div className={cn(
                          "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                          isToday && "bg-gold text-primary font-bold"
                        )}>
                          {format(day, "d")}
                        </div>
                        <div className="space-y-0.5">
                          {dayBookings.slice(0, 3).map((b) => (
                            <div
                              key={b.id}
                              className={cn(
                                "text-[10px] px-1 py-0.5 rounded truncate text-white",
                                statusColors[b.status] ?? "bg-gray-500"
                              )}
                              title={`${b.customer_name} - ${b.vans?.name ?? ""} (${b.booking_code ?? ""})`}
                            >
                              {b.vans?.name ?? b.customer_name}
                            </div>
                          ))}
                          {dayBookings.length > 3 && (
                            <div className="text-[10px] text-muted-foreground text-center">+{dayBookings.length - 3} อีก</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="p-3 flex gap-3 flex-wrap border-t">
                  {Object.entries(statusColors).map(([status, color]) => (
                    <div key={status} className="flex items-center gap-1.5">
                      <div className={cn("w-2.5 h-2.5 rounded-full", color)} />
                      <span className="text-[10px] capitalize text-muted-foreground">{status}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
