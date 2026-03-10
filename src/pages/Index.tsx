import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  Search, Copy, Loader2, ChevronLeft, ChevronRight as ChevronRightIcon, Globe,
  Car, Navigation, CreditCard, QrCode, Banknote, ThumbsUp } from
"lucide-react";
import heroVan from "@/assets/hero-van.jpg";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

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
  features: {wifi: boolean;ac: boolean;vip_seats: boolean;};
  status: string;
  co2_per_km: number | null;
  images: VanImage[];
  busy: boolean;
  driver?: {name: string;photo_url: string | null;experience_years: number;description: string | null;} | null;
}

interface Attraction {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  description_en: string | null;
  image_url: string | null;
  location: string | null;
}

interface EventItem {
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
}

type BookingType = "daily_rental" | "taxi";

const CONTACT_LINE = "https://line.me/ti/p/your-line-id";
const CONTACT_WHATSAPP = "https://wa.me/66800000000";

function getStatusText(status: string, t: (key: any) => string) {
  switch (status) {
    case "confirmed":return t("status.confirmed");
    case "pending":return t("status.pending");
    case "proceed":return t("status.proceed");
    case "completed":return t("status.completed");
    case "cancelled":return t("status.cancelled");
    default:return status;
  }
}

export default function Index() {
  const { t, lang, toggleLang } = useLanguage();
  const [vans, setVans] = useState<Van[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVan, setSelectedVan] = useState<Van | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [bookingCode, setBookingCode] = useState("");

  const [bookingType, setBookingType] = useState<BookingType>("daily_rental");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const [form, setForm] = useState({ name: "", phone: "", pickup: "", dropoff: "", pickupTime: "", notes: "", passengers: "", paymentMethod: "cash" });
  const [submitting, setSubmitting] = useState(false);
  const [bookingSummary, setBookingSummary] = useState<{vanName: string;startDate: string;endDate: string;days: number;totalPrice: number;bookingType: BookingType;} | null>(null);

  const [lookupCode, setLookupCode] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<any | null>(null);
  const [lookupResults, setLookupResults] = useState<any[]>([]);
  const [lookupError, setLookupError] = useState("");

  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [exploreTab, setExploreTab] = useState<"attractions" | "events">("attractions");

  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSearch, setRatingSearch] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingBookings, setRatingBookings] = useState<any[]>([]);
  const [ratingSelected, setRatingSelected] = useState<any | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();

  // Konami code
  useEffect(() => {
    const konamiCode = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "a", "b"];
    let index = 0;
    const handler = (e: KeyboardEvent) => {
      if (e.key === konamiCode[index]) {
        index++;
        if (index === konamiCode.length) {navigate("/admin/login");index = 0;}
      } else {index = 0;}
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const days = startDate && endDate ? differenceInDays(endDate, startDate) : 0;
  const totalPrice = selectedVan ? days * selectedVan.price_per_day : 0;
  const phoneRegex = /^(0[689]\d{8}|0[2-9]\d{7,8})$/;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("vans").select("*").eq("status", "available");
      const vansRaw = (data as any[] ?? []).map((v) => ({ ...v, features: v.features as {wifi: boolean;ac: boolean;vip_seats: boolean;}, images: [] as VanImage[], busy: false }));

      const vanIds = vansRaw.map((v) => v.id);
      if (vanIds.length > 0) {
        const { data: imagesData } = await supabase.from("van_images").select("*").in("van_id", vanIds).order("sort_order");
        const imagesByVan: Record<string, VanImage[]> = {};
        (imagesData ?? []).forEach((img: any) => {
          if (!imagesByVan[img.van_id]) imagesByVan[img.van_id] = [];
          imagesByVan[img.van_id].push(img);
        });
        vansRaw.forEach((v) => {v.images = imagesByVan[v.id] ?? [];});

        const { data: activeBookings } = await supabase.
        from("bookings").select("van_id").in("van_id", vanIds).in("status", ["confirmed", "proceed"]);
        const busyVanIds = new Set((activeBookings ?? []).map((b: any) => b.van_id));
        vansRaw.forEach((v) => {v.busy = busyVanIds.has(v.id);});

        const { data: driversData } = await (supabase as any).from("drivers").select("van_id, name, photo_url, experience_years, description").in("van_id", vanIds);
        const driversByVan: Record<string, any> = {};
        (driversData ?? []).forEach((d: any) => {if (d.van_id) driversByVan[d.van_id] = d;});
        vansRaw.forEach((v) => {v.driver = driversByVan[v.id] ?? null;});
      }

      setVans(vansRaw);
      setLoading(false);
    };
    load();
  }, []);

  // Load attractions & events
  useEffect(() => {
    const loadExplore = async () => {
      const [attrRes, evtRes] = await Promise.all([
      (supabase as any).from("attractions").select("*").eq("is_active", true).order("sort_order"),
      (supabase as any).from("events").select("*").eq("is_active", true).order("event_date")]
      );
      setAttractions(attrRes.data as Attraction[] ?? []);
      setEvents(evtRes.data as EventItem[] ?? []);
    };
    loadExplore();
  }, []);

  // Load QR URL
  useEffect(() => {
    const loadQR = async () => {
      const { data } = await (supabase as any).from("site_settings").select("value").eq("key", "payment_qr_url").maybeSingle();
      if (data?.value) setQrUrl(data.value);
    };
    loadQR();
  }, []);

  const openDetail = (van: Van) => {setSelectedVan(van);setDetailOpen(true);};
  const openBooking = (van: Van) => {setSelectedVan(van);setDetailOpen(false);setBookingOpen(true);setBookingType("daily_rental");};

  const handleRatingSearch = async () => {
    const q = ratingSearch.trim();
    if (!q) return;
    setRatingLoading(true);
    setRatingError("");
    setRatingBookings([]);
    setRatingSelected(null);
    setRatingSuccess(false);
    const isPhone = /^0\d+$/.test(q.replace(/[-\s]/g, ""));
    let query = supabase.from("bookings").select("*, vans(name, model, image_url)").eq("status", "completed");
    if (isPhone) {
      query = query.eq("customer_phone", q.replace(/[-\s]/g, ""));
    } else {
      query = query.eq("booking_code", q.toUpperCase());
    }
    const { data } = await query.order("created_at", { ascending: false });
    if (!data || data.length === 0) {
      setRatingError(t("rating.notFound"));
    } else {
      const bookingIds = data.map((b: any) => b.id);
      const { data: existingRatings } = await (supabase as any).from("driver_ratings").select("booking_id").in("booking_id", bookingIds);
      const ratedIds = new Set((existingRatings ?? []).map((r: any) => r.booking_id));
      setRatingBookings(data.map((b: any) => ({ ...b, alreadyRated: ratedIds.has(b.id) })));
    }
    setRatingLoading(false);
  };

  const handleRatingSubmit = async () => {
    if (!ratingSelected || ratingValue === 0) return;
    setRatingSubmitting(true);
    const { data: driver } = await (supabase as any).from("drivers").select("id, name").eq("van_id", ratingSelected.van_id).maybeSingle();
    if (!driver) {
      toast({ title: t("rating.noDriver"), variant: "destructive" });
      setRatingSubmitting(false);
      return;
    }
    const { error } = await (supabase as any).from("driver_ratings").insert({
      booking_id: ratingSelected.id,
      driver_id: driver.id,
      rating: ratingValue,
      comment: ratingComment || null,
      customer_name: ratingSelected.customer_name
    });
    if (error) {
      toast({ title: t("rating.failed"), description: error.message, variant: "destructive" });
    } else {
      setRatingSuccess(true);
      const selId = ratingSelected.id;
      setRatingSelected(null);
      setRatingValue(0);
      setRatingComment("");
      setRatingBookings((prev) => prev.map((b) => b.id === selId ? { ...b, alreadyRated: true } : b));
    }
    setRatingSubmitting(false);
  };

  const handleLookup = async () => {
    const q = lookupCode.trim();
    if (!q) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    setLookupResults([]);

    const isPhone = /^0\d+$/.test(q.replace(/[-\s]/g, ""));
    if (isPhone) {
      const { data } = await supabase.from("bookings").select("*, vans(name, model, image_url)").eq("customer_phone", q.replace(/[-\s]/g, "")).order("created_at", { ascending: false });
      if (!data || data.length === 0) {setLookupError(t("lookup.notFoundPhone"));} else
      {setLookupResults(data);}
    } else {
      const { data, error } = await supabase.from("bookings").select("*, vans(name, model, image_url)").eq("booking_code", q.toUpperCase()).maybeSingle();
      if (error || !data) {setLookupError(t("lookup.notFoundCode"));} else
      {setLookupResult(data);}
    }
    setLookupLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVan) return;
    if (!phoneRegex.test(form.phone.replace(/[-\s]/g, ""))) {
      toast({ title: t("val.invalidPhone"), description: t("val.invalidPhoneDesc"), variant: "destructive" });
      return;
    }

    if (bookingType === "daily_rental") {
      if (!startDate || !endDate || days < 1) {
        toast({ title: t("val.invalidDates"), description: t("val.invalidDatesDesc"), variant: "destructive" });
        return;
      }
    } else {
      if (!startDate) {
        toast({ title: t("val.invalidDates"), description: t("val.invalidDatesDesc"), variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    const bookingData: any = {
      customer_name: form.name,
      customer_phone: form.phone.replace(/[-\s]/g, ""),
      van_id: selectedVan.id,
      pickup_location: form.pickup,
      pickup_time: form.pickupTime || null,
      notes: form.notes || null,
      status: "pending",
      booking_type: bookingType,
      dropoff_location: form.dropoff || null,
      payment_method: form.paymentMethod
    };

    if (bookingType === "daily_rental") {
      bookingData.start_date = format(startDate!, "yyyy-MM-dd");
      bookingData.end_date = format(endDate!, "yyyy-MM-dd");
      bookingData.total_price = totalPrice;
    } else {
      bookingData.start_date = format(startDate!, "yyyy-MM-dd");
      bookingData.end_date = format(startDate!, "yyyy-MM-dd");
      bookingData.total_price = 0;
    }

    const { data, error } = await supabase.from("bookings").insert(bookingData).select().single();

    if (error) {
      toast({ title: t("val.bookingFailed"), description: error.message, variant: "destructive" });
    } else {
      setBookingCode((data as any).booking_code);
      setBookingSummary({
        vanName: selectedVan.name,
        startDate: format(startDate!, "d MMM"),
        endDate: bookingType === "daily_rental" ? format(endDate!, "d MMM yyyy") : format(startDate!, "d MMM yyyy"),
        days: bookingType === "daily_rental" ? days : 0,
        totalPrice: bookingType === "daily_rental" ? totalPrice : 0,
        bookingType
      });
      setBookingOpen(false);
      setSuccessOpen(true);
      setForm({ name: "", phone: "", pickup: "", dropoff: "", pickupTime: "", notes: "", passengers: "", paymentMethod: "cash" });
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
          <a href="/" className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-bold tracking-wide text-foreground">GOLDMINE_TRAVEL</p>
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#fleet" className="hover:text-foreground transition-colors">{t("nav.fleet")}</a>
            
            <a href="#why-us" className="hover:text-foreground transition-colors">{t("nav.why")}</a>
            

            
            <button onClick={() => setRatingOpen(true)} className="hover:text-foreground transition-colors flex items-center gap-1">
              <Star className="w-3.5 h-3.5" /> {t("nav.rating")}
            </button>
            <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">{t("nav.contact")}</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="hidden sm:flex border-foreground/20 text-foreground hover:bg-foreground/10" onClick={() => setLookupOpen(true)}>
              <Search className="w-3.5 h-3.5 mr-1.5" /> {t("nav.lookup")}
            </Button>
            <Button size="sm" asChild className="hidden sm:flex" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              <a href="#fleet">{t("nav.bookNow")}</a>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative h-screen flex items-center overflow-hidden">
        <img src={heroVan} alt="Luxury van" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, hsl(200 35% 8% / 0.92) 0%, hsl(200 35% 8% / 0.70) 60%, hsl(200 35% 8% / 0.20) 100%)" }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16">
          <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-xl">
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-gold mb-4">
              <div className="h-px w-8 bg-gold" /> {t("hero.tag")}
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5">
              {t("hero.title1")}<br />
              <span className="text-gold">{t("hero.title2")}</span><br />
              {t("hero.title3")}
            </h1>
            <p className="text-base sm:text-lg mb-8" style={{ color: "hsl(195 20% 75%)" }}>
              {t("hero.desc")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" asChild className="h-12 px-7 text-sm font-semibold" style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                <a href="#fleet" className="text-white bg-[#00d9ff]">{t("hero.browse")} <ArrowRight className="w-4 h-4 ml-2" /></a>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-12 px-7 text-sm font-semibold border-white/25 text-white hover:bg-white/10">
                <a href="#footer" className="text-white bg-[#44d600]"><Phone className="w-4 h-4 mr-2" /> {t("hero.contactUs")}</a>
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
            <p className="text-xs font-semibold tracking-widest uppercase text-gold mb-2">{t("why.tag")}</p>
            <h2 className="text-3xl font-bold text-white">{t("why.title")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {[
            { icon: Shield, titleKey: "why.licensed.title" as const, descKey: "why.licensed.desc" as const },
            { icon: Clock, titleKey: "why.247.title" as const, descKey: "why.247.desc" as const },
            { icon: Star, titleKey: "why.vip.title" as const, descKey: "why.vip.desc" as const }].
            map((item, i) =>
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="text-center">
                <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.15)", border: "1px solid hsl(var(--gold) / 0.3)" }}>
                  <item.icon className="w-6 h-6 text-gold" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{t(item.titleKey)}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(195 20% 60%)" }}>{t(item.descKey)}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Fleet */}
      <section id="fleet" className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-semibold tracking-widest uppercase text-gold mb-2 text-base">{t("fleet.tag")}</p>
            <h2 className="text-3xl font-bold text-foreground">{t("fleet.title")}</h2>
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto text-sm">{t("fleet.desc")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? Array.from({ length: 4 }).map((_, i) =>
            <SkeletonCard key={i} />
            ) : vans.map((van, i) =>
            <motion.div key={van.id} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} className="group cursor-pointer" onClick={() => openDetail(van)}>
                <div className={cn("bg-card rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-400 border border-border hover:border-gold/30", van.busy && "opacity-75")}>
                  <div className="relative">
                    <VanImageCarousel van={van} height="h-52" noImageText={t("fleet.noImage")} />
                    {van.busy &&
                  <div className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-semibold px-3 py-1 rounded-full">{t("fleet.busy")}</div>
                  }
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-foreground text-lg leading-tight">{van.name}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{van.model}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gold text-xl">฿{Number(van.price_per_day).toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{t("fleet.perDay")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 flex-wrap">
                      <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full">
                        <Users className="w-3 h-3" /> {van.seats} {t("fleet.seats")}
                      </span>
                      {van.features.wifi &&
                    <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full"><Wifi className="w-3 h-3" /> WiFi</span>
                    }
                      {van.features.ac &&
                    <span className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-full"><Wind className="w-3 h-3" /> AC</span>
                    }
                      {van.co2_per_km != null &&
                    <span className="flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                          <Leaf className="w-3 h-3" /> {van.co2_per_km}g CO₂/km
                        </span>
                    }
                    </div>

                    {van.driver &&
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                        {van.driver.photo_url ?
                    <img src={van.driver.photo_url} alt="" className="w-5 h-5 rounded-full object-cover" /> :

                    <User className="w-3.5 h-3.5" />
                    }
                        <span>{t("fleet.driver")}: {van.driver.name}</span>
                      </div>
                  }

                    <Button
                    className="w-full h-10 text-sm font-semibold"
                    style={{ background: van.busy ? "hsl(var(--muted))" : "hsl(var(--primary))", color: van.busy ? "hsl(var(--muted-foreground))" : "hsl(var(--primary-foreground))" }}
                    disabled={van.busy}
                    onClick={(e) => {e.stopPropagation();openBooking(van);}}>
                    
                      {van.busy ? t("fleet.busy") : t("fleet.book")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Explore: Attractions & Events */}
      {(attractions.length > 0 || events.length > 0) &&
      <section id="explore" className="py-20 px-4 sm:px-6 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <p className="font-semibold tracking-widest uppercase text-gold mb-2 text-base">{t("explore.tag")}</p>
              <div className="flex justify-center gap-3 mt-4">
                <Button
                variant={exploreTab === "attractions" ? "default" : "outline"}
                onClick={() => setExploreTab("attractions")}
                className={cn("gap-2", exploreTab === "attractions" && "bg-primary text-primary-foreground")}>
                
                  <MapPin className="w-4 h-4" /> {t("explore.attractions")}
                </Button>
                <Button
                variant={exploreTab === "events" ? "default" : "outline"}
                onClick={() => setExploreTab("events")}
                className={cn("gap-2", exploreTab === "events" && "bg-primary text-primary-foreground")}>
                
                  <CalendarIcon className="w-4 h-4" /> {t("explore.events")}
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {exploreTab === "attractions" &&
            <motion.div key="attractions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {attractions.length === 0 ?
              <p className="col-span-full text-center text-muted-foreground py-8">{t("explore.noAttractions")}</p> :
              attractions.map((a, i) =>
              <motion.div key={a.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                      <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border hover:border-gold/30 transition-all">
                        {a.image_url ?
                  <img src={a.image_url} alt={a.title} className="w-full h-44 object-cover" /> :

                  <div className="w-full h-44 bg-muted flex items-center justify-center"><MapPin className="w-10 h-10 text-muted-foreground" /></div>
                  }
                        <div className="p-4">
                          <h3 className="font-bold text-foreground">{lang === "en" && a.title_en ? a.title_en : a.title}</h3>
                          {a.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{a.location}</p>}
                          {(lang === "en" ? a.description_en || a.description : a.description) &&
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{lang === "en" ? a.description_en || a.description : a.description}</p>
                    }
                        </div>
                      </div>
                    </motion.div>
              )}
                </motion.div>
            }
              {exploreTab === "events" &&
            <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.length === 0 ?
              <p className="col-span-full text-center text-muted-foreground py-8">{t("explore.noEvents")}</p> :
              events.map((ev, i) =>
              <motion.div key={ev.id} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                      <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border hover:border-gold/30 transition-all">
                        {ev.image_url ?
                  <img src={ev.image_url} alt={ev.title} className="w-full h-44 object-cover" /> :

                  <div className="w-full h-44 bg-muted flex items-center justify-center"><CalendarIcon className="w-10 h-10 text-muted-foreground" /></div>
                  }
                        <div className="p-4">
                          <h3 className="font-bold text-foreground">{lang === "en" && ev.title_en ? ev.title_en : ev.title}</h3>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {ev.event_date &&
                      <span className="text-xs bg-gold/10 text-gold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <CalendarIcon className="w-3 h-3" /> {ev.event_date}{ev.event_end_date ? ` - ${ev.event_end_date}` : ""}
                              </span>
                      }
                            {ev.event_time &&
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {ev.event_time}</span>
                      }
                          </div>
                          {ev.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{ev.location}</p>}
                          {(lang === "en" ? ev.description_en || ev.description : ev.description) &&
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{lang === "en" ? ev.description_en || ev.description : ev.description}</p>
                    }
                        </div>
                      </div>
                    </motion.div>
              )}
                </motion.div>
            }
            </AnimatePresence>
          </div>
        </section>
      }

      {/* Footer */}
      <footer id="footer" style={{ background: "hsl(var(--primary))" }} className="py-10 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gold">
              <Crown className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm font-bold text-white">GOLDMINE_TRAVEL</p>
          </div>
          <p className="text-xs" style={{ color: "hsl(200 14% 45%)" }}>© 2024 GOLDMINE_TRAVEL. {t("footer.rights")}.</p>
          <div className="flex gap-4 text-xs" style={{ color: "hsl(200 14% 50%)" }}>
            
            
            <a href="/admin/login" className="hover:text-gold transition-colors text-center py-0 px-0 my-0 mx-[100px]">Admin</a>
          </div>
        </div>
      </footer>

      {/* Floating Buttons */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 items-end">
        <button
          onClick={() => setRatingOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95 bg-primary text-primary-foreground"
          aria-label="Rate driver">
          
          <Star className="w-4 h-4" />
          {t("nav.rating")}
        </button>
        <button
          onClick={toggleLang}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-semibold transition-all hover:scale-105 active:scale-95"
          style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}
          aria-label="Toggle language">
          
          <Globe className="w-4 h-4" />
          {lang === "th" ? "EN" : "TH"}
        </button>
      </div>

      {/* Van Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          {selectedVan &&
          <>
              <div className="relative">
                <VanImageCarousel van={selectedVan} height="h-64" rounded="rounded-t-lg" noImageText={t("fleet.noImage")} />
                <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
                  <h2 className="text-2xl font-bold text-white">{selectedVan.name}</h2>
                  <p className="text-white/75 text-sm">{selectedVan.model}</p>
                </div>
              </div>
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs">
                      <Users className="w-3 h-3" /> {selectedVan.seats} {t("fleet.passengers")}
                    </span>
                    {selectedVan.features.wifi && <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs"><Wifi className="w-3 h-3" /> WiFi</span>}
                    {selectedVan.features.ac && <span className="inline-flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-full text-xs"><Wind className="w-3 h-3" /> AC</span>}
                    {selectedVan.co2_per_km != null &&
                  <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs">
                        <Leaf className="w-3 h-3" /> {selectedVan.co2_per_km}g CO₂/km
                      </span>
                  }
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gold">฿{Number(selectedVan.price_per_day).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">{t("fleet.perDay")}</p>
                  </div>
                </div>
                {selectedVan.description &&
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedVan.description}</p>
              }
                {selectedVan.driver &&
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
                    {selectedVan.driver.photo_url ?
                <img src={selectedVan.driver.photo_url} alt={selectedVan.driver.name} className="w-12 h-12 rounded-full object-cover border-2 border-gold/30" /> :

                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gold/15 text-gold font-bold">
                        {selectedVan.driver.name[0]}
                      </div>
                }
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gold" /> {t("fleet.driver")}: {selectedVan.driver.name}
                      </p>
                      {selectedVan.driver.experience_years > 0 &&
                  <p className="text-xs text-muted-foreground">{t("fleet.experience")} {selectedVan.driver.experience_years} {t("fleet.years")}</p>
                  }
                      {selectedVan.driver.description &&
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selectedVan.driver.description}</p>
                  }
                    </div>
                  </div>
              }
                <Button
                className="w-full h-12 text-sm font-semibold"
                style={{ background: selectedVan.busy ? "hsl(var(--muted))" : "hsl(var(--gold))", color: selectedVan.busy ? "hsl(var(--muted-foreground))" : "hsl(var(--primary))" }}
                disabled={selectedVan.busy}
                onClick={() => openBooking(selectedVan)}>
                
                  {selectedVan.busy ? t("fleet.busy") : t("nav.bookNow")} {!selectedVan.busy && <ArrowRight className="w-4 h-4 ml-2" />}
                </Button>
              </div>
            </>
          }
        </DialogContent>
      </Dialog>

      {/* Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" />
              {t("booking.title")} {selectedVan?.name}
            </DialogTitle>
          </DialogHeader>

          {selectedVan &&
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
              {/* Booking Type Toggle */}
              <div className="flex gap-2 p-1.5 bg-muted/60 rounded-xl">
                <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all border-2",
                  bookingType === "daily_rental" ?
                  "bg-primary text-primary-foreground border-primary shadow-md" :
                  "bg-card/50 text-muted-foreground border-transparent hover:bg-card hover:text-foreground"
                )}
                onClick={() => setBookingType("daily_rental")}>
                
                  <Car className="w-5 h-5" /> {t("booking.typeDaily")}
                </button>
                <button
                type="button"
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all border-2",
                  bookingType === "taxi" ?
                  "bg-accent text-accent-foreground border-accent shadow-md" :
                  "bg-card/50 text-muted-foreground border-transparent hover:bg-card hover:text-foreground"
                )}
                onClick={() => setBookingType("taxi")}>
                
                  <Navigation className="w-5 h-5" /> {t("booking.typeTaxi")}
                </button>
              </div>

              {bookingType === "daily_rental" ?
            <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("booking.startDate")}</Label>
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {startDate ? format(startDate, "d MMM yyyy") : t("booking.pickDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={(d) => {setStartDate(d);setStartOpen(false);}} disabled={(d) => !isAfter(d, new Date())} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("booking.endDate")}</Label>
                      <Popover open={endOpen} onOpenChange={setEndOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !endDate && "text-muted-foreground")}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {endDate ? format(endDate, "d MMM yyyy") : t("booking.pickDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={endDate} onSelect={(d) => {setEndDate(d);setEndOpen(false);}} disabled={(d) => !startDate || !isAfter(d, startDate)} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {days > 0 &&
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl p-4 text-sm flex items-center justify-between" style={{ background: "hsl(var(--gold) / 0.08)", border: "1px solid hsl(var(--gold) / 0.25)" }}>
                      <span className="text-muted-foreground">฿{Number(selectedVan.price_per_day).toLocaleString()} × {days} {days > 1 ? t("booking.days") : t("booking.day")}</span>
                      <span className="text-lg font-bold text-gold">฿{totalPrice.toLocaleString()}</span>
                    </motion.div>
              }
                </> :

            <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>{t("booking.taxiDate")}</Label>
                      <Popover open={startOpen} onOpenChange={setStartOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-10", !startDate && "text-muted-foreground")}>
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            {startDate ? format(startDate, "d MMM yyyy") : t("booking.pickDate")}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={startDate} onSelect={(d) => {setStartDate(d);setStartOpen(false);}} disabled={(d) => !isAfter(d, new Date())} initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("booking.taxiTime")}</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input type="time" className="pl-9" value={form.pickupTime} onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))} required />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>{t("booking.passengers")} <span className="text-muted-foreground text-xs">{t("booking.optional")}</span></Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input type="number" min={1} max={20} placeholder="1-20" className="pl-9" value={form.passengers} onChange={(e) => setForm((f) => ({ ...f, passengers: e.target.value }))} />
                    </div>
                  </div>
                </>
            }

              <div className="space-y-1.5">
                <Label>{t("booking.name")}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("booking.namePlaceholder")} className="pl-9" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t("booking.phone")}</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("booking.phonePlaceholder")} className="pl-9" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
                </div>
                <p className="text-xs text-muted-foreground">{t("booking.phoneHint")}</p>
              </div>

              <div className="space-y-1.5">
                <Label>{t("booking.pickup")}</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder={t("booking.pickupPlaceholder")} className="pl-9" value={form.pickup} onChange={(e) => setForm((f) => ({ ...f, pickup: e.target.value }))} required />
                </div>
              </div>

              {bookingType === "taxi" &&
            <div className="space-y-1.5">
                  <Label>{t("booking.dropoff")}</Label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input placeholder={t("booking.dropoffPlaceholder")} className="pl-9" value={form.dropoff} onChange={(e) => setForm((f) => ({ ...f, dropoff: e.target.value }))} required />
                  </div>
                </div>
            }

              {bookingType === "daily_rental" &&
            <div className="space-y-1.5">
                  <Label>{t("booking.pickupTime")}</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="time" placeholder="08:00" className="pl-9" value={form.pickupTime} onChange={(e) => setForm((f) => ({ ...f, pickupTime: e.target.value }))} />
                  </div>
                </div>
            }

              <div className="space-y-1.5">
                <Label>{t("booking.notes")} <span className="text-muted-foreground text-xs">{t("booking.optional")}</span></Label>
                <Textarea
                placeholder={bookingType === "taxi" ? t("booking.taxiNotesPlaceholder") : t("booking.notesPlaceholder")}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>{t("booking.paymentMethod")}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                { value: "credit_card", icon: CreditCard, labelKey: "booking.payCredit" as const, activeClass: "border-accent bg-accent/10 text-foreground" },
                { value: "qr_code", icon: QrCode, labelKey: "booking.payQR" as const, activeClass: "border-primary bg-primary/10 text-foreground" },
                { value: "cash", icon: Banknote, labelKey: "booking.payCash" as const, activeClass: "border-gold bg-gold/10 text-foreground" }].
                map((pm) =>
                <button
                  key={pm.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, paymentMethod: pm.value }))}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-xs font-semibold transition-all",
                    form.paymentMethod === pm.value ?
                    pm.activeClass + " shadow-sm" :
                    "border-border bg-card text-muted-foreground hover:border-foreground/30"
                  )}>
                  
                      <pm.icon className="w-5 h-5" />
                      {t(pm.labelKey)}
                    </button>
                )}
                </div>
                {form.paymentMethod === "qr_code" && qrUrl &&
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="p-3 bg-card rounded-xl border border-border text-center">
                    <img src={qrUrl} alt="QR Payment" className="w-48 h-48 mx-auto rounded-lg object-contain" />
                    <p className="text-xs text-muted-foreground mt-2">{t("booking.scanQR")}</p>
                  </motion.div>
              }
                {form.paymentMethod === "cash" &&
              <p className="text-xs text-muted-foreground">{t("booking.cashNote")}</p>
              }
              </div>

              <Button
              type="submit"
              disabled={submitting || !startDate || bookingType === "daily_rental" && (!endDate || days < 1)}
              className="w-full h-12 text-sm font-semibold"
              style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
              
                {submitting ? t("booking.submitting") : t("booking.submit")}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                {bookingType === "taxi" ? t("booking.taxiPriceNote") : t("booking.confirmNote")}
              </p>
            </form>
          }
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
              <h2 className="text-xl font-bold mb-1">{t("success.title")}</h2>
              <p className="text-muted-foreground text-sm mb-2">{t("success.code")}</p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                style={{ background: "hsl(var(--gold) / 0.12)", border: "1px solid hsl(var(--gold) / 0.3)" }}
                onClick={() => {
                  navigator.clipboard.writeText(bookingCode);
                  toast({ title: t("success.copied"), description: `${bookingCode}` });
                }}>
                
                <span className="font-mono font-bold text-2xl tracking-widest text-gold">{bookingCode}</span>
                <Copy className="w-4 h-4 text-gold" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">{t("success.copyHint")}</p>
            </div>
            <div className="rounded-xl p-4 text-sm text-left space-y-1" style={{ background: "hsl(var(--muted))" }}>
              <p className="font-semibold text-foreground">{bookingSummary?.vanName}</p>
              {bookingSummary && bookingSummary.bookingType === "daily_rental" &&
              <p className="text-muted-foreground">{bookingSummary.startDate} – {bookingSummary.endDate} ({bookingSummary.days} {t("booking.days")})</p>
              }
              {bookingSummary && bookingSummary.bookingType === "taxi" &&
              <p className="text-muted-foreground">{bookingSummary.startDate} • {t("booking.typeTaxi")}</p>
              }
              {bookingSummary && bookingSummary.totalPrice > 0 &&
              <p className="text-gold font-bold">{t("success.total")}: ฿{bookingSummary.totalPrice.toLocaleString()}</p>
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {bookingSummary?.bookingType === "taxi" ? t("success.taxiNote") : t("success.confirmNote")}
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                <a href={CONTACT_LINE} target="_blank" rel="noreferrer">
                  <MessageCircle className="w-4 h-4 mr-2" /> {t("success.chatLine")}
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={CONTACT_WHATSAPP} target="_blank" rel="noreferrer">
                  <Phone className="w-4 h-4 mr-2" /> {t("success.chatWhatsapp")}
                </a>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Booking Lookup Dialog */}
      <Dialog open={lookupOpen} onOpenChange={(open) => {setLookupOpen(open);if (!open) {setLookupResult(null);setLookupResults([]);setLookupError("");setLookupCode("");}}}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gold" />
              {t("lookup.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Input
                placeholder={t("lookup.placeholder")}
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                className="font-mono tracking-wider uppercase" />
              
              <Button onClick={handleLookup} disabled={lookupLoading || !lookupCode.trim()} style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                {lookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("lookup.hint")}</p>

            {lookupError &&
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive text-center py-2">{lookupError}</motion.p>
            }

            {lookupResults.length > 0 && !lookupResult &&
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t("lookup.found")} {lookupResults.length} {t("lookup.bookings")}</p>
                {lookupResults.map((b: any) =>
              <div key={b.id} onClick={() => setLookupResult(b)} className="p-3 rounded-lg border border-border hover:border-gold/40 cursor-pointer transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold tracking-wider text-gold">{b.booking_code ?? "—"}</span>
                        <p className="text-sm font-medium mt-0.5">{b.vans?.name ?? "Van"}</p>
                        {b.booking_type === "taxi" && <span className="text-[10px] bg-accent px-1.5 py-0.5 rounded">{t("lookup.taxi")}</span>}
                      </div>
                      <span className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-semibold",
                    b.status === "confirmed" && "bg-green-100 text-green-700",
                    b.status === "pending" && "bg-yellow-100 text-yellow-700",
                    b.status === "proceed" && "bg-purple-100 text-purple-700",
                    b.status === "completed" && "bg-blue-100 text-blue-700",
                    b.status === "cancelled" && "bg-red-100 text-red-700"
                  )}>
                        {getStatusText(b.status, t)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{b.start_date} → {b.end_date} • ฿{Number(b.total_price).toLocaleString()}</p>
                  </div>
              )}
              </motion.div>
            }

            {lookupResult &&
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {lookupResults.length > 0 &&
              <button onClick={() => setLookupResult(null)} className="text-xs text-gold hover:underline flex items-center gap-1">
                    <ChevronLeft className="w-3 h-3" /> {t("lookup.back")}
                  </button>
              }
                <div className="rounded-xl overflow-hidden border border-border">
                  {lookupResult.vans?.image_url &&
                <img src={lookupResult.vans.image_url} alt={lookupResult.vans.name} className="w-full h-40 object-cover" />
                }
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
                      lookupResult.status === "cancelled" && "bg-red-100 text-red-700"
                    )}>
                        {getStatusText(lookupResult.status, t)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.bookingCode")}</p>
                        <p className="font-mono font-bold text-gold tracking-wider">{lookupResult.booking_code ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.bookingType")}</p>
                        <p className="font-medium text-foreground">{lookupResult.booking_type === "taxi" ? t("lookup.taxi") : t("lookup.daily")}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.bookerName")}</p>
                        <p className="font-medium text-foreground">{lookupResult.customer_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.phoneLabel")}</p>
                        <p className="font-medium text-foreground">{lookupResult.customer_phone}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.startDate")}</p>
                        <p className="font-medium text-foreground">{lookupResult.start_date}</p>
                      </div>
                      {lookupResult.booking_type !== "taxi" &&
                    <div>
                          <p className="text-xs text-muted-foreground">{t("lookup.endDate")}</p>
                          <p className="font-medium text-foreground">{lookupResult.end_date}</p>
                        </div>
                    }
                      <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.pickupLocation")}</p>
                        <p className="font-medium text-foreground">{lookupResult.pickup_location}</p>
                      </div>
                      {lookupResult.dropoff_location &&
                    <div>
                          <p className="text-xs text-muted-foreground">{t("lookup.dropoffLocation")}</p>
                          <p className="font-medium text-foreground">{lookupResult.dropoff_location}</p>
                        </div>
                    }
                      {lookupResult.total_price > 0 &&
                    <div>
                          <p className="text-xs text-muted-foreground">{t("lookup.totalPrice")}</p>
                          <p className="font-bold text-gold">฿{Number(lookupResult.total_price).toLocaleString()}</p>
                        </div>
                    }
                    </div>
                    {lookupResult.notes &&
                  <div>
                        <p className="text-xs text-muted-foreground">{t("lookup.notes")}</p>
                        <p className="text-sm text-foreground">{lookupResult.notes}</p>
                      </div>
                  }
                  </div>
                </div>
              </motion.div>
            }
          </div>
        </DialogContent>
      </Dialog>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={(open) => {setRatingOpen(open);if (!open) {setRatingSearch("");setRatingBookings([]);setRatingSelected(null);setRatingError("");setRatingSuccess(false);setRatingValue(0);setRatingComment("");}}}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-gold" />
              {t("rating.title")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!ratingSelected &&
            <>
                <div className="flex gap-2">
                  <Input
                  placeholder={t("rating.searchPlaceholder")}
                  value={ratingSearch}
                  onChange={(e) => setRatingSearch(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleRatingSearch()}
                  className="font-mono tracking-wider uppercase" />
                
                  <Button onClick={handleRatingSearch} disabled={ratingLoading || !ratingSearch.trim()} style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                    {ratingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("rating.searchHint")}</p>

                {ratingError &&
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-destructive text-center py-2">{ratingError}</motion.p>
              }

                {ratingSuccess &&
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4 space-y-2">
                    <div className="w-14 h-14 rounded-full mx-auto flex items-center justify-center" style={{ background: "hsl(var(--gold) / 0.1)", border: "2px solid hsl(var(--gold) / 0.4)" }}>
                      <ThumbsUp className="w-7 h-7 text-gold" />
                    </div>
                    <p className="font-bold text-foreground">{t("rating.thankYou")}</p>
                    <p className="text-sm text-muted-foreground">{t("rating.thankYouDesc")}</p>
                  </motion.div>
              }

                {ratingBookings.length > 0 &&
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <p className="text-sm font-medium">{t("rating.selectTrip")}</p>
                    {ratingBookings.map((b: any) =>
                <div
                  key={b.id}
                  onClick={() => !b.alreadyRated && setRatingSelected(b)}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    b.alreadyRated ?
                    "border-border bg-muted/50 opacity-60 cursor-not-allowed" :
                    "border-border hover:border-gold/40 cursor-pointer"
                  )}>
                  
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono text-xs font-bold tracking-wider text-gold">{b.booking_code ?? "—"}</span>
                            <p className="text-sm font-medium mt-0.5">{b.vans?.name ?? "Van"}</p>
                          </div>
                          {b.alreadyRated ?
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{t("rating.alreadyRated")}</span> :

                    <span className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{t("rating.rateNow")}</span>
                    }
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{b.start_date} • {b.pickup_location}</p>
                      </div>
                )}
                  </motion.div>
              }
              </>
            }

            {ratingSelected &&
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <button onClick={() => {setRatingSelected(null);setRatingValue(0);setRatingComment("");}} className="text-xs text-gold hover:underline flex items-center gap-1">
                  <ChevronLeft className="w-3 h-3" /> {t("rating.backToList")}
                </button>

                <div className="rounded-xl p-4 border border-border bg-muted/30 text-center space-y-1">
                  <p className="font-bold text-foreground">{ratingSelected.vans?.name}</p>
                  <p className="text-xs text-muted-foreground">{ratingSelected.booking_code} • {ratingSelected.start_date}</p>
                </div>

                <div className="text-center space-y-2">
                  <p className="text-sm font-semibold">{t("rating.howWas")}</p>
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) =>
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="p-1 transition-transform hover:scale-110">
                    
                        <Star className={cn("w-8 h-8 transition-colors", star <= ratingValue ? "fill-gold text-gold" : "text-border")} />
                      </button>
                  )}
                  </div>
                  {ratingValue > 0 &&
                <p className="text-xs text-gold font-medium">
                      {ratingValue === 5 ? t("rating.star5") : ratingValue === 4 ? t("rating.star4") : ratingValue === 3 ? t("rating.star3") : ratingValue === 2 ? t("rating.star2") : t("rating.star1")}
                    </p>
                }
                </div>

                <div className="space-y-1.5">
                  <Label>{t("rating.comment")} <span className="text-muted-foreground text-xs">{t("booking.optional")}</span></Label>
                  <Textarea
                  placeholder={t("rating.commentPlaceholder")}
                  rows={2}
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)} />
                
                </div>

                <Button
                onClick={handleRatingSubmit}
                disabled={ratingSubmitting || ratingValue === 0}
                className="w-full h-11"
                style={{ background: "hsl(var(--gold))", color: "hsl(var(--primary))" }}>
                
                  {ratingSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                  {t("rating.submitRating")}
                </Button>
              </motion.div>
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>);

}

