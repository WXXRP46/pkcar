import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CheckCircle, XCircle, Filter, Phone, Search, Pencil, Loader2, CreditCard, QrCode, Banknote, MapPin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const googleMapsUrl = (location: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;

type BookingStatus = "pending" | "confirmed" | "proceed" | "completed" | "cancelled";

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  pickup_location: string;
  dropoff_location: string | null;
  total_price: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  booking_code: string | null;
  pickup_time: string | null;
  booking_type: string;
  payment_method: string;
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

const paymentMethodLabels: Record<string, { label: string; icon: typeof CreditCard }> = {
  credit_card: { label: "บัตรเครดิต", icon: CreditCard },
  qr_code: { label: "QR Code", icon: QrCode },
  cash: { label: "เงินสด", icon: Banknote },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editForm, setEditForm] = useState({
    customer_name: "", customer_phone: "", pickup_location: "", dropoff_location: "",
    notes: "", total_price: 0, payment_method: "cash", pickup_time: "",
  });
  const [editSaving, setEditSaving] = useState(false);
  const { toast } = useToast();

  const fetchBookings = useCallback(async () => {
    let query = (supabase as any).from("bookings").select("*, vans(name, model)").is("deleted_at", null).order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter as BookingStatus);
    const { data } = await query;
    setBookings((data as Booking[]) ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { setLoading(true); fetchBookings(); }, [fetchBookings]);

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

  const moveToTrash = async (id: string) => {
    if (!confirm("ย้ายการจองนี้ไปยังถังขยะ? คุณสามารถกู้คืนได้ภายใน 30 วัน")) return;
    const { error } = await (supabase as any).from("bookings").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ย้ายไปถังขยะแล้ว", description: "กู้คืนได้ที่หน้าถังขยะ" });
      fetchBookings();
    }
  };

  const openEdit = (b: Booking) => {
    setEditingBooking(b);
    setEditForm({
      customer_name: b.customer_name,
      customer_phone: b.customer_phone,
      pickup_location: b.pickup_location,
      dropoff_location: b.dropoff_location ?? "",
      notes: b.notes ?? "",
      total_price: b.total_price,
      payment_method: b.payment_method ?? "cash",
      pickup_time: b.pickup_time ?? "",
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingBooking) return;
    setEditSaving(true);
    const { error } = await supabase.from("bookings").update({
      customer_name: editForm.customer_name,
      customer_phone: editForm.customer_phone,
      pickup_location: editForm.pickup_location,
      dropoff_location: editForm.dropoff_location || null,
      notes: editForm.notes || null,
      total_price: editForm.total_price,
      payment_method: editForm.payment_method,
      pickup_time: editForm.pickup_time || null,
    }).eq("id", editingBooking.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "อัพเดทการจองแล้ว" });
      setEditOpen(false);
      fetchBookings();
    }
    setEditSaving(false);
  };

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
            <h1 className="text-2xl font-bold">จัดการการจอง</h1>
            <p className="text-muted-foreground text-sm mt-1">{filteredBookings.length} รายการ</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="ค้นหาด้วยรหัส, เบอร์โทร, ชื่อ" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 w-64" />
            </div>
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filter by status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="pending">รอดำเนินการ</SelectItem>
                <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                <SelectItem value="proceed">กำลังดำเนินการ</SelectItem>
                <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                <SelectItem value="cancelled">ยกเลิก</SelectItem>
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
                    <th className="text-left p-4 font-medium text-muted-foreground">รหัส</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">ประเภท</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">ลูกค้า</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">รถ</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">วันที่</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">จุดรับ</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">ชำระเงิน</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">ราคา</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">สถานะ</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      {Array.from({ length: 10 }).map((_, j) => (
                        <td key={j} className="p-4"><Skeleton className="h-4 w-full" /></td>
                      ))}
                    </tr>
                  )) : filteredBookings.map((booking) => {
                    const pm = paymentMethodLabels[booking.payment_method] ?? paymentMethodLabels.cash;
                    const PmIcon = pm.icon;
                    return (
                      <motion.tr key={booking.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-xs font-bold tracking-wider bg-muted px-2 py-1 rounded">{booking.booking_code ?? "—"}</span>
                        </td>
                        <td className="p-4">
                          <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", booking.booking_type === "taxi" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground")}>
                            {booking.booking_type === "taxi" ? "แท็กซี่" : "เช่าเหมาวัน"}
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
                        <td className="p-4 text-sm max-w-[140px] truncate">
                          <a href={googleMapsUrl(booking.pickup_location)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1" title={booking.pickup_location}>
                            <MapPin className="w-3 h-3 flex-shrink-0" />{booking.pickup_location}
                          </a>
                          {booking.dropoff_location && (
                            <a href={googleMapsUrl(booking.dropoff_location)} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 mt-0.5" title={booking.dropoff_location}>
                              <MapPin className="w-3 h-3 flex-shrink-0" />→ {booking.dropoff_location}
                            </a>
                          )}
                        </td>
                        <td className="p-4">
                          <span className="text-xs flex items-center gap-1 text-muted-foreground">
                            <PmIcon className="w-3 h-3" /> {pm.label}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-foreground">฿{Number(booking.total_price).toLocaleString()}</td>
                        <td className="p-4">
                          <Select value={booking.status} onValueChange={(val) => updateStatus(booking.id, val as BookingStatus)}>
                            <SelectTrigger className={`h-7 w-[120px] text-xs font-medium border ${statusColors[booking.status]}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">รอดำเนินการ</SelectItem>
                              <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                              <SelectItem value="proceed">กำลังดำเนินการ</SelectItem>
                              <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                              <SelectItem value="cancelled">ยกเลิก</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted" onClick={() => openEdit(booking)}>
                              <Pencil className="w-3.5 h-3.5 mr-1" /> แก้ไข
                            </Button>
                            {NEXT_STATUS[booking.status] && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted" onClick={() => updateStatus(booking.id, NEXT_STATUS[booking.status]!)}>
                                <CheckCircle className="w-4 h-4 mr-1 text-green-600" />
                                {NEXT_STATUS[booking.status] === "confirmed" ? "ยืนยัน" :
                                 NEXT_STATUS[booking.status] === "proceed" ? "ดำเนินการ" : "เสร็จสิ้น"}
                              </Button>
                            )}
                            {booking.status === "pending" && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-muted" onClick={() => updateStatus(booking.id, "cancelled")}>
                                <XCircle className="w-4 h-4 mr-1 text-destructive" /> ยกเลิก
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" className="h-7 px-2 hover:bg-destructive/10 text-destructive" onClick={() => moveToTrash(booking.id)}>
                              <Trash2 className="w-3.5 h-3.5 mr-1" /> ลบ
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {!loading && filteredBookings.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">ไม่พบรายการจอง</div>
              )}
            </div>
          </Card>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4"><Skeleton className="h-24 w-full" /></Card>
          )) : filteredBookings.map((booking) => {
            const pm = paymentMethodLabels[booking.payment_method] ?? paymentMethodLabels.cash;
            const PmIcon = pm.icon;
            return (
              <Card key={booking.id} className="shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{booking.customer_name}</p>
                      <a href={`tel:${booking.customer_phone}`} className="text-xs text-gold">{booking.customer_phone}</a>
                    </div>
                    <Select value={booking.status} onValueChange={(val) => updateStatus(booking.id, val as BookingStatus)}>
                      <SelectTrigger className={`h-7 w-[110px] text-xs font-medium border ${statusColors[booking.status]}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">รอดำเนินการ</SelectItem>
                        <SelectItem value="confirmed">ยืนยันแล้ว</SelectItem>
                        <SelectItem value="proceed">กำลังดำเนินการ</SelectItem>
                        <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                        <SelectItem value="cancelled">ยกเลิก</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-3">
                    <div><p className="font-medium text-foreground">รหัส</p><span className="font-mono text-xs font-bold tracking-wider">{booking.booking_code ?? "—"}</span></div>
                    <div><p className="font-medium text-foreground">รถ</p>{booking.vans?.name}</div>
                    <div><p className="font-medium text-foreground">ราคา</p>฿{Number(booking.total_price).toLocaleString()}</div>
                    <div><p className="font-medium text-foreground">ชำระเงิน</p><span className="flex items-center gap-1"><PmIcon className="w-3 h-3" />{pm.label}</span></div>
                    <div><p className="font-medium text-foreground">วันรับ</p>{format(new Date(booking.start_date), "d MMM yyyy")}</div>
                    <div><p className="font-medium text-foreground">วันคืน</p>{format(new Date(booking.end_date), "d MMM yyyy")}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => openEdit(booking)}>
                      <Pencil className="w-3 h-3 mr-1" /> แก้ไข
                    </Button>
                    {NEXT_STATUS[booking.status] && (
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => updateStatus(booking.id, NEXT_STATUS[booking.status]!)}>
                        {NEXT_STATUS[booking.status] === "confirmed" ? "ยืนยัน" :
                         NEXT_STATUS[booking.status] === "proceed" ? "ดำเนินการ" : "เสร็จสิ้น"}
                      </Button>
                    )}
                    {booking.status === "pending" && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => updateStatus(booking.id, "cancelled")}>
                        ยกเลิก
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => moveToTrash(booking.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!loading && filteredBookings.length === 0 && (
            <div className="p-12 text-center text-muted-foreground">ไม่พบรายการจอง</div>
          )}
        </div>
      </div>

      {/* Edit Booking Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>แก้ไขการจอง {editingBooking?.booking_code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อลูกค้า</Label>
              <Input value={editForm.customer_name} onChange={(e) => setEditForm(f => ({ ...f, customer_name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>เบอร์โทร</Label>
              <Input value={editForm.customer_phone} onChange={(e) => setEditForm(f => ({ ...f, customer_phone: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>จุดรับ</Label>
              <Input value={editForm.pickup_location} onChange={(e) => setEditForm(f => ({ ...f, pickup_location: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>จุดส่ง</Label>
              <Input value={editForm.dropoff_location} onChange={(e) => setEditForm(f => ({ ...f, dropoff_location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>เวลารับ</Label>
                <Input type="time" value={editForm.pickup_time} onChange={(e) => setEditForm(f => ({ ...f, pickup_time: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>ราคารวม (฿)</Label>
                <Input type="number" value={editForm.total_price} onChange={(e) => setEditForm(f => ({ ...f, total_price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>วิธีชำระเงิน</Label>
              <Select value={editForm.payment_method} onValueChange={(v) => setEditForm(f => ({ ...f, payment_method: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">เงินสด</SelectItem>
                  <SelectItem value="credit_card">บัตรเครดิต/เดบิต</SelectItem>
                  <SelectItem value="qr_code">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <Textarea value={editForm.notes} onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleEditSave} disabled={editSaving} className="w-full" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              {editSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              บันทึกการแก้ไข
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}