import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Upload, Loader2, CreditCard, Banknote, Smartphone } from "lucide-react";

export default function AdminPayments() {
  const [qrUrl, setQrUrl] = useState("");
  const [qrSaving, setQrSaving] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "payment_qr_url").maybeSingle();
    setQrUrl(data?.value ?? "");
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

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

      // Upsert into site_settings
      const { data: existing } = await (supabase as any).from("site_settings").select("id").eq("key", "payment_qr_url").maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from("site_settings").update({ value: finalUrl, updated_at: new Date().toISOString() }).eq("key", "payment_qr_url");
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from("site_settings").insert({ key: "payment_qr_url", value: finalUrl });
        if (error) throw error;
      }
      setQrUrl(finalUrl);
      setQrFile(null);
      toast({ title: "บันทึก QR Code แล้ว" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setQrSaving(false);
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold">ระบบชำระเงิน</h1>
          <p className="text-muted-foreground text-sm mt-1">จัดการวิธีการชำระเงินสำหรับลูกค้า</p>
        </div>

        {/* Payment Methods Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-bold">บัตรเครดิต/เดบิต</p>
                <p className="text-xs text-muted-foreground">ลูกค้าแจ้งความประสงค์ชำระด้วยบัตร</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100">
                <Smartphone className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold">QR Code</p>
                <p className="text-xs text-muted-foreground">สแกน QR Code ชำระเงิน</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card border-0">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100">
                <Banknote className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="font-bold">เงินสด</p>
                <p className="text-xs text-muted-foreground">ชำระเงินสดหลังเสร็จงาน</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* QR Code Management */}
        <Card className="shadow-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold text-lg">จัดการ QR Code ชำระเงิน</h2>
                <p className="text-xs text-muted-foreground">อัพโหลดรูป QR Code สำหรับให้ลูกค้าสแกนจ่ายเงิน</p>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                {qrUrl && (
                  <div className="w-48 h-48 rounded-xl border border-border overflow-hidden bg-white flex-shrink-0 shadow-sm">
                    <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain" />
                  </div>
                )}
                <div className="flex-1 space-y-4">
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
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
