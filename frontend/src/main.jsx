import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Patch global fetch to automatically append cache-buster and map prediction keys
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  const isGet = !init || !init.method || init.method.toUpperCase() === 'GET';
  if (isGet && typeof input === 'string' && input.includes('/api/') && !input.includes('t=')) {
    const separator = input.includes('?') ? '&' : '?';
    input = `${input}${separator}t=${Date.now()}`;
  }
  
  return originalFetch(input, init).then(async (response) => {
    if (typeof input === 'string' && (input.includes('/api/predictions') || input.includes('/api/predictions/magic'))) {
      const clone = response.clone();
      try {
        const json = await clone.json();
        if (json && json.success && Array.isArray(json.data)) {
          json.data = json.data.map(pred => {
            const result = { ...pred };
            if (pred.home_matches && !pred.recent_home_matches) {
              result.recent_home_matches = pred.home_matches;
            }
            if (pred.away_matches && !pred.recent_away_matches) {
              result.recent_away_matches = pred.away_matches;
            }
            if (pred.h2h_matches && !pred.recent_h2h_matches) {
              result.recent_h2h_matches = pred.h2h_matches;
            }
            return result;
          });
          return new Response(JSON.stringify(json), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers
          });
        }
      } catch (e) {
        // Fallback to original response on parsing error
      }
    }
    return response;
  });
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
