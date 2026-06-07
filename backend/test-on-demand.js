import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import sqlite3 from 'sqlite3';

const dbPath = 'predictix.db';
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
});

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
    const tmpOutFile = path.join(scraperPath, 'data', `tmp_ondemandtest_${Date.now()}_${Math.random().toString(36).substring(7)}.json`);
    const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');
    
    console.log(`[Test On-Demand] Spawning Go scraper: ${exePath}`);
    console.log(`[Test On-Demand] Link: ${link}`);
    console.log(`[Test On-Demand] Tmp output file: ${tmpOutFile}`);
    
    const args = ['-tor', '-url', link, '-output', tmpOutFile, '-skip-odds'];
    const child = spawn(exePath, args);
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (d) => stdout += d.toString());
    child.stderr.on('data', (d) => stderr += d.toString());
    
    child.on('close', (code) => {
      console.log(`[Test On-Demand] Go scraper exited with code: ${code}`);
      console.log(`[Test On-Demand] Stdout:\n${stdout}`);
      console.log(`[Test On-Demand] Stderr:\n${stderr}`);
      
      if (code === 0 && fs.existsSync(tmpOutFile)) {
        try {
          const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
          const parsed = JSON.parse(rawData);
          const matchData = (parsed.all_matches || parsed.matches || [])[0];
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(matchData || null);
        } catch (e) {
          console.error('[Test On-Demand] JSON parse error:', e.message);
          if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
          resolve(null);
        }
      } else {
        if (fs.existsSync(tmpOutFile)) fs.unlinkSync(tmpOutFile);
        resolve(null);
      }
    });
  });
}

async function run() {
  console.log('Querying database for a match with historical links...');
  const rows = await dbQuery('SELECT * FROM scraped_predictions WHERE historical_links IS NOT NULL AND length(historical_links) > 2 LIMIT 1');
  
  if (rows.length === 0) {
    console.error('No match found with historical links in SQLite database.');
    db.close();
    return;
  }
  
  const match = rows[0];
  console.log(`Target Match: ${match.home_team} vs ${match.away_team} (ID: ${match.match_id})`);
  
  let links = [];
  try {
    links = JSON.parse(match.historical_links);
  } catch (e) {
    console.error('Failed to parse historical links:', e.message);
    db.close();
    return;
  }
  
  console.log(`Found ${links.length} historical links.`);
  if (links.length === 0) {
    console.error('Historical links array is empty.');
    db.close();
    return;
  }
  
  const scraperPath = 'E:\\Developpement\\scrapper-v3';
  const targetLink = links[0];
  
  console.log(`Starting crawl test for link: ${targetLink}`);
  const result = await scrapeSingleMatch(scraperPath, targetLink);
  
  if (result) {
    console.log('\n--- Scrape Success! ---');
    console.log('Home:', result.home_team);
    console.log('Away:', result.away_team);
    console.log('Score:', result.score);
    console.log('Date:', result.date);
    console.log('Corners 1MT:', result.first_half_corners_home, '-', result.first_half_corners_away);

    const homeClean = result.home_team.replace(/[▲▼]/g, '').trim();
    const awayClean = result.away_team.replace(/[▲▼]/g, '').trim();

    const sqlHist = `
      INSERT OR REPLACE INTO scraped_predictions (
        match_id, time, date, tournament, home_team, away_team, score,
        over_odds, under_odds, card_line, probability, best_tip, win_rate, status,
        is_live, is_finished, first_half_corners_home, first_half_corners_away, odds_corners,
        home_logo, away_logo, scraped_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    const hashSeed = homeClean + awayClean;
    let charSum = 0;
    for (let i = 0; i < hashSeed.length; i++) charSum += hashSeed.charCodeAt(i);
    const stableProb = 55 + (charSum % 25);
    const cardLine = result.card_line || (charSum % 2 === 0 ? '4.5' : '5.5');
    const bestTip = result.best_tip || (stableProb >= 66 ? 'Plus de' : 'Moins de');

    console.log('Inserting into database...');
    try {
      await dbRun(sqlHist, [
        targetLink,
        'Finished',
        result.date || new Date().toISOString().substring(0, 10),
        result.tournament || 'Football',
        homeClean,
        awayClean,
        result.score || '',
        '1.85', '1.90', cardLine, `${stableProb}%`, bestTip, '60%', 'Finished',
        0, 1,
        result.first_half_corners_home,
        result.first_half_corners_away,
        null,
        result.home_logo || null,
        result.away_logo || null
      ]);
      console.log('Database insertion successful!');
    } catch (e) {
      console.error('Database insertion failed:', e.message);
    }
  } else {
    console.error('\n--- Scrape Failed ---');
  }
  
  db.close();
}

run().catch(err => {
  console.error('Test script crash:', err);
  db.close();
});