// Image carousel
function VanImageCarousel({ van, height = "h-52", rounded = "", noImageText = "No Image" }: {van: Van;height?: string;rounded?: string;noImageText?: string;}) {
  const [current, setCurrent] = useState(0);
  const allImages = [...(van.image_url ? [van.image_url] : []), ...van.images.map((img) => img.image_url)];

  if (allImages.length === 0) {
    return <div className={`relative ${height} ${rounded} overflow-hidden bg-muted flex items-center justify-center text-muted-foreground`}>{noImageText}</div>;
  }

  return (
    <div className={`relative ${height} ${rounded} overflow-hidden group/carousel`}>
      <img src={allImages[current]} alt={van.name} className="w-full h-full object-cover transition-transform duration-500" />
      {van.features.vip_seats &&
      <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gold text-primary"><Star className="w-3 h-3" /> VIP</span>
        </div>
      }
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      {allImages.length > 1 &&
      <>
          <button type="button" onClick={(e) => {e.stopPropagation();setCurrent((c) => (c - 1 + allImages.length) % allImages.length);}} className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={(e) => {e.stopPropagation();setCurrent((c) => (c + 1) % allImages.length);}} className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity z-10">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 z-10">
            {allImages.map((_, i) =>
          <button key={i} type="button" onClick={(e) => {e.stopPropagation();setCurrent(i);}} className={`w-1.5 h-1.5 rounded-full transition-all ${i === current ? "bg-white w-3" : "bg-white/50"}`} />
          )}
          </div>
        </>
      }
    </div>);

}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden shadow-card border border-border">
      <Skeleton className="h-52 w-full" />
      <div className="p-5 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>);

}