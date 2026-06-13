import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Layers, 
  Wrench, 
  Database, 
  Trash2, 
  Clock 
} from 'lucide-react';

export default function IntegrityTasksStatus({ settings, onUpdateSetting }) {
  if (!settings) return null;

  const guards = [
    {
      key: 'import_guard_strict',
      title: "Validation Strict à l'Import",
      desc: "Vérifie les statistiques clés dès l'importation de matchs finis et rejette/flag les données incomplètes.",
      icon: <ShieldCheck size={18} style={{ color: '#0082ff' }} />,
      isActive: settings.import_guard_strict === 'true'
    },
    {
      key: 'realtime_self_healing',
      title: "Auto-Réparation Immédiate",
      desc: "Déclenche automatiquement un re-scraping via Tor en arrière-plan dès qu'un problème d'intégrité est détecté.",
      icon: <Cpu size={18} style={{ color: '#bf5af2' }} />,
      isActive: settings.realtime_self_healing === 'true'
    },
    {
      key: 'score_date_sanity_check',
      title: "Linter de Cohérence des Scores",
      desc: "Détecte les scores absurdes (somme des mi-temps incohérente, etc.) et les signale pour correction.",
      icon: <Layers size={18} style={{ color: '#30d158' }} />,
      isActive: settings.score_date_sanity_check === 'true'
    }
  ];

  const nightlies = [
    {
      key: 'cron_integrity_repair',
      title: "Réparation Globale Nocturne (03h00)",
      desc: "Scan complet de la base de données et re-scraping des confrontations incomplètes ou manquantes.",
      icon: <Wrench size={18} style={{ color: '#ff9500' }} />,
      isActive: settings.cron_integrity_repair === 'true'
    },
    {
      key: 'cron_db_backup',
      title: "Sauvegarde de Secours (03h55)",
      desc: "Copie de sauvegarde quotidienne de la base de données SQLite predictix.db vers le dossier backups/.",
      icon: <Database size={18} style={{ color: '#ff375f' }} />,
      isActive: settings.cron_db_backup === 'true'
    },
    {
      key: 'cron_db_cleanup',
      title: "Nettoyage & Optimisation (04h00)",
      desc: "Archivage des vieilles alertes et reconstruction physique de la base de données (SQLite VACUUM).",
      icon: <Trash2 size={18} style={{ color: '#ff3b30' }} />,
      isActive: settings.cron_db_cleanup === 'true'
    }
  ];

  const handleToggle = (key, currentVal) => {
    const newVal = currentVal ? 'false' : 'true';
    onUpdateSetting(key, newVal);
  };

  const renderTaskRow = (task) => {
    return (
      <div 
        key={task.key}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 16px',
          transition: 'all 0.2s ease',
          gap: '15px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            padding: '8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: '2px'
          }}>
            {task.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
                {task.title}
              </span>
              <span style={{
                fontSize: '9.5px',
                background: task.isActive ? 'rgba(46, 204, 113, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                color: task.isActive ? '#2ecc71' : 'var(--text-muted)',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {task.isActive ? 'Actif' : 'Désactivé'}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
              {task.desc}
            </p>
          </div>
        </div>

        {/* Switch Toggle */}
        <div 
          onClick={() => handleToggle(task.key, task.isActive)}
          style={{
            position: 'relative',
            width: '38px',
            height: '22px',
            backgroundColor: task.isActive ? '#30d158' : 'rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '3px',
            left: task.isActive ? '19px' : '3px',
            width: '16px',
            height: '16px',
            backgroundColor: '#fff',
            borderRadius: '50%',
            transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
          }} />
        </div>
      </div>
    );
  };

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'Outfit', fontWeight: 800, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Clock size={18} style={{ color: '#0082ff' }} />
        Statut des Gardiens d'Intégrité & Tâches Planifiées
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Real-time Guards column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
            Contrôle & Gardiens en Temps Réel
          </h4>
          {guards.map(renderTaskRow)}
        </div>

        {/* Nightly Maintainers column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px 0' }}>
            Maintenance Nocturne Automatique
          </h4>
          {nightlies.map(renderTaskRow)}
        </div>
      </div>
    </div>
  );
}
