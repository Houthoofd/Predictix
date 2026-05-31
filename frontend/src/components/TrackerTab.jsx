import React from 'react';
import { 
  Check, 
  X, 
  Trash2,
  RefreshCw,
  MoreVertical,
  RotateCcw
} from 'lucide-react';

export default function TrackerTab({ 
  bets, 
  stats, 
  handleSettleBet, 
  handleDeleteBet,
  handleRefreshBet,
  handleRefreshAllBets,
  betRefreshLoading = {},
  globalRefreshLoading = false
}) {
  const [activeKebabId, setActiveKebabId] = React.useState(null);

  // Close kebab dropdown when clicking anywhere else
  React.useEffect(() => {
    const handleDocumentClick = () => {
      setActiveKebabId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, []);

  const toggleKebab = (e, betId) => {
    e.stopPropagation();
    setActiveKebabId(activeKebabId === betId ? null : betId);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Active/Pending Bets section */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', margin: 0 }}>Paris en Cours (En attente de résultat)</h3>
          {bets.filter(b => b.status === 'PENDING' && b.match_id).length > 0 && (
            <button
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit', background: 'var(--grad-accent)', border: 'none' }}
              onClick={handleRefreshAllBets}
              disabled={globalRefreshLoading}
            >
              <RefreshCw size={14} className={globalRefreshLoading ? 'animate-spin' : ''} />
              <span>{globalRefreshLoading ? 'Mise à jour en cours...' : 'Mettre à jour tous les paris'}</span>
            </button>
          )}
        </div>
        
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
                  <td style={{ fontSize: '12.5px', fontFamily: 'Outfit' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bet.date}</div>
                    {bet.time && bet.time !== 'Planned' && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{bet.time}</div>
                    )}
                  </td>
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
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                      {bet.match_id ? (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', color: 'var(--color-accent-solid)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => handleRefreshBet(bet.id)}
                          disabled={betRefreshLoading[bet.id]}
                          title="Auto-résoudre le score via Matchendirect"
                        >
                          <RefreshCw size={13} className={betRefreshLoading[bet.id] ? 'animate-spin' : ''} />
                        </button>
                      ) : (
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', color: 'var(--text-muted)', cursor: 'not-allowed', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          disabled
                          title="Indisponible pour les paris manuels (sans ID match)"
                        >
                          <RefreshCw size={13} />
                        </button>
                      )}
                      
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
                    <td style={{ fontSize: '12.5px', fontFamily: 'Outfit' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bet.date}</div>
                      {bet.time && bet.time !== 'Planned' && (
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{bet.time}</div>
                      )}
                    </td>
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
                    <td style={{ position: 'relative' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '4px 6px', border: 'none', color: 'var(--text-secondary)' }}
                        onClick={(e) => toggleKebab(e, bet.id)}
                        title="Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {activeKebabId === bet.id && (
                        <div className="glass-card" style={{ 
                          position: 'absolute', 
                          top: '100%', 
                          right: '16px', 
                          zIndex: 100, 
                          minWidth: '150px', 
                          padding: '6px 0', 
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)', 
                          borderRadius: '6px',
                          background: '#0f172a',
                          border: '1px solid var(--border-color)',
                          textAlign: 'left'
                        }}>
                          <button 
                            style={{ 
                              width: '100%', 
                              padding: '8px 14px', 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--text-primary)', 
                              fontSize: '12.5px', 
                              textAlign: 'left', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px' 
                            }}
                            onClick={() => {
                              handleSettleBet(bet.id, 'PENDING');
                              setActiveKebabId(null);
                            }}
                            className="kebab-item"
                          >
                            <RotateCcw size={14} style={{ color: 'var(--color-accent-solid)' }} />
                            <span>Remettre en jeu</span>
                          </button>
                          <button 
                            style={{ 
                              width: '100%', 
                              padding: '8px 14px', 
                              background: 'transparent', 
                              border: 'none', 
                              color: 'var(--color-danger)', 
                              fontSize: '12.5px', 
                              textAlign: 'left', 
                              cursor: 'pointer', 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '8px' 
                            }}
                            onClick={() => {
                              handleDeleteBet(bet.id);
                              setActiveKebabId(null);
                            }}
                            className="kebab-item"
                          >
                            <Trash2 size={14} />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      )}
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
