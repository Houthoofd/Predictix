import React from 'react';
import { Calendar } from 'lucide-react';

export default function MatchCardTeams({ sig }) {
  return (
    <div>
      <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sig.home_logo ? (
          <img src={sig.home_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
        )}
        <span>{sig.home_team}</span>
      </h4>
      <h4 style={{ fontSize: '16px', fontFamily: 'Outfit', lineHeight: 1.3, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {sig.away_logo ? (
          <img src={sig.away_logo} alt="" referrerPolicy="no-referrer" style={{ width: '20px', height: '20px', borderRadius: '50%', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)' }} />
        )}
        <span>{sig.away_team}</span>
      </h4>

      <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={12} style={{ opacity: 0.6 }} />
          {sig.date}
        </span>
        <span>•</span>
        <span>{sig.time}</span>
      </div>
    </div>
  );
}
