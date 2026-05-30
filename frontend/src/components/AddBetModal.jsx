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
  bankroll
}) {
  if (!showAddBetModal) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
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
                <label className="form-label">Conseil</label>
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
                <label className="form-label">Ligne Cartons</label>
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
                <label className="form-label">Cote</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  required
                  value={newBetForm.odds}
                  onChange={(e) => setNewBetForm({ ...newBetForm, odds: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Mise ({bankroll.currency})</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  value={newBetForm.stake}
                  onChange={(e) => setNewBetForm({ ...newBetForm, stake: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Probabilité (%)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="ex: 65"
                  value={newBetForm.probability}
                  onChange={(e) => setNewBetForm({ ...newBetForm, probability: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Bookmaker</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={newBetForm.bookmaker}
                  onChange={(e) => setNewBetForm({ ...newBetForm, bookmaker: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes additionnelles</label>
              <textarea 
                className="form-control" 
                rows="2"
                placeholder="Commentaires sur l'arbitre, météo, blessures..."
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
