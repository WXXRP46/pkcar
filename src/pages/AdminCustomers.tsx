import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Search, Phone, User, CalendarCheck, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface CustomerBooking {
  id: string;
  booking_code: string | null;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  created_at: string;
  vans: { name: string } | null;
}

interface Customer {
  customer_name: string;
  customer_phone: string;
  total_bookings: number;
  total_spent: number;
  last_booking: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-green-100 text-green-800",
  proceed: "bg-cyan-100 text-cyan-800",
  completed: "bg-blue-100 text-blue-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerBookings, setCustomerBookings] = useState<CustomerBooking[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const { toast } = useToast();

  const fetchCustomers = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("customer_name, customer_phone, total_price, created_at, status")
      .order("created_at", { ascending: false });

    const map: Record<string, Customer> = {};
    (data ?? []).forEach((b: any) => {
      const key = b.customer_phone;
      if (!map[key]) {
        map[key] = {
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
          total_bookings: 0,
          total_spent: 0,
          last_booking: b.created_at,
        };
      }
      map[key].total_bookings++;
      if (b.status !== "cancelled") map[key].total_spent += Number(b.total_price);
    });

    setCustomers(Object.values(map).sort((a, b) => b.total_bookings - a.total_bookings));
    setLoading(false);
  };

  useEffect(() => { fetchCustomers(); }, []);

  const openDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("id, booking_code, start_date, end_date, total_price, status, created_at, vans(name)")
      .eq("customer_phone", customer.customer_phone)
      .order("created_at", { ascending: false });
    setCustomerBookings((data as CustomerBooking[]) ?? []);
    setDetailLoading(false);
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`ต้องการลบประวัติการจองทั้งหมดของ ${customer.customer_name}? (${customer.total_bookings} รายการ)`)) return;
    const { error } = await (supabase as any).from("bookings").delete().eq("customer_phone", customer.customer_phone);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบประวัติลูกค้าแล้ว" });
      setSelectedCustomer(null);
      setLoading(true);
      fetchCustomers();
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("ต้องการลบการจองนี้?")) return;
    const { error } = await (supabase as any).from("bookings").delete().eq("id", bookingId);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบการจองแล้ว" });
      if (selectedCustomer) openDetail(selectedCustomer);
      fetchCustomers();
    }
  };

  const filtered = customers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.customer_name.toLowerCase().includes(q) || c.customer_phone.includes(q);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">ประวัติลูกค้า</h1>
            <p className="text-muted-foreground text-sm mt-1">{filtered.length} ลูกค้า</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ค้นหาชื่อหรือเบอร์โทร"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="shadow-card border-0"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => (
              <Card
                key={c.customer_phone}
                className="shadow-card border-0 cursor-pointer hover:shadow-card-hover transition-shadow"
                onClick={() => openDetail(c)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold))" }}>
                      {c.customer_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{c.customer_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {c.customer_phone}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-lg font-bold">{c.total_bookings}</p>
                      <p className="text-[10px] text-muted-foreground">จองทั้งหมด</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-lg font-bold text-gold">฿{c.total_spent.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">ยอดรวม</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="text-xs font-medium mt-1">{format(new Date(c.last_booking), "d MMM yy")}</p>
                      <p className="text-[10px] text-muted-foreground">ล่าสุด</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">ไม่พบลูกค้า</div>
        )}
      </div>

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedCustomer} onOpenChange={(open) => { if (!open) setSelectedCustomer(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-gold" />
              {selectedCustomer?.customer_name}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" /> {selectedCustomer.customer_phone}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold">{selectedCustomer.total_bookings}</p>
                  <p className="text-xs text-muted-foreground">จองทั้งหมด</p>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-gold">฿{selectedCustomer.total_spent.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">ยอดใช้จ่าย</p>
                </div>
              </div>
              <h3 className="font-semibold text-sm flex items-center gap-1.5">
                <CalendarCheck className="w-4 h-4" /> ประวัติการจอง
              </h3>
              {detailLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <div className="space-y-2">
                  {customerBookings.map((b) => (
                    <div key={b.id} className="border rounded-lg p-3 text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-xs font-bold">{b.booking_code ?? "—"}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[b.status] ?? ""}`}>
                            {b.status}
                          </span>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteBooking(b.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs">{b.vans?.name ?? "—"}</p>
                      <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                        <span>{format(new Date(b.start_date), "d MMM")} → {format(new Date(b.end_date), "d MMM yyyy")}</span>
                        <span className="font-semibold text-foreground">฿{Number(b.total_price).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
