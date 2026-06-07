async function main() {
  console.log('Fetching predictions from active backend...');
  try {
    const res = await fetch('http://127.0.0.1:5000/api/predictions');
    const json = await res.json();
    if (!json.success || !json.data || json.data.length === 0) {
      console.log('No predictions found in the API response!');
      return;
    }
    
    // Find the first match that has some historical H2H matches
    const matchWithH2H = json.data.find(m => m.recent_h2h_matches && m.recent_h2h_matches.length > 0);
    if (!matchWithH2H) {
      console.log('No match found with historical H2H data in API response!');
      return;
    }
    
    console.log(`\nFound Match: ${matchWithH2H.home_team} vs ${matchWithH2H.away_team}`);
    console.log(`Number of H2H matches: ${matchWithH2H.recent_h2h_matches.length}`);
    
    const firstH2H = matchWithH2H.recent_h2h_matches[0];
    console.log('\nFirst H2H Match properties:');
    console.log(Object.keys(firstH2H));
    
    console.log('\nstatistics_json value:');
    console.log(firstH2H.statistics_json ? JSON.stringify(firstH2H.statistics_json).substring(0, 150) + '...' : 'UNDEFINED / NULL');
  } catch (err) {
    console.error('Error fetching API:', err.message);
  }
}

main();
