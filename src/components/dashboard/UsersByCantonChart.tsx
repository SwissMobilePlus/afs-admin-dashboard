'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UsersByCantonChartProps {
  data: { canton: string; count: number }[];
}

const CANTON_COLORS = [
  'hsl(220, 80%, 56%)',
  'hsl(262, 60%, 58%)',
  'hsl(160, 60%, 42%)',
  'hsl(30, 80%, 55%)',
  'hsl(340, 65%, 55%)',
  'hsl(190, 70%, 45%)',
  'hsl(45, 75%, 50%)',
  'hsl(280, 50%, 50%)',
  'hsl(10, 70%, 55%)',
  'hsl(140, 55%, 40%)',
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { canton: string; count: number } }[];
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  return (
    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 shadow-xl">
      <p className="text-sm font-semibold text-foreground">{entry.payload.canton}</p>
      <p className="text-xs text-muted-foreground">
        {entry.value.toLocaleString('fr-CH')} utilisateurs
      </p>
    </div>
  );
}

function CustomLegend({
  payload,
}: {
  payload?: { value: string; color: string }[];
}) {
  if (!payload?.length) return null;

  return (
    <div className="flex flex-col gap-1.5 text-xs">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function UsersByCantonChart({ data }: UsersByCantonChartProps) {
  return (
    <Card className="py-5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Utilisateurs par canton
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="canton"
                cx="40%"
                cy="50%"
                outerRadius={100}
                innerRadius={55}
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CANTON_COLORS[index % CANTON_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                content={<CustomLegend />}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{ right: 0, top: '50%', transform: 'translateY(-50%)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
