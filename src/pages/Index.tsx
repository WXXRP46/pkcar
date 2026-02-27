import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { format, differenceInDays, addDays, isAfter } from "date-fns";
import {
  Crown, Users, Wifi, Wind, Star, CalendarIcon, MapPin, Phone, User,
  CheckCircle, MessageCircle, ArrowRight, Shield, Clock, ChevronDown, Leaf,
  Search, Copy, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon
} from "lucide-react";
import heroVan from "@/assets/hero-van.jpg";
import { cn } from "@/lib/utils";

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
  status: string;
  co2_per_km: number | null;
  images: VanImage[];
}

const CONTACT_LINE = "https://line.me/ti/p/your-line-id";
const CONTACT_WHATSAPP = "https://wa.me/66800000000";

export default function Index() {
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");

  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", pickup: "", pickupTime: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<{ vanName: string; startDate: string; endDate: string; days: number; totalPrice: number } | null>(null);

  // Booking lookup
  const [lookupCode, setLookupCode] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupError, setLookupError] = useState("");

  const { toast } = useToast();

  const days = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const totalPrice = selectedVan ? days * selectedVan.price_per_day : 0;

  const phoneRegex = /^(0[689]\d{8}|0[2-9]\d{7,8})$/;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("vans").select("*").eq("status", "available");
      const vansRaw = ((data as any[]) ?? []).map((v) => ({ ...v, features: v.features as { wifi: boolean; ac: boolean; vip_seats: boolean }, images: [] as VanImage[] }));
      
      // Fetch additional images
      const vanIds = vansRaw.map(v => v.id);
      if (vanIds.length > 0) {
        const { data: imagesData } = await supabase.from("van_images").select("*").in("van_id", vanIds).order("sort_order");
        const imagesByVan: Record<string, VanImage[]> = {};
        (imagesData ?? []).forEach((img: any) => {
          if (!imagesByVan[img.van_id]) imagesByVan[img.van_id] = [];
          imagesByVan[img.van_id].push(img);
        });
        vansRaw.forEach(v => { v.images = imagesByVan[v.id] ?? []; });
      }
      
      setVans(vansRaw);
      setLoading(false);
    };
    load();
  }, []);

  const openDetail = (van: Van) => {
    setSelectedVan(van);
    setDetailOpen(true);
  };

  const openBooking = (van: Van) => {
    setSelectedVan(van);
    setDetailOpen(false);
    setBookingOpen(true);
  };

  const handleLookup = async () => {
    if (!lookupCode.trim()) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    const { data, error } = await supabase
      .from("bookings")
      .select("*, vans(name, model, image_url)")
      .eq("booking_code", lookupCode.trim().toUpperCase())
      .maybeSingle();
    if (error || !data) {
      setLookupError("ไม่พบการจองด้วยรหัสนี้ กรุณาตรวจสอบอีกครั้ง");
    } else {
      setLookupResult(data);
    }
    setLookupLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVan || !startDate || !endDate) return;

    if (!phoneRegex.test(form.phone.replace(/[-\s]/g, ""))) {
      toast({ title: "Invalid Phone", description: "Please enter a valid Thai phone number.", variant: "destructive" });
      return;
    }

    if (days < 1) {
      toast({ title: "Invalid Dates", description: "End date must be after start date.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.from("bookings").insert({
      customer_name: form.name,
      customer_phone: form.phone.replace(/[-\s]/g, ""),
      van_id: selectedVan.id,
      start_date: format(startDate, "yyyy-MM-dd"),
      end_date: format(endDate, "yyyy-MM-dd"),
      pickup_location: form.pickup,
       pickup_time: form.pickupTime || null,
       total_price: totalPrice,
       notes: form.notes || null,
      status: "pending",
    }).select().single();

    if (error) {
      toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
    } else {
      setBookingCode((data as { booking_code: string }).booking_code);
      setBookingSummary({
        vanName: selectedVan.name,
        startDate: format(startDate, "d MMM"),
        endDate: format(endDate, "d MMM yyyy"),
        days,
        totalPrice,
      });
      setBookingOpen(false);
      setSuccessOpen(true);
      setForm({ name: "", phone: "", pickup: "", pickupTime: "", notes: "" });
      setStartDate(undefined);
      setEndDate(undefined);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold tracking-wide text-foreground">VAN ELITE</p>
              <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Premium Rental</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#fleet" className="hover:text-foreground transition-colors">Our Fleet</a>
            <a href="#why-us" className="hover:text-foreground transition-colors">Why Us</a>
            <button onClick={() => setLookupOpen(true)} className="hover:text-foreground transition-colors flex items-center gap-1">
              <Search className="w-3.5 h-3.5" /> ตรวจสอบการจอง
            </button>
            <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hidden sm:flex border-foreground/20 text-foreground hover:bg-foreground/10" onClick={() => setLookupOpen(true)}>
              <Search className="w-3.5 h-3.5 mr-1.5" /> ตรวจสอบการจอง
            </Button>
            <Button size="sm" asChild className="hidden sm:flex" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              <a href="#fleet">Book Now</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <img
          src={heroVan}
          alt="Luxury van"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(215 28% 6% / 0.92) 0%, hsl(215 28% 6% / 0.70) 60%, hsl(215 28% 6% / 0.20) 100%)" }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-xl"
          >
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-gold mb-4">
              <div className="h-px w-8 bg-gold" /> Premium Van Rental with Driver
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
              Travel in<br />
              <span className="text-gold">Executive</span><br />
              Comfort
            </h1>
            <p className="text-base sm:text-lg mb-8" style={{ color: "hsl(210 20% 75%)" }}>
              Luxury vans with professional drivers for corporate events, airport transfers, and VIP journeys across Thailand.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="h-12 px-7 text-sm font-semibold" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                <a href="#fleet">
                  เลือกดูรถ <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-7 text-sm font-semibold border-white/25 text-white hover:bg-white/10">
                <a href="#footer">
                  <Phone className="w-4 h-4 mr-2" /> ติดต่อเรา
                </a>
              </Button>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <ChevronDown className="w-6 h-6 text-white/50" />
          </motion.div>
        </div>
      </section>

      {/* Why Us */}
      <section id="why-us" className="py-20 px-4 sm:px-6" style={{ background: "hsl(var(--primary))" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-gold mb-2">Our Commitment</p>
            <h2 className="text-3xl font-bold text-white">Why Choose Van Elite?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
              { icon: Shield, title: "Licensed & Insured", desc: "All drivers are professionally licensed with comprehensive insurance coverage." },
              { icon: Clock, title: "24/7 Availability", desc: "Round-the-clock service for early flights, late events, and emergency transfers." },
              { icon: Star, title: "VIP Experience", desc: "Premium vehicles with in-cabin amenities designed for executive comfort." },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.15)", border: "1px solid hsl(var(--gold) / 0.3)" }}>
                  <item.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(210 20% 60%)" }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section id="fleet" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest uppercase text-gold mb-2">Our Vehicles</p>
            <h2 className="text-3xl font-bold text-foreground">Select Your Van</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">Each vehicle is meticulously maintained and equipped to deliver a first-class travel experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} />
            )) : vans.map((van, i) => (
              <motion.div
                key={van.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="group cursor-pointer"
                onClick={() => openDetail(van)}
              >
                <div className="bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-400 border border-border hover:border-gold/30">
                  <VanImageCarousel van={van} height="h-52" />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground text-lg leading-tight">{van.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{van.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gold text-xl">฿{Number(van.price_per_day).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">per day</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                        <Users className="w-3 h-3" /> {van.seats} seats
                      </span>
                      {van.features.wifi && (
                        <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                          <Wifi className="w-3 h-3" /> WiFi
                        </span>
                      )}
                      {van.features.ac && (
                        <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                          <Wind className="w-3 h-3" /> AC
                        </span>
                      )}
                      {van.co2_per_km != null && (
                        <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                          <Leaf className="w-3 h-3" /> {van.co2_per_km}g CO₂/km
                        </span>
                      )}
                    </div>

                    <Button
                      className="w-full h-10 text-sm font-semibold"
                      style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
                      onClick={(e) => { e.stopPropagation(); openBooking(van); }}
                    >
                      Book This Van
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="footer" style={{ background: "hsl(var(--primary))" }} className="py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">VAN ELITE</p>
              <p className="text-[10px]" style={{ color: "hsl(215 16% 50%)" }}>Premium Van Rental</p>
            </div>
          </div>
          <p className="text-xs" style={{ color: "hsl(215 16% 45%)" }}>© 2024 Van Elite. All rights reserved.</p>
          <div className="flex gap-4 text-xs" style={{ color: "hsl(215 16% 50%)" }}>
            <a href={CONTACT_LINE} target="_blank" rel="noreferrer" className="hover:text-gold transition-colors">LINE</a>
            <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-gold transition-colors">WhatsApp</a>
            <a href="/admin/login" className="hover:text-gold transition-colors">Admin</a>
          </div>
        </div>
      </footer>

      {/* Van Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedVan && (
            <>
              <div className="relative">
                <VanImageCarousel van={selectedVan} height="h-64" rounded="rounded-t-lg" />
                <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                  <h2 className="text-2xl font-bold text-white">{selectedVan.name}</h2>
                  <p className="text-white/75 text-sm">{selectedVan.model}</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs">
                      <Users className="w-3 h-3" /> {selectedVan.seats} Passengers
                    </span>
                    {selectedVan.features.wifi && <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs"><Wifi className="w-3 h-3" /> WiFi</span>}
                    {selectedVan.features.ac && <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs"><Wind className="w-3 h-3" /> AC</span>}
                    {selectedVan.co2_per_km != null && (
                      <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs">
                        <Leaf className="w-3 h-3" /> {selectedVan.co2_per_km}g CO₂/km
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gold">฿{Number(selectedVan.price_per_day).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">per day</p>
                  </div>
                </div>
                {selectedVan.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{selectedVan.description}</p>
                )}
                <Button
                  className="w-full h-12 text-sm font-semibold"
                  style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}
                  onClick={() => openBooking(selectedVan)}
                >
                  Book Now <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              Reserve {selectedVan?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedVan && (
            <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Date pickers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal h-10", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {startDate ? format(startDate, "d MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => { setStartDate(d); setStartOpen(false); }}
                        disabled={(d) => !isAfter(d, new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal h-10", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        {endDate ? format(endDate, "d MMM yyyy") : "Pick date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => { setEndDate(d); setEndOpen(false); }}
                        disabled={(d) => !startDate || !isAfter(d, startDate)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Price preview */}
              {days > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl p-4 text-sm flex items-center justify-between"
                  style={{ background: "hsl(var(--gold) / 0.08)", border: "1px solid hsl(var(--gold) / 0.25)" }}
                >
                  <span className="text-muted-foreground">฿{Number(selectedVan.price_per_day).toLocaleString()} × {days} day{days > 1 ? "s" : ""}</span>
                  <span className="text-lg font-bold text-gold">฿{totalPrice.toLocaleString()}</span>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Somchai Jaidee"
                    className="pl-9"
                    value={form.name}
                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="0891234567"
                    className="pl-9"
                    value={form.phone}
                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Thai format: 0XX-XXX-XXXX</p>
              </div>

              <div className="space-y-1.5">
                 <Label>Pickup Location</Label>
                 <div className="relative">
                   <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <Input
                     placeholder="Suvarnabhumi Airport, Terminal 2"
                     className="pl-9"
                     value={form.pickup}
                     onChange={(e) => setForm(f => ({ ...f, pickup: e.target.value }))}
                     required
                   />
                 </div>
               </div>

               <div className="space-y-1.5">
                 <Label>Pickup Time</Label>
                 <div className="relative">
                   <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <Input
                     type="time"
                     placeholder="08:00"
                     className="pl-9"
                     value={form.pickupTime}
                     onChange={(e) => setForm(f => ({ ...f, pickupTime: e.target.value }))}
                   />
                 </div>
               </div>

              <div className="space-y-1.5">
                <Label>Additional Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  placeholder="Special requests, drop-off location, number of passengers..."
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !startDate || !endDate || days < 1}
                className="w-full h-12 text-sm font-semibold"
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}
              >
                {submitting ? "Sending..." : "Confirm Booking Request"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Our team will contact you within 2 hours to confirm your booking.</p>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={setSuccessOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.1)", border: "2px solid hsl(var(--gold) / 0.4)" }}>
              <CheckCircle className="w-8 h-8 text-gold" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">จองสำเร็จ!</h2>
              <p className="text-muted-foreground text-sm mb-2">รหัสการจองของคุณ:</p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "hsl(var(--gold) / 0.12)", border: "1px solid hsl(var(--gold) / 0.3)" }}
                onClick={() => {
                  navigator.clipboard.writeText(bookingCode);
                  toast({ title: "คัดลอกแล้ว!", description: `รหัส ${bookingCode} ถูกคัดลอกแล้ว` });
                }}
              >
                <span className="font-mono font-bold text-2xl tracking-widest text-gold">{bookingCode}</span>
                <Copy className="w-4 h-4 text-gold" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">กดเพื่อคัดลอกรหัส • ใช้ค้นหาสถานะการจอง</p>
            </div>
            <div className="rounded-xl p-4 text-sm text-left space-y-1" style={{ background: "hsl(var(--muted))" }}>
              <p className="font-semibold text-foreground">{bookingSummary?.vanName}</p>
              {bookingSummary && (
                <p className="text-muted-foreground">{bookingSummary.startDate} – {bookingSummary.endDate} ({bookingSummary.days} วัน)</p>
              )}
              <p className="text-gold font-bold">รวม: ฿{(bookingSummary?.totalPrice ?? 0).toLocaleString()}</p>
            </div>
            <p className="text-xs text-muted-foreground">ทีมงานจะติดต่อกลับภายใน 2 ชั่วโมงเพื่อยืนยันการจอง</p>
            <div className="flex flex-col gap-2">
              <Button asChild style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                <a href={CONTACT_LINE} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> แชทผ่าน LINE
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer">
                  <Phone className="w-4 h-4 mr-2" /> ติดต่อผ่าน WhatsApp
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Lookup Dialog */}
      <Dialog open={lookupOpen} onOpenChange={(open) => { setLookupOpen(open); if (!open) { setLookupResult(null); setLookupError(""); setLookupCode(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gold" />
              ค้นหาการจอง
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder="กรอกรหัสการจอง เช่น A1B2C3"
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="font-mono tracking-wider uppercase"
              />
              <Button
                onClick={handleLookup}
                disabled={lookupLoading || !lookupCode.trim()}
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}
              >
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>

            {lookupError && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive text-center py-2">
                {lookupError}
              </motion.p>
            )}

            {lookupResult && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <div className="rounded-xl overflow-hidden border border-border">
                  {lookupResult.vans?.image_url && (
                    <img src={lookupResult.vans.image_url} alt={lookupResult.vans.name} className="w-full h-40 object-cover" />
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-foreground">{lookupResult.vans?.name || "Van"}</h3>
                        <p className="text-xs text-muted-foreground">{lookupResult.vans?.model}</p>
                      </div>
                       <span className={cn(
                         "px-2.5 py-1 rounded-full text-xs font-semibold",
                         lookupResult.status === "confirmed" && "bg-green-100 text-green-700",
                         lookupResult.status === "pending" && "bg-yellow-100 text-yellow-700",
                         lookupResult.status === "proceed" && "bg-purple-100 text-purple-700",
                         lookupResult.status === "completed" && "bg-blue-100 text-blue-700",
                         lookupResult.status === "cancelled" && "bg-red-100 text-red-700",
                       )}>
                         {lookupResult.status === "confirmed" ? "ยืนยันแล้ว" :
                          lookupResult.status === "pending" ? "รอดำเนินการ" :
                          lookupResult.status === "proceed" ? "กำลังดำเนินการ" :
                          lookupResult.status === "completed" ? "เสร็จสิ้น" : "ยกเลิก"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">ชื่อผู้จอง</p>
                        <p className="font-medium text-foreground">{lookupResult.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">เบอร์โทร</p>
                        <p className="font-medium text-foreground">{lookupResult.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">วันรับรถ</p>
                        <p className="font-medium text-foreground">{lookupResult.start_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">วันคืนรถ</p>
                        <p className="font-medium text-foreground">{lookupResult.end_date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">จุดรับรถ</p>
                        <p className="font-medium text-foreground">{lookupResult.pickup_location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">ราคารวม</p>
                        <p className="font-bold text-gold">฿{Number(lookupResult.total_price).toLocaleString()}</p>
                      </div>
                    </div>
                    {lookupResult.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground">หมายเหตุ</p>
                        <p className="text-sm text-foreground">{lookupResult.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Image carousel for van cards and detail
function VanImageCarousel({ van, height = "h-52", rounded = "" }: { van: Van; height?: string; rounded?: string }) {
  const [current, setCurrent] = useState(0);
  const allImages = [
    ...(van.image_url ? [van.image_url] : []),
    ...van.images.map(img => img.image_url),
  ];

  if (allImages.length === 0) {
    return (
      <div className={`relative ${height} ${rounded} overflow-hidden bg-muted flex items-center justify-center text-muted-foreground`}>
        No Image
      </div>
    );
  }

  return (
    <div className={`relative ${height} ${rounded} overflow-hidden group/carousel`}>
      <img src={allImages[current]} alt={van.name} className="w-full h-full object-cover transition-transform duration-500" />
      {van.features.vip_seats && (
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold text-primary">
            <Star className="w-3 h-3" /> VIP
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      {allImages.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + allImages.length) % allImages.length); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % allImages.length); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {allImages.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white w-3" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Skeleton card for loading state
function Card({ key }: { key?: number }) {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border" key={key}>
      <Skeleton className="h-52 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
