import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Wifi, Wind, Star, Users, Loader2, Eye, EyeOff, Leaf, Trash2, ImagePlus } from "lucide-react";

type VanStatus = "available" | "maintenance" | "hidden";

interface VanImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface Van {
  id: string;
  name: string;
  model: string;
  seats: number;
  price_per_day: number;
  image_url: string | null;
  description: string | null;
  features: { wifi: boolean; ac: boolean; vip_seats: boolean };
  status: VanStatus;
  co2_per_km: number | null;
  images?: VanImage[];
}

const statusBadge: Record<VanStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-200",
  maintenance: "bg-amber-100 text-amber-800 border-amber-200",
  hidden: "bg-gray-100 text-gray-600 border-gray-200",
};

const emptyForm = {
  name: "",
  model: "",
  seats: 8,
  price_per_day: 0,
  image_url: "",
  description: "",
  features: { wifi: false, ac: true, vip_seats: false },
  status: "available" as VanStatus,
  co2_per_km: "" as string | number,
};

export default function AdminFleet() {
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVan, setEditingVan] = useState<Van | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<VanImage[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const { toast } = useToast();

  const fetchVans = useCallback(async () => {
    const { data } = await supabase.from("vans").select("*").order("created_at", { ascending: false });
    const vansData = ((data as any[]) ?? []).map((v) => ({ ...v, features: v.features as { wifi: boolean; ac: boolean; vip_seats: boolean } }));
    
    // Fetch images for all vans
    const { data: imagesData } = await supabase.from("van_images").select("*").order("sort_order");
    const imagesByVan: Record<string, VanImage[]> = {};
    (imagesData ?? []).forEach((img: any) => {
      if (!imagesByVan[img.van_id]) imagesByVan[img.van_id] = [];
      imagesByVan[img.van_id].push(img);
    });
    
    setVans(vansData.map(v => ({ ...v, images: imagesByVan[v.id] ?? [] })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchVans(); }, [fetchVans]);

  const openAddDialog = () => {
    setEditingVan(null);
    setForm(emptyForm);
    setImageFile(null);
    setAdditionalImages([]);
    setNewImageFiles([]);
    setDialogOpen(true);
  };

  const openEditDialog = (van: Van) => {
    setEditingVan(van);
    setForm({
      name: van.name,
      model: van.model,
      seats: van.seats,
      price_per_day: van.price_per_day,
      image_url: van.image_url ?? "",
      description: van.description ?? "",
      features: van.features,
      status: van.status,
      co2_per_km: van.co2_per_km ?? "",
    });
    setImageFile(null);
    setAdditionalImages(van.images ?? []);
    setNewImageFiles([]);
    setDialogOpen(true);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("van-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("van-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleDeleteImage = async (imageId: string) => {
    const { error } = await supabase.from("van_images").delete().eq("id", imageId);
    if (!error) {
      setAdditionalImages(prev => prev.filter(img => img.id !== imageId));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let image_url = form.image_url;

      if (imageFile) {
        image_url = await uploadImage(imageFile);
      }

      const payload = { ...form, image_url, co2_per_km: form.co2_per_km === "" ? null : Number(form.co2_per_km) };

      let vanId = editingVan?.id;

      if (editingVan) {
        const { error } = await supabase.from("vans").update(payload).eq("id", editingVan.id);
        if (error) throw error;
        toast({ title: "Van Updated", description: `${form.name} has been updated.` });
      } else {
        const { data, error } = await supabase.from("vans").insert(payload).select().single();
        if (error) throw error;
        vanId = (data as any).id;
        toast({ title: "Van Added", description: `${form.name} has been added to the fleet.` });
      }

      // Upload new additional images
      if (vanId && newImageFiles.length > 0) {
        const maxOrder = additionalImages.reduce((max, img) => Math.max(max, img.sort_order), 0);
        for (let i = 0; i < newImageFiles.length; i++) {
          const url = await uploadImage(newImageFiles[i]);
          await supabase.from("van_images").insert({
            van_id: vanId,
            image_url: url,
            sort_order: maxOrder + i + 1,
          });
        }
      }

      setDialogOpen(false);
      fetchVans();
    } catch (err: unknown) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleStatus = async (van: Van) => {
    const newStatus: VanStatus = van.status === "available" ? "hidden" : "available";
    const { error } = await supabase.from("vans").update({ status: newStatus }).eq("id", van.id);
    if (!error) {
      fetchVans();
      toast({ title: `Van ${newStatus === "available" ? "Visible" : "Hidden"}` });
    }
  };

  const totalImages = (van: Van) => (van.image_url ? 1 : 0) + (van.images?.length ?? 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fleet Management</h1>
            <p className="text-muted-foreground text-sm mt-1">{vans.length} vehicles in fleet</p>
          </div>
          <Button onClick={openAddDialog} className="gap-2" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
            <Plus className="w-4 h-4" /> Add Van
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="overflow-hidden shadow-card border-0">
              <Skeleton className="h-44 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          )) : vans.map((van) => (
            <motion.div key={van.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="overflow-hidden shadow-card border-0 group">
                <div className="relative h-44 overflow-hidden bg-muted">
                  {van.image_url ? (
                    <img src={van.image_url} alt={van.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge[van.status]}`}>
                      {van.status}
                    </span>
                  </div>
                  {totalImages(van) > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      {totalImages(van)} รูป
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold">{van.name}</h3>
                      <p className="text-xs text-muted-foreground">{van.model}</p>
                    </div>
                    <p className="font-bold text-gold">฿{Number(van.price_per_day).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/day</span></p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{van.seats} seats</span>
                    {van.features.wifi && <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />WiFi</span>}
                    {van.features.ac && <span className="flex items-center gap-1"><Wind className="w-3 h-3" />AC</span>}
                    {van.features.vip_seats && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-gold" />VIP</span>}
                    {van.co2_per_km != null && (
                      <span className="flex items-center gap-1 text-green-600"><Leaf className="w-3 h-3" />{van.co2_per_km}g/km</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1" onClick={() => openEditDialog(van)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 gap-1" onClick={() => toggleStatus(van)}>
                      {van.status === "available" ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {van.status === "available" ? "Hide" : "Show"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVan ? "Edit Van" : "Add New Van"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Van Name</Label>
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Executive Elite" />
              </div>
              <div className="space-y-1.5">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => setForm(f => ({ ...f, model: e.target.value }))} placeholder="Mercedes V-Class" />
              </div>
            </div>
            <div className="space-y-1.5">
               <Label>Price per Day (฿)</Label>
               <Input type="number" min={0} value={form.price_per_day} onChange={(e) => setForm(f => ({ ...f, price_per_day: Number(e.target.value) }))} />
             </div>
            <div className="space-y-1.5">
              <Label>รูปหลัก (URL หรืออัปโหลด)</Label>
              <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <Label>อัปโหลดรูปหลัก</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} />
            </div>

            {/* Additional Images */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><ImagePlus className="w-4 h-4" /> รูปเพิ่มเติม (สำหรับ Carousel)</Label>
              
              {/* Existing additional images */}
              {additionalImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {additionalImages.map((img) => (
                    <div key={img.id} className="relative group rounded-lg overflow-hidden border border-border">
                      <img src={img.image_url} alt="" className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.id)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Preview new files */}
              {newImageFiles.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {newImageFiles.map((file, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-dashed border-gold/50">
                      <img src={URL.createObjectURL(file)} alt="" className="w-full h-20 object-cover" />
                      <button
                        type="button"
                        onClick={() => setNewImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-gold/80 text-primary text-[10px] text-center py-0.5">ใหม่</div>
                    </div>
                  ))}
                </div>
              )}

              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setNewImageFiles(prev => [...prev, ...files]);
                  e.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">เลือกหลายรูปได้ ลูกค้าจะเห็นเป็น Carousel เลื่อนดูรูป</p>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Van description..." />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as VanStatus }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="hidden">Hidden</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Leaf className="w-4 h-4 text-green-600" /> CO₂ Emission (g/km)</Label>
              <Input type="number" min={0} step={0.1} value={form.co2_per_km} onChange={(e) => setForm(f => ({ ...f, co2_per_km: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="e.g. 150" />
              <p className="text-xs text-muted-foreground">ปล่อยว่างหากไม่ทราบค่า CO₂</p>
            </div>
            <div className="space-y-3">
               <Label>สิ่งอำนวยความสะดวก</Label>
               <div className="grid grid-cols-2 gap-3">
                 <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                   <input type="checkbox" checked={form.features.wifi} onChange={(e) => setForm(f => ({ ...f, features: { ...f.features, wifi: e.target.checked } }))} className="rounded" />
                   <Wifi className="w-4 h-4 text-muted-foreground" />
                   <span className="text-sm">Free WiFi</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                   <input type="checkbox" checked={form.features.ac} onChange={(e) => setForm(f => ({ ...f, features: { ...f.features, ac: e.target.checked } }))} className="rounded" />
                   <Wind className="w-4 h-4 text-muted-foreground" />
                   <span className="text-sm">แอร์</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                   <input type="checkbox" checked={form.features.vip_seats} onChange={(e) => setForm(f => ({ ...f, features: { ...f.features, vip_seats: e.target.checked } }))} className="rounded" />
                   <Star className="w-4 h-4 text-gold" />
                   <span className="text-sm">VIP Seats</span>
                 </label>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-2">
                 <div className="space-y-1.5">
                   <Label className="flex items-center gap-1.5"><Users className="w-4 h-4" /> จำนวนที่นั่ง</Label>
                   <Input type="number" min={1} value={form.seats} onChange={(e) => setForm(f => ({ ...f, seats: Number(e.target.value) }))} />
                 </div>
               </div>
             </div>
            <Button onClick={handleSave} disabled={saving} className="w-full" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Saving..." : editingVan ? "Save Changes" : "Add Van"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
