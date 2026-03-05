import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, MapPin, Loader2, Eye, EyeOff } from "lucide-react";

interface Attraction {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  location: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = {
  title: "",
  title_en: "",
  description: "",
  description_en: "",
  image_url: "",
  location: "",
  category: "attraction",
  is_active: true,
  sort_order: 0,
};

export default function AdminAttractions() {
  const [items, setItems] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Attraction | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    const { data } = await (supabase as any).from("attractions").select("*").order("sort_order").order("created_at", { ascending: false });
    setItems((data as Attraction[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Attraction) => {
    setEditing(item);
    setForm({
      title: item.title,
      title_en: item.title_en ?? "",
      description: item.description ?? "",
      description_en: item.description_en ?? "",
      image_url: item.image_url ?? "",
      location: item.location ?? "",
      category: item.category ?? "attraction",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `attractions/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("van-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("van-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "กรุณากรอกชื่อสถานที่", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let image_url = form.image_url;
      if (photoFile) image_url = await uploadPhoto(photoFile);

      const payload = {
        title: form.title,
        title_en: form.title_en || null,
        description: form.description || null,
        description_en: form.description_en || null,
        image_url: image_url || null,
        location: form.location || null,
        category: form.category || "attraction",
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (editing) {
        const { error } = await (supabase as any).from("attractions").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "อัพเดทแล้ว" });
      } else {
        const { error } = await (supabase as any).from("attractions").insert(payload);
        if (error) throw error;
        toast({ title: "เพิ่มสถานที่แล้ว" });
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบสถานที่นี้?")) return;
    const { error } = await (supabase as any).from("attractions").delete().eq("id", id);
    if (!error) { toast({ title: "ลบแล้ว" }); fetchItems(); }
  };

  const toggleActive = async (item: Attraction) => {
    await (supabase as any).from("attractions").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">ที่เที่ยวน่าสนใจ</h1>
            <p className="text-muted-foreground text-sm mt-1">{items.length} สถานที่</p>
          </div>
          <Button onClick={openAdd} className="gap-2" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
            <Plus className="w-4 h-4" /> เพิ่มสถานที่
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="shadow-card border-0"><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
          )) : items.map((item) => (
            <motion.div key={item.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`shadow-card border-0 ${!item.is_active ? "opacity-50" : ""}`}>
                <CardContent className="p-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.title} className="w-full h-36 object-cover rounded-t-xl" />
                  ) : (
                    <div className="w-full h-36 bg-muted rounded-t-xl flex items-center justify-center text-muted-foreground">
                      <MapPin className="w-8 h-8" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="font-bold text-base">{item.title}</h3>
                      <button onClick={() => toggleActive(item)} title={item.is_active ? "ซ่อน" : "แสดง"}>
                        {item.is_active ? <Eye className="w-4 h-4 text-green-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                    {item.title_en && <p className="text-xs text-muted-foreground">{item.title_en}</p>}
                    {item.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{item.location}</p>}
                    {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1" onClick={() => openEdit(item)}>
                        <Pencil className="w-3 h-3" /> แก้ไข
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-3 h-3" /> ลบ
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
        {!loading && items.length === 0 && (
          <div className="text-center p-12 text-muted-foreground">ยังไม่มีสถานที่ กด "เพิ่มสถานที่" เพื่อเริ่มต้น</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขสถานที่" : "เพิ่มสถานที่ใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อ (ไทย) *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น หาดป่าตอง" />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อ (อังกฤษ)</Label>
              <Input value={form.title_en} onChange={(e) => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder="e.g. Patong Beach" />
            </div>
            <div className="space-y-1.5">
              <Label>สถานที่ / ตำแหน่ง</Label>
              <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="เช่น อ.กะทู้ จ.ภูเก็ต" />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด (ไทย)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="คำอธิบายสถานที่..." />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด (อังกฤษ)</Label>
              <Textarea value={form.description_en} onChange={(e) => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} placeholder="Description in English..." />
            </div>
            <div className="space-y-1.5">
              <Label>รูปภาพ</Label>
              <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="URL รูปภาพ" />
              <Input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>ลำดับการแสดง</Label>
                <Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>แสดงบนหน้าเว็บ</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
                  <span className="text-sm">{form.is_active ? "แสดง" : "ซ่อน"}</span>
                </div>
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {editing ? "บันทึกการแก้ไข" : "เพิ่มสถานที่"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
