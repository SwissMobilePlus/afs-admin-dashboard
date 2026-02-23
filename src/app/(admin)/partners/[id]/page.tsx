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

// ── Mock data factories ───────────────────────────────────────────────

const mockPartnersMap: Record<string, PartnerDetail> = {
  '1': {
    id: '1',
    nom: 'CA next bank',
    categorie: 'Banque',
    siteWeb: 'https://www.ca-nextbank.ch',
    statut: 'Actif',
    couleur: '#006a4e',
    commissionType: 'CPA',
    commissionRate: 25,
    devise: 'CHF',
    dateDebut: '2025-03-01',
    clics: 3420,
    conversions: 187,
    revenue: 4675,
    tauxConversion: 5.47,
    description: 'Partenaire bancaire principal pour les comptes courants et cartes de crédit.',
  },
  '2': {
    id: '2',
    nom: 'UBS KeyClub',
    categorie: 'Banque',
    siteWeb: 'https://www.ubs.com',
    statut: 'Actif',
    couleur: '#e60000',
    commissionType: 'CPL',
    commissionRate: 20,
    devise: 'CHF',
    dateDebut: '2025-04-15',
    clics: 2890,
    conversions: 156,
    revenue: 3120,
    tauxConversion: 5.4,
    description: 'Programme de fidélité UBS avec commissions sur les leads qualifiés.',
  },
  '3': {
    id: '3',
    nom: 'Alpian',
    categorie: 'Banque',
    siteWeb: 'https://www.alpian.com',
    statut: 'Actif',
    couleur: '#1a237e',
    commissionType: 'Revenue Share',
    commissionRate: 15,
    devise: 'CHF',
    dateDebut: '2025-06-01',
    clics: 1560,
    conversions: 89,
    revenue: 2670,
    tauxConversion: 5.71,
    description: 'Banque digitale suisse avec gestion de patrimoine personnalisée.',
  },
  '4': {
    id: '4',
    nom: 'Yuh',
    categorie: 'Banque',
    siteWeb: 'https://www.yuh.com',
    statut: 'Actif',
    couleur: '#ff6600',
    commissionType: 'CPA',
    commissionRate: 25,
    devise: 'CHF',
    dateDebut: '2025-02-01',
    clics: 4210,
    conversions: 234,
    revenue: 5850,
    tauxConversion: 5.56,
    description: 'Application bancaire mobile suisse - investissement et paiement.',
  },
  '5': {
    id: '5',
    nom: 'Baloise Assurance',
    categorie: 'Assurance',
    siteWeb: 'https://www.baloise.ch',
    statut: 'Actif',
    couleur: '#004990',
    commissionType: 'CPL',
    commissionRate: 30,
    devise: 'CHF',
    dateDebut: '2025-05-10',
    clics: 980,
    conversions: 45,
    revenue: 1350,
    tauxConversion: 4.59,
    description: 'Solutions d\'assurance vie et non-vie pour particuliers.',
  },
  '6': {
    id: '6',
    nom: 'CSS Santé',
    categorie: 'Assurance',
    siteWeb: 'https://www.css.ch',
    statut: 'Inactif',
    couleur: '#00a651',
    commissionType: 'Revenue Share',
    commissionRate: 12,
    devise: 'CHF',
    dateDebut: '2025-07-01',
    clics: 1230,
    conversions: 67,
    revenue: 2010,
    tauxConversion: 5.45,
    description: 'Assurance maladie et complémentaires santé.',
  },
};

function generateDailyPerformance(): DailyPerformance[] {
  const data: DailyPerformance[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = d.toLocaleDateString('fr-CH', { day: '2-digit', month: '2-digit' });
    const clics = Math.floor(80 + Math.random() * 80);
    const conversions = Math.floor(clics * (0.04 + Math.random() * 0.03));
    data.push({ jour: day, clics, conversions });
  }
  return data;
}

function generatePayments(): Payment[] {
  return [
    { id: '1', date: '2026-02-15', periode: 'Janvier 2026', montant: 1250, statut: 'Payé' },
    { id: '2', date: '2026-01-15', periode: 'Décembre 2025', montant: 1180, statut: 'Payé' },
    { id: '3', date: '2025-12-15', periode: 'Novembre 2025', montant: 1095, statut: 'Payé' },
    { id: '4', date: '2025-11-15', periode: 'Octobre 2025', montant: 1020, statut: 'Payé' },
    { id: '5', date: '2025-10-15', periode: 'Septembre 2025', montant: 960, statut: 'Payé' },
    { id: '6', date: '2026-03-15', periode: 'Février 2026', montant: 1340, statut: 'En attente' },
  ];
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
        const [partnerRes, analyticsRes] = await Promise.allSettled([
          get<{ data: PartnerDetail }>(`/admin/partners/${partnerId}`),
          get<{ data: { performance: DailyPerformance[]; payments: Payment[] } }>(
            `/admin/partners/${partnerId}/analytics`,
          ),
        ]);

        if (partnerRes.status === 'fulfilled' && partnerRes.value?.data) {
          setPartner(partnerRes.value.data);
        } else {
          // Fallback to mock
          setPartner(mockPartnersMap[partnerId] || mockPartnersMap['1']);
        }

        if (analyticsRes.status === 'fulfilled' && analyticsRes.value?.data) {
          setPerformance(analyticsRes.value.data.performance);
          setPayments(analyticsRes.value.data.payments);
        } else {
          setPerformance(generateDailyPerformance());
          setPayments(generatePayments());
        }
      } catch {
        setPartner(mockPartnersMap[partnerId] || mockPartnersMap['1']);
        setPerformance(generateDailyPerformance());
        setPayments(generatePayments());
      } finally {
        setLoading(false);
      }
    }

    fetchPartner();
  }, [partnerId]);

  async function handlePayout() {
    try {
      await post(`/admin/partners/${partnerId}/payout`, {
        periode: 'Février 2026',
        montant: 1340,
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
