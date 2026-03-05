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
import { Plus, Pencil, Trash2, CalendarDays, Loader2, Eye, EyeOff, MapPin, Clock } from "lucide-react";

interface Event {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  location: string | null;
  event_date: string | null;
  event_end_date: string | null;
  event_time: string | null;
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
  event_date: "",
  event_end_date: "",
  event_time: "",
  is_active: true,
  sort_order: 0,
};

export default function AdminEvents() {
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const { toast } = useToast();

  const fetchItems = useCallback(async () => {
    const { data } = await (supabase as any).from("events").select("*").order("event_date").order("sort_order");
    setItems((data as Event[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item: Event) => {
    setEditing(item);
    setForm({
      title: item.title,
      title_en: item.title_en ?? "",
      description: item.description ?? "",
      description_en: item.description_en ?? "",
      image_url: item.image_url ?? "",
      location: item.location ?? "",
      event_date: item.event_date ?? "",
      event_end_date: item.event_end_date ?? "",
      event_time: item.event_time ?? "",
      is_active: item.is_active,
      sort_order: item.sort_order,
    });
    setPhotoFile(null);
    setDialogOpen(true);
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `events/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("van-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("van-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "กรุณากรอกชื่อกิจกรรม", variant: "destructive" });
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
        event_date: form.event_date || null,
        event_end_date: form.event_end_date || null,
        event_time: form.event_time || null,
        is_active: form.is_active,
        sort_order: form.sort_order,
      };

      if (editing) {
        const { error } = await (supabase as any).from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "อัพเดทแล้ว" });
      } else {
        const { error } = await (supabase as any).from("events").insert(payload);
        if (error) throw error;
        toast({ title: "เพิ่มกิจกรรมแล้ว" });
      }
      setDialogOpen(false);
      fetchItems();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ต้องการลบกิจกรรมนี้?")) return;
    const { error } = await (supabase as any).from("events").delete().eq("id", id);
    if (!error) { toast({ title: "ลบแล้ว" }); fetchItems(); }
  };

  const toggleActive = async (item: Event) => {
    await (supabase as any).from("events").update({ is_active: !item.is_active }).eq("id", item.id);
    fetchItems();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">กิจกรรมที่กำลังจะมาถึง</h1>
            <p className="text-muted-foreground text-sm mt-1">{items.length} กิจกรรม</p>
          </div>
          <Button onClick={openAdd} className="gap-2" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
            <Plus className="w-4 h-4" /> เพิ่มกิจกรรม
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
                      <CalendarDays className="w-8 h-8" />
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
                    <div className="flex flex-wrap gap-2 mt-1">
                      {item.event_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> {item.event_date}{item.event_end_date ? ` - ${item.event_end_date}` : ""}
                        </span>
                      )}
                      {item.event_time && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {item.event_time}</span>
                      )}
                    </div>
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
          <div className="text-center p-12 text-muted-foreground">ยังไม่มีกิจกรรม กด "เพิ่มกิจกรรม" เพื่อเริ่มต้น</div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "แก้ไขกิจกรรม" : "เพิ่มกิจกรรมใหม่"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>ชื่อกิจกรรม (ไทย) *</Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="เช่น งานลอยกระทงภูเก็ต" />
            </div>
            <div className="space-y-1.5">
              <Label>ชื่อกิจกรรม (อังกฤษ)</Label>
              <Input value={form.title_en} onChange={(e) => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder="e.g. Phuket Loy Krathong Festival" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>วันที่เริ่ม</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>วันที่สิ้นสุด</Label>
                <Input type="date" value={form.event_end_date} onChange={(e) => setForm(f => ({ ...f, event_end_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>เวลา</Label>
                <Input value={form.event_time} onChange={(e) => setForm(f => ({ ...f, event_time: e.target.value }))} placeholder="เช่น 18:00 - 22:00" />
              </div>
              <div className="space-y-1.5">
                <Label>สถานที่</Label>
                <Input value={form.location} onChange={(e) => setForm(f => ({ ...f, location: e.target.value }))} placeholder="เช่น หาดป่าตอง" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด (ไทย)</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="คำอธิบายกิจกรรม..." />
            </div>
            <div className="space-y-1.5">
              <Label>รายละเอียด (อังกฤษ)</Label>
              <Textarea value={form.description_en} onChange={(e) => setForm(f => ({ ...f, description_en: e.target.value }))} rows={3} placeholder="Event description..." />
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
              {editing ? "บันทึกการแก้ไข" : "เพิ่มกิจกรรม"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
