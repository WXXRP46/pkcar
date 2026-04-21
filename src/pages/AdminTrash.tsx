import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { Trash2, RotateCcw, AlertTriangle, Phone } from "lucide-react";

interface TrashedBooking {
  id: string;
  booking_code: string | null;
  customer_name: string;
  customer_phone: string;
  start_date: string;
  end_date: string;
  pickup_location: string;
  total_price: number;
  status: string;
  deleted_at: string;
  vans: { name: string; model: string } | null;
}

export default function AdminTrash() {
  const [items, setItems] = useState<TrashedBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTrash = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("bookings")
      .select("*, vans(name, model)")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) toast({ title: "โหลดไม่สำเร็จ", description: error.message, variant: "destructive" });
    setItems((data as TrashedBooking[]) ?? []);
    setLoading(false);
  }, [toast]);

  useEffect(() => { fetchTrash(); }, [fetchTrash]);

  const restore = async (id: string) => {
    const { error } = await (supabase as any).from("bookings").update({ deleted_at: null }).eq("id", id);
    if (error) {
      toast({ title: "กู้คืนไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "กู้คืนการจองแล้ว" });
      fetchTrash();
    }
  };

  const purge = async (id: string) => {
    if (!confirm("ลบถาวร? ไม่สามารถกู้คืนได้อีก")) return;
    const { error } = await (supabase as any).from("bookings").delete().eq("id", id);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ลบถาวรเรียบร้อย" });
      fetchTrash();
    }
  };

  const purgeAll = async () => {
    if (items.length === 0) return;
    if (!confirm(`ลบทั้งหมด ${items.length} รายการแบบถาวร?`)) return;
    const { error } = await (supabase as any).from("bookings").delete().not("deleted_at", "is", null);
    if (error) {
      toast({ title: "ลบไม่สำเร็จ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "ล้างถังขยะแล้ว" });
      fetchTrash();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Trash2 className="w-6 h-6 text-destructive" /> ถังขยะ
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {items.length} รายการ · จะถูกลบถาวรอัตโนมัติภายใน 30 วันหลังลบ
            </p>
          </div>
          {items.length > 0 && (
            <Button variant="destructive" size="sm" onClick={purgeAll} className="gap-2">
              <Trash2 className="w-4 h-4" /> ล้างถังขยะทั้งหมด
            </Button>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-sm text-amber-900">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>รายการในถังขยะจะถูกลบถาวรโดยอัตโนมัติเมื่อครบ 30 วันนับจากวันที่ลบ คุณสามารถกู้คืนได้ก่อนหน้านั้น</p>
        </div>

        {loading ? (
          <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : items.length === 0 ? (
          <Card className="shadow-card border-0">
            <CardContent className="p-12 text-center text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>ถังขยะว่างเปล่า</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {items.map((b) => {
              const daysSince = differenceInDays(new Date(), new Date(b.deleted_at));
              const daysLeft = Math.max(0, 30 - daysSince);
              return (
                <motion.div key={b.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="shadow-card border-0">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="font-mono text-xs font-bold tracking-wider bg-muted px-2 py-1 rounded">
                              {b.booking_code ?? "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">{b.status}</span>
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${daysLeft <= 7 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                              เหลือ {daysLeft} วัน
                            </span>
                          </div>
                          <p className="font-semibold">{b.customer_name}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" />{b.customer_phone}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {b.vans?.name ?? "—"} · {format(new Date(b.start_date), "d MMM")} → {format(new Date(b.end_date), "d MMM yyyy")} · ฿{Number(b.total_price).toLocaleString()}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            ลบเมื่อ {format(new Date(b.deleted_at), "d MMM yyyy HH:mm")}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => restore(b.id)} className="gap-1.5">
                            <RotateCcw className="w-3.5 h-3.5" /> กู้คืน
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => purge(b.id)} className="gap-1.5 text-destructive hover:bg-destructive/10">
                            <Trash2 className="w-3.5 h-3.5" /> ลบถาวร
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
