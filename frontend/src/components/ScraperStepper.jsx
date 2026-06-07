import React from 'react';
import { CheckCircle, Search, FileText, Layers, Database, RefreshCcw } from 'lucide-react';

export default function ScraperStepper({
  scrapePhase,
  scrapeProgress,
  scrapeTimeRemaining,
  matchesRemaining,
  currentPrimary,
  totalPrimary,
  currentDeep,
  totalDeep,
  scrapeLimit,
  setScrapeLimit,
  handleStartDetailedScraping
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
  );
}
