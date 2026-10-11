import React from 'react';
import { ChevronDown, HelpCircle, User, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardHeader({
  user,
  logout,
  accountMenuOpen,
  setAccountMenuOpen,
  accountMenuRef,
  totalCapital,
  overallROI,
  totalMatchesCount,
  bankrollsCount,
  activeNav,
  setActiveNav,
  setActiveTabPill,
  setShowNewBankrollModal,
}) {
  return (
    <>
      {/* 1. TOP HEADER BAR */}
      <header className="h-12 border-b border-zinc-200 bg-white flex items-center justify-between px-3.5 z-40 shrink-0">
        {/* Left: Predictix Brand Logo + Instance Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
            <div className="h-6 w-6 rounded-md bg-white border border-zinc-200 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <img
                src="/predictix-logo.png"
                alt="Predictix Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 hover:text-zinc-700">
              <span className="truncate max-w-[200px] sm:max-w-[280px]">Predictix • Multisport & Bankrolls</span>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            </div>
          </div>
        </div>

        {/* Right: Real API Indicator + Capital Global + User Profile */}
        <div className="flex items-center gap-3" ref={accountMenuRef}>
          {/* Live predictix-api badge */}
          <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>predictix-api ({totalMatchesCount} matchs)</span>
          </div>

          {/* Fast KPI in Header */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-zinc-50 border border-zinc-200/80 text-xs">
            <span className="text-zinc-500 text-[11px]">Capital total :</span>
            <span className="font-bold text-zinc-900 font-mono">{totalCapital.toLocaleString('fr-FR')} €</span>
            <span className="text-emerald-600 font-semibold text-[11px]">+{overallROI}%</span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-900 px-2 py-1 rounded transition-colors"
            onClick={() => window.open('https://github.com/Houthoofd/Predictix', '_blank')}
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-700" />
            <span className="font-normal hidden sm:inline">Guide</span>
          </button>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="h-7 w-7 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:ring-2 hover:ring-zinc-300 transition-all focus:outline-none"
              aria-label="Menu profil utilisateur"
            >
              <User className="w-4 h-4 text-white" />
            </button>

            {/* Account Menu Dropdown */}
            {accountMenuOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-md border border-zinc-200 bg-white p-2 shadow-lg z-50 text-xs animate-in fade-in-50 zoom-in-95">
                <div className="px-3 py-2 border-b border-zinc-100">
                  <p className="font-semibold text-zinc-900">{user?.name || 'Administrateur Predictix'}</p>
                  <p className="text-[11px] text-zinc-500 font-mono truncate">{user?.email || 'admin@predictix.io'}</p>
                  <span className="inline-block mt-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                    Session Sécurisée • predictix.be
                  </span>
                </div>

                <div className="py-1">
                  <div className="px-3 py-1.5 text-zinc-600 flex justify-between items-center text-[11px]">
                    <span>Bankrolls actives</span>
                    <span className="font-mono text-zinc-900 font-medium">{bankrollsCount} portefeuilles</span>
                  </div>
                  <div className="px-3 py-1.5 text-zinc-600 flex justify-between items-center text-[11px]">
                    <span>Source Sportive</span>
                    <span className="font-mono text-emerald-600 font-medium">predictix-api (3100)</span>
                  </div>
                </div>

                <div className="border-t border-zinc-100 pt-1 mt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-rose-600 hover:bg-rose-50 rounded flex items-center gap-2 transition-colors font-medium text-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Se déconnecter</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. SUB-HEADER / TAB PILLS BAR */}
      <div className="h-10 border-b border-zinc-200 bg-white flex items-center justify-between px-4 sm:px-6 z-30 shrink-0">
        {/* Left: Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {[
            { id: 'overview', label: "Vue d'ensemble" },
            { id: 'disciplines', label: '35 Disciplines & Cotes (Bwin)' },
            { id: 'sports-stats', label: `Stats Multisports (${totalMatchesCount})` },
            { id: 'bankrolls', label: 'Multi-Bankrolls' },
            { id: 'strategies', label: 'Stratégies & Backtest' },
            { id: 'tracker', label: 'Tracker Paris' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTabPill(tab.id);
                setActiveNav(tab.id);
              }}
              className={`px-3 py-1 text-xs rounded-md font-medium whitespace-nowrap transition-all ${
                activeNav === tab.id
                  ? 'bg-white text-zinc-900 border border-zinc-300 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Right: Quick Action Pill */}
        <div className="hidden sm:flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNewBankrollModal(true)}
            className="h-7 text-[11px] gap-1 border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-2xs"
          >
            <Plus className="w-3 h-3 text-[#1D7CEA]" />
            <span>Nouvelle Bankroll</span>
          </Button>
        </div>
      </div>
    </>
  );
}
