import React from 'react';
import { 
  Trash2, 
  ShoppingCart, 
  CheckCircle2, 
  DollarSign, 
  Info,
  TrendingUp,
  Bookmark
} from 'lucide-react';

export default function BasketTab({ 
  basketBets, 
  setBasketBets, 
  bankroll, 
  fetchAllData,
  showNotification,
  showToast
}) {
  const [basketLoading, setBasketLoading] = React.useState(false);
  const [basketGlobalBookmaker, setBasketGlobalBookmaker] = React.useState('Unibet');

  // Helper to remove a single bet from the basket
  const handleRemoveFromBasket = (id) => {
    setBasketBets(prev => prev.filter(b => b.id !== id));
    if (typeof showToast === 'function') {
      showToast("Sélection retirée du panier !", "info");
    }
  };

  // Helper to clear the entire basket
  const handleClearBasket = () => {
    setBasketBets([]);
    if (typeof showToast === 'function') {
      showToast("Le panier a été entièrement vidé !", "info");
    }
  };

  // Helper to update a field on a specific bet in the basket
  const handleUpdateBetField = (id, field, value) => {
    setBasketBets(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, [field]: value };
      }
      return b;
    }));
  };

  // Bulk place all bets in the basket
  const handlePlaceBasketBets = async () => {
    if (basketBets.length === 0) return;
    
    setBasketLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/bets/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bets: basketBets })
      });
      
      const json = await res.json();
      if (json.success) {
        const count = json.count;
        setBasketBets([]); // Clear the basket on success!
        fetchAllData(); // Refresh all data and bankroll
        showNotification(
          "Enregistrement Réussi", 
          `Félicitations ! Les ${count} paris ont été enregistrés avec succès et déduits de votre bankroll active.`, 
          "success"
        );
      } else {
        showNotification(
          "Erreur d'Enregistrement", 
          "Impossible d'enregistrer les paris en lot : " + (json.error?.message || "Erreur inconnue"), 
          "error"
        );
      }
    } catch (err) {
      showNotification(
        "Erreur Réseau", 
        "Une erreur de communication est survenue : " + err.message, 
        "error"
      );
    } finally {
      setBasketLoading(false);
    }
  };

  // Calculate sum of stakes currently in the basket
  const totalBasketStake = basketBets.reduce((acc, b) => acc + (parseFloat(b.stake) || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Header Info Panel */}
      <div className="glass-card accent-left" style={{
        background: 'linear-gradient(135deg, rgba(127, 0, 255, 0.08) 0%, rgba(0, 98, 255, 0.02) 100%)',
        borderLeft: '4px solid #7f00ff',
        boxShadow: '0 8px 32px rgba(127, 0, 255, 0.03)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ fontSize: '22px', fontFamily: 'Outfit', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShoppingCart size={22} style={{ color: '#bf5af2' }} />
              Panier de Paris
            </h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: '900px', margin: 0 }}>
              Passez vos sélections en revue avant de les enregistrer simultanément dans votre bankroll active. 
              Vous pouvez ajuster les cotes réelles, modifier les mises ou le bookmaker pour chaque ligne en un clin d'œil 
              pour une efficacité statistique optimale.
            </p>
          </div>
          {basketBets.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignSelf: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleClearBasket} 
                disabled={basketLoading}
                style={{ height: '40px' }}
              >
                Vider le panier
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handlePlaceBasketBets} 
                disabled={basketLoading}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  height: '40px', 
                  background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                  border: 'none',
                  fontWeight: 700
                }}
              >
                <CheckCircle2 size={16} />
                <span>Enregistrer tous les Paris ({basketBets.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {basketBets.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary KPIs */}
          <div className="grid-3" style={{ gap: '20px' }}>
            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(127, 0, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(127, 0, 255, 0.15)' }}>
                <Bookmark size={20} style={{ color: '#bf5af2' }} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Sélections</span>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px' }}>{basketBets.length}</div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <DollarSign size={20} style={{ color: 'var(--color-success)' }} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Mise Totale du Panier</span>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px', color: 'var(--color-success)' }}>
                  {totalBasketStake} {bankroll.currency}
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 130, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(0, 130, 255, 0.15)' }}>
                <TrendingUp size={20} style={{ color: '#3b82f6' }} />
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Bankroll Après Placement</span>
                <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'Outfit', marginTop: '2px' }}>
                  {(bankroll.balance - totalBasketStake).toFixed(1)} {bankroll.currency}
                </div>
              </div>
            </div>
          </div>

          {/* Basket Bets Table */}
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
                        <td style={{ fontFamily: 'Outfit', fontWeight: 600 }}>{bet.best_tip} {bet.card_line}</td>
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

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleClearBasket} 
              disabled={basketLoading}
              style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 600, borderRadius: '8px' }}
            >
              Vider le Panier
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handlePlaceBasketBets} 
              disabled={basketLoading}
              style={{ 
                padding: '10px 28px', 
                fontSize: '13px', 
                fontWeight: 700, 
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Enregistrer tous les Paris ({basketBets.length})</span>
            </button>
          </div>

        </div>
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
          <ShoppingCart size={48} style={{ marginBottom: '16px', color: 'var(--text-muted)', opacity: 0.4, margin: '0 auto 16px auto' }} />
          <p style={{ fontWeight: 600, fontSize: '16px', color: 'var(--text-primary)' }}>Votre panier est vide.</p>
          <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '520px', margin: '6px auto 0 auto', lineHeight: 1.6 }}>
            Allez dans l'onglet **Pronostics Magiques**, configurez vos sélections sur les cartes de matchs 
            puis ouvrez les options du menu contextuel au bas des cartes pour **« Ajouter au Panier »**. 
            Toutes vos sélections apparaîtront ici pour un enregistrement ultra-rapide !
          </p>
        </div>
      )}

    </div>
  );
}
