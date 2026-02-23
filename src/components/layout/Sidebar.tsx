'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  DollarSign,
  Handshake,
  Megaphone,
  MessageSquare,
  Briefcase,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { useSupportStore } from '@/stores/support.store';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Utilisateurs', href: '/users', icon: Users },
  { label: 'Revenus', href: '/revenue', icon: DollarSign },
  { label: 'Partenaires', href: '/partners', icon: Handshake },
  { label: 'Marketing', href: '/marketing', icon: Megaphone },
  { label: 'Support', href: '/support', icon: MessageSquare },
  { label: 'Emplois', href: '/jobs', icon: Briefcase },
  { label: 'Paramètres', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const unreadCount = useSupportStore((s) => s.unreadCount);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      >
        {/* Logo / Branding */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
                <span className="text-sm font-bold text-sidebar-primary-foreground">
                  AF
                </span>
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">
                AFS Admin
              </span>
            </Link>
          )}
          {collapsed && (
            <Link
              href="/dashboard"
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary"
            >
              <span className="text-sm font-bold text-sidebar-primary-foreground">
                AF
              </span>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const showBadge = item.href === '/support' && unreadCount > 0;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5 shrink-0',
                        active
                          ? 'text-sidebar-primary'
                          : 'text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80'
                      )}
                    />
                    {!collapsed && <span>{item.label}</span>}
                    {showBadge && (
                      <span
                        className={cn(
                          'flex items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white',
                          collapsed
                            ? 'absolute -right-1 -top-1 h-4 w-4'
                            : 'ml-auto h-5 min-w-5 px-1.5'
                        )}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle */}
        <div className="border-t border-sidebar-border px-3 py-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-lg p-2 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* User info + Logout */}
        <div className="border-t border-sidebar-border p-3">
          {user && (
            <div
              className={cn(
                'flex items-center gap-3',
                collapsed && 'flex-col'
              )}
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-semibold text-sidebar-primary-foreground">
                {user.name
                  ? user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)
                  : 'AD'}
              </div>

              {!collapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">
                    {user.name || 'Admin'}
                  </p>
                  <p className="truncate text-xs text-sidebar-foreground/50">
                    {user.role === 'super_admin'
                      ? 'Super Admin'
                      : user.role === 'admin'
                        ? 'Administrateur'
                        : user.role === 'support'
                          ? 'Support'
                          : 'Partenaire'}
                  </p>
                </div>
              )}

              <button
                onClick={logout}
                className={cn(
                  'shrink-0 rounded-lg p-2 text-sidebar-foreground/50 transition-colors hover:bg-destructive/10 hover:text-destructive',
                  collapsed && 'mt-1'
                )}
                title="Se déconnecter"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Spacer to push content over */}
      <div
        className={cn(
          'shrink-0 transition-all duration-300',
          collapsed ? 'w-[68px]' : 'w-64'
        )}
      />
    </>
  );
}
