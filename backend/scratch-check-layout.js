import fs from 'fs';

const htmlPath = 'e:/Developpement/scrapper-v3/cmd/scrapper-lite/examples/scratch-details-output.html';
if (fs.existsSync(htmlPath)) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  let idx = 52497;
  console.log(content.substring(idx - 1200, idx).replace(/\n/g, ' '));
} else {
  console.log('HTML file not found');
}
