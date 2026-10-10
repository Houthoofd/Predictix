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
    <div className="min-h-screen bg-[#fafafa] text-zinc-900 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 text-white flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight text-zinc-900">
              Predictix
            </span>
            <Badge variant="secondary" className="hidden sm:inline-flex ml-2 text-xs font-normal">
              shadcn/ui + tRPC
            </Badge>
          </div>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-medium text-zinc-900">{user?.name || 'Administrateur'}</span>
              <span className="text-[11px] text-zinc-500 font-mono">{user?.email || 'admin@predictix.io'}</span>
            </div>

            <div className="h-8 w-8 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700">
              <User className="w-4 h-4" />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              className="gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 ml-1"
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
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="success" className="gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                Session active
              </Badge>
              <span className="text-xs text-zinc-500">Style blanc & épuré</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Bonjour, {user?.name || 'Administrateur'}
            </h1>
            <p className="text-sm text-zinc-500 max-w-2xl">
              Votre interface Predictix est prête avec <strong>shadcn/ui</strong>, <strong>React Query</strong>, <strong>tRPC</strong>, <strong>Zod</strong> et <strong>Recharts</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="default"
              size="sm"
              className="gap-2 bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={() => alert('Interface épurée prête pour la suite du projet !')}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Espace Prêt
            </Button>
          </div>
        </div>

        {/* Top KPIs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-5 border-zinc-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Bankroll</span>
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-800">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">1 450.00 €</span>
              <span className="text-xs font-semibold text-emerald-600">+45.0%</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">Capital initial : 1 000.00 €</span>
          </Card>

          <Card className="p-5 border-zinc-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Taux de Réussite</span>
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-800">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">71.2%</span>
              <span className="text-xs text-zinc-500">51 / 71</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">Modèles IA calibrés</span>
          </Card>

          <Card className="p-5 border-zinc-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">ROI Global</span>
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-800">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-zinc-900">+18.4%</span>
              <span className="text-xs text-emerald-600">Edge 6.8%</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">Value bets optimisés</span>
          </Card>

          <Card className="p-5 border-zinc-200 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Architecture</span>
              <div className="p-1.5 rounded-md bg-zinc-100 text-zinc-800">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-xl font-bold text-zinc-900">shadcn + tRPC</span>
            </div>
            <span className="text-[11px] text-zinc-400 mt-1 block">React Query + Zod</span>
          </Card>
        </div>

        {/* Charts Row with Recharts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bankroll AreaChart */}
          <Card className="lg:col-span-2 border-zinc-200 bg-white p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-900">Évolution du Capital</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Courbe de performance en temps réel avec Recharts
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs text-zinc-600 border-zinc-200">
                Recharts Area
              </Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bankrollHistoryData}>
                  <defs>
                    <linearGradient id="dashboardAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#18181b" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#18181b" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 rounded-md bg-white border border-zinc-200 shadow-md text-xs space-y-0.5">
                            <div className="font-medium text-zinc-500">{payload[0].payload.date}</div>
                            <div className="text-sm font-bold text-zinc-900">{payload[0].value} €</div>
                            <div className={`font-semibold ${payload[0].payload.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
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
                    stroke="#18181b"
                    strokeWidth={2}
                    fill="url(#dashboardAreaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Performance BarChart */}
          <Card className="border-zinc-200 bg-white p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-900">Réussite par Marché</CardTitle>
                <CardDescription className="text-xs text-zinc-500">
                  Pourcentage de réussite par type
                </CardDescription>
              </div>
              <BarChart3 className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#a1a1aa" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="sport" type="category" stroke="#a1a1aa" fontSize={11} width={80} tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 rounded-md bg-white border border-zinc-200 shadow-md text-xs">
                            <div className="font-semibold text-zinc-900">{payload[0].payload.sport}</div>
                            <div className="text-zinc-700">Win Rate: {payload[0].value}%</div>
                            <div className="text-zinc-400">{payload[0].payload.bets} paris analysés</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="winRate" fill="#18181b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
