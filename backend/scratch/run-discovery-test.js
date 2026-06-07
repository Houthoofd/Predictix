import { runDiscoveryProcess } from '../src/utils/scraperHelpers.js';

async function testDiscovery() {
  const scraperPath = 'E:\\Developpement\\scrapper-v3';
  const scriptName = 'scrape-matchendirect.bat';
  const outputDirs = [
    'E:\\Developpement\\scrapper-v3\\data\\flashscore',
    'E:\\Developpement\\scrapper-v3\\data\\matchendirect',
    'E:\\Developpement\\scrapper-v3\\data\\ratingbet',
    'E:\\Developpement\\scrapper-v3\\data'
  ];
  
  // Test discovery for today: 2026-06-07
  const targetDate = '07-06-2026'; // format DD-MM-YYYY as expected by the Go scraper
  
  console.log(`Running Go crawler discovery test for sport: basketball, date: ${targetDate}...`);
  try {
    const matches = await runDiscoveryProcess(scraperPath, scriptName, outputDirs, targetDate, null, 'flashscore', 'basketball');
    console.log(`Discovered ${matches.length} basketball matches:`);
    
    let found = false;
    for (const m of matches) {
      const isToronto = m.home_team.includes('Toronto') || m.away_team.includes('Toronto');
      const isChicago = m.home_team.includes('Chicago') || m.away_team.includes('Chicago');
      const isSky = m.home_team.includes('Sky') || m.away_team.includes('Sky');
      const isTempo = m.home_team.includes('Tempo') || m.away_team.includes('Tempo');
      
      if (isToronto || isChicago || isSky || isTempo) {
        console.log(`[FOUND MATCH] -> ID: ${m.match_id} | ${m.time} | ${m.tournament} | ${m.home_team} vs ${m.away_team} | URL: ${m.href || m.match_url}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log("No Toronto/Chicago matches found in discovery results.");
    }
  } catch (err) {
    console.error("Discovery failed:", err);
  }
  process.exit(0);
}

setTimeout(testDiscovery, 1000);
