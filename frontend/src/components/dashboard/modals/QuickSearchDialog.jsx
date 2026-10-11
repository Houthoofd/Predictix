import React from 'react';
import { Search, X, ChevronRight } from 'lucide-react';

export function QuickSearchDialog({
  isOpen,
  onClose,
  searchQuery,
  setSearchQuery,
  navItems,
  onSelectNav,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-start justify-center pt-24 p-4 animate-in fade-in-50">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="flex items-center px-3.5 py-3 border-b border-zinc-100">
          <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Rechercher stats, bankrolls, stratégies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 text-xs px-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2 max-h-72 overflow-y-auto divide-y divide-zinc-50 text-xs">
          <div className="px-2 py-1 text-[10px] uppercase font-semibold text-zinc-400">
            Navigation
          </div>
          {navItems
            .filter((item) =>
              item.label.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelectNav(item.id);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-100 rounded-md flex items-center justify-between text-zinc-700 hover:text-zinc-900 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 text-zinc-500" />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-zinc-400" />
                </button>
              );
            })}
        </div>

        <div className="p-2 border-t border-zinc-100 bg-zinc-50 text-[11px] text-zinc-500 flex justify-between items-center px-4">
          <span>
            Appuyez sur <kbd className="font-mono bg-white px-1 border rounded">Échap</kbd> pour fermer
          </span>
          <span className="font-mono text-zinc-400">predictix.be</span>
        </div>
      </div>
    </div>
  );
}
