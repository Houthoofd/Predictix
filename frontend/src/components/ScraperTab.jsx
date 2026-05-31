import React from 'react';
import { 
  RefreshCcw, 
  Terminal 
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
  consoleEndRef
}) {
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
                <button className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px' }} onClick={handleStartDetailedScraping}>
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

        {/* Live Scraper Progress Bar */}
        {scraping && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <span style={{ fontWeight: 600, color: 'var(--color-accent-solid)' }}>
                {scrapePhase}
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

            {/* Deep crawl sub-progress */}
            {totalPrimary > 0 && (
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
