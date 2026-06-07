import React from 'react';
import { Terminal } from 'lucide-react';

export default function ScraperLogsConsole({ scraperLogs, consoleEndRef }) {
  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
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
  );
}
