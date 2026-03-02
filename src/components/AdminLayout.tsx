import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Car, CalendarCheck, LogOut, Crown, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/fleet", label: "Fleet", icon: Car },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const location = useLocation();

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
        <nav className="flex-1 p-4 space-y-1">
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
      <main className="flex-1 overflow-y-auto">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b bg-card shadow-sm">
          <a href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "hsl(var(--gold))" }}>
              <Crown className="w-3.5 h-3.5" style={{ color: "hsl(var(--primary))" }} />
            </div>
            <span className="font-semibold text-sm">GOLDMINE_TRAVEL</span>
          </a>
          <div className="flex gap-2">
            {navItems.map((item) => {
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
