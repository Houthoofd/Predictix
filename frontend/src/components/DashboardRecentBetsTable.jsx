import React from 'react';

export default function DashboardRecentBetsTable({ bets, currency, setActiveTab }) {
  const resolvedBets = bets.filter(b => b.status !== 'PENDING');

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '16px', fontFamily: 'Outfit' }}>Derniers Paris Résolus</h3>
        <button className="btn btn-secondary" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => setActiveTab('tracker')}>
          Voir tout
        </button>
      </div>

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
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {resolvedBets.slice(0, 5).map((bet) => (
              <tr key={bet.id}>
                <td style={{ fontSize: '13px' }}>{bet.date}</td>
                <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                <td style={{ fontSize: '13px' }}>{bet.league}</td>
                <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                <td>{bet.stake} {currency}</td>
                <td>{bet.odds}</td>
                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                <td>
                  <span className={`badge badge-${bet.status.toLowerCase()}`}>
                    {bet.status === 'WON' && 'Gagné'}
                    {bet.status === 'LOST' && 'Perdu'}
                    {bet.status === 'REFUNDED' && 'Annulé'}
                  </span>
                </td>
              </tr>
            ))}
            {resolvedBets.length === 0 && (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  Aucun pari résolu enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
