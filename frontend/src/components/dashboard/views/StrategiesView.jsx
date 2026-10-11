import React from 'react';
import { Sliders, Plus } from 'lucide-react';
import { Button } from '../../ui/button';

export function StrategiesView({
  strategies,
  setShowNewStrategyModal,
  backtestResult,
  setBacktestResult,
  testStrategyMutation,
}) {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-zinc-800" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Créateur & Test de Stratégies
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal">
            Définissez vos règles de sélection de paris et lancez des simulations historiques directement sur les matchs de predictix-api.
          </p>
        </div>

        <Button
          onClick={() => setShowNewStrategyModal(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Stratégie</span>
        </Button>
      </div>

      {/* Simulation Result Banner if active */}
      {backtestResult && (
        <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/60 text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in-50">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-800 block">
              Résultat de la Dernière Simulation (Sur {backtestResult.testedBets} matchs réels)
            </span>
            <div className="flex items-center gap-4 text-xs">
              <span>
                Taux de réussite : <strong>{backtestResult.winRate}%</strong> ({backtestResult.wonBets} gagnés / {backtestResult.lostBets} perdus)
              </span>
              <span>
                Profit simulé : <strong className="text-emerald-700">+{backtestResult.netProfit} €</strong>
              </span>
              <span>
                ROI : <strong className="text-emerald-700">{backtestResult.roi}</strong>
              </span>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setBacktestResult(null)}
            className="text-xs text-blue-700 hover:text-blue-900"
          >
            Fermer
          </Button>
        </div>
      )}

      {/* Strategies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strat) => (
          <div
            key={strat.id}
            className="p-5 rounded-xl border border-zinc-200 bg-white shadow-2xs space-y-3 hover:border-zinc-300 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-zinc-900 block">
                  {strat.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{strat.sport}</span>
                  <span className="text-zinc-300">•</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Backtest validé
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-sm font-bold text-emerald-600 block font-mono">
                  {strat.roi}
                </span>
                <span className="text-[11px] text-zinc-500 font-semibold">
                  {strat.winRate}% win rate
                </span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 space-y-1">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block tracking-wider">
                Règles & Conditions
              </span>
              <p className="text-[11px] text-zinc-600 font-mono leading-relaxed">
                {strat.rules}
              </p>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-100">
              <span className="text-zinc-500 font-mono">Cote min : {strat.odds || 1.85}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={testStrategyMutation?.isLoading}
                onClick={() => {
                  testStrategyMutation?.mutate({
                    strategyType: strat.type || 'corners_over',
                    threshold: strat.threshold || 9.5,
                    odds: strat.odds || 1.85,
                  });
                }}
                className="text-xs text-blue-600 hover:text-blue-700 p-0 h-auto"
              >
                {testStrategyMutation?.isLoading ? 'Calcul en cours...' : 'Tester sur predictix-api ➔'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
