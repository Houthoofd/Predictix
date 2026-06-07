async function test() {
  try {
    const res = await fetch('http://localhost:5000/api/predictions/magic?minCoverage=50');
    const json = await res.json();
    console.log("=== Live API Response ===");
    console.log(`Success: ${json.success}`);
    if (json.success) {
      console.log(`Total signals: ${json.data.length}`);
      const june5Signals = json.data.filter(s => s.date && s.date.includes('05 juin 2026'));
      console.log(`June 5th signals (${june5Signals.length}):`);
      june5Signals.forEach(s => {
        console.log(`- ${s.home_team} vs ${s.away_team} (${s.strategy_name}) : Avg ${s.avg_value}`);
      });
    } else {
      console.log(json);
    }
  } catch (error) {
    console.error("Failed to fetch from live API. Is the server running? Error:", error.message);
  }
}

test();
