import React from 'react';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function PlaceBetModal({
  show,
  selectedDisciplineForBet,
  selectedConfrontation,
  onClose,
  onSubmit,
  bankrolls,
  betBankrollId,
  setBetBankrollId,
  betMatch,
  setBetMatch,
  betMarket,
  setBetMarket,
  betSelection,
  setBetSelection,
  betOdds,
  setBetOdds,
  betStake,
  setBetStake,
  isSubmitting,
}) {
  if (!show || (!selectedDisciplineForBet && !selectedConfrontation)) return null;

  const sportId = selectedDisciplineForBet?.id || selectedConfrontation?.sportId || 4;
  const sportName = selectedDisciplineForBet?.name || selectedConfrontation?.sportName || 'Pari';
  const competition = selectedDisciplineForBet?.competition || selectedConfrontation?.competition || 'Compétition';

  const stakeNum = parseFloat(betStake) || 0;
  const oddsNum = parseFloat(betOdds) || 1;
  const potentialGross = (stakeNum * oddsNum).toFixed(2);
  const netProfit = (stakeNum * (oddsNum - 1)).toFixed(2);

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-50">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 text-xs">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center font-bold text-blue-600 font-mono">
              {sportId}
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">
                Placer un Pari • {sportName}
              </h3>
              <p className="text-[11px] text-zinc-500">
                {competition}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Select Bankroll */}
          <div className="space-y-1">
            <label className="font-semibold text-zinc-700 block">
              Portefeuille Bankroll à débiter
            </label>
            <select
              value={betBankrollId}
              onChange={(e) => setBetBankrollId(e.target.value)}
              className="w-full text-xs p-2 rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
            >
              {bankrolls.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} (Solde : {b.current.toLocaleString('fr-FR')} € • ROI {b.roi})
                </option>
              ))}
            </select>
          </div>

          {/* Match / Événement */}
          <div className="space-y-1">
            <label className="font-semibold text-zinc-700 block">
              Match / Événement
            </label>
            <Input
              type="text"
              value={betMatch}
              onChange={(e) => setBetMatch(e.target.value)}
              required
              placeholder="Ex: Équipe A vs Équipe B"
              className="text-xs"
            />
          </div>

          {/* Marché & Sélection */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 block">
                Marché
              </label>
              <Input
                type="text"
                value={betMarket}
                onChange={(e) => setBetMarket(e.target.value)}
                required
                placeholder="Ex: Résultat du match"
                className="text-xs font-medium"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 block">
                Sélection / Choix
              </label>
              <Input
                type="text"
                value={betSelection}
                onChange={(e) => setBetSelection(e.target.value)}
                required
                placeholder="Ex: Victoire Domicile, Plus de 2.5"
                className="text-xs font-semibold text-blue-900"
              />
            </div>
          </div>

          {/* Cote & Mise */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 block">
                Cote décimale
              </label>
              <Input
                type="number"
                step="0.01"
                min="1.01"
                value={betOdds}
                onChange={(e) => setBetOdds(e.target.value)}
                required
                className="text-xs font-mono font-semibold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-zinc-700 block">
                Mise engagée (€)
              </label>
              <Input
                type="number"
                step="1"
                min="1"
                value={betStake}
                onChange={(e) => setBetStake(e.target.value)}
                required
                className="text-xs font-mono font-semibold"
              />
            </div>
          </div>

          {/* Quick stake buttons */}
          <div className="flex items-center gap-1.5 pt-0.5">
            {[10, 25, 50, 100, 200].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setBetStake(String(amount))}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  betStake === String(amount)
                    ? 'bg-zinc-900 text-white border-zinc-900 font-bold'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                }`}
              >
                +{amount}€
              </button>
            ))}
          </div>

          {/* Financial Simulation Card */}
          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-zinc-600">
              <span>Mise engagée :</span>
              <span className="font-mono font-semibold text-zinc-900">
                {stakeNum.toFixed(2)} €
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-600">
              <span>Cote totale :</span>
              <span className="font-mono font-semibold text-blue-600">
                {oddsNum.toFixed(2)}
              </span>
            </div>
            <div className="border-t border-zinc-200/80 pt-1.5 flex justify-between items-center">
              <span className="font-semibold text-zinc-900">Gain potentiel brut :</span>
              <span className="font-mono font-bold text-sm text-emerald-600">
                {potentialGross} €
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-500">
              <span>Bénéfice net estimé :</span>
              <span className="font-mono font-medium text-emerald-600">
                +{netProfit} €
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-[#1D7CEA] hover:bg-blue-600 text-white text-xs gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {isSubmitting ? 'Validation...' : 'Confirmer et Placer le Pari'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
