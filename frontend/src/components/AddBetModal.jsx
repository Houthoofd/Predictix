import React from 'react';
import { X } from 'lucide-react';
import BetModalSuccessOverlay from './BetModalSuccessOverlay';
import BetModalValueEdgePanel from './BetModalValueEdgePanel';

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
        
        <BetModalSuccessOverlay betPlacedSuccess={betPlacedSuccess} />

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

            <div className="grid-2" style={{ gap: '16px' }}>
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
              <div className="form-group">
                <label className="form-label">Sport</label>
                <select 
                  className="form-control"
                  value={newBetForm.sport || 'football'}
                  onChange={(e) => setNewBetForm({ ...newBetForm, sport: e.target.value })}
                >
                  <option value="football">Football</option>
                  <option value="basketball">Basketball</option>
                  <option value="tennis">Tennis</option>
                  <option value="rugby">Rugby</option>
                  <option value="handball">Handball</option>
                  <option value="volleyball">Volleyball</option>
                  <option value="hockey">Hockey sur glace</option>
                  <option value="baseball">Baseball</option>
                  <option value="american-football">Football Américain</option>
                  <option value="table-tennis">Tennis de table</option>
                  <option value="badminton">Badminton</option>
                  <option value="cricket">Cricket</option>
                  <option value="snooker">Snooker</option>
                  <option value="futsal">Futsal</option>
                </select>
              </div>
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

            <BetModalValueEdgePanel
              hasValidCalc={hasValidCalc}
              valueEdge={valueEdge}
              fairOdds={fairOdds}
            />

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
