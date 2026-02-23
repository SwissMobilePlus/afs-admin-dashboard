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

// ── Currency formatter ────────────────────────────────────────────────
const chf = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
});

// ── Mock data ─────────────────────────────────────────────────────────

const mockRevenueMonthly = [
  { mois: 'Mar 25', abonnements: 2800, commissions: 620 },
  { mois: 'Avr 25', abonnements: 2950, commissions: 680 },
  { mois: 'Mai 25', abonnements: 3100, commissions: 710 },
  { mois: 'Juin 25', abonnements: 3200, commissions: 750 },
  { mois: 'Juil 25', abonnements: 3050, commissions: 800 },
  { mois: 'Août 25', abonnements: 3300, commissions: 830 },
  { mois: 'Sep 25', abonnements: 3450, commissions: 860 },
  { mois: 'Oct 25', abonnements: 3600, commissions: 910 },
  { mois: 'Nov 25', abonnements: 3750, commissions: 940 },
  { mois: 'Déc 25', abonnements: 3900, commissions: 980 },
  { mois: 'Jan 26', abonnements: 4200, commissions: 1020 },
  { mois: 'Fév 26', abonnements: 4560, commissions: 1080 },
];

const mockSubscriptions = [
  { id: 1, user: 'Sophie Müller', email: 'sophie.m@gmail.com', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-15', statut: 'Actif' },
  { id: 2, user: 'Marc Dubois', email: 'marc.d@outlook.com', plan: 'Annuel', montant: 89.9, renouvellement: '2027-01-10', statut: 'Actif' },
  { id: 3, user: 'Laura Fischer', email: 'l.fischer@bluewin.ch', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-08', statut: 'Actif' },
  { id: 4, user: 'Thomas Keller', email: 't.keller@proton.me', plan: 'Annuel', montant: 89.9, renouvellement: '2026-11-22', statut: 'Actif' },
  { id: 5, user: 'Anna Brunner', email: 'anna.b@gmail.com', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-20', statut: 'Actif' },
  { id: 6, user: 'David Schmid', email: 'd.schmid@yahoo.com', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-12', statut: 'En pause' },
  { id: 7, user: 'Elena Rossi', email: 'elena.r@gmail.com', plan: 'Annuel', montant: 89.9, renouvellement: '2026-08-05', statut: 'Actif' },
  { id: 8, user: 'Nicolas Weber', email: 'n.weber@sunrise.ch', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-18', statut: 'Actif' },
  { id: 9, user: 'Julie Martin', email: 'j.martin@icloud.com', plan: 'Annuel', montant: 89.9, renouvellement: '2027-02-14', statut: 'Actif' },
  { id: 10, user: 'Patrick Huber', email: 'p.huber@gmx.ch', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-25', statut: 'Actif' },
  { id: 11, user: 'Sarah Meier', email: 's.meier@bluewin.ch', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-05', statut: 'Expiré' },
  { id: 12, user: 'Lucas Favre', email: 'l.favre@proton.me', plan: 'Annuel', montant: 89.9, renouvellement: '2026-06-30', statut: 'Actif' },
  { id: 13, user: 'Isabelle Roth', email: 'i.roth@gmail.com', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-28', statut: 'Actif' },
  { id: 14, user: 'Michael Bauer', email: 'm.bauer@outlook.com', plan: 'Mensuel', montant: 9.9, renouvellement: '2026-03-10', statut: 'Actif' },
  { id: 15, user: 'Céline Wyss', email: 'c.wyss@sunrise.ch', plan: 'Annuel', montant: 89.9, renouvellement: '2026-09-15', statut: 'Actif' },
];

const mockCommissions = [
  { id: 1, partenaire: 'CA next bank', type: 'CPA', clics: 3420, conversions: 187, montant: 4675 },
  { id: 2, partenaire: 'UBS KeyClub', type: 'CPL', clics: 2890, conversions: 156, montant: 3120 },
  { id: 3, partenaire: 'Alpian', type: 'Revenue Share', clics: 1560, conversions: 89, montant: 2670 },
  { id: 4, partenaire: 'Yuh', type: 'CPA', clics: 4210, conversions: 234, montant: 5850 },
  { id: 5, partenaire: 'Baloise Assurance', type: 'CPL', clics: 980, conversions: 45, montant: 1350 },
  { id: 6, partenaire: 'CSS Santé', type: 'Revenue Share', clics: 1230, conversions: 67, montant: 2010 },
];

const mockProjections = [
  { mois: 'Mar 25', réel: 3420, projeté: null },
  { mois: 'Avr 25', réel: 3630, projeté: null },
  { mois: 'Mai 25', réel: 3810, projeté: null },
  { mois: 'Juin 25', réel: 3950, projeté: null },
  { mois: 'Juil 25', réel: 3850, projeté: null },
  { mois: 'Août 25', réel: 4130, projeté: null },
  { mois: 'Sep 25', réel: 4310, projeté: null },
  { mois: 'Oct 25', réel: 4510, projeté: null },
  { mois: 'Nov 25', réel: 4690, projeté: null },
  { mois: 'Déc 25', réel: 4880, projeté: null },
  { mois: 'Jan 26', réel: 5220, projeté: 5220 },
  { mois: 'Fév 26', réel: 5640, projeté: 5640 },
  { mois: 'Mar 26', réel: null, projeté: 5920 },
  { mois: 'Avr 26', réel: null, projeté: 6210 },
  { mois: 'Mai 26', réel: null, projeté: 6530 },
  { mois: 'Juin 26', réel: null, projeté: 6870 },
  { mois: 'Juil 26', réel: null, projeté: 7140 },
  { mois: 'Août 26', réel: null, projeté: 7480 },
  { mois: 'Sep 26', réel: null, projeté: 7850 },
  { mois: 'Oct 26', réel: null, projeté: 8240 },
  { mois: 'Nov 26', réel: null, projeté: 8650 },
  { mois: 'Déc 26', réel: null, projeté: 9080 },
  { mois: 'Jan 27', réel: null, projeté: 9530 },
  { mois: 'Fév 27', réel: null, projeté: 10020 },
];

const mockKPIs = {
  mrr: 4560,
  mrrVariation: 8.4,
  arr: 54720,
  arrVariation: 12.1,
  ltv: 156,
  ltvVariation: 3.8,
  churn: 3.2,
  churnVariation: -0.5,
};

// ── Types ─────────────────────────────────────────────────────────────

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
  id: number;
  user: string;
  email: string;
  plan: string;
  montant: number;
  renouvellement: string;
  statut: string;
}

interface Commission {
  id: number;
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

// ── Variation badge helper ────────────────────────────────────────────

function VariationBadge({ value, inverse = false }: { value: number; inverse?: boolean }) {
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

// ── Statut badge color mapping ────────────────────────────────────────

function StatutBadge({ statut }: { statut: string }) {
  const variant =
    statut === 'Actif'
      ? 'default'
      : statut === 'En pause'
      ? 'secondary'
      : 'destructive';
  return <Badge variant={variant}>{statut}</Badge>;
}

// ── Main page component ───────────────────────────────────────────────

export default function RevenuePage() {
  const [kpis, setKpis] = useState<KPIData>(mockKPIs);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>(mockRevenueMonthly);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions);
  const [commissions, setCommissions] = useState<Commission[]>(mockCommissions);
  const [projections, setProjections] = useState<ProjectionMonth[]>(mockProjections);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewRes, subsRes, partnersRes, projRes] = await Promise.allSettled([
          get<{ data: KPIData }>('/admin/revenue/overview'),
          get<{ data: Subscription[] }>('/admin/revenue/subscriptions'),
          get<{ data: Commission[] }>('/admin/revenue/partners'),
          get<{ data: ProjectionMonth[] }>('/admin/revenue/projections'),
        ]);

        if (overviewRes.status === 'fulfilled' && overviewRes.value?.data) {
          setKpis(overviewRes.value.data);
        }
        if (subsRes.status === 'fulfilled' && subsRes.value?.data) {
          setSubscriptions(subsRes.value.data);
        }
        if (partnersRes.status === 'fulfilled' && partnersRes.value?.data) {
          setCommissions(partnersRes.value.data);
        }
        if (projRes.status === 'fulfilled' && projRes.value?.data) {
          setProjections(projRes.value.data);
        }
      } catch {
        // Keep mock data on error
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
                    <span className="text-xs text-muted-foreground">vs mois dernier</span>
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

        {/* ── Abonnements Tab ────────────────────────────────────────── */}
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

        {/* ── Commissions Tab ────────────────────────────────────────── */}
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

        {/* ── Projections Tab ────────────────────────────────────────── */}
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
