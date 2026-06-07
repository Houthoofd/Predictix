import React from 'react';
import { 
  ShoppingCart, 
  CheckCircle2
} from 'lucide-react';
import BasketSummaryKPIs from './BasketSummaryKPIs';
import BasketTable from './BasketTable';

export default function BasketTab({ 
  basketBets, 
  setBasketBets, 
  bankroll, 
  fetchAllData,
  showNotification,
  showToast
}) {
  const [basketLoading, setBasketLoading] = React.useState(false);

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
          <BasketSummaryKPIs 
            basketBetsCount={basketBets.length}
            totalBasketStake={totalBasketStake}
            bankroll={bankroll}
          />

          {/* Basket Bets Table */}
          <BasketTable 
            basketBets={basketBets}
            bankroll={bankroll}
            handleUpdateBetField={handleUpdateBetField}
            handleRemoveFromBasket={handleRemoveFromBasket}
          />

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

