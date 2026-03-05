import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Car, CalendarCheck, LogOut, Crown, ChevronRight,
  CalendarDays, Users, BarChart3, UserCircle, Bell, MapPin, Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/calendar", label: "ปฏิทิน", icon: CalendarDays },
  { href: "/admin/fleet", label: "Fleet", icon: Car },
  { href: "/admin/drivers", label: "คนขับ", icon: UserCircle },
  { href: "/admin/customers", label: "ลูกค้า", icon: Users },
  { href: "/admin/reports", label: "รายงาน", icon: BarChart3 },
  { href: "/admin/attractions", label: "ที่เที่ยว", icon: MapPin },
  { href: "/admin/events", label: "กิจกรรม", icon: Sparkles },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const [newBookingCount, setNewBookingCount] = useState(0);
  const [showNotif, setShowNotif] = useState(false);

  useEffect(() => {
    // Count pending bookings
    const fetchPending = async () => {
      const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("status", "pending");
      setNewBookingCount(count ?? 0);
    };
    fetchPending();

    // Listen for new bookings
    const channel = supabase
      .channel("admin-notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => {
        setNewBookingCount(c => c + 1);
        setShowNotif(true);
        setTimeout(() => setShowNotif(false), 5000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-muted">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col" style={{ background: "hsl(var(--primary))" }}>
        {/* Logo */}
        <a href="/" className="p-6 border-b block hover:opacity-80 transition-opacity" style={{ borderColor: "hsl(200 25% 20%)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold))" }}>
              <Crown className="w-4 h-4" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <p className="text-xs font-semibold text-gold">GOLDMINE_TRAVEL</p>
          </div>
        </a>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.href;
            return (
              <Link key={item.href} to={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "text-primary font-semibold"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )} style={active ? { background: "hsl(var(--gold))", color: "hsl(var(--primary))" } : {}}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span>{item.label}</span>
                  {active && <ChevronRight className="w-3 h-3 ml-auto" />}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t" style={{ borderColor: "hsl(200 25% 20%)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "hsl(var(--gold) / 0.15)", color: "hsl(var(--gold))", border: "1px solid hsl(var(--gold) / 0.3)" }}>
              {profile?.full_name?.[0] ?? "A"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{profile?.full_name ?? "Admin"}</p>
              <p className="text-xs capitalize" style={{ color: "hsl(200 14% 50%)" }}>{profile?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 text-sidebar-foreground hover:text-white hover:bg-destructive/20"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Notification toast */}
        {showNotif && (
          <div className="fixed top-4 right-4 z-50 bg-card border border-gold/30 shadow-lg rounded-xl p-4 flex items-center gap-3 animate-in slide-in-from-top-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gold/15">
              <Bell className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-sm font-semibold">การจองใหม่เข้ามา!</p>
              <p className="text-xs text-muted-foreground">มีลูกค้าจองรถเข้ามาใหม่</p>
            </div>
          </div>
        )}

        {/* Notification badge on sidebar bookings */}

        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card shadow-sm">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold))" }}>
              <Crown className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <span className="font-semibold text-sm">GOLDMINE_TRAVEL</span>
          </a>
          <div className="flex gap-1 overflow-x-auto">
            {navItems.slice(0, 4).map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.href;
              return (
                <Link key={item.href} to={item.href}>
                  <Button variant={active ? "default" : "ghost"} size="icon" className="w-8 h-8">
                    <Icon className="w-4 h-4" />
                  </Button>
                </Link>
              );
            })}
            {newBookingCount > 0 && (
              <Link to="/admin/bookings">
                <Button variant="ghost" size="icon" className="w-8 h-8 relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {newBookingCount > 9 ? "9+" : newBookingCount}
                  </span>
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={signOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
