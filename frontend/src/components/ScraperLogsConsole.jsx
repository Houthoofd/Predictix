import React from 'react';
import { Terminal } from 'lucide-react';
import styles from './ScraperLogsConsole.module.css';

export default function ScraperLogsConsole({ scraperLogs, consoleEndRef }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px', fontFamily: 'Outfit', fontWeight: 600, color: 'var(--text-secondary)' }}>
        <Terminal size={14} />
        <span>LOGS DU SERVEUR SCRAPPER-LITE</span>
      </div>
      <div className={styles.scraperConsole}>
        {scraperLogs.map((log, idx) => (
          <div key={idx} className={`${styles.consoleLine} ${styles[log.type] || ''}`}>
            {log.message}
          </div>
        ))}
        <div className="console-cursor" ref={consoleEndRef}></div>
      </div>
    </div>
  );
}
