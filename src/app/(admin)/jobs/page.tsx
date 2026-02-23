'use client';

import { useState } from 'react';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Briefcase,
  Download,
  RefreshCw,
  TrendingUp,
  MapPin,
  FileText,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ── Mock data ────────────────────────────────────────────────────────────

// Generate 30 days of import data
const importData = Array.from({ length: 30 }, (_, i) => {
  const date = subDays(new Date('2026-02-23'), 29 - i);
  const base = 80 + Math.floor(Math.random() * 80);
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  return {
    date: format(date, 'dd/MM'),
    fullDate: format(date, 'dd MMM yyyy', { locale: fr }),
    count: weekend ? Math.floor(base * 0.3) : base,
  };
});

interface CantonCoverage {
  canton: string;
  offers: number;
  lastImport: string;
  status: 'active' | 'warning' | 'inactive';
}

const cantonCoverage: CantonCoverage[] = [
  { canton: 'Zurich', offers: 520, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Geneve', offers: 410, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Vaud', offers: 355, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Berne', offers: 290, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Bale', offers: 215, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Lucerne', offers: 142, lastImport: '2026-02-23T06:00:00', status: 'active' },
  { canton: 'Valais', offers: 118, lastImport: '2026-02-22T20:00:00', status: 'warning' },
  { canton: 'Fribourg', offers: 105, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Tessin', offers: 95, lastImport: '2026-02-22T18:00:00', status: 'warning' },
  { canton: 'Neuchatel', offers: 78, lastImport: '2026-02-23T08:30:00', status: 'active' },
  { canton: 'Argovie', offers: 68, lastImport: '2026-02-23T06:00:00', status: 'active' },
  { canton: 'Soleure', offers: 54, lastImport: '2026-02-21T12:00:00', status: 'inactive' },
];

const totalOffers = cantonCoverage.reduce((sum, c) => sum + c.offers, 0);
const importedToday = 127;
const totalApplications = 8420;
const coveredCantons = cantonCoverage.filter((c) => c.status !== 'inactive').length;

const kpis = [
  { title: 'Total offres actives', value: totalOffers.toLocaleString('fr-CH'), icon: Briefcase, change: 5.2, changeLabel: 'vs semaine derniere' },
  { title: 'Importees aujourd\'hui', value: importedToday.toString(), icon: Download, change: 12.3, changeLabel: 'vs hier' },
  { title: 'Candidatures envoyees', value: totalApplications.toLocaleString('fr-CH'), icon: FileText, change: 8.1, changeLabel: 'vs mois dernier' },
  { title: 'Cantons couverts', value: `${coveredCantons}/12`, icon: MapPin, change: 0, changeLabel: 'stable' },
];

const statusConfigCanton: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  active: { label: 'Actif', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400', icon: CheckCircle2 },
  warning: { label: 'Retard', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400', icon: Clock },
  inactive: { label: 'Inactif', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400', icon: AlertCircle },
};

// ── Chart tooltip ────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: { fullDate: string } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {payload[0].payload.fullDate}
      </p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value} offres importees
      </p>
    </div>
  );
}

// ── Page Component ───────────────────────────────────────────────────────

export default function JobsPage() {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = () => {
    setIsImporting(true);
    setTimeout(() => setIsImporting(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Emplois &amp; Importation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez les offres d&apos;emploi importees et la couverture par canton
          </p>
        </div>
        <Button onClick={handleImport} disabled={isImporting}>
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importation...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Lancer importation
            </>
          )}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const isPositive = kpi.change > 0;
          const isZero = kpi.change === 0;
          return (
            <Card key={kpi.title} className="group relative overflow-hidden py-5 transition-all duration-200 hover:shadow-md hover:border-border/80">
              <CardContent className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {kpi.title}
                  </span>
                  <span className="text-2xl font-bold tracking-tight text-card-foreground">
                    {kpi.value}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {!isZero && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5 ${
                          isPositive
                            ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                            : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50'
                        }`}
                      >
                        <span className="text-[10px]">{isPositive ? '\u2191' : '\u2193'}</span>
                        {Math.abs(kpi.change).toFixed(1)}%
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{kpi.changeLabel}</span>
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

      {/* Chart */}
      <Card className="py-5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Offres importees par jour (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={importData}
                margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(0, 0%, 85%)"
                  strokeOpacity={0.4}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }}
                  tickMargin={8}
                  interval={4}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }}
                  tickMargin={8}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="count"
                  fill="hsl(220, 80%, 56%)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Canton coverage table */}
      <Card className="py-0">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Couverture par canton
          </CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Canton</TableHead>
              <TableHead className="text-right">Nombre d&apos;offres</TableHead>
              <TableHead>Derniere importation</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cantonCoverage.map((canton) => {
              const statusInfo = statusConfigCanton[canton.status];
              const StatusIcon = statusInfo.icon;
              return (
                <TableRow key={canton.canton}>
                  <TableCell className="pl-4 font-medium">{canton.canton}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {canton.offers.toLocaleString('fr-CH')}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(canton.lastImport), 'dd MMM yyyy, HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusInfo.label}
                    </span>
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
