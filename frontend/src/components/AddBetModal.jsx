import React from 'react';
import { X } from 'lucide-react';

export default function AddBetModal({
  showAddBetModal,
  setShowAddBetModal,
  prefilledBet,
  setPrefilledBet,
  newBetForm,
  setNewBetForm,
  handleAddBet,
  bankroll,
  betPlacedSuccess
}) {
  // 1. Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (showAddBetModal) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showAddBetModal]);

  // 2. Smoothly scroll overlay back to top when success overlay triggers
  React.useEffect(() => {
    if (betPlacedSuccess) {
      const overlay = document.querySelector('.modal-overlay');
      if (overlay) {
        overlay.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [betPlacedSuccess]);

  if (!showAddBetModal) return null;

  // Calculate dynamic Value Bet edge in real-time
  const probVal = parseFloat(newBetForm.probability);
  const oddsVal = parseFloat(newBetForm.odds);
  const hasValidCalc = !isNaN(probVal) && !isNaN(oddsVal) && probVal > 0 && oddsVal > 0;
  const fairOdds = hasValidCalc ? (100 / probVal).toFixed(2) : null;
  const valueEdge = hasValidCalc ? (((probVal / 100) * oddsVal) - 1) * 100 : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ position: 'relative', overflowY: betPlacedSuccess ? 'hidden' : 'visible', maxHeight: 'none', margin: 'auto' }}>
        
        {betPlacedSuccess && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'var(--bg-secondary)',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            fontFamily: 'Outfit',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '2px solid var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)',
              animation: 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="var(--color-success)" strokeWidth="3" style={{ width: '32px', height: '32px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h4 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Pari enregistré avec succès !</h4>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mise à jour de la bankroll en cours...</p>
          </div>
        )}

        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit' }}>
            {prefilledBet ? 'Placer Pari depuis Prédiction' : 'Enregistrer un Pari'}
          </h3>
          <button className="modal-close" onClick={() => { setShowAddBetModal(false); setPrefilledBet(null); }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleAddBet}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {prefilledBet && (
              <div style={{ background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '13px' }}>
                <span style={{ fontWeight: 700 }}>Match ciblé: </span>
                {prefilledBet.home_team} vs {prefilledBet.away_team} ({prefilledBet.probability} probabilité)
              </div>
            )}

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={newBetForm.date}
                  onChange={(e) => setNewBetForm({ ...newBetForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input 
                  type="time" 
                  className="form-control" 
                  required
                  value={newBetForm.time}
                  onChange={(e) => setNewBetForm({ ...newBetForm, time: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Championnat / Ligue</label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="ex: Premier League, LaLiga..."
                required
                value={newBetForm.league}
                onChange={(e) => setNewBetForm({ ...newBetForm, league: e.target.value })}
              />
            </div>

            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Équipe Domicile</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newBetForm.home_team}
                  onChange={(e) => setNewBetForm({ ...newBetForm, home_team: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Équipe Extérieur</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newBetForm.away_team}
                  onChange={(e) => setNewBetForm({ ...newBetForm, away_team: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Pronostic</label>
                <select 
                  className="form-control"
                  value={newBetForm.best_tip}
                  onChange={(e) => setNewBetForm({ ...newBetForm, best_tip: e.target.value })}
                >
                  <option value="Over">Over</option>
                  <option value="Under">Under</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Ligne du Pari</label>
                <input 
                  type="number" 
                  step="0.5"
                  className="form-control" 
                  required
                  value={newBetForm.card_line}
                  onChange={(e) => setNewBetForm({ ...newBetForm, card_line: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Cote Réelle</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  required
                  value={newBetForm.odds}
                  onChange={(e) => setNewBetForm({ ...newBetForm, odds: parseFloat(e.target.value) })}
                  style={{ border: hasValidCalc && valueEdge > 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)', boxShadow: hasValidCalc && valueEdge > 0 ? '0 0 8px rgba(16, 185, 129, 0.15)' : 'none', transition: 'all 0.2s ease' }}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Mise ({bankroll.currency})</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  value={newBetForm.stake}
                  onChange={(e) => setNewBetForm({ ...newBetForm, stake: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Probabilité (%)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="ex: 65"
                  value={newBetForm.probability}
                  onChange={(e) => setNewBetForm({ ...newBetForm, probability: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Bookmaker</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newBetForm.bookmaker}
                  onChange={(e) => setNewBetForm({ ...newBetForm, bookmaker: e.target.value })}
                />
              </div>
            </div>

            {/* Real-time Value Bet Calculator and Calibration Card */}
            {hasValidCalc && (
              <div style={{
                background: valueEdge > 0 
                  ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.03) 100%)' 
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.015) 100%)',
                border: valueEdge > 0 
                  ? '1px solid rgba(16, 185, 129, 0.3)' 
                  : '1px solid rgba(239, 68, 68, 0.2)',
                padding: '14px 16px',
                borderRadius: '8px',
                boxShadow: valueEdge > 0 ? '0 0 15px rgba(16, 185, 129, 0.05)' : 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontFamily: 'Outfit',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center' 
                }}>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    color: valueEdge > 0 ? 'var(--color-success)' : '#ef4444',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ 
                      width: '6px', 
                      height: '6px', 
                      borderRadius: '50%', 
                      background: valueEdge > 0 ? 'var(--color-success)' : '#ef4444', 
                      display: 'inline-block',
                      boxShadow: valueEdge > 0 ? '0 0 8px var(--color-success)' : 'none'
                    }}></span>
                    {valueEdge > 0 ? 'VALUE BET DÉTECTÉ' : 'EDGE NÉGATIF / PAS DE VALUE'}
                  </span>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 800, 
                    color: valueEdge > 0 ? 'var(--color-success)' : '#ef4444' 
                  }}>
                    {valueEdge > 0 ? `+${valueEdge.toFixed(1)}% Edge` : `${valueEdge.toFixed(1)}% Edge`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Cote Juste Estimée :</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{fairOdds}</span>
                </div>

                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.03)', 
                  paddingTop: '6px',
                  fontStyle: 'italic',
                  lineHeight: 1.3
                }}>
                  ℹ️ Saisir la cote réelle de votre bookmaker aide le modèle Predictix à mesurer les écarts du marché réel pour auto-calibrer et affiner ses cotes théoriques futures.
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Notes additionnelles</label>
              <textarea 
                className="form-control" 
                rows="2"
                placeholder="Spécifiez la statistique (ex: Fautes commises, tirs, cartons) ou saisissez vos notes (arbitre, météo...)"
                value={newBetForm.notes}
                onChange={(e) => setNewBetForm({ ...newBetForm, notes: e.target.value })}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => { setShowAddBetModal(false); setPrefilledBet(null); }}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Valider le Pari
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
