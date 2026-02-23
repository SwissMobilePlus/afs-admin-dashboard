'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { get } from '@/lib/api';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Heart,
  BarChart3,
} from 'lucide-react';

// -- Currency formatter -------------------------------------------------------
const chf = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
});

// -- Backend response types ---------------------------------------------------
// These mirror the exact shapes returned by the backend endpoints.

/** GET /admin/revenue/overview */
interface RevenueOverviewResponse {
  mrr: number;
  arr: number;
  ltv: number;
  churnRate: number;
  cancelledLast30d: number;
  totalActiveSubscriptions: number;
  planBreakdown: Array<{ plan: string; count: number; revenue: number }>;
  partnerRevenueTotal: number;
}

/** GET /admin/revenue/subscriptions — flat array of these objects */
interface SubscriptionResponse {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  plan: string;
  status: string;
  store: string | null;
  currentPeriodEnd: string | null;
  originalPurchaseDate: string | null;
  monthlyRevenue: number;
  createdAt: string;
}

/** GET /admin/revenue/partners */
interface PartnerRevenueItem {
  partnerId: string;
  partnerName: string;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalPaidOut: number;
}

interface PartnersResponse {
  partners: PartnerRevenueItem[];
  totals: {
    clicks: number;
    conversions: number;
    revenue: number;
    paidOut: number;
  };
}

/** GET /admin/revenue/projections */
interface ProjectionItem {
  month: number;
  label: string;       // "YYYY-MM"
  projectedMRR: number;
  projectedARR: number;
}

interface ProjectionsResponse {
  currentMRR: number;
  monthlyGrowthRate: number;
  projections: ProjectionItem[];
}

// -- Frontend display types ---------------------------------------------------

interface KPIData {
  mrr: number;
  mrrVariation: number;
  arr: number;
  arrVariation: number;
  ltv: number;
  ltvVariation: number;
  churn: number;
  churnVariation: number;
}

interface RevenueMonth {
  mois: string;
  abonnements: number;
  commissions: number;
}

interface Subscription {
  id: string | number;
  user: string;
  email: string;
  plan: string;
  montant: number;
  renouvellement: string;
  statut: string;
}

interface Commission {
  id: string | number;
  partenaire: string;
  type: string;
  clics: number;
  conversions: number;
  montant: number;
}

interface ProjectionMonth {
  mois: string;
  réel: number | null;
  projeté: number | null;
}

// -- Default empty state -------------------------------------------------------

const emptyKPIs: KPIData = {
  mrr: 0,
  mrrVariation: 0,
  arr: 0,
  arrVariation: 0,
  ltv: 0,
  ltvVariation: 0,
  churn: 0,
  churnVariation: 0,
};

// -- Helpers ------------------------------------------------------------------

/** Format a plan slug from the backend (e.g. "monthly", "weekly") for display */
function formatPlanLabel(plan: string): string {
  switch (plan.toLowerCase()) {
    case 'monthly':
      return 'Mensuel';
    case 'weekly':
      return 'Hebdomadaire';
    case 'yearly':
    case 'annual':
      return 'Annuel';
    default:
      return plan;
  }
}

/** Map backend subscription status to the French display label */
function formatStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'active':
      return 'Actif';
    case 'paused':
      return 'En pause';
    case 'canceled':
    case 'cancelled':
      return 'Annulé';
    case 'expired':
      return 'Expiré';
    default:
      return status;
  }
}

/** Format a "YYYY-MM" label to a short French label like "Mar 26" */
function formatProjectionLabel(label: string): string {
  const [yearStr, monthStr] = label.split('-');
  const monthNames = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
  ];
  const monthIndex = parseInt(monthStr, 10) - 1;
  const shortYear = yearStr.slice(2);
  return `${monthNames[monthIndex] ?? monthStr} ${shortYear}`;
}

// -- Variation badge helper ---------------------------------------------------

function VariationBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
  if (value === 0) return null;
  const isPositive = inverse ? value < 0 : value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isPositive ? 'text-emerald-600' : 'text-red-500'
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {value > 0 ? '+' : ''}
      {value}%
    </span>
  );
}

// -- Statut badge color mapping -----------------------------------------------

function StatutBadge({ statut }: { statut: string }) {
  const variant =
    statut === 'Actif'
      ? 'default'
      : statut === 'En pause'
      ? 'secondary'
      : 'destructive';
  return <Badge variant={variant}>{statut}</Badge>;
}

// -- Main page component ------------------------------------------------------

