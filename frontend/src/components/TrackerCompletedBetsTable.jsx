import React from 'react';
import { MoreVertical, Edit, RotateCcw, Trash2 } from 'lucide-react';

export default function TrackerCompletedBetsTable({
  completedBets,
  stats,
  selectedBetIds,
  setSelectedBetIds,
  toggleKebab,
  activeKebabId,
  setActiveKebabId,
  onOpenEditBetModal,
  handleSettleBet,
  handleDeleteBet
}) {
  const currency = stats.bankroll?.currency || '€';

  return (
    <div className="glass-card">
      <h3 style={{ fontSize: '18px', marginBottom: '16px', fontFamily: 'Outfit' }}>Historique Complet de tous les Paris</h3>
      
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={completedBets.length > 0 && completedBets.every(b => selectedBetIds.includes(b.id))}
                  onChange={() => {
                    const completedIds = completedBets.map(b => b.id);
                    const allSelected = completedBets.every(b => selectedBetIds.includes(b.id));
                    if (allSelected) {
                      setSelectedBetIds(prev => prev.filter(id => !completedIds.includes(id)));
                    } else {
                      setSelectedBetIds(prev => Array.from(new Set([...prev, ...completedIds])));
                    }
                  }}
                  style={{ cursor: 'pointer', accentColor: '#bf5af2' }}
                />
              </th>
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
            {completedBets.map((bet) => {
              let profit = 0;
              if (bet.status === 'WON') profit = bet.stake * (bet.odds - 1);
              else if (bet.status === 'LOST') profit = -bet.stake;

              const isSelected = selectedBetIds.includes(bet.id);

              return (
                <tr key={bet.id} style={{ background: isSelected ? 'rgba(191, 90, 242, 0.04)' : undefined }}>
                  <td style={{ textAlign: 'center' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={() => {
                        setSelectedBetIds(prev => 
                          prev.includes(bet.id) ? prev.filter(id => id !== bet.id) : [...prev, bet.id]
                        );
                      }}
                      style={{ cursor: 'pointer', accentColor: '#bf5af2' }}
                    />
                  </td>
                  <td style={{ fontSize: '12.5px', fontFamily: 'Outfit' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{bet.date}</div>
                    {bet.time && bet.time !== 'Planned' && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px' }}>{bet.time}</div>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{bet.home_team} vs {bet.away_team}</td>
                  <td style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {bet.sport && bet.sport !== 'football' && (
                      <span style={{ 
                        background: 'rgba(0, 130, 255, 0.12)', 
                        color: '#0082ff', 
                        padding: '1px 5px', 
                        borderRadius: '4px', 
                        fontSize: '9px',
                        fontWeight: 800,
                        textTransform: 'uppercase'
                      }}>
                        {bet.sport}
                      </span>
                    )}
                    <span>{bet.league}</span>
                  </td>
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
                  <td>{bet.stake} {currency}</td>
                  <td>{bet.odds}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                  <td style={{ 
                    fontWeight: 700, 
                    color: profit >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                  }}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} {currency}
                  </td>
                  <td>
                    <span className={`badge badge-${bet.status.toLowerCase()}`}>
                      {bet.status === 'WON' && 'Gagné'}
                      {bet.status === 'LOST' && 'Perdu'}
                      {bet.status === 'REFUNDED' && 'Annulé'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
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
                          top: 'calc(100% + 4px)', 
                          right: 0, 
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
                              if (onOpenEditBetModal) onOpenEditBetModal(bet);
                              setActiveKebabId(null);
                            }}
                            className="kebab-item"
                          >
                            <Edit size={14} style={{ color: 'var(--color-accent-solid)' }} />
                            <span>Modifier</span>
                          </button>
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
                    </div>
                  </td>
                </tr>
              );
            })}
            {completedBets.length === 0 && (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  Historique vide.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
