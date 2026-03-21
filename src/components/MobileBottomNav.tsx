import { LayoutDashboard, Car, Gavel, Users, Activity } from 'lucide-react';
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
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur-md border-t safe-area-bottom">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 flex-1 transition-colors duration-150 active:scale-95',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/70'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'flex items-center justify-center w-10 h-7 rounded-full transition-colors',
                  isActive && 'bg-accent'
                )}>
                  <item.icon className="h-[18px] w-[18px]" />
                </div>
                <span className={cn(
                  'text-[10px] leading-tight',
                  isActive ? 'font-semibold' : 'font-medium'
                )}>
                  {item.title}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}