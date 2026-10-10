import React from 'react';
import { useAuth } from '@/lib/authContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  LogOut,
  User,
  Activity,
  Target,
  BarChart3,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const bankrollHistoryData = [
  { date: '01 Oct', bankroll: 1000, profit: 0 },
  { date: '02 Oct', bankroll: 1045, profit: 45 },
  { date: '03 Oct', bankroll: 1020, profit: -25 },
  { date: '04 Oct', bankroll: 1110, profit: 90 },
  { date: '05 Oct', bankroll: 1180, profit: 70 },
  { date: '06 Oct', bankroll: 1160, profit: -20 },
  { date: '07 Oct', bankroll: 1250, profit: 90 },
  { date: '08 Oct', bankroll: 1310, profit: 60 },
  { date: '09 Oct', bankroll: 1390, profit: 80 },
  { date: '10 Oct', bankroll: 1450, profit: 60 },
];

const sportPerformanceData = [
  { sport: 'Football', winRate: 72, bets: 28 },
  { sport: 'Basketball', winRate: 64, bets: 14 },
  { sport: 'Corners Over', winRate: 78, bets: 19 },
  { sport: 'Cartons Over', winRate: 60, bets: 10 },
];

export function AuthenticatedDashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#fafbfc] text-[#0F172A] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-[#0CBFAA] via-[#1D7CEA] to-[#0EAFE9] opacity-25 blur-xs group-hover:opacity-40 transition" />
              <div className="relative h-9 w-9 rounded-lg bg-white border border-slate-100 flex items-center justify-center p-1.5 shadow-2xs">
                <img
                  src="/predictix-logo.png"
                  alt="Predictix Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-[#0F172A]">
              Predictix
            </span>
            <Badge variant="brand" className="hidden sm:inline-flex ml-1.5 text-xs">
              tRPC + React Query
            </Badge>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-[#0F172A]">{user?.name || 'Administrateur'}</span>
              <span className="text-[11px] text-slate-500 font-mono">{user?.email || 'admin@predictix.io'}</span>
            </div>

            <div className="h-8 w-8 rounded-full bg-[#1D7CEA]/10 border border-[#1D7CEA]/20 flex items-center justify-center text-[#1D7CEA]">
              <User className="w-4 h-4" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs text-slate-700 hover:text-[#0F172A] hover:border-slate-300 ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Welcome Section */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="h-[2px] w-full absolute top-0 left-0 bg-gradient-to-r from-[#0CBFAA] via-[#1D7CEA] to-[#0EAFE9]" />
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="teal" className="gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0CBFAA]" />
                Session active
              </Badge>
              <span className="text-xs text-slate-500">Design harmonisé avec le logo</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Bonjour, {user?.name || 'Administrateur'}
            </h1>
            <p className="text-sm text-slate-500 max-w-2xl">
              Votre tableau de bord Predictix applique la palette officielle : <strong>Bleu Électrique</strong>, <strong>Cyan Aérien</strong>, <strong>Menthe Émeraude</strong> et <strong>Bleu Nuit</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="brand"
              size="sm"
              className="gap-2"
              onClick={() => alert('Interface harmonisée avec le logo !')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Espace Prêt
            </Button>
          </div>
        </div>

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-slate-200/80 bg-white shadow-xs hover:border-[#1D7CEA]/30 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Bankroll</span>
              <div className="p-2 rounded-lg bg-[#1D7CEA]/10 text-[#1D7CEA]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">1 450.00 €</span>
              <span className="text-xs font-semibold text-[#078575] bg-[#0CBFAA]/10 px-1.5 py-0.5 rounded">+45.0%</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Capital initial : 1 000.00 €</span>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs hover:border-[#0EAFE9]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Taux de Réussite</span>
              <div className="p-2 rounded-lg bg-[#0EAFE9]/10 text-[#0284C7]">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0F172A]">71.2%</span>
              <span className="text-xs text-slate-500">51 / 71</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Modèles IA calibrés</span>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs hover:border-[#0CBFAA]/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">ROI Global</span>
              <div className="p-2 rounded-lg bg-[#0CBFAA]/10 text-[#078575]">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#078575]">+18.4%</span>
              <span className="text-xs text-[#0284C7] bg-[#0EAFE9]/10 px-1.5 py-0.5 rounded font-medium">Edge 6.8%</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Value bets optimisés</span>
          </Card>

          <Card className="p-5 border-slate-200/80 bg-white shadow-xs hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Architecture</span>
              <div className="p-2 rounded-lg bg-[#0F172A]/10 text-[#0F172A]">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-[#0F172A]">shadcn + tRPC</span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">React Query + Zod</span>
          </Card>
        </div>

        {/* Charts Row with Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bankroll AreaChart */}
          <Card className="lg:col-span-2 border-slate-200/90 bg-white p-6 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#0F172A]">Évolution du Capital</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Courbe de performance en temps réel avec Recharts
                </CardDescription>
              </div>
              <Badge variant="sky" className="text-xs">
                Performance Live
              </Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bankrollHistoryData}>
                  <defs>
                    <linearGradient id="dashboardAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1D7CEA" stopOpacity={0.28} />
                      <stop offset="60%" stopColor="#0EAFE9" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#0CBFAA" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-lg text-xs space-y-1">
                            <div className="font-medium text-slate-500">{payload[0].payload.date}</div>
                            <div className="text-base font-bold text-[#0F172A]">{payload[0].value} €</div>
                            <div className={`font-semibold ${payload[0].payload.profit >= 0 ? 'text-[#078575]' : 'text-rose-600'}`}>
                              {payload[0].payload.profit >= 0 ? '+' : ''}{payload[0].payload.profit} €
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="bankroll"
                    stroke="#1D7CEA"
                    strokeWidth={2.5}
                    fill="url(#dashboardAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Performance BarChart */}
          <Card className="border-slate-200/90 bg-white p-6 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#0F172A]">Réussite par Marché</CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Pourcentage de réussite par type
                </CardDescription>
              </div>
              <div className="p-1.5 rounded-md bg-[#1D7CEA]/10 text-[#1D7CEA]">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="sport" type="category" stroke="#94a3b8" fontSize={11} width={85} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-lg text-xs">
                            <div className="font-semibold text-[#0F172A]">{payload[0].payload.sport}</div>
                            <div className="text-[#1D7CEA] font-bold mt-0.5">Win Rate: {payload[0].value}%</div>
                            <div className="text-slate-400 mt-0.5">{payload[0].payload.bets} paris analysés</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="winRate" fill="#1D7CEA" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
