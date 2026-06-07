import React from 'react';
import { Calendar, Sparkles, RefreshCcw, Info, CheckCircle, Search, FileText, Layers, Database } from 'lucide-react';

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
          {scrapePhase === 'discovered_waiting' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selectedScraperStrategyId ? 'rgba(127, 0, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)', border: selectedScraperStrategyId ? '1px solid rgba(127, 0, 255, 0.3)' : '1px solid var(--border-color)', borderRadius: '6px', padding: '4px 12px', height: '36px' }}>
              <Sparkles size={14} style={{ color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-muted)' }} />
              <span style={{ fontSize: '12.5px', color: selectedScraperStrategyId ? '#bf5af2' : 'var(--text-secondary)', fontWeight: 600 }}>Cibler :</span>
              <select
                value={selectedScraperStrategyId || ''}
                onChange={(e) => setSelectedScraperStrategyId(e.target.value)}
                disabled={scraping && scrapePhase !== 'discovered_waiting'}
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
          
          <div style={{ width: '100%', height: '8px', background: 'var(--bg-tertiary)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${scrapeProgress}%`, height: '100%', background: 'var(--grad-accent)', borderRadius: '4px', transition: 'width 0.4s ease' }} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px', padding: '16px 20px', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.03)', position: 'relative' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
              <div className={`step-circle ${getStepStatus('discovery') === 'completed' ? 'step-completed' : getStepStatus('discovery') === 'active' ? 'step-active' : 'step-pending'}`} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)' }}>
                {getStepStatus('discovery') === 'completed' ? <CheckCircle size={15} /> : <Search size={14} />}
              </div>
              <span style={{ fontSize: '11px', fontWeight: getStepStatus('discovery') === 'active' ? 700 : 500, color: getStepStatus('discovery') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                Découverte
              </span>
            </div>

            <div className={getStepStatus('details') === 'completed' ? 'connector-completed' : getStepStatus('details') === 'active' ? 'connector-active' : 'connector-pending'} style={{ height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease' }} />

            {/* Step 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
              <div className={`step-circle ${getStepStatus('details') === 'completed' ? 'step-completed' : getStepStatus('details') === 'active' ? 'step-active' : 'step-pending'}`} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)' }}>
                {getStepStatus('details') === 'completed' ? <CheckCircle size={15} /> : <FileText size={14} />}
              </div>
              <span style={{ fontSize: '11px', fontWeight: getStepStatus('details') === 'active' ? 700 : 500, color: getStepStatus('details') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                Détails Matchs
              </span>
            </div>

            <div className={getStepStatus('h2h') === 'completed' ? 'connector-completed' : getStepStatus('h2h') === 'active' ? 'connector-active' : 'connector-pending'} style={{ height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease' }} />

            {/* Step 3 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
              <div className={`step-circle ${getStepStatus('h2h') === 'completed' ? 'step-completed' : getStepStatus('h2h') === 'active' ? 'step-active' : 'step-pending'}`} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)' }}>
                {getStepStatus('h2h') === 'completed' ? <CheckCircle size={15} /> : <Layers size={14} />}
              </div>
              <span style={{ fontSize: '11px', fontWeight: getStepStatus('h2h') === 'active' ? 700 : 500, color: getStepStatus('h2h') === 'active' ? '#0082ff' : 'var(--text-muted)' }}>
                Historique H2H
              </span>
            </div>

            <div className={getStepStatus('import') === 'completed' ? 'connector-completed' : getStepStatus('import') === 'active' ? 'connector-active' : 'connector-pending'} style={{ height: '2px', flex: 1, margin: '0 -15px', marginTop: '-20px', transition: 'all 0.3s ease' }} />

            {/* Step 4 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', zIndex: 2, flex: 1 }}>
              <div className={`step-circle ${getStepStatus('import') === 'completed' ? 'step-completed' : getStepStatus('import') === 'active' ? 'step-active' : 'step-pending'}`} style={{ width: '34px', height: '34px', borderRadius: '50%', border: '2px solid', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.3s ease', background: 'var(--bg-secondary)' }}>
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
  );
}
