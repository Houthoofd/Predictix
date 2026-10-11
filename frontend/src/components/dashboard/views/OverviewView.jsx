import React from 'react';
import {
  Home,
  BarChart3,
  Wallet,
  Sliders,
  Target,
  Trophy,
  ArrowRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export function OverviewView({
  totalMatchesCount,
  avgGoals,
  avgCorners,
  avgCards,
  bankrolls,
  selectedBankrollId,
  setSelectedBankrollId,
  totalCapital,
  overallROI,
  strategies,
  bankrollHistoryData,
  setActiveNav,
  setActiveTabPill,
  setShowNewBankrollModal,
  setShowNewStrategyModal,
}) {
  return (
    <div className="w-full space-y-6">
      {/* Page Title Section */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-zinc-800" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Predictix One
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 max-w-4xl font-normal leading-relaxed">
          Visualisez les statistiques sur tous les sports ({totalMatchesCount} matchs en direct et récents via predictix-api), gérez vos portefeuilles multi-bankrolls et créez vos stratégies de paris avec simulation de rentabilité.
        </p>
      </div>

      {/* 2-Column Responsive Grid (Left ~65%, Right ~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Card 1: Que souhaitez-vous faire ensuite ? */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
            <h2 className="text-xs font-semibold text-zinc-800">
              Que souhaitez-vous faire ensuite ?
            </h2>

            <div className="divide-y divide-zinc-100">
              {/* Action Row 1: Sports Stats */}
              <div className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1 text-[#1D7CEA] mt-0.5 shrink-0">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      Explorer les statistiques multisports ({totalMatchesCount} matchs réels)
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Moyennes de buts ({avgGoals}), corners ({avgCorners}), cartons ({avgCards}) et scores
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('sports-stats');
                    setActiveTabPill('sports-stats');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  Voir les stats <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action Row 2: Create / Manage Bankroll */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1 text-[#10B981] mt-0.5 shrink-0">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      Créer ou gérer une nouvelle bankroll dédiée
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {bankrolls.length} bankrolls actives • Capital cumulé : {totalCapital.toLocaleString('fr-FR')} €
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewBankrollModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  Créer une bankroll <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action Row 3: Create & Test Strategy */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1 text-[#F59E0B] mt-0.5 shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      Créer et tester une stratégie de paris sportifs
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Backtest direct sur les données réelles de predictix-api
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNewStrategyModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  Tester une stratégie <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action Row 4: Bets Tracker */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1 text-[#8B5CF6] mt-0.5 shrink-0">
                    <Target className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      Journaliser et analyser vos paris sportifs
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Suivi des cotes, mises, gains nets et taux de réussite
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('tracker');
                    setActiveTabPill('tracker');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  Ouvrir le tracker <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Action Row 5: 35 Disciplines & Cotes */}
              <div className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-1 text-purple-600 mt-0.5 shrink-0">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-zinc-900 block truncate">
                      Explorer les 35 disciplines sportives (8 346 cotes réelles Bwin)
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      Football US, NHL, NBA, Tennis, Esport, F1 et placement direct de paris
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveNav('disciplines');
                    setActiveTabPill('disciplines');
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  Voir les 35 sports <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Évolution du Capital Multi-Bankrolls */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-semibold text-zinc-800">
                  Évolution du Capital Multi-Bankrolls
                </h2>
                <span className="text-[11px] text-zinc-500">
                  Gains cumulés sur l'ensemble de vos portefeuilles
                </span>
              </div>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                +{overallROI}% Total
              </span>
            </div>

            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={bankrollHistoryData}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D7CEA" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="#1D7CEA" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
                  <XAxis dataKey="date" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} domain={['dataMin - 50', 'dataMax + 50']} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="p-2.5 rounded-md bg-white border border-zinc-200 shadow-md text-xs">
                            <div className="text-zinc-500">{payload[0].payload.date}</div>
                            <div className="font-bold text-zinc-900">{payload[0].value} €</div>
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
                    strokeWidth={2}
                    fill="url(#totalGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 1: Vos Portefeuilles Multi-Bankrolls */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-800">Vos Portefeuilles Bankroll</h2>
              <button
                type="button"
                onClick={() => setShowNewBankrollModal(true)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                + Créer
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {bankrolls.map((bk) => (
                <div
                  key={bk.id}
                  onClick={() => {
                    setSelectedBankrollId(bk.id);
                    setActiveNav('bankrolls');
                    setActiveTabPill('bankrolls');
                  }}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                    selectedBankrollId === bk.id
                      ? 'border-blue-300 bg-blue-50/40 shadow-2xs'
                      : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                  }`}
                >
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: bk.color }}
                      />
                      <span className="text-xs font-semibold text-zinc-900 truncate block">
                        {bk.name}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400 block pl-3.5">
                      {bk.sport} • Initial: {bk.initial} €
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-zinc-900 block font-mono">
                      {bk.current.toLocaleString('fr-FR')} €
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold block font-mono">
                      {bk.roi}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: Vos Stratégies de Paris */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-zinc-800">Stratégies & Backtest</h2>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('strategies');
                  setActiveTabPill('strategies');
                }}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                Gérer <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5 pt-1">
              {strategies.slice(0, 3).map((strat) => (
                <div
                  key={strat.id}
                  onClick={() => {
                    setActiveNav('strategies');
                    setActiveTabPill('strategies');
                  }}
                  className="p-2.5 rounded-lg border border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-900 truncate">
                      {strat.name}
                    </span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-semibold shrink-0">
                      {strat.roi}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span>{strat.sport} • {strat.betsCount} paris testés</span>
                    <span className="font-semibold text-zinc-700">{strat.winRate}% win</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 3: Source de données sportive */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-3">
            <h2 className="text-xs font-semibold text-zinc-800">Source de Données</h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                <span className="font-medium text-zinc-800">predictix-api (port 3100)</span>
                <span className="text-emerald-600 font-semibold font-mono">Connecté</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                <span className="font-medium text-zinc-800">Matchs collectés</span>
                <span className="text-zinc-700 font-mono font-bold">{totalMatchesCount} matchs</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-zinc-50">
                <span className="font-medium text-zinc-800">Moyenne Buts / Match</span>
                <span className="text-zinc-700 font-mono font-bold">{avgGoals}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