export default function RevenuePage() {
  const [kpis, setKpis] = useState<KPIData>(emptyKPIs);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [projections, setProjections] = useState<ProjectionMonth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, subsRes, partnersRes, projRes, monthlyRes] = await Promise.allSettled([
          get<RevenueOverviewResponse>('/admin/revenue/overview'),
          get<SubscriptionResponse[]>('/admin/revenue/subscriptions'),
          get<PartnersResponse>('/admin/revenue/partners'),
          get<ProjectionsResponse>('/admin/revenue/projections'),
          get<RevenueMonth[]>('/admin/revenue/monthly-breakdown'),
        ]);

        // --- Overview KPIs ---
        // Backend returns flat: { mrr, arr, ltv, churnRate, ... }
        // The API helper already unwraps axios response.data, so no .data wrapper.
        if (overviewRes.status === 'fulfilled' && overviewRes.value) {
          const o = overviewRes.value;
          setKpis({
            mrr: o.mrr,
            arr: o.arr,
            ltv: o.ltv,
            // Backend field is "churnRate", frontend uses "churn"
            churn: o.churnRate,
            // Backend does not return month-over-month variation percentages.
            // Set to 0 so the VariationBadge hides (returns null when value === 0).
            mrrVariation: 0,
            arrVariation: 0,
            ltvVariation: 0,
            churnVariation: 0,
          });
        }

        // --- Subscriptions ---
        // Backend returns a flat array of SubscriptionResponse objects.
        // Map to the frontend Subscription shape used by the table.
        if (subsRes.status === 'fulfilled' && Array.isArray(subsRes.value) && subsRes.value.length > 0) {
          setSubscriptions(
            subsRes.value.map((s) => ({
              id: s.id,
              user: s.userName || s.userEmail,
              email: s.userEmail,
              plan: formatPlanLabel(s.plan),
              montant: s.monthlyRevenue,
              // Use currentPeriodEnd as the renewal date; fall back to originalPurchaseDate
              renouvellement: s.currentPeriodEnd || s.originalPurchaseDate || s.createdAt,
              statut: formatStatusLabel(s.status),
            }))
          );
        }

        // --- Partner commissions ---
        // Backend returns { partners: [...], totals: {...} }
        if (partnersRes.status === 'fulfilled' && partnersRes.value?.partners?.length > 0) {
          setCommissions(
            partnersRes.value.partners.map((p) => ({
              id: p.partnerId,
              partenaire: p.partnerName,
              // Backend doesn't return a commission type; use a generic label
              type: 'Commission',
              clics: p.totalClicks,
              conversions: p.totalConversions,
              montant: p.totalRevenue,
            }))
          );
        }

        // --- Projections ---
        // Backend returns { currentMRR, monthlyGrowthRate, projections: [{ month, label, projectedMRR, projectedARR }] }
        if (projRes.status === 'fulfilled' && projRes.value?.projections?.length > 0) {
          const currentMRR = projRes.value.currentMRR;
          setProjections(
            projRes.value.projections.map((p, idx) => ({
              mois: formatProjectionLabel(p.label),
              réel: idx === 0 ? currentMRR : null,
              projeté: p.projectedMRR,
            }))
          );
        }

        // --- Monthly breakdown (area chart) ---
        if (monthlyRes.status === 'fulfilled' && Array.isArray(monthlyRes.value) && monthlyRes.value.length > 0) {
          setRevenueData(monthlyRes.value);
        }
      } catch {
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const kpiCards = [
    {
      title: 'MRR',
      value: chf.format(kpis.mrr),
      variation: kpis.mrrVariation,
      icon: DollarSign,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'ARR',
      value: chf.format(kpis.arr),
      variation: kpis.arrVariation,
      icon: BarChart3,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'LTV moyen',
      value: chf.format(kpis.ltv),
      variation: kpis.ltvVariation,
      icon: Heart,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      title: 'Taux de churn',
      value: `${kpis.churn}%`,
      variation: kpis.churnVariation,
      inverse: true,
      icon: Users,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Revenus &amp; Finances</h1>
        <p className="text-muted-foreground mt-1">
          Vue d&apos;ensemble des performances financières
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">
                    {kpi.title}
                  </span>
                  <span className="text-2xl font-bold">{kpi.value}</span>
                  <div className="flex items-center gap-1.5">
                    <VariationBadge value={kpi.variation} inverse={kpi.inverse} />
                    {kpi.variation !== 0 && (
                      <span className="text-xs text-muted-foreground">vs mois dernier</span>
                    )}
                  </div>
                </div>
                <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue mensuel (12 derniers mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAbo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="mois"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `${v} CHF`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value: any) => chf.format(Number(value))}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="abonnements"
                  name="Abonnements"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#colorAbo)"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="commissions"
                  name="Commissions"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#colorComm)"
                  stackId="1"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Abonnements / Commissions / Projections */}
      <Tabs defaultValue="abonnements">
        <TabsList>
          <TabsTrigger value="abonnements">Abonnements</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        {/* -- Abonnements Tab ------------------------------------------------ */}
        <TabsContent value="abonnements">
          <Card>
            <CardHeader>
              <CardTitle>Abonnements actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Renouvellement</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.user}</div>
                          <div className="text-xs text-muted-foreground">{sub.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sub.plan}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {chf.format(sub.montant)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(sub.renouvellement).toLocaleDateString('fr-CH')}
                      </TableCell>
                      <TableCell>
                        <StatutBadge statut={sub.statut} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Commissions Tab ------------------------------------------------ */}
        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commissions partenaires</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Partenaire</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Clics</TableHead>
                    <TableHead className="text-right">Conversions</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.partenaire}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {c.clics.toLocaleString('fr-CH')}
                      </TableCell>
                      <TableCell className="text-right">
                        {c.conversions.toLocaleString('fr-CH')}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {chf.format(c.montant)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* -- Projections Tab ------------------------------------------------ */}
        <TabsContent value="projections">
          <Card>
            <CardHeader>
              <CardTitle>Projections de revenue (12 prochains mois)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={projections}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="mois"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(v) => `${v} CHF`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '13px',
                      }}
                      formatter={(value: any) =>
                        value != null ? chf.format(Number(value)) : '—'
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="réel"
                      name="Réel"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="projeté"
                      name="Projeté"
                      stroke="#8b5cf6"
                      strokeWidth={2.5}
                      strokeDasharray="8 4"
                      dot={{ r: 3 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
