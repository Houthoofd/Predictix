import { scrapeSingleMatch } from '../src/utils/scraperHelpers.js';
import { parseFrenchDate } from '../src/utils/dateParser.js';

async function testSingle() {
  const scraperPath = 'E:\\Developpement\\scrapper-v3';
  const matchId = '/match/x4oCT0Xa/#/match-summary';
  
  console.log(`Scraping details for match ID: ${matchId}...`);
  try {
    const details = await scrapeSingleMatch(scraperPath, matchId, false, null, 9050, 'flashscore', 'basketball');
    console.log("Details returned from crawler:");
    console.log(JSON.stringify(details, null, 2));
    
    if (details) {
      const matchDateRaw = details.date || '';
      const matchDateNormalized = parseFrenchDate(matchDateRaw) || matchDateRaw;
      const expectedIsoDate = new Date().toISOString().substring(0, 10);
      console.log(`\nDate checks:`);
      console.log(`- Raw Date: "${matchDateRaw}"`);
      console.log(`- Normalized Date: "${matchDateNormalized}"`);
      console.log(`- Expected ISO Date: "${expectedIsoDate}"`);
      console.log(`- Match Date Substring: "${matchDateNormalized.substring(0, 10)}"`);
      console.log(`- Date Match: ${matchDateNormalized.substring(0, 10) === expectedIsoDate}`);
      
      const hasStats = details.statistics && Object.keys(details.statistics).some(k => k !== 'stats_source' && details.statistics[k] !== null && details.statistics[k] !== undefined);
      console.log(`- Has Statistics: ${hasStats}`);
    } else {
      console.log("Scraping returned null.");
    }
  } catch (err) {
    console.error("Scrape failed:", err);
  }
  process.exit(0);
}

setTimeout(testSingle, 1000);
