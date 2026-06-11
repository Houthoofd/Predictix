import React, { useState, useMemo } from 'react';
import { Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { getValueBetsForMatch } from '../utils/valueBetScanner';
import { sportLabels, getMetricLabel, parseTournament } from '../utils/labels';
import MagicPredictionsGroup from './MagicPredictionsGroup';
import MagicMatchCard from './MagicMatchCard';


export default function MagicPredictionsTab({
  predictions,
  handleQuickPlaceBet,
  setSelectedMatchDetails,
  handleAddToBasket,
  handleInstantPlaceBet,
  selectedPredIds,
  setSelectedPredIds,
  selectedMagicSport,
  setSelectedMagicSport,
  magicSignals: signals,
  magicLoading: loading,
  magicError: error,
  fetchMagicSignals,
  minCoverage,
  setMinCoverage
}) {
  const [filterMetric, setFilterMetric] = useState('all');
  const [collapsedLeagues, setCollapsedLeagues] = useState({});
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('today');

  const fetchSignals = () => {
    if (typeof fetchMagicSignals === 'function') {
      fetchMagicSignals();
    }
  };

  React.useEffect(() => {
    setCollapsedLeagues({});
    if (selectedMagicSport === 'basketball') {
      setSortBy('confidence');
    } else {
      setSortBy('date');
    }
  }, [selectedMagicSport]);

  React.useEffect(() => {
    if (typeof fetchMagicSignals === 'function') {
      fetchMagicSignals();
    }
  }, [predictions]);

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  const filteredSignals = signals.filter(s => {
    const matchMetric = filterMetric === 'all' || s.metric === filterMetric;
    const matchSport = selectedMagicSport === 'all' || (s.sport || 'football') === selectedMagicSport;
    const isTodayOrFuture = s.date >= todayStr;
    const matchDateMode = viewMode === 'today' ? isTodayOrFuture : !isTodayOrFuture;
    return matchMetric && matchSport && matchDateMode;
  });

  const availableMetrics = ['all', ...new Set(signals.map(s => s.metric))];
  const availableSports = ['all', ...new Set(signals.map(s => s.sport || 'football'))];

  const leagueGroups = useMemo(() => {
    const groups = {};
    filteredSignals.forEach(sig => {
      const { country, league } = parseTournament(sig.tournament);
      const groupKey = `${country} : ${league}`;
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(sig);
    });

    // Sort signals inside league groups if basketball
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        if (selectedMagicSport === 'basketball') {
          const matchA = (predictions || []).find(p => p.match_id === a.match_id);
          const matchB = (predictions || []).find(p => p.match_id === b.match_id);
          const probA = matchA && matchA.probability ? parseInt(matchA.probability, 10) : 0;
          const probB = matchB && matchB.probability ? parseInt(matchB.probability, 10) : 0;
          if (probB !== probA) {
            return probB - probA;
          }
          return (b.avg_value || 0) - (a.avg_value || 0);
        }
        return 0;
      });
    });

    return groups;
  }, [filteredSignals, predictions, selectedMagicSport]);

  const sortedLeagues = useMemo(() => {
    return Object.keys(leagueGroups).sort();
  }, [leagueGroups]);

  const collapseAllLeagues = () => {
    const nextCollapsed = {};
    sortedLeagues.forEach(g => { nextCollapsed[g] = true; });
    setCollapsedLeagues(nextCollapsed);
  };

  const expandAllLeagues = () => { setCollapsedLeagues({}); };
  const toggleLeagueCollapse = (groupKey) => {
    setCollapsedLeagues(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <style>{`
        .date-section-header:hover { color: #bf5af2 !important; }
        .date-section-header:hover span { color: #fff !important; }
      `}</style>

      {/* Sub-tab view mode selector */}
      <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '4px', alignSelf: 'flex-start', gap: '4px' }}>
        <button 
          style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            padding: '6px 16px', 
            borderRadius: '8px', 
            background: viewMode === 'today' ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
            color: viewMode === 'today' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setViewMode('today')}
        >
          Matchs du Jour & À venir
        </button>
        <button 
          style={{ 
            fontSize: '13px', 
            fontWeight: 700, 
            padding: '6px 16px', 
            borderRadius: '8px', 
            background: viewMode === 'history' ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : 'transparent',
            color: viewMode === 'history' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => setViewMode('history')}
        >
          Historique / Archives
        </button>
      </div>

      {signals.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableMetrics.map((met) => (
              <button key={met} className={`btn ${filterMetric === met ? 'btn-primary' : 'btn-secondary'}`} style={{ padding: '6px 14px', fontSize: '12.5px', borderRadius: '20px', background: filterMetric === met ? 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)' : undefined, border: filterMetric === met ? 'none' : undefined }} onClick={() => setFilterMetric(met)}>{met === 'all' ? 'Tous les signaux' : getMetricLabel(met)}</button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Sport :</span>
              <select value={selectedMagicSport} onChange={(e) => setSelectedMagicSport(e.target.value)} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                {availableSports.map(sp => (
                  <option key={sp} value={sp} style={{ background: '#1c1c1e', color: '#fff' }}>{sportLabels[sp] || (sp.charAt(0).toUpperCase() + sp.slice(1))}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Couverture :</span>
              <select value={minCoverage} onChange={(e) => setMinCoverage(e.target.value)} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="0" style={{ background: '#1c1c1e', color: '#fff' }}>0%</option>
                <option value="10" style={{ background: '#1c1c1e', color: '#fff' }}>10%</option>
                <option value="30" style={{ background: '#1c1c1e', color: '#fff' }}>30%</option>
                <option value="50" style={{ background: '#1c1c1e', color: '#fff' }}>50%</option>
                <option value="70" style={{ background: '#1c1c1e', color: '#fff' }}>70%</option>
                <option value="90" style={{ background: '#1c1c1e', color: '#fff' }}>90%</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Trier par :</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-primary)', borderRadius: '8px', padding: '6px 12px', fontSize: '12.5px', fontFamily: 'Outfit', fontWeight: 600, cursor: 'pointer', outline: 'none' }}>
                <option value="date" style={{ background: '#1c1c1e', color: '#fff' }}>Date & Heure</option>
                <option value="confidence" style={{ background: '#1c1c1e', color: '#fff' }}>Confiance (Probabilité %)</option>
              </select>
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={fetchSignals} 
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '32px', padding: '0 12px', fontSize: '12.5px', borderRadius: '8px', cursor: 'pointer' }}
            >
              <RefreshCw size={13} className={loading ? 'spin-animation' : ''} />
              <span>Actualiser</span>
            </button>

            {sortBy === 'date' && sortedLeagues.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }} onClick={collapseAllLeagues}>Tout replier</button>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '11px', height: '28px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: 600, cursor: 'pointer' }} onClick={expandAllLeagues}>Tout déplier</button>
              </div>
            )}

            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Signaux détectés : <strong style={{ color: '#bf5af2' }}>{filteredSignals.length}</strong></span>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '15px' }}>
          <div className="loading-spinner" style={{ width: '40px', height: '40px', border: '3px solid rgba(127, 0, 255, 0.1)', borderTopColor: '#bf5af2', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Screening en cours des cibles...</span>
        </div>
      ) : error ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
          <AlertCircle size={36} style={{ marginBottom: '12px', color: 'var(--color-danger)' }} />
          <p style={{ fontWeight: 600 }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchSignals} style={{ marginTop: '16px' }}>Réessayer</button>
        </div>
      ) : filteredSignals.length > 0 ? (
        (() => {
          if (sortBy === 'date') {
            return sortedLeagues.map((groupKey, gIdx) => (
              <MagicPredictionsGroup
                key={gIdx}
                groupKey={groupKey}
                signalsInGroup={leagueGroups[groupKey]}
                collapsedLeagues={collapsedLeagues}
                toggleLeagueCollapse={toggleLeagueCollapse}
                predictions={predictions}
                selectedPredIds={selectedPredIds}
                setSelectedPredIds={setSelectedPredIds}
                setSelectedMatchDetails={setSelectedMatchDetails}
                handleAddToBasket={handleAddToBasket}
                handleQuickPlaceBet={handleQuickPlaceBet}
                handleInstantPlaceBet={handleInstantPlaceBet}
                getValueBetsForMatch={getValueBetsForMatch}
              />
            ));
          } else {
            const sortedSignals = [...filteredSignals].sort((a, b) => {
              const matchA = (predictions || []).find(p => p.match_id === a.match_id);
              const matchB = (predictions || []).find(p => p.match_id === b.match_id);

              if (selectedMagicSport === 'basketball') {
                const probA = matchA && matchA.probability ? parseInt(matchA.probability, 10) : 0;
                const probB = matchB && matchB.probability ? parseInt(matchB.probability, 10) : 0;
                if (probB !== probA) {
                  return probB - probA;
                }
                return (b.avg_value || 0) - (a.avg_value || 0);
              }

              const betsA = getValueBetsForMatch(matchA);
              const betsAProb = betsA.length > 0 ? betsA[0].probability : 0;
              const betsB = getValueBetsForMatch(matchB);
              const betsBProb = betsB.length > 0 ? betsB[0].probability : 0;
              return betsBProb - betsAProb;
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                <div className="grid-3" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  {sortedSignals.map((sig) => (
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
              </div>
            );
          }
        })()
      ) : (
        <div className="glass-card" style={{ textAlign: 'center', padding: '70px 20px', color: 'var(--text-muted)' }}>
          <Sparkles size={40} style={{ marginBottom: '12px', color: 'var(--text-muted)', opacity: 0.5 }} />
          <p style={{ fontWeight: 600, fontSize: '16px' }}>Aucun signal magique détecté pour le moment.</p>
        </div>
      )}
    </div>
  );
}
