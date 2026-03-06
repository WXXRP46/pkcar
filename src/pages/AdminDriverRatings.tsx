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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Star, Trash2, Pencil, Loader2, Upload, QrCode, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Rating {
  id: string;
  booking_id: string;
  driver_id: string;
  rating: number;
  comment: string | null;
  customer_name: string | null;
  created_at: string;
  drivers?: { name: string; photo_url: string | null } | null;
  bookings?: { booking_code: string | null; vans: { name: string } | null } | null;
}

interface DriverSummary {
  id: string;
  name: string;
  photo_url: string | null;
  avgRating: number;
  totalRatings: number;
}

export default function AdminDriverRatings() {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [driverSummaries, setDriverSummaries] = useState<DriverSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editingRating, setEditingRating] = useState<Rating | null>(null);
  const [editForm, setEditForm] = useState({ rating: 0, comment: "" });
  const [saving, setSaving] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const [qrSaving, setQrSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data: ratingsData } = await (supabase as any)
      .from("driver_ratings")
      .select("*, drivers(name, photo_url), bookings(booking_code, vans(name))")
      .order("created_at", { ascending: false });

    const allRatings = (ratingsData ?? []) as Rating[];
    setRatings(allRatings);

    // Calculate driver summaries
    const driverMap: Record<string, { name: string; photo_url: string | null; ratings: number[]; }> = {};
    allRatings.forEach(r => {
      if (!driverMap[r.driver_id]) {
        driverMap[r.driver_id] = { name: r.drivers?.name ?? "Unknown", photo_url: r.drivers?.photo_url ?? null, ratings: [] };
      }
      driverMap[r.driver_id].ratings.push(r.rating);
    });

    setDriverSummaries(Object.entries(driverMap).map(([id, d]) => ({
      id,
      name: d.name,
      photo_url: d.photo_url,
      avgRating: d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length,
      totalRatings: d.ratings.length,
    })).sort((a, b) => b.avgRating - a.avgRating));

    // Load QR URL
    const { data: qrData } = await (supabase as any).from("site_settings").select("value").eq("key", "payment_qr_url").maybeSingle();
    setQrUrl(qrData?.value ?? "");

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openEdit = (r: Rating) => {
    setEditingRating(r);
    setEditForm({ rating: r.rating, comment: r.comment ?? "" });
    setEditOpen(true);
  };

  const handleSaveRating = async () => {
    if (!editingRating) return;
    setSaving(true);
    const { error } = await (supabase as any).from("driver_ratings").update({
      rating: editForm.rating,
      comment: editForm.comment || null,
    }).eq("id", editingRating.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "อัพเดทคะแนนแล้ว" });
      setEditOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบคะแนนนี้?")) return;
    const { error } = await (supabase as any).from("driver_ratings").delete().eq("id", id);
    if (!error) {
      toast({ title: "ลบคะแนนแล้ว" });
      fetchData();
    }
  };

  const handleSaveQR = async () => {
    setQrSaving(true);
    try {
      let finalUrl = qrUrl;
      if (qrFile) {
        const ext = qrFile.name.split(".").pop();
        const path = `qr/payment-qr.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("van-images").upload(path, qrFile, { upsert: true });
        if (uploadErr) throw uploadErr;
        const { data } = supabase.storage.from("van-images").getPublicUrl(path);
        finalUrl = data.publicUrl;
      }
      const { error } = await (supabase as any).from("site_settings").update({ value: finalUrl, updated_at: new Date().toISOString() }).eq("key", "payment_qr_url");
      if (error) throw error;
      setQrUrl(finalUrl);
      setQrFile(null);
      toast({ title: "บันทึก QR Code แล้ว" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setQrSaving(false);
  };

  const StarDisplay = ({ value, size = "w-4 h-4" }: { value: number; size?: string }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={cn(size, s <= value ? "fill-gold text-gold" : "text-border")} />
      ))}
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">คะแนนคนขับ</h1>
          <p className="text-muted-foreground text-sm mt-1">จัดการคะแนนและรีวิวจากลูกค้า</p>
        </div>

        {/* QR Code Management */}
        <Card className="shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">จัดการ QR Code ชำระเงิน</h2>
                <p className="text-xs text-muted-foreground">อัพโหลดรูป QR Code สำหรับให้ลูกค้าสแกนจ่ายเงิน</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              {qrUrl && (
                <div className="w-40 h-40 rounded-xl border border-border overflow-hidden bg-card flex-shrink-0">
                  <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1 space-y-3">
                <div className="space-y-1.5">
                  <Label>URL รูป QR Code</Label>
                  <Input value={qrUrl} onChange={(e) => setQrUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>หรืออัพโหลดรูปใหม่</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setQrFile(e.target.files?.[0] ?? null)} />
                </div>
                <Button onClick={handleSaveQR} disabled={qrSaving} className="gap-2" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                  {qrSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  บันทึก QR Code
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Driver Summaries */}
        {driverSummaries.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">สรุปคะแนนคนขับ</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {driverSummaries.map(d => (
                <motion.div key={d.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="shadow-card border-0">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {d.photo_url ? (
                          <img src={d.photo_url} alt={d.name} className="w-12 h-12 rounded-full object-cover border-2 border-border" />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-lg font-bold">
                            {d.name[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold">{d.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <StarDisplay value={Math.round(d.avgRating)} />
                            <span className="text-sm font-bold text-gold">{d.avgRating.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">({d.totalRatings} รีวิว)</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* All Ratings */}
        <div>
          <h2 className="text-lg font-bold mb-3">คะแนนทั้งหมด ({ratings.length})</h2>
          <div className="space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="shadow-card border-0"><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
            )) : ratings.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="shadow-card border-0">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {r.drivers?.photo_url ? (
                          <img src={r.drivers.photo_url} alt={r.drivers?.name} className="w-10 h-10 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground text-sm font-bold">
                            {r.drivers?.name?.[0] ?? "?"}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-sm">{r.drivers?.name ?? "Unknown"}</p>
                          <StarDisplay value={r.rating} size="w-3.5 h-3.5" />
                          {r.comment && <p className="text-sm text-muted-foreground mt-1">"{r.comment}"</p>}
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span>โดย: {r.customer_name ?? "—"}</span>
                            <span>•</span>
                            <span className="font-mono">{r.bookings?.booking_code ?? "—"}</span>
                            <span>•</span>
                            <span>{new Date(r.created_at).toLocaleDateString("th-TH")}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEdit(r)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {!loading && ratings.length === 0 && (
              <div className="text-center p-12 text-muted-foreground">ยังไม่มีคะแนนจากลูกค้า</div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Rating Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>แก้ไขคะแนน</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <p className="text-sm font-medium mb-2">คะแนน</p>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} type="button" onClick={() => setEditForm(f => ({ ...f, rating: s }))} className="p-1">
                    <Star className={cn("w-7 h-7 transition-colors", s <= editForm.rating ? "fill-gold text-gold" : "text-border")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ความคิดเห็น</Label>
              <Textarea value={editForm.comment} onChange={(e) => setEditForm(f => ({ ...f, comment: e.target.value }))} rows={3} />
            </div>
            <Button onClick={handleSaveRating} disabled={saving} className="w-full" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              บันทึก
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}