import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { parseFrenchDate } from './src/utils/scraperHelpers.js';

const scraperPath = 'E:\\Developpement\\scrapper-v3';
const link = '/live-score/hammarby-malmo_4flmppjgbcdbyrr2f2q8k1btg.html';

console.log('Testing single match scrape...');
console.log('Link:', link);

const tmpOutFile = path.join(scraperPath, 'data', `tmp_test_${Date.now()}.json`);
const exePath = path.join(scraperPath, 'cmd', 'scrapper-lite', 'examples', 'scrapper-matchendirect.exe');

console.log('Spawning Go Scraper:', exePath);
const child = spawn(exePath, ['-tor', '-url', link, '-output', tmpOutFile]);

child.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString().trim());
});

child.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString().trim());
});

child.on('close', (code) => {
  console.log('Go scraper exited with code:', code);
  if (code === 0 && fs.existsSync(tmpOutFile)) {
    try {
      const rawData = fs.readFileSync(tmpOutFile, 'utf-8');
      console.log('\n--- Scraped Match Output ---');
      console.log(rawData);
      const parsed = JSON.parse(rawData);
      const match = (parsed.all_matches || [])[0];
      if (match) {
        console.log('\n--- French Date Parser Normalization ---');
        console.log(`Raw date: "${match.date}"`);
        console.log(`Normalized date: "${parseFrenchDate(match.date)}"`);
      }
      fs.unlinkSync(tmpOutFile);
    } catch (e) {
      console.error('Failed to parse output:', e.message);
    }
  } else {
    console.error('Failed to create output file or scraper failed.');
  }
  process.exit(code);
});
