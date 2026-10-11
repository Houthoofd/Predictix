import React from 'react';
import { X, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MarketsModal({
  show,
  confrontation,
  onClose,
  marketsQuery,
  marketsFilterCategory,
  setMarketsFilterCategory,
  onSelectMarketBet,
}) {
  if (!show || !confrontation) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in-50">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-zinc-200 bg-white shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 bg-zinc-50/70 flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {confrontation.sportName || 'Sport'}
              </span>
              <span className="text-zinc-400">•</span>
              <span className="text-xs font-semibold text-zinc-700">
                {confrontation.competition || 'Compétition'}
              </span>
              {confrontation.phase === 'live' ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  En direct
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-600">
                  Prematch
                </span>
              )}
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 text-zinc-600">
                Bwin Belgique
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900">
              {confrontation.homeTeam} <span className="text-zinc-400 font-normal">vs</span> {confrontation.awayTeam}
            </h2>

            <p className="text-xs text-zinc-500">
              Cliquez sur n'importe quelle cote ci-dessous pour placer instantanément un pari depuis l'une de vos bankrolls.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Category Pills */}
        <div className="px-5 py-2.5 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs shrink-0">
          {[
            { id: 'all', label: `Tous les marchés (${marketsQuery.data?.totalMarkets || 0})` },
            { id: 'Résultat', label: 'Résultats (1X2)' },
            { id: 'Totaux & Buts', label: 'Totaux & Buts' },
            { id: 'Double Chance', label: 'Double Chance' },
            { id: 'Les 2 Marquent', label: 'Les 2 Marquent' },
            { id: 'Handicap', label: 'Handicap' },
            { id: 'Spéciaux', label: 'Spéciaux & Autres' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setMarketsFilterCategory(cat.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                marketsFilterCategory === cat.id
                  ? 'bg-zinc-900 text-white shadow-2xs font-semibold'
                  : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Modal Body: Markets List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-zinc-50/30">
          {marketsQuery.isLoading ? (
            <div className="p-12 text-center space-y-3">
              <RefreshCw className="w-6 h-6 text-[#1D7CEA] animate-spin mx-auto" />
              <p className="text-xs text-zinc-500">
                Récupération de tous les marchés disponibles pour cette confrontation...
              </p>
            </div>
          ) : marketsQuery.error ? (
            <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 rounded-xl border border-rose-200">
              Erreur lors du chargement des marchés : {marketsQuery.error.message}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(marketsQuery.data?.markets || [])
                .filter(
                  (m) =>
                    marketsFilterCategory === 'all' ||
                    m.category === marketsFilterCategory ||
                    (marketsFilterCategory === 'Spéciaux' &&
                      !['Résultat', 'Totaux & Buts', 'Double Chance', 'Les 2 Marquent', 'Handicap'].includes(m.category))
                )
                .map((market, mIdx) => (
                  <div
                    key={mIdx}
                    className="rounded-xl border border-zinc-200 bg-white p-4 shadow-2xs space-y-3 hover:border-zinc-300 transition-all"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#1D7CEA]" />
                        <h3 className="text-xs font-bold text-zinc-900">
                          {market.name}
                        </h3>
                      </div>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 text-zinc-600 font-mono">
                        {market.selections.length} options
                      </span>
                    </div>

                    {/* Selections buttons grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {market.selections.map((sel, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => onSelectMarketBet(confrontation, market.name, sel)}
                          className="p-2.5 rounded-lg border border-zinc-200 bg-zinc-50/60 hover:bg-blue-50/60 hover:border-blue-300 hover:text-blue-900 transition-all text-left flex items-center justify-between gap-2 group cursor-pointer"
                        >
                          <span className="text-xs font-semibold text-zinc-800 group-hover:text-blue-900 truncate">
                            {sel.selection}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-white group-hover:bg-[#1D7CEA] group-hover:text-white border border-zinc-200 group-hover:border-transparent font-mono font-bold text-xs text-zinc-900 transition-colors shrink-0">
                            {Number(sel.odds).toFixed(2)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-zinc-200 bg-white flex items-center justify-between text-xs text-zinc-500 px-5 shrink-0">
          <span className="font-mono text-[11px]">
            {marketsQuery.data?.totalQuotes || 0} cotes actives enregistrées dans predictix-api
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Fermer
          </Button>
        </div>
      </div>
    </div>
  );
}
