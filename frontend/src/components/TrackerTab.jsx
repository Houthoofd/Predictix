import React from 'react';
import { 
  Check, 
  X, 
  Trash2 
} from 'lucide-react';

export default function TrackerTab({ 
  bets, 
  stats, 
  handleSettleBet, 
  handleDeleteBet 
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Active/Pending Bets section */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>Paris en Cours (En attente de résultat)</h3>
        
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th>Championnat</th>
                <th>Conseil</th>
                <th>Mise</th>
                <th>Cote</th>
                <th>Bookmaker</th>
                <th>Probabilité</th>
                <th style={{ textAlign: 'center' }}>Résoudre le Pari</th>
              </tr>
            </thead>
            <tbody>
              {bets.filter(b => b.status === 'PENDING').map((bet) => (
                <tr key={bet.id}>
                  <td style={{ fontSize: '13px' }}>{bet.date} {bet.time}</td>
                  <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                  <td style={{ fontSize: '13px' }}>{bet.league}</td>
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                  <td style={{ fontWeight: 700 }}>{bet.stake} {stats.bankroll?.currency || '€'}</td>
                  <td>{bet.odds}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                  <td>
                    {bet.probability ? (
                      <span className={bet.probability >= 60 ? 'prob-high' : 'prob-medium'}>
                        {bet.probability}%
                      </span>
                    ) : '-'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        className="btn btn-accent" 
                        style={{ padding: '4px 10px', fontSize: '12px', background: 'var(--color-success)', color: 'white' }}
                        onClick={() => handleSettleBet(bet.id, 'WON')}
                        title="Marquer comme GAGNÉ"
                      >
                        <Check size={14} />
                        <span>Gain</span>
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                        onClick={() => handleSettleBet(bet.id, 'LOST')}
                        title="Marquer comme PERDU"
                      >
                        <X size={14} />
                        <span>Perte</span>
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px', fontSize: '11px' }}
                        onClick={() => handleSettleBet(bet.id, 'REFUNDED')}
                        title="Annulé/Remboursé"
                      >
                        Remb.
                      </button>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px', color: 'var(--color-danger)' }}
                        onClick={() => handleDeleteBet(bet.id)}
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {bets.filter(b => b.status === 'PENDING').length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    Aucun pari actif en attente de résultat. Cliquez sur "Nouveau Pari" ou utilisez la section Match en Direct pour en rajouter un.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bets History section */}
      <div className="glass-card">
        <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>Historique Complet de tous les Paris</h3>
        
        <div className="table-container">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Match</th>
                <th>Ligue</th>
                <th>Conseil</th>
                <th>Mise</th>
                <th>Cote</th>
                <th>Bookmaker</th>
                <th>Bénéfice/Perte</th>
                <th>Statut</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {bets.filter(b => b.status !== 'PENDING').map((bet) => {
                let profit = 0;
                if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
                else if (bet.status === 'LOST') profit = -bet.stake;

                return (
                  <tr key={bet.id}>
                    <td style={{ fontSize: '13px' }}>{bet.date}</td>
                    <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                    <td style={{ fontSize: '13px' }}>{bet.league}</td>
                    <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                    <td>{bet.stake} {stats.bankroll?.currency || '€'}</td>
                    <td>{bet.odds}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                    <td style={{ 
                      fontWeight: 700, 
                      color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                    }}>
                      {profit >= 0 ? '+' : ''}{profit.toFixed(2)} {stats.bankroll?.currency || '€'}
                    </td>
                    <td>
                      <span className={`badge badge-${bet.status.toLowerCase()}`}>
                        {bet.status === 'WON' && 'Gagné'}
                        {bet.status === 'LOST' && 'Perdu'}
                        {bet.status === 'REFUNDED' && 'Annulé'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px', color: 'var(--color-danger)', border: 'none' }}
                        onClick={() => handleDeleteBet(bet.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {bets.filter(b => b.status !== 'PENDING').length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                    Historique vide.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
