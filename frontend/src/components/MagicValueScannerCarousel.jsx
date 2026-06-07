import React, { useMemo, useRef } from 'react';
import { Sparkles, ShoppingCart, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { scanAllValueBets, getValueBetsForMatch } from '../utils/valueBetScanner';

export default function MagicValueScannerCarousel({
  predictions,
  selectedMagicSport,
  handleAddToBasket,
  handleQuickPlaceBet
}) {
  const carouselRef = useRef(null);

  const topBets = useMemo(() => {
    if (!predictions || predictions.length === 0) return [];
    const filteredPreds = selectedMagicSport === 'all' 
      ? predictions 
      : predictions.filter(p => (p.sport || 'football') === selectedMagicSport);
    const allValueBets = scanAllValueBets(filteredPreds);
    return allValueBets.slice(0, 12);
  }, [predictions, selectedMagicSport]);

  const scrollScanner = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const getMetricLabel = (metric) => {
    const labels = {
      fouls: 'Fautes',
      yellow_cards: 'Cartons Jaunes',
      possession: 'Possession',
      shots_on_target: 'Tirs Cadrés',
      shots: 'Tirs',
      offsides: 'Hors-jeu',
      corners: 'Corners'
    };
    return labels[metric] || metric;
  };

  if (topBets.length === 0) return null;

  return (
    <div className="glass-card" style={{ 
      padding: '24px', 
      background: 'linear-gradient(135deg, rgba(20, 20, 22, 0.7) 0%, rgba(28, 28, 30, 0.7) 100%)', 
      border: '1px solid rgba(255, 255, 255, 0.05)', 
      borderRadius: '16px', 
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.4)' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} style={{ color: '#bf5af2' }} /> Scanner de Cibles Prioritaires (Côtes 1.45 - 1.90)
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Les opportunités les plus rentables classées par taux de réussite.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(191, 90, 242, 0.1)', padding: '4px 10px', borderRadius: '12px', border: '1px solid rgba(191, 90, 242, 0.2)', fontWeight: 700 }}>
            {topBets.length} opportunités
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => scrollScanner('left')} className="btn btn-secondary" style={{ padding: 0, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}><ChevronLeft size={16} /></button>
            <button onClick={() => scrollScanner('right')} className="btn btn-secondary" style={{ padding: 0, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)' }}><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      <div ref={carouselRef} className="no-scrollbar" style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px', scrollBehavior: 'smooth' }}>
        {topBets.map((bet, idx) => {
          const isOver = bet.tip === 'Plus de';
          const calculatedBookieOdds = (bet.fairOdds * 0.93).toFixed(2);
          const mappedPred = {
            match_id: bet.match_id, 
            date: bet.date, 
            time: bet.time, 
            tournament: bet.tournament, 
            home_team: bet.home_team, 
            away_team: bet.away_team, 
            best_tip: isOver ? 'Over' : 'Under', 
            card_line: String(bet.line), 
            probability: `${bet.probability}%`, 
            win_rate: `${bet.probability}%`, 
            over_odds: calculatedBookieOdds, 
            under_odds: calculatedBookieOdds, 
            notes: `Placé depuis le scanner. Marché: ${bet.metricTitle} (${bet.tip} ${bet.line})`, 
            match_url: bet.match_url || ''
          };
          return (
            <div key={idx} className="leaderboard-card" style={{ 
              flex: '0 0 290px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              border: '1px solid rgba(255, 255, 255, 0.04)', 
              borderRadius: '12px', 
              padding: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'space-between', 
              gap: '14px', 
              transition: 'all 0.2s ease', 
              position: 'relative', 
              overflow: 'hidden' 
            }}>
              <div style={{ position: 'absolute', top: 0, right: 0, background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', color: '#fff', fontSize: '10px', fontWeight: 900, padding: '2px 8px 4px 8px', borderBottomLeftRadius: '8px' }}>#{idx + 1}</div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 800, marginBottom: '6px', letterSpacing: '0.05em' }}>{bet.tournament}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {bet.home_logo ? <img src={bet.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{bet.home_team}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {bet.away_logo ? <img src={bet.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'contain' }} /> : <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />}
                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>{bet.away_team}</span>
                  </div>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{bet.date} à {bet.time}</div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.15)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 800, color: isOver ? 'var(--color-success)' : '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{bet.tip} {bet.line}</span>
                  <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>{getMetricLabel(bet.metric)} (Match)</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>Cote : <span style={{ color: 'var(--color-success)' }}>@{calculatedBookieOdds}</span></span>
                </div>
                <div style={{ position: 'relative', width: '46px', height: '46px', display: 'flex', alignItems: 'center', justifyItems: 'center', borderRadius: '50%', background: `conic-gradient(#bf5af2 0% ${bet.probability}%, rgba(255, 255, 255, 0.05) ${bet.probability}% 100%)`, padding: '2.5px', boxShadow: '0 0 10px rgba(191, 90, 242, 0.15)' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 800, color: '#fff' }}>{bet.probability}%</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, fontSize: '11px', fontWeight: 700, height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: 0 }} onClick={() => handleAddToBasket(mappedPred)}><ShoppingCart size={13} /><span>Panier</span></button>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '11px', fontWeight: 700, height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none', padding: 0, cursor: 'pointer' }} onClick={() => handleQuickPlaceBet(mappedPred)}><Plus size={13} /><span>Placer</span></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
