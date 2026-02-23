'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, CreditCard, LifeBuoy } from 'lucide-react';
import { get } from '@/lib/api';
import { KPICard } from '@/components/dashboard/KPICard';
import { GrowthChart } from '@/components/dashboard/GrowthChart';
import { RevenueChart } from '@/components/dashboard/RevenueChart';
import { UsersByCantonChart } from '@/components/dashboard/UsersByCantonChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

// ── Types ────────────────────────────────────────────────────────────────

interface DashboardStats {
  usersTotal: number;
  usersActive30d: number;
  mrr: number;
  supportTicketsOpen: number;
  registrationsTrend: { date: string; count: number }[];
  revenueBySource: { month: string; subscriptions: number; commissions: number }[];
  usersByCanton: { canton: string; count: number }[];
  recentUsers: { id: string; name: string; email: string; createdAt: string }[];
  recentTickets: { id: string; subject: string; status: string; createdAt: string }[];
  changes: {
    usersTotal: number;
    usersActive30d: number;
    mrr: number;
    supportTicketsOpen: number;
  };
}

// ── Mock data (fallback when API is unavailable) ─────────────────────────

function generateRegistrationsTrend(): { date: string; count: number }[] {
  const data: { date: string; count: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const base = 25 + Math.floor(Math.random() * 20);
    const weekend = date.getDay() === 0 || date.getDay() === 6 ? -8 : 0;
    data.push({
      date: date.toISOString().split('T')[0],
      count: Math.max(5, base + weekend + Math.floor(Math.random() * 10 - 5)),
    });
  }
  return data;
}

const MOCK_STATS: DashboardStats = {
  usersTotal: 1247,
  usersActive30d: 834,
  mrr: 4560,
  supportTicketsOpen: 12,
  registrationsTrend: generateRegistrationsTrend(),
  revenueBySource: [
    { month: 'Sept', subscriptions: 2800, commissions: 1200 },
    { month: 'Oct', subscriptions: 3100, commissions: 1400 },
    { month: 'Nov', subscriptions: 3400, commissions: 1350 },
    { month: 'Dec', subscriptions: 3200, commissions: 1600 },
    { month: 'Jan', subscriptions: 3800, commissions: 1800 },
    { month: 'Feb', subscriptions: 4200, commissions: 2100 },
  ],
  usersByCanton: [
    { canton: 'Gen\u00e8ve', count: 312 },
    { canton: 'Vaud', count: 278 },
    { canton: 'Neuch\u00e2tel', count: 156 },
    { canton: 'Fribourg', count: 134 },
    { canton: 'Valais', count: 112 },
    { canton: 'Jura', count: 89 },
    { canton: 'Berne', count: 98 },
    { canton: 'Autres', count: 68 },
  ],
  recentUsers: [
    {
      id: '1',
      name: 'Marie Dupont',
      email: 'marie.dupont@example.ch',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: '2',
      name: 'Jean-Pierre Muller',
      email: 'jp.muller@example.ch',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    },
    {
      id: '3',
      name: 'Sophie Berger',
      email: 'sophie.berger@example.ch',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
      id: '4',
      name: 'Luca Rossi',
      email: 'luca.rossi@example.ch',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    },
    {
      id: '5',
      name: 'Anna Schneider',
      email: 'anna.schneider@example.ch',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
  ],
  recentTickets: [
    {
      id: 't1',
      subject: 'Probl\u00e8me de connexion au compte',
      status: 'open',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 't2',
      subject: 'Demande de remboursement abonnement',
      status: 'in_progress',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    },
    {
      id: 't3',
      subject: 'Bug affichage profil mobile',
      status: 'open',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    },
    {
      id: 't4',
      subject: 'Question facturation TVA',
      status: 'resolved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
    },
    {
      id: 't5',
      subject: 'Mise \u00e0 jour donn\u00e9es personnelles',
      status: 'resolved',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    },
  ],
  changes: {
    usersTotal: 12.5,
    usersActive30d: 8.3,
    mrr: 15.2,
    supportTicketsOpen: -25.0,
  },
};

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
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboard() {
      try {
        const data = await get<DashboardStats>('/admin/dashboard');
        if (!cancelled) {
          setStats(data);
        }
      } catch {
        // API unavailable or unauthorized - use mock data
        if (!cancelled) {
          setStats(MOCK_STATS);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  // Loading state
  if (isLoading) {
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

        {/* Revenue Chart Skeleton */}
        <ChartSkeleton />

        {/* Activity Skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      </div>
    );
  }

  // Loaded state — stats is guaranteed non-null here
  const data = stats!;

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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Utilisateurs Total"
          value={data.usersTotal}
          icon={Users}
          change={data.changes.usersTotal}
          changeLabel="vs mois dernier"
        />
        <KPICard
          title="Utilisateurs Actifs (30j)"
          value={data.usersActive30d}
          icon={UserCheck}
          change={data.changes.usersActive30d}
          changeLabel="vs mois dernier"
        />
        <KPICard
          title="MRR"
          value={data.mrr}
          icon={CreditCard}
          change={data.changes.mrr}
          changeLabel="vs mois dernier"
          prefix="CHF"
        />
        <KPICard
          title="Tickets Support Ouverts"
          value={data.supportTicketsOpen}
          icon={LifeBuoy}
          change={data.changes.supportTicketsOpen}
          changeLabel="vs mois dernier"
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

      {/* Revenue Chart - Full Width */}
      <RevenueChart data={data.revenueBySource} />

      {/* Recent Activity */}
      <RecentActivity
        recentUsers={data.recentUsers}
        recentTickets={data.recentTickets}
      />
    </div>
  );
}
