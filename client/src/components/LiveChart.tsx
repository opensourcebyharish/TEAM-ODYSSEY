import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Point {
  t: number; // epoch ms
  [key: string]: number | string;
}

export function ChartTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="mb-1 font-sans text-[10px] uppercase tracking-wide text-slate-400">
        {new Date(label).toLocaleTimeString('en-GB', { hour12: false })}
      </div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="data-value text-xs" style={{ color: p.color || p.stroke }}>
          {p.dataKey}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value} {unit}
        </div>
      ))}
    </div>
  );
}

export default function LiveChart({
  data,
  dataKey,
  color = '#2dd4bf',
  unit = '',
  height = 200,
  domain,
  gradientId = 'tealGrad',
  syncId,
}: {
  data: Point[];
  dataKey: string;
  color?: string;
  unit?: string;
  height?: number;
  domain?: [number | 'auto', number | 'auto'];
  gradientId?: string;
  syncId?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} syncId={syncId} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.45} />
            <stop offset="100%" stopColor={color} stopOpacity={0.03} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1d2942" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => new Date(v).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit' })}
          stroke="#475569"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: '#1d2942' }}
        />
        <YAxis
          stroke="#475569"
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          domain={domain || ['auto', 'auto']}
          width={46}
        />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}