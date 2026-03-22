import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Login from "./pages/Login";

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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={
          loading ? null : user ? <Navigate to="/" replace /> : <Login />
        } />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/vehiculos" element={<ProtectedRoute><Vehicles /></ProtectedRoute>} />
        <Route path="/vehiculos/nuevo" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
        <Route path="/vehiculos/:id" element={<ProtectedRoute><VehicleForm /></ProtectedRoute>} />
        <Route path="/subastas" element={<ProtectedRoute><Auctions /></ProtectedRoute>} />
        <Route path="/subastas/nueva" element={<ProtectedRoute><AuctionForm /></ProtectedRoute>} />
        <Route path="/subastas/:id" element={<ProtectedRoute><AuctionDetail /></ProtectedRoute>} />
        <Route path="/subastas/:id/editar" element={<ProtectedRoute><AuctionForm /></ProtectedRoute>} />
        <Route path="/grupos" element={<ProtectedRoute><TelegramGroups /></ProtectedRoute>} />
        <Route path="/crm" element={<ProtectedRoute><CRM /></ProtectedRoute>} />
        <Route path="/crm/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
        <Route path="/actividad" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
        <Route path="/galeria/:auctionId" element={<VehicleGallery />} />
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
