'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, CreditCard, LifeBuoy } from 'lucide-react';
import { get } from '@/lib/api';
import { KPICard } from '@/components/dashboard/KPICard';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { UsersByCantonChart } from '@/components/dashboard/UsersByCantonChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

// ── Types ────────────────────────────────────────────────────────────────

/** Shape returned by GET /admin/dashboard */
interface DashboardAPIResponse {
  usersTotal: number;
  usersActive7d: number;
  usersActive30d: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  subscriptionsActive: number;
  mrr: number;
  jobsTotal: number;
  jobsToday: number;
  applicationsTotal: number;
  supportOpen: number;
  registrationsByDay: { date: string; count: number }[];
  usersByCountry: { country: string; count: number }[];
  usersByCanton: { canton: string; count: number }[];
}

/** Shape returned by GET /admin/users */
interface UsersAPIResponse {
  users: {
    id: string;
    email: string;
    name: string | null;
    firstName: string | null;
    phone: string | null;
    role: string;
    targetCountry: string;
    cantons: string[];
    onboardingComplete: boolean;
    bannedAt: string | null;
    banReason: string | null;
    lastActiveAt: string | null;
    createdAt: string;
    subscription: {
      plan: string;
      status: string;
      store: string;
      currentPeriodEnd: string | null;
    } | null;
  }[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Shape returned by GET /support/admin/conversations */
interface ConversationsAPIResponse {
  conversations: {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    subject: string;
    status: string;
    priority: string;
    assignedTo: string | null;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    createdAt: string;
    updatedAt: string;
  }[];
  total: number;
  page: number;
  pages: number;
}

/** Internal frontend state for the dashboard */
interface DashboardState {
  usersTotal: number;
  usersActive30d: number;
  mrr: number;
  supportTicketsOpen: number;
  registrationsTrend: { date: string; count: number }[];
  usersByCanton: { canton: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentTickets: { id: string; subject: string; status: string; createdAt: string }[];
}

// ── Skeleton components ──────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-3 flex-1">
          <div className="h-4 w-24 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-32 rounded-md bg-muted animate-pulse" />
          <div className="h-4 w-36 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
      </div>
    </div>
  );
}

function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className || ''}`}>
      <div className="h-5 w-48 rounded-md bg-muted animate-pulse mb-6" />
      <div className="h-[300px] w-full rounded-lg bg-muted/50 animate-pulse" />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="h-5 w-40 rounded-md bg-muted animate-pulse mb-4" />
      <div className="flex flex-col gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            <div className="flex flex-col gap-1.5 flex-1">
              <div className="h-4 w-32 rounded-md bg-muted animate-pulse" />
              <div className="h-3 w-48 rounded-md bg-muted animate-pulse" />
            </div>
            <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Page ───────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      // Fire all three requests in parallel
      const [dashboardResult, usersResult, ticketsResult] = await Promise.allSettled([
        get<DashboardAPIResponse>('/admin/dashboard'),
        get<UsersAPIResponse>('/admin/users', { params: { page: 1, limit: 5 } }),
        get<ConversationsAPIResponse>('/support/admin/conversations', { params: { page: 1, limit: 5 } }),
      ]);

      if (cancelled) return;

      // --- Dashboard stats ---
      const dashboard =
        dashboardResult.status === 'fulfilled' ? dashboardResult.value : null;

      // --- Recent users ---
      let recentUsers: DashboardState['recentUsers'] = [];
      if (usersResult.status === 'fulfilled' && usersResult.value?.users) {
        recentUsers = usersResult.value.users.map((u) => ({
          id: u.id,
          name: [u.firstName, u.name].filter(Boolean).join(' ') || u.email,
          email: u.email,
          createdAt: u.createdAt,
        }));
      }

      // --- Recent tickets (conversations) ---
      let recentTickets: DashboardState['recentTickets'] = [];
      if (ticketsResult.status === 'fulfilled' && ticketsResult.value?.conversations) {
        recentTickets = ticketsResult.value.conversations.map((c) => ({
          id: c.id,
          subject: c.subject,
          status: c.status,
          createdAt: c.createdAt,
        }));
      }

      setData({
        usersTotal: dashboard?.usersTotal ?? 0,
        usersActive30d: dashboard?.usersActive30d ?? 0,
        mrr: dashboard ? Math.round(dashboard.mrr) : 0,
        supportTicketsOpen: dashboard?.supportOpen ?? 0,
        registrationsTrend: dashboard?.registrationsByDay ?? [],
        usersByCanton: dashboard?.usersByCanton ?? [],
        recentUsers,
        recentTickets,
      });

      setIsLoading(false);
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state
  if (isLoading || !data) {
    return (
      <div className="flex flex-col gap-6">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </div>

        {/* Chart Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <ChartSkeleton className="lg:col-span-2" />
          <ChartSkeleton />
        </div>

        {/* Activity Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Tableau de bord
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vue d&apos;ensemble de l&apos;activit&eacute; de la plateforme AFS
        </p>
      </div>

      {/* KPI Cards — no fake change percentages; backend does not compute period-over-period deltas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Utilisateurs Total"
          value={data.usersTotal}
          icon={Users}
        />
        <KPICard
          title="Utilisateurs Actifs (30j)"
          value={data.usersActive30d}
          icon={UserCheck}
        />
        <KPICard
          title="MRR"
          value={data.mrr}
          icon={CreditCard}
          prefix="CHF"
        />
        <KPICard
          title="Tickets Support Ouverts"
          value={data.supportTicketsOpen}
          icon={LifeBuoy}
        />
      </div>

      {/* Charts Row: Growth + Canton Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <GrowthChart data={data.registrationsTrend} />
        </div>
        <div>
          <UsersByCantonChart data={data.usersByCanton} />
        </div>
      </div>

      {/* Revenue chart removed — dedicated Revenue page handles revenue analytics */}

      {/* Recent Activity — real data from /admin/users and /support/admin/conversations */}
      <RecentActivity
        recentUsers={data.recentUsers}
        recentTickets={data.recentTickets}
      />
    </div>
  );
}
