import { LayoutDashboard, Car, Gavel, Users, Activity, Send } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { title: 'Inicio', url: '/', icon: LayoutDashboard },
  { title: 'Autos', url: '/vehiculos', icon: Car },
  { title: 'Subastas', url: '/subastas', icon: Gavel },
  { title: 'CRM', url: '/crm', icon: Users },
  { title: 'Más', url: '/actividad', icon: Activity },
];

export function MobileBottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card border-t safe-area-bottom">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 text-muted-foreground transition-colors duration-150 active:scale-95',
                isActive && 'text-primary'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="text-[10px] font-medium leading-tight">{item.title}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
