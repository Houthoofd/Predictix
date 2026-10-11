import React from 'react';
import { X, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function NewBankrollModal({
  show,
  onClose,
  onSubmit,
  name,
  setName,
  amount,
  setAmount,
  sport,
  setSport,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in-50">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-[#1D7CEA]" />
            <h3 className="text-sm font-semibold text-zinc-900">Créer une nouvelle Bankroll</h3>
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
            <label className="font-medium text-zinc-700">Nom de la bankroll</label>
            <Input
              type="text"
              required
              placeholder="Ex: Bankroll Tennis ATP ou Stratégie Corners"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Capital de départ (€)</label>
            <Input
              type="number"
              required
              min="10"
              step="10"
              placeholder="500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="font-medium text-zinc-700">Sport ciblé</label>
            <select
              value={sport}
              onChange={(e) => setSport(e.target.value)}
              className="w-full text-xs p-2 rounded-md border border-zinc-200 bg-white text-zinc-900 focus:outline-none"
            >
              <option value="Football">Football</option>
              <option value="Basketball">Basketball</option>
              <option value="Tennis">Tennis</option>
              <option value="Multisport">Multisport (Tous)</option>
            </select>
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
              className="bg-zinc-900 text-white hover:bg-zinc-800 text-xs"
            >
              Enregistrer la bankroll
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
