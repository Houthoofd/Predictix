import React from 'react';
import { Calendar, Sparkles, RefreshCcw, Info, CheckCircle, Search, FileText, Layers, Database } from 'lucide-react';
import ScraperStepper from './ScraperStepper';

export default function ScraperConsoleCard({
  selectedScraperSource,
  setSelectedScraperSource,
  selectedScraperSport,
  setSelectedScraperSport,
  scraperTargetDate,
  setScraperTargetDate,
  selectedScraperStrategyId,
  setSelectedScraperStrategyId,
  strategies,
  scrapePhase,
  scrapeLimit,
  setScrapeLimit,
  scraping,
  totalPrimary,
  handleTriggerScraping,
  handleStartDetailedScraping,
  handleStopScraping,
  scrapeTimeRemaining,
  scrapeProgress,
  matchesRemaining,
  currentPrimary,
  totalDeep,
  currentDeep
}) {
  return (
    <div className="glass-card accent-right" style={{ padding: '24px 30px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: scraping ? '1px solid var(--border-color)' : 'none', paddingBottom: scraping ? '16px' : '0', transition: 'all 0.3s ease' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontFamily: 'Outfit', fontWeight: 700 }}>
            {selectedScraperSource === 'flashscore' 
              ? `Lancer le Scraper Go (Flashscore - ${selectedScraperSport === 'all' ? 'Tous les sports' : (selectedScraperSport.charAt(0).toUpperCase() + selectedScraperSport.slice(1))})` 
              : 'Lancer le Scraper Go (MatchEnDirect.fr)'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {selectedScraperSource === 'flashscore' ? 'Compile et démarre le scraper Flashscore pour extraire les matchs, scores et statistiques du sport sélectionné.' : 'Compile et démarre le serveur de workflow, navigue sur MatchEnDirect pour extraire les statistiques et cotes.'}
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Source Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', height: '36px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Source :</span>
            <select
              value={selectedScraperSource}
              onChange={(e) => {
                setSelectedScraperSource(e.target.value);
                if (e.target.value === 'matchendirect') {
                  setSelectedScraperSport('football');
                }
              }}
              disabled={scraping}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12.5px', outline: 'none', cursor: 'pointer' }}
            >
              <option value="matchendirect" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>MatchEnDirect</option>
              <option value="flashscore" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Flashscore (Multi-sports)</option>
            </select>
          </div>

          {/* Sport Selector */}
          {selectedScraperSource === 'flashscore' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', height: '36px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 600 }}>Sport :</span>
              <select
                value={selectedScraperSport}
                onChange={(e) => setSelectedScraperSport(e.target.value)}
                disabled={scraping}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12.5px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="all" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Tous les sports</option>
                <option value="football" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Football</option>
                <option value="basketball" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Basketball</option>
                <option value="tennis" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Tennis</option>
                <option value="rugby" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Rugby</option>
                <option value="handball" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Handball</option>
                <option value="volleyball" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Volleyball</option>
                <option value="hockey" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Hockey sur glace</option>
                <option value="baseball" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Baseball</option>
                <option value="american-football" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Football Américain</option>
                <option value="table-tennis" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Tennis de table</option>
                <option value="badminton" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Badminton</option>
                <option value="cricket" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Cricket</option>
                <option value="snooker" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Snooker</option>
                <option value="futsal" style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>Futsal</option>
              </select>
            </div>
          )}

          {/* Target Date Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: scraperTargetDate ? 'rgba(0, 130, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)', border: scraperTargetDate ? '1px solid rgba(0, 130, 255, 0.3)' : '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', height: '36px' }}>
            <Calendar size={14} style={{ color: scraperTargetDate ? '#0082ff' : 'var(--text-muted)' }} />
            <span style={{ fontSize: '12.5px', color: scraperTargetDate ? '#0082ff' : 'var(--text-secondary)', fontWeight: 600 }}>Date :</span>
            <input 
              type="date"
              value={scraperTargetDate || ''}
              onChange={(e) => setScraperTargetDate(e.target.value)}
              disabled={scraping}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12.5px', outline: 'none', cursor: 'pointer', width: '120px', colorScheme: 'dark' }}
            />
          </div>

          {/* Strategy Dropdown */}
          {!scraping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selectedScraperStrategyId ? 'rgba(127, 0, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)', border: selectedScraperStrategyId ? '1px solid rgba(127, 0, 255, 0.3)' : '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', height: '36px' }}>
              <Sparkles size={14} style={{ color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-muted)' }} />
              <span style={{ fontSize: '12.5px', color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-secondary)', fontWeight: 600 }}>Cibler :</span>
              <select
                value={selectedScraperStrategyId || ''}
                onChange={(e) => setSelectedScraperStrategyId(e.target.value)}
                disabled={scraping}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontWeight: 700, fontSize: '12.5px', outline: 'none', cursor: 'pointer', maxWidth: '180px' }}
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
          
          {scrapePhase === 'idle' ? (
            <button 
              className="btn btn-primary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none', boxShadow: '0 4px 15px rgba(127, 0, 255, 0.25)', fontWeight: 700 }} 
              onClick={handleTriggerScraping}
            >
              <Sparkles size={14} />
              <span>Démarrer le Scrapping</span>
            </button>
          ) : scrapePhase === 'discovered_waiting' ? (
            <>
              <button 
                className="btn btn-primary" 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', height: '36px', background: 'linear-gradient(135deg, #7f00ff 0%, #0082ff 100%)', border: 'none', boxShadow: '0 4px 15px rgba(127, 0, 255, 0.25)', fontWeight: 700 }} 
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

      {selectedScraperStrategyId && !scraping && (
        <div style={{ marginTop: '15px', padding: '10px 14px', background: 'rgba(127, 0, 255, 0.03)', border: '1px dashed rgba(127, 0, 255, 0.15)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={14} style={{ color: '#bf5af2' }} />
          <span>
            <strong>Smart-Scraping actif :</strong> Predictix analysera la page d'accueil, mais filtrera instantanément les confrontations historiques en exploitant vos caches. Les H2H hors-cible ne seront pas scrapés en profondeur, économisant jusqu'à 80% du temps de traitement Tor !
          </span>
        </div>
      )}

      {scraping && (
        <ScraperStepper
          scrapePhase={scrapePhase}
          scrapeProgress={scrapeProgress}
          scrapeTimeRemaining={scrapeTimeRemaining}
          matchesRemaining={matchesRemaining}
          currentPrimary={currentPrimary}
          totalPrimary={totalPrimary}
          currentDeep={currentDeep}
          totalDeep={totalDeep}
          scrapeLimit={scrapeLimit}
          setScrapeLimit={setScrapeLimit}
          handleStartDetailedScraping={handleStartDetailedScraping}
        />
      )}
    </div>
  );
}
