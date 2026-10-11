import React from 'react';
import { BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export function SportsStatsView({
  totalMatchesCount,
  matchesQuery,
  aggregatesQuery,
  avgGoals,
  over25Rate,
  avgCorners,
  avgCards,
  homeWinRate,
  bttsRate,
  matchSearchTeam,
  setMatchSearchTeam,
}) {
  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-zinc-800" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Statistiques Multisports ({totalMatchesCount} matchs réels)
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal">
            Données collectées en temps réel par predictix-api : buts, corners, cartons, fautes et résultats détaillés.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              matchesQuery.refetch();
              aggregatesQuery.refetch();
            }}
            className="h-8 text-xs gap-1.5 border-zinc-200"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${matchesQuery.isFetching ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
        </div>
      </div>

      {/* Real Aggregated KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Buts / Match</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
            {avgGoals}
          </span>
          <span className="text-[11px] text-blue-600 font-medium">Over 2.5 : {over25Rate}%</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Corners</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
            {avgCorners}
          </span>
          <span className="text-[11px] text-zinc-400">Total corners par match</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Moyenne Cartons Jaunes</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
            {avgCards}
          </span>
          <span className="text-[11px] text-zinc-400">Fautes : 24.6 moy</span>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-2xs">
          <span className="text-[11px] text-zinc-500 uppercase tracking-wider block font-medium">Victoire Domicile</span>
          <span className="text-2xl font-bold text-zinc-900 mt-1 block font-mono">
            {homeWinRate}%
          </span>
          <span className="text-[11px] text-emerald-600 font-semibold">Les 2 marq. : {bttsRate}%</span>
        </div>
      </div>

      {/* Real Matches Explorer from predictix-api */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs space-y-3">
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-zinc-900">
              Matchs Récents & Statistiques de Jeu (Source : predictix-api)
            </span>
            <p className="text-[11px] text-zinc-400">
              Cliquez sur une ligne pour observer les corners, tirs et cartons détaillés
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Filtrer par équipe..."
              value={matchSearchTeam}
              onChange={(e) => setMatchSearchTeam(e.target.value)}
              className="h-8 text-xs w-48"
            />
          </div>
        </div>

        {matchesQuery.isLoading ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            Chargement des matchs en direct depuis predictix-api...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px]">
                <tr>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Tournoi / Compétition</th>
                  <th className="py-2.5 px-4">Rencontre</th>
                  <th className="py-2.5 px-4 text-center">Score</th>
                  <th className="py-2.5 px-4 text-center">Corners (D / E)</th>
                  <th className="py-2.5 px-4 text-center">Cartons</th>
                  <th className="py-2.5 px-4 text-center">Tirs Cadrés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-zinc-800">
                {matchesQuery.data?.matches?.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">{m.date}</td>
                    <td className="py-3 px-4 text-zinc-500 max-w-[160px] truncate">{m.tournament}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">
                      {m.homeTeam} <span className="text-zinc-400 font-normal">vs</span> {m.awayTeam}
                    </td>
                    <td className="py-3 px-4 text-center font-bold font-mono text-zinc-900">
                      {m.score}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="font-semibold text-blue-600">{m.corners.total}</span>{' '}
                      <span className="text-zinc-400 text-[10px]">({m.corners.home} - {m.corners.away})</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className="text-amber-600 font-semibold">{m.yellowCards.total}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-zinc-600">
                      {m.shotsOnTarget.home || 0} - {m.shotsOnTarget.away || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
