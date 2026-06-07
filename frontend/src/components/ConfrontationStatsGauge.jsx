import React from 'react';

const formatKeyLabel = (key) => {
  const labels = {
    fouls: 'Fautes Commises',
    yellow_cards: 'Cartons Jaunes',
    possession: 'Possession de Balle',
    shots_on_target: 'Tirs Cadrés',
    shots: 'Tirs',
    offsides: 'Hors-jeu',
    red_cards: 'Cartons Rouges',
    xg_buts_attendus: 'Expected Goals (xG)',
    passes: 'Passes Totales',
    passes_reussis: 'Passes Réussies (%)',
    tacles_reussis: 'Tacles Réussis',
    dribbles_reussis: 'Dribbles Réussis',
    duels_reussis: 'Duels Gagnés',
    duels_aeriens_reussis: 'Duels Aériens Gagnés',
    ballons_touches_dans_la_surface_adverse: 'Touches Surface Adverse',
    centres: 'Centres Tentés',
    centres_reussis: 'Centres Réussis',
    degagements: 'Dégagements',
    rentree_de_touche: 'Touches',
    occasions_manquees: 'Occasions Manquées',
    poteau: 'Tirs sur Poteau',
    total_rebounds: 'Rebonds',
    assists: 'Passes Décisives',
    blocks: 'Contres',
    steals: 'Interceptions',
    field_goals: 'Paniers Réussis',
    free_throws: 'Lancers Francs',
    aces: 'Aces',
    double_faults: 'Doubles Fautes',
    first_serve: '1er Service (%)',
    break_points: 'Balles de Break',
    tries: 'Essais',
    penalties: 'Pénalités',
    conversions: 'Transformations',
    goals: 'Buts',
    saves: 'Arrêts'
  };
  if (labels[key]) return labels[key];
  return key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

const renderStatGauge = (label, hVal, aVal, key) => {
  const hNum = parseFloat(String(hVal).replace('%', ''));
  const aNum = parseFloat(String(aVal).replace('%', ''));
  
  let pctH = 50;
  let pctA = 50;
  if (!isNaN(hNum) && !isNaN(aNum) && (hNum + aNum) > 0) {
    pctH = (hNum / (hNum + aNum)) * 100;
    pctA = 100 - pctH;
  }
  
  const isPoss = key === 'possession';
  const isPassesReussis = key === 'passes_reussis';
  const formattedH = hVal !== undefined ? (isPoss || isPassesReussis ? `${hVal}%` : hVal) : '-';
  const formattedA = aVal !== undefined ? (isPoss || isPassesReussis ? `${aVal}%` : aVal) : '-';
  
  return (
    <div key={key} style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      background: 'rgba(255, 255, 255, 0.015)', 
      padding: '8px 12px', 
      borderRadius: '6px', 
      border: '1px solid rgba(255, 255, 255, 0.03)',
      gap: '5px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-success)' }}>{formattedH}</span>
        <span style={{ fontSize: '9px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center', width: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>
          {label}
        </span>
        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--color-danger)' }}>{formattedA}</span>
      </div>
      
      <div style={{ height: '3px', width: '100%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1.5px', overflow: 'hidden', display: 'flex' }}>
        <div style={{ 
          width: `${pctH}%`, 
          background: 'linear-gradient(90deg, var(--color-success) 0%, #10b981 100%)', 
          height: '100%',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
        <div style={{ 
          width: `${pctA}%`, 
          background: 'linear-gradient(90deg, #f97316 0%, var(--color-danger) 100%)', 
          height: '100%',
          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
        }} />
      </div>
    </div>
  );
};

export default function ConfrontationStatsGauge({ m }) {
  let stats = null;
  try {
    if (m.statistics_json) {
      stats = typeof m.statistics_json === 'string' ? JSON.parse(m.statistics_json) : m.statistics_json;
    }
  } catch (e) {}
  
  const hasCorners = m.first_half_corners_home !== null && m.first_half_corners_away !== null;
  
  if ((!stats || Object.keys(stats).length === 0) && !hasCorners) {
    return (
      <div style={{ padding: '12px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', width: '100%' }}>
        Aucune statistique détaillée disponible pour cette confrontation.
      </div>
    );
  }
  
  return (
    <div style={{
      background: 'rgba(0, 0, 0, 0.35)',
      border: '1px solid rgba(255, 255, 255, 0.04)',
      borderRadius: '8px',
      padding: '12px 14px',
      marginTop: '8px',
      width: '100%',
      boxSizing: 'border-box',
      boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.2)'
    }} onClick={(e) => e.stopPropagation()}>
      <h5 style={{ margin: '0 0 10px 0', fontSize: '10px', fontWeight: 800, color: 'var(--color-accent-solid)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <span>STATISTIQUES COMPARATIVES DE LA CONFRONTATION</span>
      </h5>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', 
        gap: '8px' 
      }}>
        {hasCorners && renderStatGauge('Corners 1MT', m.first_half_corners_home, m.first_half_corners_away, 'corners')}
        {stats && Object.keys(stats).filter(k => k !== 'corners').map(key => {
          const s = stats[key];
          if (s.home === undefined && s.away === undefined) return null;
          return renderStatGauge(formatKeyLabel(key), s.home, s.away, key);
        })}
      </div>
    </div>
  );
}
