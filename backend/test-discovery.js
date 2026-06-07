import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function testDiscovery() {
  console.log('Testing discovery mode on-demand...');
  const scraperPath = 'E:\\Developpement\\scrapper-v3';
  const scriptName = 'scrape-matchendirect.bat';
  const outputDirs = [
    path.join(scraperPath, 'data', 'matchendirect'),
    path.join(scraperPath, 'data')
  ];
  
  console.log(`Spawning batch script in ${scraperPath}...`);
  const child = spawn('cmd.exe', ['/c', scriptName, 'verbose', '0', 'discover'], {
    cwd: scraperPath,
    env: { ...process.env, FORCE_COLOR: '1' }
  });
  
  let stdout = '';
  let stderr = '';
  
  child.stdout.on('data', (d) => stdout += d.toString());
  child.stderr.on('data', (d) => stderr += d.toString());
  
  child.on('close', (code) => {
    console.log(`Process closed with code: ${code}`);
    console.log(`\n--- Stdout --- \n${stdout}`);
    console.log(`\n--- Stderr --- \n${stderr}`);
    
    // Check if output file was generated
    let allFiles = [];
    for (const dir of outputDirs) {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir)
          .filter(file => file.endsWith('.json'))
          .map(file => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            return { path: filePath, mtime: stat.mtime };
          });
        allFiles = allFiles.concat(files);
      }
    }
    allFiles.sort((a, b) => b.mtime - a.mtime);
    
    if (allFiles.length > 0) {
      const newestFile = allFiles[0].path;
      console.log(`Newest scraped JSON file found: ${newestFile}`);
      try {
        const rawData = fs.readFileSync(newestFile, 'utf-8');
        const parsed = JSON.parse(rawData);
        const matches = parsed.all_matches || parsed.matches || [];
        console.log(`Successfully parsed discovery file! Found ${matches.length} matches.`);
        if (matches.length > 0) {
          console.log('First match:', JSON.stringify(matches[0], null, 2));
        }
      } catch (e) {
        console.error('Failed to parse discovery file:', e.message);
      }
    } else {
      console.error('No JSON output file found!');
    }
  });
}

testDiscovery();
