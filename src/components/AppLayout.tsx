import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { DemoBadge } from '@/components/DemoBadge';
import { useIsMobile } from '@/hooks/use-mobile';

export function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <div className="px-4 pt-3">
          <DemoBadge />
        </div>
        <main className="flex-1 px-4 pt-3 pb-24 overflow-auto">
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b bg-card/80 backdrop-blur-sm px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <DemoBadge />
          </header>
          <main className="flex-1 p-6 lg:p-8 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}