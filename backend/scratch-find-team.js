import fs from 'fs';

const htmlPath = 'e:/Developpement/scrapper-v3/cmd/scrapper-lite/examples/scratch-details-output.html';
if (fs.existsSync(htmlPath)) {
  const content = fs.readFileSync(htmlPath, 'utf8');
  let idx = content.indexOf('Touches in opposition box');
  if (idx !== -1) {
    console.log('FOUND AT INDEX:', idx);
    console.log(content.substring(Math.max(0, idx - 650), Math.min(content.length, idx - 200)));
  } else {
    console.log('Not found in HTML');
  }
} else {
  console.log('HTML file not found');
}
