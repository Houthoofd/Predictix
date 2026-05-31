import React, { useState, useEffect } from 'react';
import { 
  RefreshCcw, 
  Terminal,
  Sparkles,
  Info
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
  consoleEndRef,
  selectedScraperStrategyId,
  setSelectedScraperStrategyId
}) {
  const [strategies, setStrategies] = useState([]);

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
      
      {/* Scraper Action Console Card */}
      <div className="glass-card accent-right" style={{ padding: '24px 30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: scraping ? '1px solid var(--border-color)' : 'none', paddingBottom: scraping ? '16px' : '0', transition: 'all 0.3s ease' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 700 }}>
              Lancer le Scraper Go (MatchEnDirect.fr)
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Compile et démarre le serveur de workflow, navigue sur MatchEnDirect en direct pour extraire les statistiques et cotes.
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
            
            {/* Smart-Scraping Selector: Target Strategy Dropdown */}
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
                disabled={scraping}
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

            {/* Scrape Limit input */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 10px', height: '36px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Limite :</span>
              <input 
                type="number" 
                min="1" 
                max="100" 
                style={{ width: '45px', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontWeight: 700, textAlign: 'center', outline: 'none', padding: '0' }} 
                value={scrapeLimit}
                onChange={(e) => setScrapeLimit(Math.max(1, parseInt(e.target.value) || 30))}
                disabled={scraping}
              />
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>matchs</span>
            </div>
            
            {!scraping ? (
              <>
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }} onClick={() => handleStartDetailedScraping(scrapeLimit)}>
                  <RefreshCcw size={15} />
                  <span>Crawl Profond H2H (Tor)</span>
                </button>
                
                <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }} onClick={handleTriggerScraping}>
                  <RefreshCcw size={15} />
                  <span>Démarrer Scraper Rapide</span>
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

        {/* Live Scraper Progress Bar */}
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
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>Scraping en cours : {scrapeProgress}% effectué</span>
              {matchesRemaining !== null && (
                <span>{matchesRemaining} matchs restants</span>
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
                  <span style={{ fontWeight: 600 }}>Découverte :</span> {currentPrimary} / {totalPrimary}
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

        {/* Live Console Output Log Streamer */}
        {scraperLogs.length > 0 && (
          <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
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

    </div>
  );
}
