import {
  LayoutDashboard, Car, Gavel, Users, Activity, LogOut, Send,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Vehículos', url: '/vehiculos', icon: Car },
  { title: 'Subastas', url: '/subastas', icon: Gavel },
  { title: 'Grupos Telegram', url: '/grupos', icon: Send },
  { title: 'CRM', url: '/crm', icon: Users },
  { title: 'Actividad', url: '/actividad', icon: Activity },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 py-5">
            {!collapsed && (
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                  <Gavel className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="min-w-0">
                  <span className="font-bold text-sm tracking-tight block">Subasta Privada</span>
                  <span className="text-[10px] text-muted-foreground font-medium">Telegram Edition</span>
                </div>
              </div>
            )}
            {collapsed && (
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center mx-auto">
                <Gavel className="h-4 w-4 text-primary-foreground" />
              </div>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-accent/60 transition-colors duration-150 rounded-lg"
                      activeClassName="bg-accent text-accent-foreground font-semibold"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-3">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive rounded-lg"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Cerrar sesión</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}