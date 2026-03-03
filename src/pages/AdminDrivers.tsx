import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User, Phone, Car, Loader2, Award } from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone: string | null;
  license_number: string | null;
  photo_url: string | null;
  experience_years: number;
  description: string | null;
  van_id: string | null;
  vans?: { name: string; model: string } | null;
}

interface VanOption {
  id: string;
  name: string;
  model: string;
}

const emptyForm = {
  name: "",
  phone: "",
  license_number: "",
  photo_url: "",
  experience_years: 0,
  description: "",
  van_id: "",
};

export default function AdminDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vans, setVans] = useState<VanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchDrivers = useCallback(async () => {
    const [driversRes, vansRes] = await Promise.all([
      (supabase as any).from("drivers").select("*, vans(name, model)").order("created_at", { ascending: false }),
      supabase.from("vans").select("id, name, model").order("name"),
    ]);
    setDrivers((driversRes.data as Driver[]) ?? []);
    setVans((vansRes.data as VanOption[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  const openAdd = () => {
    setEditingDriver(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (d: Driver) => {
    setEditingDriver(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      license_number: d.license_number ?? "",
      photo_url: d.photo_url ?? "",
      experience_years: d.experience_years,
      description: d.description ?? "",
      van_id: d.van_id ?? "",
    });
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `drivers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("van-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("van-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: "กรุณากรอกชื่อคนขับ", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let photo_url = form.photo_url;
      if (photoFile) {
        photo_url = await uploadPhoto(photoFile);
      }

      const payload = {
        name: form.name,
        phone: form.phone || null,
        license_number: form.license_number || null,
        photo_url: photo_url || null,
        experience_years: form.experience_years,
        description: form.description || null,
        van_id: form.van_id || null,
      };

      if (editingDriver) {
        const { error } = await (supabase as any).from("drivers").update(payload).eq("id", editingDriver.id);
        if (error) throw error;
        toast({ title: "อัพเดทคนขับแล้ว" });
      } else {
        const { error } = await (supabase as any).from("drivers").insert(payload);
        if (error) throw error;
        toast({ title: "เพิ่มคนขับแล้ว" });
      }
      setDialogOpen(false);
      fetchDrivers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบคนขับคนนี้?")) return;
    const { error } = await (supabase as any).from("drivers").delete().eq("id", id);
    if (!error) {
      toast({ title: "ลบคนขับแล้ว" });
      fetchDrivers();
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">จัดการคนขับ</h1>
            <p className="text-muted-foreground text-sm mt-1">{drivers.length} คนขับ</p>
          </div>
          <Button onClick={openAdd} className="gap-2" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
            <Plus className="w-4 h-4" /> เพิ่มคนขับ
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-card border-0"><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
          )) : drivers.map((driver) => (
            <motion.div key={driver.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="shadow-card border-0">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {driver.photo_url ? (
                      <img src={driver.photo_url} alt={driver.name} className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base">{driver.name}</h3>
                      {driver.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {driver.phone}
                        </p>
                      )}
                      {driver.license_number && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Award className="w-3 h-3" /> {driver.license_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {driver.vans && (
                      <div className="flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-full w-fit">
                        <Car className="w-3 h-3" /> {driver.vans.name} ({driver.vans.model})
                      </div>
                    )}
                    {driver.experience_years > 0 && (
                      <p className="text-xs text-muted-foreground">ประสบการณ์ {driver.experience_years} ปี</p>
                    )}
                    {driver.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{driver.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1" onClick={() => openEdit(driver)}>
                      <Pencil className="w-3 h-3" /> แก้ไข
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(driver.id)}>
                      <Trash2 className="w-3 h-3" /> ลบ
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {!loading && drivers.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">ยังไม่มีคนขับ กด "เพิ่มคนขับ" เพื่อเริ่มต้น</div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "แก้ไขคนขับ" : "เพิ่มคนขับใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อ-สกุล *</Label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ชื่อคนขับ" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>เบอร์โทร</Label>
                <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="08x-xxx-xxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>เลขใบขับขี่</Label>
                <Input value={form.license_number} onChange={(e) => setForm(f => ({ ...f, license_number: e.target.value }))} placeholder="เลขใบอนุญาต" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>ประสบการณ์ (ปี)</Label>
              <Input type="number" min={0} value={form.experience_years} onChange={(e) => setForm(f => ({ ...f, experience_years: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label>รถที่ประจำ</Label>
              <Select value={form.van_id} onValueChange={(v) => setForm(f => ({ ...f, van_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="เลือกรถ (ไม่บังคับ)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=" ">ไม่ระบุ</SelectItem>
                  {vans.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name} ({v.model})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>รูปโปรไฟล์</Label>
              <Input value={form.photo_url} onChange={(e) => setForm(f => ({ ...f, photo_url: e.target.value }))} placeholder="URL รูปภาพ (ไม่บังคับ)" />
              <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับคนขับ..." />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editingDriver ? "บันทึกการแก้ไข" : "เพิ่มคนขับ"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
