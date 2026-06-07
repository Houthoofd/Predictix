import React from 'react';
import { 
  Sparkles, 
  Trash2, 
  RefreshCcw, 
  Pause, 
  Play, 
  Square, 
  Plus 
} from 'lucide-react';

export default function IntegrityBatcherControls({
  batcherStatus,
  batcherLoading,
  cleaning,
  injecting,
  injectedUrl,
  setInjectedUrl,
  handleStartBatcher,
  handlePauseBatcher,
  handleStopBatcher,
  handleCleanupDatabase,
  handleInjectUrl
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Sparkles size={20} style={{ color: '#0082ff' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, margin: 0 }}>Cockpit de Réparation Automatique</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Recherche et répare tous les diagnostics incomplets (historique, stats de corners, logos manquants).
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            className="btn"
            onClick={handleCleanupDatabase}
            disabled={cleaning}
            style={{
              fontSize: '12.5px',
              fontWeight: 700,
              fontFamily: 'Outfit',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 59, 48, 0.08)',
              border: '1px solid rgba(255, 59, 48, 0.2)',
              borderRadius: '6px',
              padding: '8px 14px',
              cursor: 'pointer',
              color: '#ff3b30',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)'}
          >
            <Trash2 size={14} className={cleaning ? 'animate-spin' : ''} />
            <span>{cleaning ? 'Nettoyage...' : 'Nettoyer la base'}</span>
          </button>

          {batcherStatus === 'idle' ? (
            <button 
              className="btn btn-primary"
              style={{ 
                background: 'linear-gradient(135deg, #0082ff 0%, #bf5af2 100%)', 
                border: 'none', 
                fontFamily: 'Outfit', 
                fontWeight: 700, 
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '6px',
                color: '#fff'
              }}
              onClick={handleStartBatcher}
              disabled={batcherLoading}
            >
              <RefreshCcw size={14} className={batcherLoading ? 'animate-spin' : ''} />
              <span>Lancer la Réparation Globale</span>
            </button>
          ) : batcherStatus === 'running' ? (
            <>
              <button 
                className="btn btn-warning"
                style={{ 
                  background: '#ff9500', 
                  border: 'none', 
                  fontFamily: 'Outfit', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: '#fff'
                }}
                onClick={handlePauseBatcher}
              >
                <Pause size={14} />
                <span>Pause</span>
              </button>
              <button 
                className="btn btn-danger"
                style={{ 
                  background: '#ff3b30', 
                  border: 'none', 
                  fontFamily: 'Outfit', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: '#fff'
                }}
                onClick={handleStopBatcher}
              >
                <Square size={14} />
                <span>Arrêter</span>
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-primary"
                style={{ 
                  background: '#2ecc71', 
                  border: 'none', 
                  fontFamily: 'Outfit', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: '#fff'
                }}
                onClick={handleStartBatcher}
              >
                <Play size={14} />
                <span>Reprendre</span>
              </button>
              <button 
                className="btn btn-danger"
                style={{ 
                  background: '#ff3b30', 
                  border: 'none', 
                  fontFamily: 'Outfit', 
                  fontWeight: 700, 
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  color: '#fff'
                }}
                onClick={handleStopBatcher}
              >
                <Square size={14} />
                <span>Arrêter</span>
              </button>
            </>
          )}
        </div>
      </div>

      <form onSubmit={handleInjectUrl} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Injecteur de Match sur Demande</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text"
            placeholder="Coller l'URL MatchDirect (ex: /live-score/psg-brest.html)"
            value={injectedUrl}
            onChange={(e) => setInjectedUrl(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '12.5px',
              color: '#fff',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={injecting}
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 14px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Plus size={14} />
            <span>{injecting ? '...' : 'Injecter'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
