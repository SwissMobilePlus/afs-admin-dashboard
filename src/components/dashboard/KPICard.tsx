'use client';

import { type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  /** Optional percentage change vs previous period. When null/undefined, shows "—" instead of fake data. */
  change?: number | null;
  changeLabel?: string;
  prefix?: string;
}

export function KPICard({
  title,
  value,
  icon: Icon,
  change,
  changeLabel,
  prefix,
}: KPICardProps) {
  const hasChange = change != null;
  const isPositive = hasChange && change >= 0;

  const formattedValue = prefix
    ? `${prefix} ${value.toLocaleString('fr-CH')}`
    : value.toLocaleString('fr-CH');

  return (
    <Card className="group relative overflow-hidden py-5 transition-all duration-200 hover:shadow-md hover:border-border/80">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">
            {title}
          </span>
          <span className="text-2xl font-bold tracking-tight text-card-foreground">
            {formattedValue}
          </span>
          {hasChange ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5',
                  isPositive
                    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/50'
                    : 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50'
                )}
              >
                <span className="text-[10px]">{isPositive ? '\u2191' : '\u2193'}</span>
                {Math.abs(change).toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">
                  {changeLabel}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs text-muted-foreground">
                {changeLabel || '—'}
              </span>
            </div>
          )}
        </div>
        <div className="flex-shrink-0 rounded-lg bg-muted/50 p-2.5 text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
