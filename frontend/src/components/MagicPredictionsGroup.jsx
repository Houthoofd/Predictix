import React from 'react';
import { Trophy, ChevronRight, ChevronDown } from 'lucide-react';
import MagicMatchCard from './MagicMatchCard';

export default function MagicPredictionsGroup({
  groupKey,
  signalsInGroup,
  collapsedLeagues,
  toggleLeagueCollapse,
  predictions,
  selectedPredIds,
  setSelectedPredIds,
  setSelectedMatchDetails,
  handleAddToBasket,
  handleQuickPlaceBet,
  handleInstantPlaceBet,
  getValueBetsForMatch
}) {
  const isCollapsed = !!collapsedLeagues[groupKey];
  const [country, league] = groupKey.split(' : ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* League Section Header */}
      <div 
        onClick={() => toggleLeagueCollapse(groupKey)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 0', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontFamily: 'Outfit',
          fontSize: '14px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color 0.2s ease-in-out'
        }}
        className="date-section-header"
      >
        {isCollapsed ? (
          <ChevronRight size={15} style={{ color: '#bf5af2', marginRight: '2px' }} />
        ) : (
          <ChevronDown size={15} style={{ color: '#bf5af2', marginRight: '2px' }} />
        )}
        <Trophy size={14} style={{ color: '#bf5af2' }} />
        <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          {country}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>:</span>
        <span style={{ color: '#fff', fontWeight: 800 }}>
          {league}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, background: 'rgba(191, 90, 242, 0.12)', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>
          {signalsInGroup.length} signal{signalsInGroup.length > 1 ? 'aux' : ''}
        </span>
      </div>

      {!isCollapsed && (
        <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {signalsInGroup.map((sig) => (
            <MagicMatchCard
              key={sig.id}
              sig={sig}
              predictions={predictions}
              selectedPredIds={selectedPredIds}
              setSelectedPredIds={setSelectedPredIds}
              setSelectedMatchDetails={setSelectedMatchDetails}
              handleAddToBasket={handleAddToBasket}
              handleQuickPlaceBet={handleQuickPlaceBet}
              handleInstantPlaceBet={handleInstantPlaceBet}
              getValueBetsForMatch={getValueBetsForMatch}
            />
          ))}
        </div>
      )}
    </div>
  );
}
