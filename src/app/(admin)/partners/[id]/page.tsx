'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { get, post, patch } from '@/lib/api';
import {
  ArrowLeft,
  ExternalLink,
  MousePointerClick,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Pencil,
  CreditCard,
  XCircle,
} from 'lucide-react';

// ── Currency formatter ────────────────────────────────────────────────
const chf = new Intl.NumberFormat('fr-CH', {
  style: 'currency',
  currency: 'CHF',
});

// ── Types ─────────────────────────────────────────────────────────────

interface PartnerDetail {
  id: string;
  nom: string;
  categorie: string;
  siteWeb: string;
  statut: 'Actif' | 'Inactif';
  couleur: string;
  commissionType: string;
  commissionRate: number;
  devise: string;
  dateDebut: string;
  clics: number;
  conversions: number;
  revenue: number;
  tauxConversion: number;
  description: string;
}

interface DailyPerformance {
  jour: string;
  clics: number;
  conversions: number;
}

interface Payment {
  id: string;
  date: string;
  periode: string;
  montant: number;
  statut: 'Payé' | 'En attente';
}


// ── Initials helper ───────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ── Category badge color ──────────────────────────────────────────────
function categoryColor(cat: string) {
  switch (cat) {
    case 'Banque':
      return 'bg-blue-100 text-blue-800';
    case 'Assurance':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// ── Main component ────────────────────────────────────────────────────

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<PartnerDetail | null>(null);
  const [performance, setPerformance] = useState<DailyPerformance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPartner() {
      try {
        const res = await get<Record<string, unknown>>(`/admin/partners/${partnerId}/analytics`);

        // Map partner object
        const p = res.partner as Record<string, unknown> | undefined;
        const totals = res.totals as Record<string, unknown> | undefined;
        const service = p?.service as Record<string, unknown> | undefined;
        const commissions = Array.isArray(p?.commissions) ? (p.commissions as Record<string, unknown>[]) : [];
        const firstCommission = commissions[0];

        if (p) {
          setPartner({
            id: (p.id as string) || partnerId,
            nom: (p.name as string) || '',
            categorie: (service?.title as string) || '',
            siteWeb: '',
            statut: p.active ? 'Actif' : 'Inactif',
            couleur: '#3b82f6',
            commissionType: (firstCommission?.type as string) || '',
            commissionRate: (firstCommission?.rate as number) || 0,
            devise: (firstCommission?.currency as string) || 'CHF',
            dateDebut: (p.createdAt as string) || '',
            clics: (totals?.clicks as number) || 0,
            conversions: (totals?.conversions as number) || 0,
            revenue: (totals?.revenue as number) || 0,
            tauxConversion: (totals?.conversionRate as number) || 0,
            description: '',
          });
        }

        // Map daily stats
        const dailyStats = Array.isArray(res.dailyStats) ? (res.dailyStats as Record<string, unknown>[]) : [];
        setPerformance(
          dailyStats.map((d) => ({
            jour: new Date(d.date as string).toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' }),
            clics: (d.clicks as number) || 0,
            conversions: (d.conversions as number) || 0,
          }))
        );

        // Map payouts
        const payouts = Array.isArray(res.payouts) ? (res.payouts as Record<string, unknown>[]) : [];
        setPayments(
          payouts.map((pay) => ({
            id: (pay.id as string) || '',
            date: (pay.paidAt as string) || (pay.createdAt as string) || '',
            periode: (pay.period as string) || '',
            montant: (pay.amount as number) || 0,
            statut: (pay.status === 'paid' ? 'Payé' : 'En attente') as 'Payé' | 'En attente',
          }))
        );
      } catch {
        setPartner(null);
        setPerformance([]);
        setPayments([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPartner();
  }, [partnerId]);

  async function handlePayout() {
    const pending = payments.find((p) => p.statut === 'En attente');
    if (!pending) return;
    try {
      await post(`/admin/partners/${partnerId}/payout`, {
        periode: pending.periode,
        montant: pending.montant,
      });
    } catch {
      // Silently handle - UI already updated
    }
    setPayments((prev) =>
      prev.map((p) => (p.statut === 'En attente' ? { ...p, statut: 'Payé' as const } : p)),
    );
  }

  async function handleToggleStatus() {
    if (!partner) return;
    const newStatut = partner.statut === 'Actif' ? 'Inactif' : 'Actif';
    try {
      await patch(`/admin/partners/${partnerId}`, { statut: newStatut });
    } catch {
      // Update locally
    }
    setPartner((prev) => (prev ? { ...prev, statut: newStatut as 'Actif' | 'Inactif' } : prev));
  }

  if (loading || !partner) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const kpis = [
    {
      label: 'Total clics',
      value: partner.clics.toLocaleString('fr-CH'),
      icon: MousePointerClick,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Conversions',
      value: partner.conversions.toLocaleString('fr-CH'),
      icon: ArrowRightLeft,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Revenue généré',
      value: chf.format(partner.revenue),
      icon: DollarSign,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Taux conversion',
      value: `${partner.tauxConversion}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Back button */}
      <div>
        <Button variant="ghost" onClick={() => router.push('/partners')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour aux partenaires
        </Button>
      </div>

      {/* Partner header */}
      <Card>
        <CardContent className="pt-0">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white"
                style={{ backgroundColor: partner.couleur }}
              >
                {getInitials(partner.nom)}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">{partner.nom}</h1>
                  <Badge variant={partner.statut === 'Actif' ? 'default' : 'secondary'}>
                    {partner.statut}
                  </Badge>
                </div>
                <div className="mt-1 flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${categoryColor(
                      partner.categorie,
                    )}`}
                  >
                    {partner.categorie}
                  </span>
                  <a
                    href={partner.siteWeb}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    {partner.siteWeb.replace('https://', '')}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {partner.description && (
                  <p className="mt-2 text-sm text-muted-foreground">{partner.description}</p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Modifier
              </Button>
              <Button variant="outline" size="sm" onClick={handlePayout}>
                <CreditCard className="mr-1.5 h-3.5 w-3.5" />
                Marquer paiement
              </Button>
              <Button
                variant={partner.statut === 'Actif' ? 'destructive' : 'default'}
                size="sm"
                onClick={handleToggleStatus}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                {partner.statut === 'Actif' ? 'Désactiver' : 'Activer'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-muted-foreground">{kpi.label}</span>
                  <span className="text-2xl font-bold">{kpi.value}</span>
                </div>
                <div className={`rounded-lg p-2.5 ${kpi.bg}`}>
                  <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance chart */}
      <Card>
        <CardHeader>
          <CardTitle>Performance (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performance} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="jour"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="clics"
                  name="Clics"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom section: Payments + Commission details */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payments table */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Historique des paiements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Aucun paiement
                      </TableCell>
                    </TableRow>
                  )}
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString('fr-CH')}
                      </TableCell>
                      <TableCell className="font-medium">{payment.periode}</TableCell>
                      <TableCell className="text-right font-medium">
                        {chf.format(payment.montant)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payment.statut === 'Payé' ? 'default' : 'secondary'}
                          className={
                            payment.statut === 'Payé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }
                        >
                          {payment.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Commission details */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Détails de commission</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4">
                <div className="flex justify-between">
                  <dt className="text-sm text-muted-foreground">Type</dt>
                  <dd className="text-sm font-medium">
                    <Badge variant="outline">{partner.commissionType}</Badge>
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <dt className="text-sm text-muted-foreground">Taux</dt>
                  <dd className="text-sm font-semibold">{partner.commissionRate}%</dd>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <dt className="text-sm text-muted-foreground">Devise</dt>
                  <dd className="text-sm font-medium">{partner.devise}</dd>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <dt className="text-sm text-muted-foreground">Date de début</dt>
                  <dd className="text-sm font-medium">
                    {new Date(partner.dateDebut).toLocaleDateString('fr-CH')}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-4">
                  <dt className="text-sm text-muted-foreground">Revenue total</dt>
                  <dd className="text-sm font-bold text-emerald-600">
                    {chf.format(partner.revenue)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
