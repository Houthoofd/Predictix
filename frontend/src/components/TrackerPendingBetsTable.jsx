import React from 'react';
import { Check, X, RefreshCw, MoreVertical, Edit, Trash2 } from 'lucide-react';
import { formatTipLabel } from '../utils/labels';

export default function TrackerPendingBetsTable({
  pendingBets,
  stats,
  selectedBetIds,
  setSelectedBetIds,
  handleRefreshAllBets,
  globalRefreshLoading,
  handleSettleBet,
  activeKebabId,
  setActiveKebabId,
  toggleKebab,
  betRefreshLoading = {},
  handleRefreshBet,
  onOpenEditBetModal,
  handleDeleteBet
}) {
  const currency = stats.bankroll?.currency || '€';

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', margin: 0 }}>Paris en Cours (En attente de résultat)</h3>
        {pendingBets.filter(b => b.match_id).length > 0 && (
          <button
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '8px 16px', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              fontWeight: 700, 
              fontFamily: 'Outfit', 
              background: 'var(--grad-accent)', 
              border: 'none' 
            }}
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
              <th style={{ width: '40px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={pendingBets.length > 0 && pendingBets.every(b => selectedBetIds.includes(b.id))}
                  onChange={() => {
                    const pendingIds = pendingBets.map(b => b.id);
                    const allSelected = pendingBets.every(b => selectedBetIds.includes(b.id));
                    if (allSelected) {
                      setSelectedBetIds(prev => prev.filter(id => !pendingIds.includes(id)));
                    } else {
                      setSelectedBetIds(prev => Array.from(new Set([...prev, ...pendingIds])));
                    }
                  }}
                  style={{ cursor: 'pointer', accentColor: '#bf5af2' }}
                />
              </th>
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
            {pendingBets.map((bet) => {
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
                  <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>
                    {formatTipLabel(bet.best_tip, bet.card_line, bet.sport)}
                  </td>
                  <td style={{ fontWeight: 700 }}>{bet.stake} {currency}</td>
                  <td>{bet.odds}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{bet.bookmaker}</td>
                  <td>
                    {bet.probability ? (
                      <span className={bet.probability >= 60 ? 'prob-high' : 'prob-medium'}>
                        {bet.probability}%
                      </span>
                    ) : '-'}
                  </td>
                  <td style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
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
                      
                      <div style={{ position: 'relative', display: 'inline-block' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '4px 6px', border: 'none', color: 'var(--text-secondary)' }}
                          onClick={(e) => toggleKebab(e, bet.id)}
                          title="Plus d'actions"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {activeKebabId === bet.id && (
                          <div className="glass-card" style={{ 
                            position: 'absolute', 
                            top: 'calc(100% + 4px)', 
                            right: 0, 
                            zIndex: 100, 
                            minWidth: '170px', 
                            padding: '6px 0', 
                            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)', 
                            borderRadius: '6px',
                            background: '#0f172a',
                            border: '1px solid var(--border-color)',
                            textAlign: 'left'
                          }}>
                            {bet.match_id && (
                              <button 
                                style={{ 
                                  width: '100%', 
                                  padding: '8px 14px', 
                                  background: 'transparent', 
                                  border: 'none', 
                                  color: 'var(--text-primary)', 
                                  fontSize: '12.5px', 
                                  textAlign: 'left', 
                                  cursor: betRefreshLoading[bet.id] ? 'not-allowed' : 'pointer', 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '8px',
                                  opacity: betRefreshLoading[bet.id] ? 0.7 : 1
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!betRefreshLoading[bet.id]) {
                                    handleRefreshBet(bet.id);
                                    setActiveKebabId(null);
                                  }
                                }}
                                className="kebab-item"
                                disabled={betRefreshLoading[bet.id]}
                              >
                                <RefreshCw size={14} className={betRefreshLoading[bet.id] ? 'animate-spin' : ''} style={{ color: 'var(--color-accent-solid)' }} />
                                <span>Auto-résoudre</span>
                              </button>
                            )}
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
                                handleSettleBet(bet.id, 'REFUNDED');
                                setActiveKebabId(null);
                              }}
                              className="kebab-item"
                            >
                              <X size={14} style={{ color: 'var(--text-muted)' }} />
                              <span>Annulé/Remboursé</span>
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
                    </div>
                  </td>
                </tr>
              );
            })}
            {pendingBets.length === 0 && (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px 0' }}>
                  Aucun pari actif en attente de résultat.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
