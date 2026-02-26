import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  date: string;
  score: number;
  fullDate?: string;
}

interface EvolutionChartProps {
  data: ChartData[];
}

function formatTooltipDate(label: string, payload: any[]): string {
  if (payload?.[0]?.payload?.fullDate) {
    const d = new Date(payload[0].payload.fullDate + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  }
  return label;
}

const EvolutionChart = ({ data }: EvolutionChartProps) => {
  const scores = data.map((d) => d.score);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);

  return (
    <div className="rounded-2xl bg-card border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-medium">
          Últimos {data.length} dias
        </h3>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full" style={{ background: 'hsl(var(--vyr-accent-action))' }} />
          <span className="text-[10px] text-muted-foreground">VYR State</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--vyr-accent-action))" stopOpacity={0.4} />
              <stop offset="100%" stopColor="hsl(var(--vyr-accent-action))" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tickCount={4}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(label, payload) => formatTooltipDate(label, payload)}
          />
          <Area
            type="monotone"
            dataKey="score"
            stroke="hsl(var(--vyr-accent-action))"
            strokeWidth={2}
            fill="url(#scoreGradient)"
            dot={{ r: 3, fill: 'hsl(var(--vyr-accent-action))', stroke: 'hsl(var(--background))', strokeWidth: 1 }}
            activeDot={{ r: 5, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EvolutionChart;
