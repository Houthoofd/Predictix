import React, { useState, useEffect } from 'react';
import { GitMerge, RefreshCw, Check, AlertCircle } from 'lucide-react';

export default function TeamSynonymMerger({ onRefreshPredictions }) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mergingPair, setMergingPair] = useState(null); // the pair being merged
  const [mergeTarget, setMergeTarget] = useState(''); // the team name to KEEP
  const [mergeStatus, setMergeStatus] = useState({ loading: false, success: null, error: null });

  const fetchDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/integrity/team-duplicates');
      const data = await res.json();
      if (data.success) {
        setDuplicates(data.data);
      } else {
        setError(data.error?.message || 'Erreur lors de la récupération.');
      }
    } catch (err) {
      setError('Impossible de se connecter au serveur.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  const handleOpenMerge = (pair) => {
    setMergingPair(pair);
    // Default to keeping the team with the higher match count
    if (pair.teamACount >= pair.teamBCount) {
      setMergeTarget(pair.teamA);
    } else {
      setMergeTarget(pair.teamB);
    }
    setMergeStatus({ loading: false, success: null, error: null });
  };

  const handleCloseMerge = () => {
    setMergingPair(null);
  };

  const handleConfirmMerge = async () => {
    if (!mergingPair || !mergeTarget) return;
    const sourceTeam = mergeTarget === mergingPair.teamA ? mergingPair.teamB : mergingPair.teamA;
    const targetTeam = mergeTarget;

    setMergeStatus({ loading: true, success: null, error: null });
    try {
      const res = await fetch('/api/integrity/merge-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceTeam, targetTeam })
      });
      const data = await res.json();
      if (data.success) {
        setMergeStatus({ loading: false, success: data.message, error: null });
        // Refresh duplicates after 1.5 seconds
        setTimeout(() => {
          setMergingPair(null);
          fetchDuplicates();
          if (onRefreshPredictions) onRefreshPredictions();
        }, 1500);
      } else {
        setMergeStatus({ loading: false, success: null, error: data.error?.message || 'Erreur de fusion.' });
      }
    } catch (err) {
      setMergeStatus({ loading: false, success: null, error: 'Impossible de joindre le serveur.' });
    }
  };

  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <GitMerge size={20} style={{ color: 'var(--color-accent-solid)' }} />
          <div>
            <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', margin: 0 }}>Résolveur de Doublons & Synonymes</h3>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
              Fusionnez les variantes orthographiques d'une même équipe pour consolider les historiques de confrontation.
            </p>
          </div>
        </div>
        <button
          className="btn btn-secondary"
          onClick={fetchDuplicates}
          disabled={loading}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'Outfit'
          }}
        >
          <RefreshCw size={13} className={loading ? 'spin-anim' : ''} />
          <span>Scanner</span>
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 15px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', fontSize: '12px' }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', height: '100px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={20} className="spin-anim" style={{ marginRight: '8px' }} />
          <span style={{ fontSize: '13px' }}>Recherche des synonymes dans la base de données...</span>
        </div>
      ) : duplicates.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', maxHeight: '320px', overflowY: 'auto', paddingRight: '5px' }}>
          {duplicates.map((pair, idx) => (
            <div
              key={idx}
              className="glass-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                transition: 'transform 0.2s, background-color 0.2s',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{pair.teamA}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pair.teamACount} match{pair.teamACount > 1 ? 's' : ''}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px 8px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.05)', fontSize: '10px', color: 'var(--text-secondary)' }}>
                    <span>{(pair.similarity * 100).toFixed(0)}% sim.</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{pair.teamB}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{pair.teamBCount} match{pair.teamBCount > 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                onClick={() => handleOpenMerge(pair)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '6px',
                  fontFamily: 'Outfit',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <GitMerge size={12} />
                <span>Fusionner</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', color: 'var(--text-muted)', gap: '8px' }}>
          <Check size={24} style={{ color: 'var(--color-success)' }} />
          <span style={{ fontSize: '13px' }}>Aucun doublon suspecté n'a été détecté dans la base de données.</span>
        </div>
      )}

      {/* Merge Modal / Popover */}
      {mergingPair && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
        >
          <div
            className="glass-card"
            style={{
              width: '90%',
              maxWidth: '480px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitMerge size={22} style={{ color: 'var(--color-accent-solid)' }} />
              <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', margin: 0 }}>Fusionner des synonymes</h4>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
              Vous allez fusionner tous les enregistrements de match et paris contenant ces deux noms. Veuillez choisir l'orthographe principale à conserver :
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: mergeTarget === mergingPair.teamA ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  border: `1px solid ${mergeTarget === mergingPair.teamA ? 'var(--color-accent-solid)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMergeTarget(mergingPair.teamA)}
              >
                <input
                  type="radio"
                  name="mergeTarget"
                  checked={mergeTarget === mergingPair.teamA}
                  onChange={() => setMergeTarget(mergingPair.teamA)}
                  style={{ accentColor: 'var(--color-accent-solid)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Conserver "{mergingPair.teamA}"</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rebaptisera "{mergingPair.teamB}" ({mergingPair.teamBCount} matches affectés)</span>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px',
                  borderRadius: '6px',
                  background: mergeTarget === mergingPair.teamB ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                  border: `1px solid ${mergeTarget === mergingPair.teamB ? 'var(--color-accent-solid)' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => setMergeTarget(mergingPair.teamB)}
              >
                <input
                  type="radio"
                  name="mergeTarget"
                  checked={mergeTarget === mergingPair.teamB}
                  onChange={() => setMergeTarget(mergingPair.teamB)}
                  style={{ accentColor: 'var(--color-accent-solid)' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Conserver "{mergingPair.teamB}"</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Rebaptisera "{mergingPair.teamA}" ({mergingPair.teamACount} matches affectés)</span>
                </div>
              </label>
            </div>

            {mergeStatus.error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', fontSize: '11px' }}>
                <AlertCircle size={14} />
                <span>{mergeStatus.error}</span>
              </div>
            )}

            {mergeStatus.success && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontSize: '11px' }}>
                <Check size={14} />
                <span>{mergeStatus.success}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '5px' }}>
              <button
                className="btn btn-secondary"
                onClick={handleCloseMerge}
                disabled={mergeStatus.loading}
                style={{ padding: '8px 16px', fontSize: '12px', fontFamily: 'Outfit' }}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmMerge}
                disabled={mergeStatus.loading || !!mergeStatus.success}
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontFamily: 'Outfit',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {mergeStatus.loading ? (
                  <>
                    <RefreshCw size={13} className="spin-anim" />
                    <span>Fusion en cours...</span>
                  </>
                ) : (
                  <>
                    <GitMerge size={13} />
                    <span>Confirmer la fusion</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
