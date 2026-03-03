import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookings from "./pages/AdminBookings";
import AdminFleet from "./pages/AdminFleet";
import AdminCalendar from "./pages/AdminCalendar";
import AdminCustomers from "./pages/AdminCustomers";
import AdminReports from "./pages/AdminReports";
import AdminDrivers from "./pages/AdminDrivers";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/bookings" element={<ProtectedRoute><AdminBookings /></ProtectedRoute>} />
          <Route path="/admin/fleet" element={<ProtectedRoute><AdminFleet /></ProtectedRoute>} />
          <Route path="/admin/calendar" element={<ProtectedRoute><AdminCalendar /></ProtectedRoute>} />
          <Route path="/admin/customers" element={<ProtectedRoute><AdminCustomers /></ProtectedRoute>} />
          <Route path="/admin/reports" element={<ProtectedRoute><AdminReports /></ProtectedRoute>} />
          <Route path="/admin/drivers" element={<ProtectedRoute><AdminDrivers /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
