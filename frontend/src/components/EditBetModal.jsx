import React from 'react';
import { X } from 'lucide-react';
import BetModalValueEdgePanel from './BetModalValueEdgePanel';

export default function EditBetModal({
  showEditBetModal,
  setShowEditBetModal,
  editBetForm,
  setEditBetForm,
  handleEditBet,
  bankroll
}) {
  // Lock/Unlock body scroll when modal is shown to avoid background scroll chaining
  React.useEffect(() => {
    if (showEditBetModal) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [showEditBetModal]);

  if (!showEditBetModal) return null;

  // Calculate dynamic Value Bet edge in real-time
  const probVal = parseFloat(editBetForm.probability);
  const oddsVal = parseFloat(editBetForm.odds);
  const hasValidCalc = !isNaN(probVal) && !isNaN(oddsVal) && probVal > 0 && oddsVal > 0;
  const fairOdds = hasValidCalc ? (100 / probVal).toFixed(2) : null;
  const valueEdge = hasValidCalc ? (((probVal / 100) * oddsVal) - 1) * 100 : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ position: 'relative', overflowY: 'visible', maxHeight: 'none', margin: 'auto' }}>
        
        <div className="modal-header">
          <h3 className="modal-title" style={{ fontFamily: 'Outfit' }}>
            Modifier le Pari
          </h3>
          <button className="modal-close" onClick={() => setShowEditBetModal(false)}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleEditBet}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div className="grid-2" style={{ gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  required
                  value={editBetForm.date}
                  onChange={(e) => setEditBetForm({ ...editBetForm, date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <input 
                  type="time" 
                  className="form-control" 
                  required
                  value={editBetForm.time}
                  onChange={(e) => setEditBetForm({ ...editBetForm, time: e.target.value })}
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
                  value={editBetForm.league}
                  onChange={(e) => setEditBetForm({ ...editBetForm, league: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Sport</label>
                <select 
                  className="form-control"
                  value={editBetForm.sport || 'football'}
                  onChange={(e) => setEditBetForm({ ...editBetForm, sport: e.target.value })}
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
                  value={editBetForm.home_team}
                  onChange={(e) => setEditBetForm({ ...editBetForm, home_team: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Équipe Extérieur</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editBetForm.away_team}
                  onChange={(e) => setEditBetForm({ ...editBetForm, away_team: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Pronostic</label>
                <select 
                  className="form-control"
                  value={editBetForm.best_tip}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = { ...editBetForm, best_tip: val };
                    if (val === 'N') {
                      updated.card_line = 0;
                    }
                    setEditBetForm(updated);
                  }}
                >
                  <option value="Over">Over</option>
                  <option value="Under">Under</option>
                  <option value="1">1 (Victoire Domicile)</option>
                  <option value="2">2 (Victoire Extérieur)</option>
                  <option value="N">N (Match Nul)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>
                  {editBetForm.best_tip === '1' || editBetForm.best_tip === '2' 
                    ? 'Handicap (0 si aucun)' 
                    : editBetForm.best_tip === 'N' 
                    ? 'Ligne (non applicable)' 
                    : 'Ligne du Pari'}
                </label>
                <input 
                  type="number" 
                  step="0.5"
                  className="form-control" 
                  required
                  disabled={editBetForm.best_tip === 'N'}
                  value={editBetForm.card_line}
                  onChange={(e) => setEditBetForm({ ...editBetForm, card_line: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Cote Réelle</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="form-control" 
                  required
                  value={editBetForm.odds}
                  onChange={(e) => setEditBetForm({ ...editBetForm, odds: parseFloat(e.target.value) })}
                  style={{ border: hasValidCalc && valueEdge > 0 ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)', boxShadow: hasValidCalc && valueEdge > 0 ? '0 0 8px rgba(16, 185, 129, 0.15)' : 'none', transition: 'all 0.2s ease' }}
                />
              </div>
            </div>

            <div className="grid-3" style={{ gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Mise ({bankroll?.currency || '€'})</label>
                <input 
                  type="number" 
                  className="form-control" 
                  required
                  value={editBetForm.stake}
                  onChange={(e) => setEditBetForm({ ...editBetForm, stake: parseFloat(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Probabilité (%)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="ex: 65"
                  value={editBetForm.probability}
                  onChange={(e) => setEditBetForm({ ...editBetForm, probability: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ minHeight: '16px', display: 'flex', alignItems: 'center' }}>Bookmaker</label>
                <input 
                  type="text" 
                  className="form-control" 
                  required
                  value={editBetForm.bookmaker}
                  onChange={(e) => setEditBetForm({ ...editBetForm, bookmaker: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Statut du Pari</label>
              <select 
                className="form-control"
                value={editBetForm.status}
                onChange={(e) => setEditBetForm({ ...editBetForm, status: e.target.value })}
              >
                <option value="PENDING">En cours</option>
                <option value="WON">Gagné</option>
                <option value="LOST">Perdu</option>
                <option value="REFUNDED">Annulé / Remboursé</option>
              </select>
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
                value={editBetForm.notes}
                onChange={(e) => setEditBetForm({ ...editBetForm, notes: e.target.value })}
              />
            </div>

          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={() => setShowEditBetModal(false)}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer les modifications
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
