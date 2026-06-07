import React, { useState, useEffect } from 'react';
import { Shield, Settings, Database, Volume2, Info, RefreshCw, Save, Check, Clock } from 'lucide-react';

export default function SettingsTab({ showToast, setShowResetBankrollModal, onSettingsChanged }) {
  const [settings, setSettings] = useState({
    keep_awake_mode: 'active_only',
    cron_integrity_repair: 'true',
    cron_db_cleanup: 'true',
    value_bet_min_edge: '5',
    default_stake_pct: '5',
    default_bookmaker: 'Unibet',
    football_corner_line: '4.5',
    realtime_notifications: 'true',
    cron_retry_interval_live: '10',
    cron_retry_interval_fail: '15',
    cron_max_retries: '5',
    cron_db_backup: 'true',
    cron_db_backup_keep_days: '7'
  });

  const [keepAwakeActive, setKeepAwakeActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);

  // Fetch settings and keep-awake status
  const fetchAllSettings = async () => {
    try {
      const resSettings = await fetch('/api/settings');
      const jsonSettings = await resSettings.json();
      if (jsonSettings.success) {
        setSettings(jsonSettings.data);
        if (onSettingsChanged) onSettingsChanged(jsonSettings.data);
      }

      const resStatus = await fetch('/api/settings/keepawake/status');
      const jsonStatus = await resStatus.json();
      if (jsonStatus.success) {
        setKeepAwakeActive(jsonStatus.data.active);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      showToast('Impossible de charger les paramètres', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSettings();

    // Poll keep-awake status every 10 seconds
    const interval = setInterval(async () => {
      try {
        const resStatus = await fetch('/api/settings/keepawake/status');
        const jsonStatus = await resStatus.json();
        if (jsonStatus.success) {
          setKeepAwakeActive(jsonStatus.data.active);
        }
      } catch (e) {}
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
        if (onSettingsChanged) onSettingsChanged(json.data);
        showToast('Paramètres enregistrés avec succès !', 'success');
        // Instantly fetch status in case keep awake mode was modified
        const resStatus = await fetch('/api/settings/keepawake/status');
        const jsonStatus = await resStatus.json();
        if (jsonStatus.success) {
          setKeepAwakeActive(jsonStatus.data.active);
        }
      } else {
        showToast('Erreur : ' + json.error.message, 'error');
      }
    } catch (err) {
      showToast('Erreur réseau lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleTooltip = (paramName) => {
    setActiveTooltip(activeTooltip === paramName ? null : paramName);
  };

  const tooltips = {
    keep_awake_mode: "Détermine quand bloquer la mise en veille Windows : 'Intelligent' active l'anti-veille uniquement pendant un scraping/réparation actif. 'Toujours actif' le bloque en permanence tant que le serveur Predictix tourne. 'Désactivé' laisse Windows gérer sa veille.",
    cron_integrity_repair: "Chaque nuit à 3h00 du matin, Predictix analysera la base de données et lancera automatiquement le batcher multi-Tor pour compléter les statistiques ou historiques manquants sur vos matchs.",
    cron_db_cleanup: "Chaque nuit à 4h00 du matin, Predictix nettoie les anciennes notifications lues (> 7 jours) et lance une commande d'optimisation SQLite 'VACUUM' pour reconstruire et accélérer la base de données.",
    value_bet_min_edge: "Le pourcentage minimal d'avantage théorique calculé par Poisson par rapport aux cotes réelles pour qu'un match soit signalé comme 'Value Bet'. (5% par défaut).",
    default_stake_pct: "Le pourcentage de votre capital total (bankroll) suggéré par défaut lors du placement d'un pari rapide (ex: 5% du capital).",
    default_bookmaker: "Le nom du bookmaker de référence utilisé pour pré-remplir les formulaires lors de la création d'un pari.",
    football_corner_line: "La ligne standard de corners en première mi-temps utilisée par le simulateur de Poisson (ex: 4.5 corners).",
    realtime_notifications: "Si désactivé, Predictix n'interrogera plus l'API de notifications toutes les 15 secondes en arrière-plan (réduit la charge CPU et réseau).",
    cron_retry_interval_live: "Temps d'attente (en minutes) entre chaque scraping d'un match en cours de jeu (live) pour détecter la fin et le score final.",
    cron_retry_interval_fail: "Temps d'attente (en minutes) avant de retenter de scraper un match dont la requête a échoué (limite Tor, proxy temporairement bloqué, etc.).",
    cron_max_retries: "Le nombre maximum de tentatives infructueuses de re-scraping effectuées pour un match donné avant d'abandonner.",
    cron_db_backup: "Chaque nuit à 3h55 (juste avant le nettoyage de 4h00), Predictix effectue une copie de sauvegarde de votre base de données dans le dossier 'backups/' à la racine du projet.",
    cron_db_backup_keep_days: "Le nombre de jours de rétention pour les sauvegardes de la base de données. Les fichiers plus anciens seront automatiquement supprimés."
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: 'var(--text-secondary)' }}>
        <RefreshCw size={28} className="animate-spin" />
        <span style={{ marginLeft: '12px', fontFamily: 'Outfit', fontWeight: 600 }}>Chargement des réglages...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', width: '100%' }}>
      
      {/* Title block */}
      <div>
        <h2 style={{ fontSize: '24px', fontFamily: 'Outfit', fontWeight: 800, margin: 0, background: 'var(--grad-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={26} style={{ color: 'var(--color-accent-solid)' }} />
          Configuration de Predictix
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', marginTop: '6px' }}>
          Ajustez les paramètres d'alimentation, les tâches automatiques de maintenance et la logique métier de l'algorithme.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Section 1: Énergie & Anti-Veille Windows */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={18} style={{ color: '#0a84ff' }} />
              Gestion d'Énergie & Anti-Veille Windows
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>Statut Système :</span>
              <span style={{ 
                background: keepAwakeActive ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                color: keepAwakeActive ? '#4ade80' : 'var(--text-muted)',
                border: `1px solid ${keepAwakeActive ? 'rgba(74, 222, 128, 0.25)' : 'var(--border-color)'}`,
                boxShadow: keepAwakeActive ? '0 0 8px rgba(74, 222, 128, 0.15)' : 'none',
                padding: '3px 8px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 800,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease'
              }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: keepAwakeActive ? '#4ade80' : '#8e8e93', display: 'inline-block' }}></span>
                {keepAwakeActive ? 'Anti-Veille Actif (PC éveillé)' : 'Veille Autorisée'}
              </span>
            </div>
          </div>

          <div className="form-group" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>Mode Anti-Veille Windows</label>
              <button type="button" onClick={() => toggleTooltip('keep_awake_mode')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
                <Info size={14} />
              </button>
            </div>
            {activeTooltip === 'keep_awake_mode' && (
              <div className="glass-card" style={{ padding: '10px 14px', background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', borderRadius: '6px' }}>
                {tooltips.keep_awake_mode}
              </div>
            )}
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              {[
                { value: 'active_only', title: 'Intelligent (Tâche Active)', desc: 'Bloque la veille uniquement pendant un scraping ou une réparation.' },
                { value: 'always', title: 'Toujours Actif', desc: 'Bloque la veille en permanence tant que Predictix est ouvert.' },
                { value: 'disabled', title: 'Désactivé', desc: 'Laisse Windows gérer la veille sans aucune restriction.' }
              ].map((opt) => (
                <label key={opt.value} style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  padding: '12px 14px', 
                  borderRadius: '10px', 
                  border: settings.keep_awake_mode === opt.value ? '1.5px solid var(--color-accent-solid)' : '1px solid var(--border-color)', 
                  background: settings.keep_awake_mode === opt.value ? 'rgba(0, 98, 255, 0.04)' : 'rgba(255,255,255,0.01)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input 
                      type="radio" 
                      name="keep_awake_mode" 
                      value={opt.value}
                      checked={settings.keep_awake_mode === opt.value}
                      onChange={(e) => setSettings({ ...settings, keep_awake_mode: e.target.value })}
                      style={{ accentColor: '#0062ff' }}
                    />
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>{opt.title}</strong>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>{opt.desc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Maintenance et soin */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, margin: '0 0 18px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={18} style={{ color: '#ff9500' }} />
            Maintenance et soin
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Auto integrity repair */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Réparation d'Intégrité Nocturne (3h00)</strong>
                  <button type="button" onClick={() => toggleTooltip('cron_integrity_repair')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_integrity_repair' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '550px' }}>
                    {tooltips.cron_integrity_repair}
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Relance automatiquement le batcher d'intégrité Tor pour réparer les données de match incomplètes.</span>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.cron_integrity_repair === 'true'} 
                  onChange={(e) => setSettings({ ...settings, cron_integrity_repair: e.target.checked ? 'true' : 'false' })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  background: settings.cron_integrity_repair === 'true' ? 'var(--color-accent-solid)' : '#2c2c2e', 
                  borderRadius: '20px', transition: '0.3s' 
                }}>
                  <span style={{ 
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: settings.cron_integrity_repair === 'true' ? '22px' : '3px', bottom: '3px', 
                    background: '#white', borderRadius: '50%', transition: '0.3s', backgroundColor: '#fff' 
                  }}></span>
                </span>
              </label>
            </div>

            {/* DB Cleanup and Vacuum */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Nettoyage & Optimisation SQLite VACUUM (4h00)</strong>
                  <button type="button" onClick={() => toggleTooltip('cron_db_cleanup')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_db_cleanup' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '550px' }}>
                    {tooltips.cron_db_cleanup}
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nettoie les notifications lues de plus de 7 jours et reconstruit l'index SQLite pour optimiser la vitesse de requêtage.</span>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.cron_db_cleanup === 'true'} 
                  onChange={(e) => setSettings({ ...settings, cron_db_cleanup: e.target.checked ? 'true' : 'false' })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  background: settings.cron_db_cleanup === 'true' ? 'var(--color-accent-solid)' : '#2c2c2e', 
                  borderRadius: '20px', transition: '0.3s' 
                }}>
                  <span style={{ 
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: settings.cron_db_cleanup === 'true' ? '22px' : '3px', bottom: '3px', 
                    background: '#white', borderRadius: '50%', transition: '0.3s', backgroundColor: '#fff' 
                  }}></span>
                </span>
              </label>
            </div>

            {/* DB Backup */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', borderBottom: settings.cron_db_backup === 'true' ? '1px solid rgba(255,255,255,0.03)' : 'none', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Sauvegarde de Base de Données Nocturne (3h55)</strong>
                  <button type="button" onClick={() => toggleTooltip('cron_db_backup')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_db_backup' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '550px' }}>
                    {tooltips.cron_db_backup}
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Crée une sauvegarde automatique de sécurité de la base de données dans le dossier 'backups/'.</span>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.cron_db_backup === 'true'} 
                  onChange={(e) => setSettings({ ...settings, cron_db_backup: e.target.checked ? 'true' : 'false' })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  background: settings.cron_db_backup === 'true' ? 'var(--color-accent-solid)' : '#2c2c2e', 
                  borderRadius: '20px', transition: '0.3s' 
                }}>
                  <span style={{ 
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: settings.cron_db_backup === 'true' ? '22px' : '3px', bottom: '3px', 
                    background: '#white', borderRadius: '50%', transition: '0.3s', backgroundColor: '#fff' 
                  }}></span>
                </span>
              </label>
            </div>

            {/* DB Backup Keep Days */}
            {settings.cron_db_backup === 'true' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', paddingBottom: '4px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Rétention des Sauvegardes (jours)</strong>
                    <button type="button" onClick={() => toggleTooltip('cron_db_backup_keep_days')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                      <Info size={13} />
                    </button>
                  </div>
                  {activeTooltip === 'cron_db_backup_keep_days' && (
                    <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '550px' }}>
                      {tooltips.cron_db_backup_keep_days}
                    </div>
                  )}
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nombre de jours de conservation des fichiers avant suppression automatique.</span>
                </div>
                <input 
                  type="number" 
                  className="form-control" 
                  min="1"
                  max="90"
                  required
                  style={{ width: '80px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '6px' }}
                  value={settings.cron_db_backup_keep_days} 
                  onChange={(e) => setSettings({ ...settings, cron_db_backup_keep_days: e.target.value })}
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Paramètres Métier Predictix */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, margin: '0 0 18px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} style={{ color: 'var(--color-accent-solid)' }} />
            Paramètres Algorithmiques Predictix
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
            {/* Value Bet Edge */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Seuil d'Edge Value Bet (%)</label>
                <button type="button" onClick={() => toggleTooltip('value_bet_min_edge')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  <Info size={13} />
                </button>
              </div>
              {activeTooltip === 'value_bet_min_edge' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {tooltips.value_bet_min_edge}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="range" 
                  min="1" 
                  max="20" 
                  className="form-control"
                  style={{ flex: 1, padding: 0 }}
                  value={settings.value_bet_min_edge} 
                  onChange={(e) => setSettings({ ...settings, value_bet_min_edge: e.target.value })}
                />
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, minWidth: '35px', color: 'var(--color-accent-solid)' }}>
                  {settings.value_bet_min_edge}%
                </span>
              </div>
            </div>

            {/* Default Stake Pct */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Mise suggérée par défaut (%)</label>
                <button type="button" onClick={() => toggleTooltip('default_stake_pct')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  <Info size={13} />
                </button>
              </div>
              {activeTooltip === 'default_stake_pct' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {tooltips.default_stake_pct}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input 
                  type="range" 
                  min="1" 
                  max="15" 
                  className="form-control"
                  style={{ flex: 1, padding: 0 }}
                  value={settings.default_stake_pct} 
                  onChange={(e) => setSettings({ ...settings, default_stake_pct: e.target.value })}
                />
                <span style={{ fontFamily: 'Outfit', fontWeight: 700, minWidth: '35px', color: 'var(--color-accent-solid)' }}>
                  {settings.default_stake_pct}%
                </span>
              </div>
            </div>

            {/* Default Bookmaker */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Bookmaker par défaut</label>
                <button type="button" onClick={() => toggleTooltip('default_bookmaker')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  <Info size={13} />
                </button>
              </div>
              {activeTooltip === 'default_bookmaker' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {tooltips.default_bookmaker}
                </div>
              )}
              <input 
                type="text" 
                className="form-control" 
                required
                value={settings.default_bookmaker} 
                onChange={(e) => setSettings({ ...settings, default_bookmaker: e.target.value })}
              />
            </div>

            {/* Football Standard Corner Line */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Ligne corners football par défaut</label>
                <button type="button" onClick={() => toggleTooltip('football_corner_line')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                  <Info size={13} />
                </button>
              </div>
              {activeTooltip === 'football_corner_line' && (
                <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  {tooltips.football_corner_line}
                </div>
              )}
              <input 
                type="number" 
                step="0.5"
                className="form-control" 
                required
                value={settings.football_corner_line} 
                onChange={(e) => setSettings({ ...settings, football_corner_line: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Réglages du Scraper & Performance */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, margin: '0 0 18px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} style={{ color: '#0082ff' }} />
            Réglages de Relance & Notifications
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Realtime notifications toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>Rafraîchissement des Notifications en Temps Réel (Polling 15s)</strong>
                  <button type="button" onClick={() => toggleTooltip('realtime_notifications')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'realtime_notifications' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '550px' }}>
                    {tooltips.realtime_notifications}
                  </div>
                )}
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Désactivez cette option pour couper les requêtes réseau arrière-plan régulières de notifications.</span>
              </div>
              <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '40px', height: '20px' }}>
                <input 
                  type="checkbox" 
                  checked={settings.realtime_notifications === 'true'} 
                  onChange={(e) => setSettings({ ...settings, realtime_notifications: e.target.checked ? 'true' : 'false' })}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{ 
                  position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
                  background: settings.realtime_notifications === 'true' ? 'var(--color-accent-solid)' : '#2c2c2e', 
                  borderRadius: '20px', transition: '0.3s' 
                }}>
                  <span style={{ 
                    position: 'absolute', content: '""', height: '14px', width: '14px', left: settings.realtime_notifications === 'true' ? '22px' : '3px', bottom: '3px', 
                    background: '#white', borderRadius: '50%', transition: '0.3s', backgroundColor: '#fff' 
                  }}></span>
                </span>
              </label>
            </div>

            {/* Retry delays and limits inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Intervalle de retry en Live (min)</label>
                  <button type="button" onClick={() => toggleTooltip('cron_retry_interval_live')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_retry_interval_live' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {tooltips.cron_retry_interval_live}
                  </div>
                )}
                <input 
                  type="number" 
                  className="form-control" 
                  min="2"
                  max="60"
                  required
                  value={settings.cron_retry_interval_live} 
                  onChange={(e) => setSettings({ ...settings, cron_retry_interval_live: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Délai de retry après Échec (min)</label>
                  <button type="button" onClick={() => toggleTooltip('cron_retry_interval_fail')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_retry_interval_fail' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {tooltips.cron_retry_interval_fail}
                  </div>
                )}
                <input 
                  type="number" 
                  className="form-control" 
                  min="2"
                  max="60"
                  required
                  value={settings.cron_retry_interval_fail} 
                  onChange={(e) => setSettings({ ...settings, cron_retry_interval_fail: e.target.value })}
                />
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Nombre maximal d'essais (Crons)</label>
                  <button type="button" onClick={() => toggleTooltip('cron_max_retries')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', color: 'var(--text-muted)' }}>
                    <Info size={13} />
                  </button>
                </div>
                {activeTooltip === 'cron_max_retries' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid var(--border-color)', padding: '8px 12px', borderRadius: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {tooltips.cron_max_retries}
                  </div>
                )}
                <input 
                  type="number" 
                  className="form-control" 
                  min="1"
                  max="20"
                  required
                  value={settings.cron_max_retries} 
                  onChange={(e) => setSettings({ ...settings, cron_max_retries: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5: Gestion Bankroll */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 700, margin: '0 0 14px 0', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={18} style={{ color: 'var(--color-danger)' }} />
            Capital & Bankroll
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
              Souhaitez-vous réinitialiser votre capital de départ ou effacer l'historique des paris enregistrés pour recommencer à zéro ?
            </span>
            <button 
              type="button" 
              className="btn btn-danger"
              style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'Outfit', padding: '8px 16px' }}
              onClick={() => setShowResetBankrollModal(true)}
            >
              Réinitialiser le Capital de Départ
            </button>
          </div>
        </div>

        {/* Form Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '10px 24px', 
              fontSize: '14px', 
              fontWeight: 700, 
              fontFamily: 'Outfit',
              background: 'var(--grad-accent)',
              border: 'none',
              boxShadow: '0 4px 15px rgba(0, 98, 255, 0.2)'
            }}
            disabled={saving}
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>{saving ? 'Enregistrement...' : 'Enregistrer toutes les modifications'}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
