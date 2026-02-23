'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Utilisateurs',
  '/revenue': 'Revenus',
  '/partners': 'Partenaires',
  '/marketing': 'Marketing',
  '/support': 'Support',
  '/jobs': 'Emplois',
  '/settings': 'Param\u00e8tres',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Prefix match for nested routes
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path)) return title;
  }

  return 'Dashboard';
}

const roleBadgeStyles: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  support: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  partner: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
};

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  support: 'Support',
  partner: 'Partenaire',
};

export default function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Page title */}
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>

      {/* Right side */}
      <div className="flex items-center gap-4">
        {/* Search bar */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher..."
            className="h-9 w-64 rounded-lg border border-input bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
          />
        </div>

        {/* Notification bell */}
        <button
          className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {/* Notification dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-border" />

        {/* User avatar + role badge */}
        {user && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {user.name
                ? user.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)
                : 'AD'}
            </div>
            <div className="hidden flex-col lg:flex">
              <span className="text-sm font-medium text-foreground">
                {user.name || 'Admin'}
              </span>
              <span
                className={cn(
                  'inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                  roleBadgeStyles[user.role] || roleBadgeStyles.admin
                )}
              >
                {roleLabels[user.role] || user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
