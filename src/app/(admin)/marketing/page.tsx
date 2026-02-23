'use client';

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

// ── Types ────────────────────────────────────────────────────────────────

type CampaignType = 'push' | 'email' | 'in-app';
type CampaignStatus = 'brouillon' | 'programmee' | 'envoyee' | 'annulee';

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

// ── Mock data ────────────────────────────────────────────────────────────

const campaigns: Campaign[] = [
  {
    id: '1',
    title: 'Nouvelles offres premium disponibles',
    type: 'push',
    date: '2026-02-20T10:00:00',
    audience: 3420,
    status: 'envoyee',
    opens: 1856,
    clicks: 423,
  },
  {
    id: '2',
    title: 'Marché de l\'emploi suisse - Tendances février 2026',
    type: 'email',
    date: '2026-02-18T09:00:00',
    audience: 5200,
    status: 'envoyee',
    opens: 2340,
    clicks: 876,
  },
  {
    id: '3',
    title: 'Score SwissReady : Découvrez votre compatibilité',
    type: 'in-app',
    date: '2026-02-15T14:30:00',
    audience: 8100,
    status: 'envoyee',
    opens: 5670,
    clicks: 2130,
  },
  {
    id: '4',
    title: 'Offre partenaire : Formation professionnelle -20%',
    type: 'email',
    date: '2026-02-25T08:00:00',
    audience: 2800,
    status: 'programmee',
    opens: 0,
    clicks: 0,
  },
  {
    id: '5',
    title: 'Alerte emploi : 150 nouvelles offres à Genève',
    type: 'push',
    date: '2026-02-12T16:00:00',
    audience: 1950,
    status: 'envoyee',
    opens: 1287,
    clicks: 543,
  },
  {
    id: '6',
    title: 'Bienvenue sur AFS - Guide de démarrage',
    type: 'email',
    date: '2026-02-22T07:00:00',
    audience: 450,
    status: 'envoyee',
    opens: 312,
    clicks: 189,
  },
  {
    id: '7',
    title: 'Mise à jour : Nouvelles fonctionnalités IA',
    type: 'in-app',
    date: '2026-02-28T10:00:00',
    audience: 8100,
    status: 'brouillon',
    opens: 0,
    clicks: 0,
  },
  {
    id: '8',
    title: 'Rappel : Salon de l\'emploi Bâle 2026',
    type: 'push',
    date: '2026-02-10T12:00:00',
    audience: 620,
    status: 'annulee',
    opens: 0,
    clicks: 0,
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────

const typeConfig: Record<CampaignType, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  push: { label: 'Push', icon: Bell, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400' },
  email: { label: 'Email', icon: Mail, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  'in-app': { label: 'In-app', icon: MessageSquare, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
};

const statusConfig: Record<CampaignStatus, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  programmee: { label: 'Programmée', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' },
  envoyee: { label: 'Envoyée', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
  annulee: { label: 'Annulée', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

// ── Stats calculations ──────────────────────────────────────────────────

const sentCampaigns = campaigns.filter((c) => c.status === 'envoyee');
const totalSent = sentCampaigns.length;
const avgOpenRate =
  sentCampaigns.length > 0
    ? sentCampaigns.reduce((acc, c) => acc + (c.audience > 0 ? (c.opens / c.audience) * 100 : 0), 0) / sentCampaigns.length
    : 0;
const avgClickRate =
  sentCampaigns.length > 0
    ? sentCampaigns.reduce((acc, c) => acc + (c.audience > 0 ? (c.clicks / c.audience) * 100 : 0), 0) / sentCampaigns.length
    : 0;
const totalReached = sentCampaigns.reduce((acc, c) => acc + c.audience, 0);

const stats = [
  { title: 'Campagnes envoyées', value: totalSent, icon: Send, change: 12.5, changeLabel: 'vs mois dernier' },
  { title: 'Taux d\'ouverture moyen', value: `${avgOpenRate.toFixed(1)}%`, icon: Eye, change: 3.2, changeLabel: 'vs mois dernier' },
  { title: 'Taux de clic moyen', value: `${avgClickRate.toFixed(1)}%`, icon: MousePointerClick, change: -1.8, changeLabel: 'vs mois dernier' },
  { title: 'Utilisateurs atteints', value: totalReached.toLocaleString('fr-CH'), icon: Users, change: 8.7, changeLabel: 'vs mois dernier' },
];

// ── Page Component ───────────────────────────────────────────────────────

export default function MarketingPage() {
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
