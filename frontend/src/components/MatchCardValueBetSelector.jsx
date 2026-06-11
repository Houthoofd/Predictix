import React from 'react';
import { Sparkles } from 'lucide-react';
import { getMetricLabel } from '../utils/labels';

export default function MatchCardValueBetSelector({
  valueBets,
  currentBet,
  setSelectedBet,
  activeBetMetric,
  matchDetails,
  lambda,
  meanHome,
  meanAway,
  h2hAvg,
  onPlaceGbdtBet
}) {
  return (
    <div style={{ 
      background: 'rgba(191, 90, 242, 0.05)', border: '1px solid rgba(191, 90, 242, 0.22)',
      padding: '10px 12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '6px'
    }} onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '9px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.08em' }}>VALUE BETS CALIBRÉS</span>
        <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{valueBets.length} opportunités</span>
      </div>
      
      {valueBets.length > 1 ? (
        <select
          value={JSON.stringify(currentBet)}
          onChange={(e) => setSelectedBet(JSON.parse(e.target.value))}
          style={{
            width: '100%', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)',
            color: 'var(--text-primary)', borderRadius: '6px', padding: '5px 8px',
            fontSize: '11.5px', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer', outline: 'none'
          }}
        >
          {valueBets.map((bet, idx) => (
            <option key={idx} value={JSON.stringify(bet)} style={{ background: '#1c1c1e', color: '#fff' }}>
              {bet.tip} {bet.line} {bet.metricTitle} @ {(bet.fairOdds * 0.93).toFixed(2)} ({bet.probability}%)
            </option>
          ))}
        </select>
      ) : (
        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 0' }}>
          <span>{currentBet.tip} {currentBet.line} {currentBet.metricTitle}</span>
          <span style={{ color: 'var(--color-success)', fontSize: '11px', background: 'rgba(16, 185, 129, 0.08)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.12)' }}>
            @{(currentBet.fairOdds * 0.93).toFixed(2)}
          </span>
        </div>
      )}

      {activeBetMetric === 'corners' && matchDetails && matchDetails.gbdt_predictions ? (
        <div style={{ background: 'rgba(191, 90, 242, 0.04)', border: '1px solid rgba(191, 90, 242, 0.15)', borderRadius: '10px', padding: '12px', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#bf5af2', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={11} /> Prédictions GBDT (Poisson Bivarié)
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {['first_half', 'second_half', 'full_time'].map((period) => {
              let gbdt = matchDetails.gbdt_predictions;
              if (typeof gbdt === 'string') {
                try { gbdt = JSON.parse(gbdt); } catch(e) {}
              }
              const expVal = gbdt?.[period]?.expected || 'N/A';
              const labels = { first_half: '1ère MT', second_half: '2ème MT', full_time: 'Match' };
              return (
                <div 
                  key={period} 
                  onClick={() => onPlaceGbdtBet && onPlaceGbdtBet(period)}
                  style={{ 
                    background: 'rgba(0, 0, 0, 0.25)', 
                    border: '1px solid rgba(255, 255, 255, 0.04)', 
                    borderRadius: '8px', 
                    padding: '8px 4px', 
                    textAlign: 'center', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(191, 90, 242, 0.12)';
                    e.currentTarget.style.borderColor = 'rgba(191, 90, 242, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-secondary)' }}>{labels[period]}</div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#bf5af2' }}>{expVal}<span style={{ fontSize: '8.5px', color: 'var(--text-muted)', marginLeft: '1px', fontWeight: 500 }}>corn.</span></div>
                  <span style={{ fontSize: '8.5px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', opacity: 0.75 }}>Placer @ Over</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        lambda !== null && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '6px', padding: '8px 10px', marginTop: '4px', lineHeight: '1.45' }}>
            Loi de Poisson estime <strong style={{ color: 'var(--color-success)' }}>{currentBet.probability}%</strong> de probabilité de voir {currentBet.tip.toLowerCase()} {currentBet.line} {getMetricLabel(activeBetMetric).toLowerCase()} ({currentBet.periodLabel}). 
            Moyenne cumulée : <strong style={{ color: '#bf5af2' }}>{lambda.toFixed(1)}</strong> ({meanHome.toFixed(1)} Dom, {meanAway.toFixed(1)} Ext). 
            {h2hAvg !== null && ` H2H : ${h2hAvg.toFixed(1)} en moy.`}
          </div>
        )
      )}
    </div>
  );
}
