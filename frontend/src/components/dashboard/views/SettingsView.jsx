import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { Button } from '../../ui/button';

export function SettingsView({ user, logout }) {
  return (
    <div className="w-full space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-zinc-800" />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">
            Configuration & Profil
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-500 font-normal">
          Paramètres de votre instance Predictix sur Raspberry Pi (bartok-48).
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-2xs space-y-4 max-w-xl">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-zinc-900">Compte Administrateur</span>
          <p className="text-xs text-zinc-500">
            Adresse email connectée : {user?.email || 'admin@predictix.io'}
          </p>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs text-zinc-700">Accès sécurisé actif</span>
          <span className="text-xs font-semibold text-emerald-600 font-mono">
            predictix.be (200 OK)
          </span>
        </div>

        <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
          <span className="text-xs text-zinc-700">API Sportive (predictix-api)</span>
          <span className="text-xs font-semibold text-zinc-900 font-mono">
            http://100.116.45.107:3100
          </span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 gap-1.5"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Déconnexion</span>
        </Button>
      </div>
    </div>
  );
}
