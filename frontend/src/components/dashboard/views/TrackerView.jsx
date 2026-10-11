import React from 'react';
import { Target, Plus } from 'lucide-react';
import { Button } from '../../ui/button';

export function TrackerView({
  trackedBets,
  handleOpenPlaceBet,
  disciplines,
}) {
  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-zinc-800" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Tracker de Paris Sportifs
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal">
            Journalisez et suivez tous vos paris par sport et par bankroll.
          </p>
        </div>

        <Button
          onClick={() =>
            handleOpenPlaceBet(
              disciplines?.[0] || {
                id: 4,
                name: 'Football',
                category: 'Sports Collectifs',
                competition: 'Ligue 1',
                sampleMatch: 'Paris vs Marseille',
                defaultOdds: [1.85],
              }
            )
          }
          className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter un Pari</span>
        </Button>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-2xs">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-900">Journal d'Activité Récente</span>
          <span className="text-zinc-500 font-mono">{(trackedBets || []).length} paris enregistrés</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px] font-medium">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Sport</th>
                <th className="py-2.5 px-4">Match</th>
                <th className="py-2.5 px-4">Pari / Sélection</th>
                <th className="py-2.5 px-4">Bankroll</th>
                <th className="py-2.5 px-4">Cote</th>
                <th className="py-2.5 px-4">Mise</th>
                <th className="py-2.5 px-4">Statut</th>
                <th className="py-2.5 px-4 text-right">Profit Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-zinc-800">
              {(trackedBets || []).map((bet) => (
                <tr key={bet.id} className="hover:bg-zinc-50/80 transition-colors">
                  <td className="py-3 px-4 text-zinc-400 font-mono">{bet.date}</td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-700 font-medium">
                      {bet.sport}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-zinc-900">{bet.match}</td>
                  <td className="py-3 px-4 text-zinc-600">{bet.bet}</td>
                  <td className="py-3 px-4 text-zinc-500">{bet.bankroll}</td>
                  <td className="py-3 px-4 font-mono font-semibold">{Number(bet.odds).toFixed(2)}</td>
                  <td className="py-3 px-4">{bet.stake} €</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        bet.status === 'won'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : bet.status === 'pending'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {bet.status === 'won' ? 'Gagné' : bet.status === 'pending' ? 'En cours' : 'Perdu'}
                    </span>
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-semibold font-mono ${
                      bet.status === 'won'
                        ? 'text-emerald-600'
                        : bet.status === 'pending'
                        ? 'text-amber-600'
                        : 'text-rose-600'
                    }`}
                  >
                    {bet.profit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
