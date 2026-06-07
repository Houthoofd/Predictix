import fs from 'fs';

async function test() {
  console.log('Testing on-demand crawl history API endpoint...');
  const matchId = '4939422'; // PSG vs Arsenal
  const url = `http://127.0.0.1:5000/api/predictions/${matchId}/crawl-history`;
  
  console.log(`Sending POST request to: ${url}`);
  try {
    const res = await fetch(url, { method: 'POST' });
    const json = await res.json();
    console.log('\n--- API Response ---');
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('Fetch error:', err.message);
    console.log('\nMake sure the backend server is running! You can start it using: run-predictix.bat');
  }
}

test();
