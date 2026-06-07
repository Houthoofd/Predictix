async function check() {
  try {
    const res = await fetch('http://localhost:5000/api/predictions');
    const json = await res.json();
    console.log(`API returned success: ${json.success}`);
    if (json.success) {
      console.log(`Total predictions: ${json.data.length}`);
      const dates = {};
      json.data.forEach(p => {
        dates[p.date] = (dates[p.date] || 0) + 1;
      });
      console.log('Predictions grouped by date:');
      console.log(dates);

      // Print first 5 predictions of June 6th
      const june6 = json.data.filter(p => p.date === '06 juin 2026' || p.date === '2026-06-06');
      console.log(`\nJune 6th predictions count: ${june6.length}`);
      console.log('June 6th predictions:');
      june6.slice(0, 5).forEach(p => {
        console.log(` - ${p.home_team} vs ${p.away_team} | Date: ${p.date} | Sport: ${p.sport}`);
      });
    } else {
      console.log(json);
    }
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

check();
