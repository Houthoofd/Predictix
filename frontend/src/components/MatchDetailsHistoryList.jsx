import React, { useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import ConfrontationHistorySection from './ConfrontationHistorySection';

export default function MatchDetailsHistoryList({
  selectedMatchDetails,
  crawlLoading,
  handleCrawlHistory,
  activeMetric,
  getOutcomeIndicator
}) {
  const [expandedRowKey, setExpandedRowKey] = useState(null);

  const toggleExpandRow = (section, idx) => {
    const key = `${section}-${idx}`;
    setExpandedRowKey(prev => (prev === key ? null : key));
  };

  if (crawlLoading || selectedMatchDetails?.isCrawling) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', background: 'rgba(255,255,255,0.015)', border: '1.5px dashed var(--border-color)', borderRadius: '12px', gap: '16px', margin: '20px 0' }}>
        <div style={{ width: '36px', height: '36px', border: '3.5px solid rgba(255,255,255,0.08)', borderTop: '3.5px solid var(--color-accent-solid)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <div style={{ textAlign: 'center' }}>
          <h4 style={{ fontSize: '14.5px', fontFamily: 'Outfit', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Analyse de l'Historique en cours...
          </h4>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '6px 0 0 0', maxWidth: '380px', lineHeight: '1.4' }}>
            Récupération des confrontations et corners 1MT depuis Matchendirect via Tor SOCKS5. Cette opération prend environ 10 à 15 secondes.
          </p>
        </div>
      </div>
    );
  }

  const hasNoMatches = !selectedMatchDetails.recent_h2h_matches?.length && 
                       !selectedMatchDetails.recent_home_matches?.length && 
                       !selectedMatchDetails.recent_away_matches?.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {hasNoMatches && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', background: 'rgba(9, 132, 227, 0.03)', border: '1px dashed rgba(9, 132, 227, 0.25)', borderRadius: '12px', gap: '12px', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent-solid)' }}>
            <RefreshCcw size={16} />
            <span style={{ fontSize: '14px', fontFamily: 'Outfit', fontWeight: 700 }}>Statistiques Vides</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, maxWidth: '400px', lineHeight: '1.4' }}>
            Les confrontations directes et les moyennes de corners ne sont pas encore disponibles pour ce match.
          </p>
          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 20px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontFamily: 'Outfit' }}
            onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
          >
            <RefreshCcw size={13} />
            Analyser l'historique du match
          </button>
        </div>
      )}

      {selectedMatchDetails.recent_h2h_matches && selectedMatchDetails.recent_h2h_matches.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
            <h4 style={{ fontSize: '13px', fontFamily: 'Outfit', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', margin: 0 }}>
              Confrontations Directes (H2H)
            </h4>
            <button 
              style={{ background: 'transparent', border: 'none', color: 'var(--color-accent-solid)', fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
              onClick={() => handleCrawlHistory(selectedMatchDetails.match_id)}
            >
              <RefreshCcw size={11} /> Mettre à jour
            </button>
          </div>
          <ConfrontationHistorySection
            title=""
            matches={selectedMatchDetails.recent_h2h_matches}
            type="h2h"
            targetTeam={selectedMatchDetails.home_team}
            expandedRowKey={expandedRowKey}
            toggleExpandRow={toggleExpandRow}
            getOutcomeIndicator={getOutcomeIndicator}
            activeMetric={activeMetric}
          />
        </div>
      )}

      <ConfrontationHistorySection
        title={`Derniers matchs de ${selectedMatchDetails.home_team} (à domicile)`}
        matches={selectedMatchDetails.recent_home_matches}
        type="home"
        targetTeam={selectedMatchDetails.home_team}
        expandedRowKey={expandedRowKey}
        toggleExpandRow={toggleExpandRow}
        getOutcomeIndicator={getOutcomeIndicator}
        activeMetric={activeMetric}
      />

      <ConfrontationHistorySection
        title={`Derniers matchs de ${selectedMatchDetails.away_team} (à l'extérieur)`}
        matches={selectedMatchDetails.recent_away_matches}
        type="away"
        targetTeam={selectedMatchDetails.away_team}
        expandedRowKey={expandedRowKey}
        toggleExpandRow={toggleExpandRow}
        getOutcomeIndicator={getOutcomeIndicator}
        activeMetric={activeMetric}
      />
    </div>
  );
}
