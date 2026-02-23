'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Megaphone,
  Mail,
  Bell,
  MessageSquare,
  Plus,
  Eye,
  MousePointerClick,
  Users,
  MoreHorizontal,
  Copy,
  Trash2,
  Send,
  Pause,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { get } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────────────────

type CampaignType = 'push' | 'email' | 'in-app';
type CampaignStatus = 'brouillon' | 'programmee' | 'en_cours' | 'envoyee' | 'annulee';

interface Campaign {
  id: string;
  title: string;
  type: CampaignType;
  date: string;
  audience: number;
  status: CampaignStatus;
  opens: number;
  clicks: number;
}

// ── API response type for campaign stats ─────────────────────────────────

interface CampaignStatsResponse {
  totalSent: number;
  totalSentChange: number;
  avgOpenRate: number;
  avgOpenRateChange: number;
  avgClickRate: number;
  avgClickRateChange: number;
  totalReached: number;
  totalReachedChange: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────

const typeConfig: Record<CampaignType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  push: { label: 'Push', icon: Bell, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  'in-app': { label: 'In-app', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  programmee: { label: 'Programmée', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  en_cours: { label: 'En cours', color: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400' },
  envoyee: { label: 'Envoyée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

// ── API response normalization ───────────────────────────────────────────

/** Normalize API type field: 'in_app' -> 'in-app' */
function normalizeType(type: string): CampaignType {
  if (type === 'in_app') return 'in-app';
  if (type === 'push' || type === 'email' || type === 'in-app') return type;
  return 'email'; // safe fallback
}

/** Normalize API status field: English -> French equivalents */
function normalizeStatus(status: string): CampaignStatus {
  const statusMap: Record<string, CampaignStatus> = {
    draft: 'brouillon',
    scheduled: 'programmee',
    sending: 'en_cours',
    sent: 'envoyee',
    cancelled: 'annulee',
    // Already-French values pass through
    brouillon: 'brouillon',
    programmee: 'programmee',
    en_cours: 'en_cours',
    envoyee: 'envoyee',
    annulee: 'annulee',
  };
  return statusMap[status] || 'brouillon';
}

/** Normalize a raw campaign object from the API into our local Campaign type.
 *
 * Prisma Campaign model fields (camelCase):
 *   id, title, body, type, targetFilter, status,
 *   scheduledAt, sentAt, createdAt, updatedAt,
 *   sentCount, openCount, clickCount, createdById, createdBy
 *
 * Note: The model has no dedicated "audience" field.
 * We use `sentCount` as the audience/reach figure for sent campaigns.
 */
function normalizeCampaign(raw: Record<string, unknown>): Campaign {
  // Prefer sentAt > scheduledAt > createdAt for the display date (all camelCase from Prisma)
  const date = String(raw.sentAt ?? raw.scheduledAt ?? raw.createdAt ?? '');

  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    type: normalizeType(String(raw.type ?? 'email')),
    date,
    // No "audience" field in Prisma model; use sentCount as the reach metric
    audience: Number(raw.sentCount ?? 0),
    status: normalizeStatus(String(raw.status ?? 'draft')),
    // Backend returns openCount / clickCount (not opens / clicks)
    opens: Number(raw.openCount ?? 0),
    clicks: Number(raw.clickCount ?? 0),
  };
}

// ── Skeleton components ──────────────────────────────────────────────────

function KPISkeleton() {
  return (
    <Card className="group relative overflow-hidden py-5">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="h-4 w-28 rounded-md bg-muted animate-pulse" />
          <div className="h-7 w-16 rounded-md bg-muted animate-pulse mt-1" />
          <div className="h-4 w-32 rounded-md bg-muted animate-pulse mt-1" />
        </div>
        <div className="flex-shrink-0 rounded-lg bg-muted/50 p-2.5">
          <div className="h-5 w-5 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card className="py-0">
      <div className="p-4 space-y-3">
        <div className="h-8 w-full rounded-md bg-muted animate-pulse" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 w-full rounded-md bg-muted/60 animate-pulse" />
        ))}
      </div>
    </Card>
  );
}

// ── Page Component ───────────────────────────────────────────────────────

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignStats, setCampaignStats] = useState<CampaignStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [campaignsRes, statsRes] = await Promise.allSettled([
          get<{ campaigns: Campaign[] } | Campaign[]>('/admin/campaigns'),
          get<CampaignStatsResponse>('/admin/campaigns/stats'),
        ]);

