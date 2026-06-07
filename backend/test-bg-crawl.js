import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('predictix.db');

const dbQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

async function scrapeSingleMatch(scraperPath, link) {
  return new Promise((resolve) => {
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_bgtest_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    console.log(`[Test bg-crawl] Spawning Go: ${exePath} with url: ${link}`);
    const child = spawn(exePath, ['-tor', '-url', link, '-output', tmpOutFile]);
    
    let stderr = '';
    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    child.on('close', async (code) => {
      console.log(`[Test bg-crawl] Go exited with code: ${code}`);
      if (code === 0 && fs.existsSync(tmpOutFile)) {
        try {
          const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
          const parsed = JSON.parse(rawData);
          const matchData = (parsed.all_matches || parsed.matches || [])[0];
          
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(matchData || null);
        } catch (e) {
          console.error('[Test bg-crawl] Failed to parse JSON:', e.message);
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(null);
        }
      } else {
        console.error('[Test bg-crawl] Scraper failed. Stderr:', stderr);
        if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
        resolve(null);
      }
    });
  });
}

async function run() {
  const scraperPath = 'E:\\Developpement\\scrapper-v3';
  const newestFile = 'E:\\Developpement\\scrapper-v3\\data\\matchendirect\\matchendirect_20260530_2312.json';
  
  console.log('Loading matches from newest JSON file:', newestFile);
  const rawData = fs.readFileSync(newestFile, 'utf-8');
  const parsed = JSON.parse(rawData);
  const matches = parsed.all_matches || parsed.matches || [];
  
  // Pick the first match that has historical links
  const targetMatch = matches.find(m => m.historical_links && m.historical_links.length > 0);
  if (!targetMatch) {
    console.error('No match with historical links found.');
    db.close();
    process.exit(1);
  }

  console.log(`\nFound target match: ${targetMatch.home_team} vs ${targetMatch.away_team}`);
  console.log(`Has ${targetMatch.historical_links.length} historical links.`);

  const uncachedLinks = [];
  for (const link of targetMatch.historical_links) {
    const cached = await dbQuery('SELECT match_id FROM scraped_predictions WHERE match_id = ?', [link]);
    if (cached.length === 0) {
      uncachedLinks.push(link);
    }
  }

  console.log(`${targetMatch.historical_links.length - uncachedLinks.length} cached, ${uncachedLinks.length} new to crawl.`);
  
  if (uncachedLinks.length === 0) {
    console.log('All links are already cached! Exiting.');
    db.close();
    process.exit(0);
  }

  const linkToScrape = uncachedLinks[0];
  console.log(`\nCrawling first link: ${linkToScrape}`);
  
  const histMatch = await scrapeSingleMatch(scraperPath, linkToScrape);
  if (histMatch && histMatch.home_team && histMatch.away_team) {
    console.log('Successfully scraped historical match:', histMatch.home_team, 'vs', histMatch.away_team);
    console.log('Score:', histMatch.score, 'Corners 1MT:', histMatch.first_half_corners_home, '-', histMatch.first_half_corners_away);
    
    const sqlHist = `
      INSERT OR REPLACE INTO scraped_predictions (
        match_id, time, date, tournament, home_team, away_team, score,
        over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
        is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
        home_logo, away_logo, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const hashSeed = histMatch.home_team + histMatch.away_team;
    let charSum = 0;
    for (let i = 0; i < hashSeed.length; i++) charSum += hashSeed.charCodeAt(i);
    const stableProb = 55 + (charSum % 25);
    const cardLine = histMatch.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
    const bestTip = histMatch.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

    await dbRun(sqlHist, [
      linkToScrape,
      'Finished',
      histMatch.date || new Date().toISOString().substring(0, 10),
      histMatch.tournament || 'Football',
      histMatch.home_team,
      histMatch.away_team,
      histMatch.score || '',
      '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
      0, 1,
      histMatch.first_half_corners_home,
      histMatch.first_half_corners_away,
      null,
      histMatch.home_logo || null,
      histMatch.away_logo || null
    ]);
    
    console.log('Successfully inserted historical match into database!');
  } else {
    console.error('Failed to scrape historical match details.');
  }

  db.close();
}

run().catch(e => {
  console.error('Run error:', e);
  if (db) db.close();
});
