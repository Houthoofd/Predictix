import React from 'react';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';

export function BankrollsView({
  bankrolls,
  selectedBankrollId,
  setSelectedBankrollId,
  setShowNewBankrollModal,
  betsTrackerData,
}) {
  const currentBankroll = bankrolls.find((b) => b.id === selectedBankrollId);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-zinc-800" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
              Gestion Multi-Bankrolls
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 font-normal">
            Créez des portefeuilles distincts selon vos sports ou vos stratégies pour isoler vos risques et optimiser vos mises.
          </p>
        </div>

        <Button
          onClick={() => setShowNewBankrollModal(true)}
          className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs gap-1.5 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nouvelle Bankroll</span>
        </Button>
      </div>

      {/* Bankrolls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {bankrolls.map((bk) => (
          <Card
            key={bk.id}
            onClick={() => setSelectedBankrollId(bk.id)}
            className={`p-5 cursor-pointer transition-all ${
              selectedBankrollId === bk.id
                ? 'border-blue-500 ring-2 ring-blue-100 shadow-sm'
                : 'border-zinc-200 hover:border-zinc-300 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-900 truncate">
                {bk.name}
              </span>
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: bk.color }}
              />
            </div>

            <div className="space-y-1">
              <span className="text-2xl font-bold text-zinc-900 block font-mono">
                {bk.current.toLocaleString('fr-FR')} €
              </span>
              <div className="flex items-center justify-between text-[11px] text-zinc-500">
                <span>Capital initial :</span>
                <span className="font-mono">{bk.initial} €</span>
              </div>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-100">
                <span className="text-zinc-500">Performance ROI :</span>
                <span className="text-emerald-600 font-bold font-mono">{bk.roi}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detailed view of active bankroll */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Détails : {currentBankroll?.name}
            </h3>
            <p className="text-xs text-zinc-500">
              Historique des paris associés à ce portefeuille
            </p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">
            {currentBankroll?.sport}
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-100 text-zinc-500 text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4">Match</th>
                <th className="py-2.5 px-4">Pari</th>
                <th className="py-2.5 px-4">Cote</th>
                <th className="py-2.5 px-4">Mise</th>
                <th className="py-2.5 px-4 text-right">Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {(betsTrackerData || [])
                .filter(
                  (b) =>
                    selectedBankrollId === 'main' ||
                    b.bankroll.toLowerCase().includes(
                      (currentBankroll?.sport || '').toLowerCase()
                    )
                )
                .map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-50">
                    <td className="py-3 px-4 text-zinc-500">{b.date}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-900">{b.match}</td>
                    <td className="py-3 px-4 text-zinc-600">{b.bet}</td>
                    <td className="py-3 px-4 font-mono font-medium">{Number(b.odds).toFixed(2)}</td>
                    <td className="py-3 px-4">{b.stake} €</td>
                    <td className={`py-3 px-4 text-right font-bold font-mono ${
                      b.status === 'won' ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {b.profit}
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
