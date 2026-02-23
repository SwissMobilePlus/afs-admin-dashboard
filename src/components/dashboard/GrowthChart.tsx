'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface GrowthChartProps {
  data: { date: string; count: number }[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground">
        {payload[0].value.toLocaleString('fr-CH')} inscriptions
      </p>
    </div>
  );
}

export function GrowthChart({ data }: GrowthChartProps) {
  return (
    <Card className="py-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Inscriptions (30 derniers jours)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
            >
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(220, 80%, 56%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220, 80%, 56%)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                tickFormatter={(value: string) => {
                  const parts = value.split('-');
                  return `${parts[2]}/${parts[1]}`;
                }}
                interval="preserveStartEnd"
                minTickGap={40}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: 'hsl(0, 0%, 45%)' }}
                tickMargin={8}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="hsl(220, 80%, 56%)"
                strokeWidth={2}
                fill="url(#growthGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'hsl(220, 80%, 56%)',
                  fill: 'white',
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
