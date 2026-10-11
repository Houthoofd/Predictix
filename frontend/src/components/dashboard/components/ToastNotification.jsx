import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export function ToastNotification({ toastMessage, onClose }) {
  if (!toastMessage) return null;

  return (
    <div className="fixed top-14 right-6 z-50 max-w-md bg-emerald-900 text-white p-3.5 rounded-lg shadow-xl border border-emerald-700 animate-in fade-in-50 slide-in-from-top-2 flex items-start gap-3">
      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <p className="font-semibold">{toastMessage.title}</p>
        <p className="text-emerald-200 mt-0.5">{toastMessage.desc}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="text-emerald-300 hover:text-white"
        aria-label="Fermer la notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
