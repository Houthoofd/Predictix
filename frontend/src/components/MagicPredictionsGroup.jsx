import React from 'react';
import { Calendar, ChevronRight, ChevronDown } from 'lucide-react';
import MagicMatchCard from './MagicMatchCard';

export default function MagicPredictionsGroup({
  dateStr,
  signalsInDate,
  collapsedDates,
  toggleDateCollapse,
  formatHumanDate,
  predictions,
  selectedPredIds,
  setSelectedPredIds,
  setSelectedMatchDetails,
  handleAddToBasket,
  handleQuickPlaceBet,
  handleInstantPlaceBet,
  getValueBetsForMatch
}) {
  const isCollapsed = !!collapsedDates[dateStr];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
      {/* Date Section Header */}
      <div 
        onClick={() => toggleDateCollapse(dateStr)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 0', 
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontFamily: 'Outfit',
          fontSize: '15px',
          fontWeight: 800,
          color: 'var(--text-primary)',
          cursor: 'pointer',
          userSelect: 'none',
          transition: 'color 0.2s ease-in-out'
        }}
        className="date-section-header"
      >
        {isCollapsed ? (
          <ChevronRight size={16} style={{ color: '#bf5af2', marginRight: '2px' }} />
        ) : (
          <ChevronDown size={16} style={{ color: '#bf5af2', marginRight: '2px' }} />
        )}
        <Calendar size={16} style={{ color: '#bf5af2' }} />
        <span>{formatHumanDate(dateStr)}</span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px' }}>
          {signalsInDate.length} signal{signalsInDate.length > 1 ? 'aux' : ''}
        </span>
      </div>

      {!isCollapsed && (
        <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
          {signalsInDate.map((sig) => (
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