        if (campaignsRes.status === 'fulfilled' && campaignsRes.value) {
          const raw: unknown = campaignsRes.value;
          // Handle both { campaigns: [...] } and plain [...] response shapes
          let rawList: Record<string, unknown>[] = [];
          if (Array.isArray(raw)) {
            rawList = raw as Record<string, unknown>[];
          } else if (raw && typeof raw === 'object' && 'campaigns' in raw && Array.isArray((raw as Record<string, unknown>).campaigns)) {
            rawList = (raw as Record<string, unknown>).campaigns as Record<string, unknown>[];
          }

          if (rawList.length > 0) {
            setCampaigns(rawList.map(normalizeCampaign));
          }
        }

        if (statsRes.status === 'fulfilled' && statsRes.value) {
          setCampaignStats(statsRes.value);
        }
      } catch {
        // Keep empty state on error
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // ── Stats calculations ────────────────────────────────────────────────
  // Use API stats if available, otherwise compute from campaign list

  const sentCampaigns = campaigns.filter((c) => c.status === 'envoyee');
  const totalSent = campaignStats?.totalSent ?? sentCampaigns.length;
  const avgOpenRate = campaignStats?.avgOpenRate ?? (
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((acc, c) => acc + (c.audience > 0 ? (c.opens / c.audience) * 100 : 0), 0) / sentCampaigns.length
      : 0
  );
  const avgClickRate = campaignStats?.avgClickRate ?? (
    sentCampaigns.length > 0
      ? sentCampaigns.reduce((acc, c) => acc + (c.audience > 0 ? (c.clicks / c.audience) * 100 : 0), 0) / sentCampaigns.length
      : 0
  );
  const totalReached = campaignStats?.totalReached ?? sentCampaigns.reduce((acc, c) => acc + c.audience, 0);

  const stats = [
    { title: 'Campagnes envoyées', value: totalSent, icon: Send, change: campaignStats?.totalSentChange ?? 0, changeLabel: campaignStats ? 'vs mois dernier' : '' },
    { title: 'Taux d\'ouverture moyen', value: `${avgOpenRate.toFixed(1)}%`, icon: Eye, change: campaignStats?.avgOpenRateChange ?? 0, changeLabel: campaignStats ? 'vs mois dernier' : '' },
    { title: 'Taux de clic moyen', value: `${avgClickRate.toFixed(1)}%`, icon: MousePointerClick, change: campaignStats?.avgClickRateChange ?? 0, changeLabel: campaignStats ? 'vs mois dernier' : '' },
    { title: 'Utilisateurs atteints', value: totalReached.toLocaleString('fr-CH'), icon: Users, change: campaignStats?.totalReachedChange ?? 0, changeLabel: campaignStats ? 'vs mois dernier' : '' },
  ];

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Campagnes Marketing</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gérez vos campagnes push, email et in-app
            </p>
          </div>
          <Button asChild>
            <Link href="/marketing/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle campagne
            </Link>
          </Button>
        </div>

        {/* KPI Skeletons */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
          <KPISkeleton />
        </div>

        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    );
  }

  // ── Loaded state ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campagnes Marketing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos campagnes push, email et in-app
          </p>
        </div>
        <Button asChild>
          <Link href="/marketing/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle campagne
          </Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change >= 0;
          const isZero = stat.change === 0;
          return (
            <Card key={stat.title} className="group relative overflow-hidden py-5 transition-all duration-200 hover:shadow-md hover:border-border/80">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {stat.title}
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-card-foreground">
                    {stat.value}
                  </span>
                  {!isZero && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 ${
                          isPositive
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                            : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50'
                        }`}
                      >
                        <span className="text-[10px]">{isPositive ? '\u2191' : '\u2193'}</span>
                        {Math.abs(stat.change).toFixed(1)}%
                      </span>
                      <span className="text-xs text-muted-foreground">{stat.changeLabel}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 rounded-lg bg-muted/50 p-2.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <Icon className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Campaigns table */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Audience</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Ouvertures</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right pr-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                  Aucune campagne trouvée
                </TableCell>
              </TableRow>
            )}
            {campaigns.map((campaign) => {
              const typeInfo = typeConfig[campaign.type];
              const statusInfo = statusConfig[campaign.status];
              const TypeIcon = typeInfo.icon;
              return (
                <TableRow key={campaign.id}>
                  <TableCell className="pl-4 font-medium max-w-[280px] truncate">
                    {campaign.title}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeInfo.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(campaign.date), 'dd MMM yyyy, HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {campaign.audience.toLocaleString('fr-CH')}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {campaign.opens > 0 ? campaign.opens.toLocaleString('fr-CH') : '—'}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {campaign.clicks > 0 ? campaign.clicks.toLocaleString('fr-CH') : '—'}
                  </TableCell>
                  <TableCell className="text-right pr-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" />
                          Voir détails
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Dupliquer
                        </DropdownMenuItem>
                        {campaign.status === 'programmee' && (
                          <DropdownMenuItem>
                            <Pause className="mr-2 h-4 w-4" />
                            Annuler
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
