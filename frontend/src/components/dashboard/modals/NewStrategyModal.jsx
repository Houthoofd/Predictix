import React from 'react';
import { X, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewStrategyModal({
  show,
  onClose,
  onSubmit,
  name,
  setName,
  type,
  setType,
  minOdds,
  setMinOdds,
  threshold,
  setThreshold,
  rules,
  setRules,
  isTesting,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-50">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#F59E0B]" />
            <h3 className="text-sm font-semibold text-zinc-900">Créer & Tester une Stratégie</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Nom de la stratégie</label>
            <Input
              type="text"
              required
              placeholder="Ex: Corners Over 9.5 ou Plus de 2.5 Buts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-medium text-zinc-700">Type de Marché</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full text-xs p-2 rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
              >
                <option value="corners_over">Corners Over</option>
                <option value="cards_over">Cartons Over</option>
                <option value="over_2_5">Plus de 2.5 Buts</option>
                <option value="btts">Les 2 Équipes Marquent</option>
                <option value="home_win">Victoire Domicile</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-medium text-zinc-700">Cote Minimale</label>
              <Input
                type="number"
                step="0.05"
                min="1.05"
                placeholder="1.85"
                value={minOdds}
                onChange={(e) => setMinOdds(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Seuil Statistique</label>
            <Input
              type="number"
              step="0.5"
              placeholder="9.5 pour corners, 2.5 pour buts..."
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Règles & Conditions</label>
            <Input
              type="text"
              placeholder="Ex: Équipes offensives, arbitre sévère..."
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              className="text-xs"
            />
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
              disabled={isTesting}
              className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs"
            >
              {isTesting ? 'Simulation en cours...' : 'Tester sur predictix-api'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
