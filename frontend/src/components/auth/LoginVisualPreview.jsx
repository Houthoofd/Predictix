import React from 'react';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';
import { TrendingUp, ShieldCheck, Activity, Target } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const sampleChartData = [
  { match: 'J-14', bankroll: 1000, roi: 0 },
  { match: 'J-12', bankroll: 1060, roi: 6.0 },
  { match: 'J-10', bankroll: 1120, roi: 12.0 },
  { match: 'J-8', bankroll: 1090, roi: 9.0 },
  { match: 'J-6', bankroll: 1210, roi: 21.0 },
  { match: 'J-4', bankroll: 1280, roi: 28.0 },
  { match: 'J-2', bankroll: 1340, roi: 34.0 },
  { match: 'Auj.', bankroll: 1425, roi: 42.5 },
];

export function LoginVisualPreview() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-8 rounded-xl border border-zinc-200 bg-zinc-50/70 shadow-sm overflow-hidden">
      {/* Top section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 py-1 px-3 text-zinc-700 bg-white border border-zinc-200 shadow-xs">
            <Activity className="w-3.5 h-3.5 text-zinc-900" />
            <span>Moteur Prédictif v3.0</span>
          </Badge>
          <Badge variant="success" className="gap-1 py-1 px-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Modèles Calibrés</span>
          </Badge>
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          Intelligence Prédictive & Tracking
        </h2>
        <p className="text-sm text-zinc-500 max-w-md leading-relaxed">
          Suivi quantitatif du capital, simulation de cotes réelles par Gradient Boosting et modélisation de Poisson bivariée.
        </p>
      </div>

      {/* Clean White Card with Recharts */}
      <div className="my-6 p-5 rounded-lg bg-white border border-zinc-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-zinc-100 text-zinc-900 border border-zinc-200/60">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-zinc-500 font-medium">Progression du Capital</div>
              <div className="text-lg font-bold text-zinc-900">
                1 425.00 € <span className="text-xs text-emerald-600 font-semibold">(+42.5%)</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500 font-medium">Win Rate Global</div>
            <div className="text-sm font-bold text-zinc-900">68.4%</div>
          </div>
        </div>

        {/* Recharts chart */}
        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampleChartData}>
              <defs>
                <linearGradient id="soberAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#18181b" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="match" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="p-2.5 rounded-md bg-white border border-zinc-200 shadow-md text-xs">
                        <div className="text-zinc-500 font-medium">{payload[0].payload.match}</div>
                        <div className="text-zinc-900 font-bold">{payload[0].value} €</div>
                        <div className="text-emerald-600 font-medium">+{payload[0].payload.roi}% ROI</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="bankroll"
                stroke="#18181b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#soberAreaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature KPI metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <Target className="w-3.5 h-3.5 text-zinc-700" />
            <span>Value Bets</span>
          </div>
          <div className="text-sm font-semibold text-zinc-900">+8.2% Edge</div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <Activity className="w-3.5 h-3.5 text-zinc-700" />
            <span>Modèles IA</span>
          </div>
          <div className="text-sm font-semibold text-zinc-900">GBDT v2</div>
        </div>

        <div className="p-3 rounded-lg bg-white border border-zinc-200 text-center shadow-xs">
          <div className="flex items-center justify-center gap-1 text-zinc-500 text-xs mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-700" />
            <span>Bankroll</span>
          </div>
          <div className="text-sm font-semibold text-zinc-900">Protégée</div>
        </div>
      </div>
    </div>
  );
}
