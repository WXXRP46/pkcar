import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Filter, Phone, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type BookingStatus = "pending" | "confirmed" | "proceed" | "completed" | "cancelled";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  pickup_location: string;
  total_price: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  booking_code: string | null;
  pickup_time: string | null;
  vans: { name: string; model: string } | null;
}

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-green-100 text-green-800 border-green-200",
  proceed: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-blue-100 text-blue-800 border-blue-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const NEXT_STATUS: Partial<Record<BookingStatus, BookingStatus>> = {
  pending: "confirmed",
  confirmed: "proceed",
  proceed: "completed",
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    let query = supabase.from("bookings").select("*, vans(name, model)").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter as BookingStatus);
    const { data } = await query;
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchBookings();
  }, [fetchBookings]);

  useEffect(() => {
    const channel = supabase
      .channel("bookings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => fetchBookings())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchBookings]);

  const updateStatus = async (id: string, status: BookingStatus) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status Updated", description: `Booking marked as ${status}` });
      fetchBookings();
    }
  };

  // Filter bookings by search query (code or phone)
  const filteredBookings = bookings.filter(b => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (b.booking_code?.toLowerCase().includes(q)) ||
      b.customer_phone.includes(q) ||
      b.customer_name.toLowerCase().includes(q)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Booking Management</h1>
            <p className="text-muted-foreground text-sm mt-1">{filteredBookings.length} bookings found</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ค้นหาด้วยรหัส, เบอร์โทร, ชื่อ"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="proceed">Proceed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Card className="shadow-card border-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-4 font-medium text-muted-foreground">Code</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Customer</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Van</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Dates</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Pickup</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Total</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 9 }).map((_, j) => (
                        <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  )) : filteredBookings.map((booking) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <span className="font-mono text-xs font-bold tracking-wider bg-muted px-2 py-1 rounded">{booking.booking_code ?? "—"}</span>
                      </td>
                      <td className="p-4">
                        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", (booking as any).booking_type === "taxi" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground")}>
                          {(booking as any).booking_type === "taxi" ? "แท็กซี่" : "เช่าเหมาวัน"}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{booking.customer_name}</p>
                        <a href={`tel:${booking.customer_phone}`} className="text-xs text-gold hover:underline flex items-center gap-1">
                          <Phone className="w-3 h-3" />{booking.customer_phone}
                        </a>
                      </td>
                      <td className="p-4">
                        <p className="font-medium">{booking.vans?.name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{booking.vans?.model}</p>
                      </td>
                      <td className="p-4 text-sm">
                        <p>{format(new Date(booking.start_date), "d MMM yyyy")}</p>
                        <p className="text-muted-foreground">→ {format(new Date(booking.end_date), "d MMM yyyy")}</p>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground max-w-[140px] truncate">{booking.pickup_location}</td>
                      <td className="p-4 font-bold text-foreground">฿{Number(booking.total_price).toLocaleString()}</td>
                      <td className="p-4">
                        <Select
                          value={booking.status}
                          onValueChange={(val) => updateStatus(booking.id, val as BookingStatus)}
                        >
                          <SelectTrigger className={`h-7 w-[120px] text-xs font-medium border ${statusColors[booking.status]}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="proceed">Proceed</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1">
                          {NEXT_STATUS[booking.status] && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted" onClick={() => updateStatus(booking.id, NEXT_STATUS[booking.status]!)}>
                              <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                              {NEXT_STATUS[booking.status] === "confirmed" ? "Confirm" :
                               NEXT_STATUS[booking.status] === "proceed" ? "Proceed" : "Complete"}
                            </Button>
                          )}
                          {booking.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted" onClick={() => updateStatus(booking.id, "cancelled")}>
                              <XCircle className="w-4 h-4 mr-1 text-destructive" /> Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {!loading && filteredBookings.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">No bookings found</div>
              )}
            </div>
          </Card>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-24 w-full" /></Card>
          )) : filteredBookings.map((booking) => (
            <Card key={booking.id} className="shadow-card border-0">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{booking.customer_name}</p>
                    <a href={`tel:${booking.customer_phone}`} className="text-xs text-gold">{booking.customer_phone}</a>
                  </div>
                  <Select
                    value={booking.status}
                    onValueChange={(val) => updateStatus(booking.id, val as BookingStatus)}
                  >
                    <SelectTrigger className={`h-7 w-[110px] text-xs font-medium border ${statusColors[booking.status]}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="proceed">Proceed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                  <div><p className="font-medium text-foreground">รหัส</p><span className="font-mono text-xs font-bold tracking-wider">{booking.booking_code ?? "—"}</span></div>
                  <div><p className="font-medium text-foreground">Van</p>{booking.vans?.name}</div>
                  <div><p className="font-medium text-foreground">Total</p>฿{Number(booking.total_price).toLocaleString()}</div>
                  <div><p className="font-medium text-foreground">From</p>{format(new Date(booking.start_date), "d MMM yyyy")}</div>
                  <div><p className="font-medium text-foreground">To</p>{format(new Date(booking.end_date), "d MMM yyyy")}</div>
                </div>
                {NEXT_STATUS[booking.status] && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => updateStatus(booking.id, NEXT_STATUS[booking.status]!)}>
                      {NEXT_STATUS[booking.status] === "confirmed" ? "Confirm" :
                       NEXT_STATUS[booking.status] === "proceed" ? "Proceed" : "Complete"}
                    </Button>
                    {booking.status === "pending" && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => updateStatus(booking.id, "cancelled")}>
                        Cancel
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!loading && filteredBookings.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">No bookings found</div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
