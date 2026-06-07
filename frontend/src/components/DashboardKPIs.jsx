import React from 'react';
import { Wallet, TrendingUp, Percent, Award } from 'lucide-react';

export default function DashboardKPIs({ stats }) {
  return (
    <div className="grid-4">
      <div className="glass-card accent-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label">Bankroll Actuelle</p>
            <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
              {stats.bankroll?.current?.toFixed(2)} {stats.bankroll?.currency}
            </h3>
          </div>
          <div className="metric-icon-box"><Wallet size={18} /></div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Départ: {stats.bankroll?.initial?.toFixed(2)} {stats.bankroll?.currency}
        </p>
      </div>

      <div className="glass-card accent-right">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label">Bénéfice Net</p>
            <h3 style={{ 
              fontSize: '28px', 
              marginTop: '8px', 
              color: stats.summary?.total_profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
            }}>
              {stats.summary?.total_profit >= 0 ? '+' : ''}{stats.summary?.total_profit?.toFixed(2)} {stats.bankroll?.currency}
            </h3>
          </div>
          <div className="metric-icon-box"><TrendingUp size={18} /></div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Ce mois-ci : {stats.summary?.current_month_profit >= 0 ? '+' : ''}{stats.summary?.current_month_profit?.toFixed(2)} {stats.bankroll?.currency}
        </p>
      </div>

      <div className="glass-card accent-left">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label">Retour sur Investissement (ROI)</p>
            <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
              {stats.summary?.roi?.toFixed(1)} %
            </h3>
          </div>
          <div className="metric-icon-box"><Percent size={18} /></div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          Volume de mises : {stats.summary?.total_stake?.toFixed(2)} {stats.bankroll?.currency}
        </p>
      </div>

      <div className="glass-card accent-right">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="form-label">Taux de Réussite</p>
            <h3 style={{ fontSize: '28px', marginTop: '8px' }}>
              {stats.summary?.win_rate?.toFixed(1)} %
            </h3>
          </div>
          <div className="metric-icon-box"><Award size={18} /></div>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
          {stats.summary?.counts?.won} Gagnés | {stats.summary?.counts?.lost} Perdus | {stats.summary?.counts?.pending} En cours
        </p>
      </div>
    </div>
  );
}
