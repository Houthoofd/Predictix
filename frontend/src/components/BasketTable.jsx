import React from 'react';
import { Trash2 } from 'lucide-react';
import { formatTipLabel } from '../utils/labels';

export default function BasketTable({
  basketBets,
  bankroll,
  handleUpdateBetField,
  handleRemoveFromBasket
}) {
  return (
    <div className="glass-card">
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Match & Date</th>
              <th>Championnat</th>
              <th>Sélection & Ligne</th>
              <th style={{ width: '130px' }}>Mise ({bankroll.currency})</th>
              <th style={{ width: '120px' }}>Cote Réelle</th>
              <th style={{ width: '140px' }}>Bookmaker</th>
              <th>Probabilité</th>
              <th>Edge</th>
              <th style={{ textAlign: 'center', width: '80px' }}>Retirer</th>
            </tr>
          </thead>
          <tbody>
            {basketBets.map((bet) => {
              const edge = bet.probability && bet.odds 
                ? (((bet.probability / 100) * bet.odds) - 1) * 100 
                : 0;

              return (
                <tr key={bet.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{bet.date} • {bet.time}</div>
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.league}</td>
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>
                    {formatTipLabel(bet.best_tip, bet.card_line, bet.sport)}
                  </td>
                  <td>
                    <input 
                      type="number" 
                      className="form-control"
                      style={{ 
                        padding: '5px 8px', 
                        fontSize: '12.5px', 
                        width: '100%', 
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'Outfit',
                        fontWeight: 700
                      }}
                      value={bet.stake}
                      onChange={(e) => handleUpdateBetField(bet.id, 'stake', parseFloat(e.target.value) || 0)}
                    />
                  </td>
                  <td>
                    <input 
                      type="number" 
                      step="0.01"
                      className="form-control"
                      style={{ 
                        padding: '5px 8px', 
                        fontSize: '12.5px', 
                        width: '100%', 
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: edge > 0 ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'Outfit',
                        fontWeight: 700
                      }}
                      value={bet.odds}
                      onChange={(e) => handleUpdateBetField(bet.id, 'odds', parseFloat(e.target.value) || 1.0)}
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      className="form-control"
                      style={{ 
                        padding: '5px 8px', 
                        fontSize: '12.5px', 
                        width: '100%', 
                        background: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontFamily: 'Outfit'
                      }}
                      value={bet.bookmaker}
                      onChange={(e) => handleUpdateBetField(bet.id, 'bookmaker', e.target.value)}
                    />
                  </td>
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>
                    {bet.probability}%
                  </td>
                  <td style={{ 
                    fontFamily: 'Outfit', 
                    fontWeight: 800, 
                    color: edge > 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {edge > 0 ? `+${edge.toFixed(1)}%` : `${edge.toFixed(1)}%`}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px', color: 'var(--color-danger)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}
                      onClick={() => handleRemoveFromBasket(bet.id)}
                      title="Retirer du panier"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
