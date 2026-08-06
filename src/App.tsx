import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy-loaded routes for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Vehicles = lazy(() => import("./pages/Vehicles"));
const VehicleForm = lazy(() => import("./pages/VehicleForm"));
const Auctions = lazy(() => import("./pages/Auctions"));
const AuctionForm = lazy(() => import("./pages/AuctionForm"));
const AuctionDetail = lazy(() => import("./pages/AuctionDetail"));
const TelegramGroups = lazy(() => import("./pages/TelegramGroups"));
const CRM = lazy(() => import("./pages/CRM"));
const LeadDetail = lazy(() => import("./pages/LeadDetail"));
const ActivityLog = lazy(() => import("./pages/ActivityLog"));
const VehicleGallery = lazy(() => import("./pages/VehicleGallery"));
const BidMiniApp = lazy(() => import("./pages/BidMiniApp"));
const NotFound = lazy(() => import("./pages/NotFound"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center text-muted-foreground">
    Cargando...
  </div>
);

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Demo pública: no hay pantalla de login */}
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/vehiculos" element={<Vehicles />} />
        <Route path="/vehiculos/nuevo" element={<VehicleForm />} />
        <Route path="/vehiculos/:id" element={<VehicleForm />} />
        <Route path="/subastas" element={<Auctions />} />
        <Route path="/subastas/nueva" element={<AuctionForm />} />
        <Route path="/subastas/:id" element={<AuctionDetail />} />
        <Route path="/subastas/:id/editar" element={<AuctionForm />} />
        <Route path="/grupos" element={<TelegramGroups />} />
        <Route path="/crm" element={<CRM />} />
        <Route path="/crm/:id" element={<LeadDetail />} />
        <Route path="/actividad" element={<ActivityLog />} />
        <Route path="/galeria/:auctionId" element={<VehicleGallery />} />
        <Route path="/ofertar/:auctionId" element={<BidMiniApp />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
