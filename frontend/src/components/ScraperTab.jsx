import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  Terminal,
  Sparkles,
  Info,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  Database,
  FileText,
  CheckCircle,
  Circle
} from 'lucide-react';

export default function ScraperTab({
  scraping,
  scrapeLimit,
  setScrapeLimit,
  matchesRemaining,
  scrapeProgress,
  scrapePhase,
  scrapeTimeRemaining,
  currentPrimary,
  totalPrimary,
  currentDeep,
  totalDeep,
  scraperLogs,
  handleStopScraping,
  handleTriggerScraping,
  handleStartDetailedScraping,
  handleOneClickScraping,
  consoleEndRef,
  selectedScraperStrategyId,
  setSelectedScraperStrategyId,
  scraperTargetDate,
  setScraperTargetDate,
  liveScrapedMatches
}) {
  const [strategies, setStrategies] = useState([]);
  const [expandedMatches, setExpandedMatches] = useState({});

  useEffect(() => {
    const fetchActiveStrategies = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/strategies/magic');
        const json = await res.json();
        if (json.success) {
          // Only show active strategies for target scraping
          setStrategies(json.data.filter(s => s.status === 'ACTIVE') || []);
        }
      } catch (err) {
        console.error("Failed to load active strategies in Scraper:", err);
      }
    };
    fetchActiveStrategies();
  }, []);

  const toggleMatchExpand = (id) => {
    setExpandedMatches(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStepStatus = (stepName) => {
    const phases = ['idle', 'discovering', 'discovered_waiting', 'scraping_primary', 'scraping_history', 'importing', 'completed'];
    const currentIdx = phases.indexOf(scrapePhase);
    
    if (scrapePhase === 'stopped') return 'pending';
    
    if (stepName === 'discovery') {
      if (currentIdx > 1) return 'completed';
      if (scrapePhase === 'discovering') return 'active';
      return 'pending';
    }
    if (stepName === 'details') {
      if (currentIdx > 3) return 'completed';
      if (scrapePhase === 'scraping_primary') return 'active';
      return 'pending';
    }
    if (stepName === 'h2h') {
      if (currentIdx > 4) return 'completed';
      if (scrapePhase === 'scraping_history') return 'active';
      return 'pending';
    }
    if (stepName === 'import') {
      if (scrapePhase === 'completed') return 'completed';
      if (scrapePhase === 'importing') return 'active';
      return 'pending';
    }
    return 'pending';
  };

  const renderStatRow = (label, statObj) => {
    if (!statObj) return null;
    const homeVal = statObj.home !== undefined ? statObj.home : '-';
    const awayVal = statObj.away !== undefined ? statObj.away : '-';
    
    const homeLabel = label.toLowerCase().includes('possession') ? `${homeVal}%` : homeVal;
    const awayLabel = label.toLowerCase().includes('possession') ? `${awayVal}%` : awayVal;
    
    const total = (parseFloat(homeVal) || 0) + (parseFloat(awayVal) || 0);
    const homePct = total > 0 ? (parseFloat(homeVal) || 0) / total * 100 : 50;
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          <span style={{ fontWeight: 600 }}>{homeLabel}</span>
          <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontWeight: 600 }}>{awayLabel}</span>
        </div>
        <div style={{ width: '100%', height: '4px', background: 'var(--bg-tertiary)', borderRadius: '2px', display: 'flex' }}>
          <div style={{ width: `${homePct}%`, height: '100%', background: '#0082ff', borderTopLeftRadius: '2px', borderBottomLeftRadius: '2px' }} />
          <div style={{ width: `${100 - homePct}%`, height: '100%', background: '#bf5af2', borderTopRightRadius: '2px', borderBottomRightRadius: '2px' }} />
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      <style>{`
        @keyframes pulseGlow {
          0% {
            box-shadow: 0 0 5px rgba(0, 130, 255, 0.4), 0 0 10px rgba(0, 130, 255, 0.2);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 15px rgba(0, 130, 255, 0.8), 0 0 25px rgba(0, 130, 255, 0.4);
            transform: scale(1.05);
          }
          100% {
            box-shadow: 0 0 5px rgba(0, 130, 255, 0.4), 0 0 10px rgba(0, 130, 255, 0.2);
            transform: scale(1);
          }
        }
        .step-active {
          animation: pulseGlow 2s infinite ease-in-out;
          border-color: #0082ff !important;
          background: rgba(0, 130, 255, 0.15) !important;
          color: #0082ff !important;
        }
        .step-completed {
          border-color: #34c759 !important;
          background: rgba(52, 199, 89, 0.15) !important;
          color: #34c759 !important;
        }
        .step-pending {
          border-color: rgba(255, 255, 255, 0.08) !important;
          background: rgba(255, 255, 255, 0.02) !important;
          color: var(--text-muted) !important;
        }
        .connector-completed {
          background: #34c759 !important;
        }
        .connector-active {
          background: linear-gradient(90deg, #34c759, #0082ff) !important;
        }
        .connector-pending {
          background: rgba(255, 255, 255, 0.08) !important;
        }
      `}</style>

      {/* Scraper Action Console Card */}
      <div className="glass-card accent-right" style={{ padding: '24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: scraping ? '1px solid var(--border-color)' : 'none', paddingBottom: scraping ? '16px' : '0', transition: 'all 0.3s ease' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 700 }}>
              Lancer le Scraper Go (MatchEnDirect.fr)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Compile et démarre le serveur de workflow, navigue sur MatchEnDirect pour extraire les statistiques et cotes.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Target Date Picker */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: scraperTargetDate ? 'rgba(0, 130, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
              border: scraperTargetDate ? '1px solid rgba(0, 130, 255, 0.3)' : '1px solid var(--border-color)', 
              borderRadius: '6px', 
              padding: '4px 12px', 
              height: '36px',
              boxShadow: scraperTargetDate ? '0 0 10px rgba(0, 130, 255, 0.04)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              <Calendar size={14} style={{ color: scraperTargetDate ? '#0082ff' : 'var(--text-muted)' }} />
              <span style={{ fontSize: '12.5px', color: scraperTargetDate ? '#0082ff' : 'var(--text-secondary)', fontWeight: 600 }}>Date :</span>
              <input 
                type="date"
                value={scraperTargetDate || ''}
                onChange={(e) => setScraperTargetDate(e.target.value)}
                disabled={scraping}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  outline: 'none',
                  cursor: 'pointer',
                  width: '120px',
                  colorScheme: 'dark'
                }}
              />
            </div>

            {/* Smart-Scraping Selector: Target Strategy Dropdown */}
            {scrapePhase === 'discovered_waiting' && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                background: selectedScraperStrategyId ? 'rgba(127, 0, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)', 
                border: selectedScraperStrategyId ? '1px solid rgba(127, 0, 255, 0.3)' : '1px solid var(--border-color)', 
                borderRadius: '6px', 
                padding: '4px 12px', 
                height: '36px',
                boxShadow: selectedScraperStrategyId ? '0 0 10px rgba(127, 0, 255, 0.04)' : 'none',
                transition: 'all 0.2s ease'
              }}>
                <Sparkles size={14} style={{ color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '12.5px', color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-secondary)', fontWeight: 600 }}>Cibler :</span>
                <select
                  value={selectedScraperStrategyId || ''}
                  onChange={(e) => setSelectedScraperStrategyId(e.target.value)}
                  disabled={scraping && scrapePhase !== 'discovered_waiting'}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '12.5px',
                    outline: 'none',
                    cursor: 'pointer',
                    maxWidth: '180px'
                  }}
                >
                  <option value="" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Aucun (Tous les H2H)</option>
                  {strategies.map(s => (
                    <option key={s.id} value={s.id} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Scrape Limit input */}
            {scrapePhase === 'discovered_waiting' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', height: '36px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Limite :</span>
                <input 
                  type="number" 
                  min="1" 
                  max={totalPrimary} 
                  style={{ width: '45px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0' }} 
                  value={scrapeLimit}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 30;
                    setScrapeLimit(Math.max(1, Math.min(totalPrimary, val)));
                  }}
                  disabled={scraping && scrapePhase !== 'discovered_waiting'}
                />
                <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>matchs</span>
              </div>
            )}
            
            {scrapePhase === 'idle' ? (
              <button 
                className="btn btn-primary" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  height: '36px',
                  background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                  border: 'none',
                  boxShadow: '0 4px 15px rgba(127, 0, 255, 0.25)',
                  fontWeight: 700
                }} 
                onClick={handleTriggerScraping}
                title="Découvrir les matchs et lancer le scrapping pour la date sélectionnée"
              >
                <Sparkles size={14} />
                <span>Démarrer le Scrapping</span>
              </button>
            ) : scrapePhase === 'discovered_waiting' ? (
              <>
                <button 
                  className="btn btn-primary" 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    height: '36px',
                    background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)',
                    border: 'none',
                    boxShadow: '0 4px 15px rgba(127, 0, 255, 0.25)',
                    fontWeight: 700
                  }} 
                  onClick={() => handleStartDetailedScraping(scrapeLimit)}
                >
                  <RefreshCcw size={14} />
                  <span>Lancer l'Analyse ({scrapeLimit})</span>
                </button>
                
                <button className="btn btn-danger" style={{ height: '36px' }} onClick={handleStopScraping}>
                  Arrêter le Scraper
                </button>
              </>
            ) : (
              <button className="btn btn-danger" style={{ height: '36px' }} onClick={handleStopScraping}>
                Arrêter le Scraper
              </button>
            )}
          </div>
        </div>

        {/* Informative banner about Smart-Scraping savings */}
        {selectedScraperStrategyId && !scraping && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px 14px', 
            background: 'rgba(127, 0, 255, 0.03)', 
            border: '1px dashed rgba(127, 0, 255, 0.15)', 
            borderRadius: '6px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <Info size={14} style={{ color: '#bf5af2' }} />
            <span>
              <strong>Smart-Scraping actif :</strong> Predictix analysera la page d'accueil, mais filtrera instantanément les confrontations historiques en exploitant vos caches. Les H2H hors-cible ne seront pas scrapés en profondeur, économisant jusqu'à 80% du temps de traitement Tor !
            </span>
          </div>
        )}

        {/* Live Scraper Progress Bar & Animated Stepper */}
        {scraping && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-accent-solid)' }}>
                {scrapePhase === 'idle' && 'En attente'}
                {scrapePhase === 'discovering' && 'Découverte des matchs en cours...'}
                {scrapePhase === 'discovered_waiting' && 'En attente de configuration...'}
                {scrapePhase === 'scraping_primary' && 'Analyse des détails des matchs...'}
                {scrapePhase === 'scraping_history' && 'Crawl profond des historiques H2H (Tor)...'}
                {scrapePhase === 'importing' && 'Calcul de Poisson & Importation...'}
                {scrapePhase === 'stopped' && 'Scraper arrêté'}
                {scrapePhase === 'completed' && 'Scraping terminé avec succès !'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                {scrapeTimeRemaining ? `Temps restant estimé : ${scrapeTimeRemaining}` : 'Calcul du temps...'}
              </span>
            </div>
            
            {/* Main Progress Bar */}
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${scrapeProgress}%`, height: '100%', background: 'var(--grad-accent)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
            </div>
            
            {/* Stepper animation component */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '15px', 
              padding: '16px 20px', 
              background: 'rgba(255,255,255,0.01)', 
              borderRadius: '8px', 
              border: '1px solid rgba(255, 255, 255, 0.03)',
              position: 'relative'
            }}>
              {/* Step 1: Discovery */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
                <div className={`step-circle ${getStepStatus('discovery') === 'completed' ? 'step-completed' : getStepStatus('discovery') === 'active' ? 'step-active' : 'step-pending'}`} style={{
                  width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)'
                }}>
                  {getStepStatus('discovery') === 'completed' ? <CheckCircle size={15} /> : <Search size={14} />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: getStepStatus('discovery') === 'active' ? 700 : 500, color: getStepStatus('discovery') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                  Découverte
                </span>
              </div>

              {/* Connector 1-2 */}
              <div className={getStepStatus('details') === 'completed' ? 'connector-completed' : getStepStatus('details') === 'active' ? 'connector-active' : 'connector-pending'} style={{
                height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease'
              }} />

              {/* Step 2: Primary scraping */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
                <div className={`step-circle ${getStepStatus('details') === 'completed' ? 'step-completed' : getStepStatus('details') === 'active' ? 'step-active' : 'step-pending'}`} style={{
                  width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)'
                }}>
                  {getStepStatus('details') === 'completed' ? <CheckCircle size={15} /> : <FileText size={14} />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: getStepStatus('details') === 'active' ? 700 : 500, color: getStepStatus('details') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                  Détails Matchs
                </span>
              </div>

              {/* Connector 2-3 */}
              <div className={getStepStatus('h2h') === 'completed' ? 'connector-completed' : getStepStatus('h2h') === 'active' ? 'connector-active' : 'connector-pending'} style={{
                height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease'
              }} />

              {/* Step 3: Deep Crawl */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
                <div className={`step-circle ${getStepStatus('h2h') === 'completed' ? 'step-completed' : getStepStatus('h2h') === 'active' ? 'step-active' : 'step-pending'}`} style={{
                  width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)'
                }}>
                  {getStepStatus('h2h') === 'completed' ? <CheckCircle size={15} /> : <Layers size={14} />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: getStepStatus('h2h') === 'active' ? 700 : 500, color: getStepStatus('h2h') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                  Historique H2H
                </span>
              </div>

              {/* Connector 3-4 */}
              <div className={getStepStatus('import') === 'completed' ? 'connector-completed' : getStepStatus('import') === 'active' ? 'connector-active' : 'connector-pending'} style={{
                height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease'
              }} />

              {/* Step 4: Calcul & Import */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
                <div className={`step-circle ${getStepStatus('import') === 'completed' ? 'step-completed' : getStepStatus('import') === 'active' ? 'step-active' : 'step-pending'}`} style={{
                  width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)'
                }}>
                  {getStepStatus('import') === 'completed' ? <CheckCircle size={15} /> : <Database size={14} />}
                </div>
                <span style={{ fontSize: '11px', fontWeight: getStepStatus('import') === 'active' ? 700 : 500, color: getStepStatus('import') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                  Calcul & Import
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>Scraping en cours : {scrapeProgress}% effectué</span>
              {matchesRemaining !== null && matchesRemaining > 0 && (
                <span>{matchesRemaining} {scrapePhase === 'scraping_history' ? 'H2H restants' : 'matchs restants'}</span>
              )}
            </div>

            {/* Configuration for Detailed Scraping after match discovery */}
            {scrapePhase === 'discovered_waiting' && (
              <div style={{ marginTop: '14px', padding: '14px 18px', background: 'rgba(255,255,255,0.02)', border: '1.5px solid var(--color-accent-solid)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff', fontFamily: 'Outfit' }}>
                    Matchs découverts : {totalPrimary}
                  </h4>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Choisissez le nombre maximum de matchs que vous souhaitez analyser en détail :
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', height: '36px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Limite :</span>
                    <input 
                      type="number" 
                      min="1" 
                      max={totalPrimary} 
                      style={{ width: '40px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0' }}
                      value={scrapeLimit}
                      onChange={(e) => setScrapeLimit(Math.max(1, Math.min(totalPrimary, parseInt(e.target.value) || 30)))}
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>matchs</span>
                  </div>
                  <button 
                    className="btn btn-primary" 
                    style={{ height: '36px', padding: '0 16px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleStartDetailedScraping(scrapeLimit)}
                  >
                    <RefreshCcw size={14} />
                    <span>Lancer l'Analyse Détaillée</span>
                  </button>
                </div>
              </div>
            )}

            {/* Deep crawl sub-progress */}
            {totalPrimary > 0 && scrapePhase !== 'discovered_waiting' && (
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: 'var(--text-secondary)', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.02)', marginTop: '8px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>Détails Matchs :</span> {currentPrimary} / {totalPrimary}
                </div>
                {totalDeep > 0 && (
                  <div>
                    <span style={{ fontWeight: 600 }}>Crawl H2H Tor :</span> {currentDeep} / {totalDeep}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Live Match Detail Scraper Panel (Collapsible Grid) */}
      {liveScrapedMatches && liveScrapedMatches.length > 0 && (
        <div className="glass-card" style={{ padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: '#0082ff' }} />
              <span>Détails des matchs extraits en temps réel ({liveScrapedMatches.length})</span>
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Cliquez sur un match pour inspecter ses statistiques et les confrontations H2H en cours de traitement.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
            {liveScrapedMatches.map((m) => {
              const isExpanded = !!expandedMatches[m.match_id];
              const hasCorners = m.first_half_corners_home !== null && m.first_half_corners_home !== undefined;
              const hasStats = m.statistics && Object.keys(m.statistics).length > 0;
              const h2hCount = m.h2hList ? m.h2hList.length : 0;
              
              return (
                <div key={m.match_id} style={{ 
                  background: 'rgba(255, 255, 255, 0.01)', 
                  border: isExpanded ? '1px solid rgba(0, 130, 255, 0.2)' : '1px solid var(--border-color)',
                  borderRadius: '8px', 
                  padding: '12px 16px',
                  transition: 'all 0.25s ease',
                  boxShadow: isExpanded ? '0 4px 15px rgba(0,130,255,0.02)' : 'none'
                }}>
                  {/* Summary Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }} onClick={() => toggleMatchExpand(m.match_id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {m.home_logo ? (
                          <img src={m.home_logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', fontWeight: 700 }}>H</div>
                        )}
                        {m.away_logo ? (
                          <img src={m.away_logo} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain', marginLeft: '2px' }} onError={(e) => e.target.style.display='none'} />
                        ) : (
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '9px', fontWeight: 700, marginLeft: '2px' }}>A</div>
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                          {m.home_team} vs {m.away_team}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {m.tournament} • {m.date || ''} {m.time ? `• ${m.time}` : ''}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      {/* Stats indicator */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Statistiques</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 800, color: hasStats ? '#34c759' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', marginTop: '2px' }}>
                          {hasStats ? `${Object.keys(m.statistics).length} métriques` : 'N/A'}
                        </div>
                      </div>

                      {/* Expand Toggle Icon */}
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-secondary)' }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content Panel */}
                  {isExpanded && (
                    <div style={{ 
                      marginTop: '16px', 
                      paddingTop: '16px', 
                      borderTop: '1px dashed rgba(255,255,255,0.05)',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '24px',
                      animation: 'fadeIn 0.2s ease-out'
                    }}>
                      {/* Advanced Stats */}
                      <div>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#0082ff', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Statistiques de la rencontre
                        </h4>
                        {hasStats ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {m.statistics.possession && renderStatRow('Possession', m.statistics.possession)}
                            {m.statistics.shots && renderStatRow('Tirs Totaux', m.statistics.shots)}
                            {m.statistics.shots_on_target && renderStatRow('Tirs Cadrés', m.statistics.shots_on_target)}
                            {m.statistics.yellow_cards && renderStatRow('Cartons Jaunes', m.statistics.yellow_cards)}
                            {m.statistics.fouls && renderStatRow('Fautes Commises', m.statistics.fouls)}
                            {m.statistics.offsides && renderStatRow('Hors-jeu', m.statistics.offsides)}
                          </div>
                        ) : (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', background: 'rgba(255,255,255,0.01)', borderRadius: '6px' }}>
                            Aucune statistique détaillée disponible pour ce match.
                          </div>
                        )}
                      </div>

                      {/* Opponent History Deep H2H */}
                      <div>
                        <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#bf5af2', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Confrontations H2H traitées ({h2hCount})
                        </h4>
                        
                        {m.h2hList && m.h2hList.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
                            {m.h2hList.map((h, idx) => {
                              const hHasCorners = h.first_half_corners_home !== null && h.first_half_corners_home !== undefined;
                              return (
                                <div key={idx} style={{ 
                                  padding: '8px 10px', 
                                  background: 'rgba(255,255,255,0.02)', 
                                  borderRadius: '6px', 
                                  display: 'flex', 
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '11.5px',
                                  border: '1px solid rgba(255,255,255,0.02)'
                                }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '10px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>{h.date ? h.date.substring(0, 10) : ''} • </span>
                                    <strong style={{ color: 'var(--text-primary)' }}>{h.home_team} {h.score} {h.away_team}</strong>
                                  </div>
                                  <div style={{ fontSize: '11px', fontWeight: 700, color: hHasCorners ? '#34c759' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>MT:</span>
                                    <span>{hHasCorners ? `${h.first_half_corners_home}-${h.first_half_corners_away}` : 'N/A'}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ 
                            padding: '24px 16px', 
                            textAlign: 'center', 
                            color: 'var(--text-muted)', 
                            fontSize: '12px', 
                            background: 'rgba(255,255,255,0.01)', 
                            borderRadius: '6px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            {scrapePhase === 'scraping_history' ? (
                              <>
                                <RefreshCcw size={14} className="animate-spin" style={{ color: '#bf5af2' }} />
                                <span>Recherche de l'historique H2H en cours...</span>
                              </>
                            ) : (
                              <span>Aucune confrontation H2H dans cette session.</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Live Console Output Log Streamer */}
      {scraperLogs.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text-secondary)' }}>
            <Terminal size={14} />
            <span>LOGS DU SERVEUR SCRAPPER-LITE</span>
          </div>
          <div className="scraper-console">
            {scraperLogs.map((log, idx) => (
              <div key={idx} className={`console-line ${log.type}`}>
                {log.message}
              </div>
            ))}
            <div className="console-cursor" ref={consoleEndRef}></div>
          </div>
        </div>
      )}

    </div>
  );
}
