const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') {
      continue;
    }
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else {
      if (name.endsWith('.js') || name.endsWith('.jsx')) {
        files.push(name);
      }
    }
  }
  return files;
}

const allFiles = getFiles('.');
const largeFiles = [];

for (const file of allFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  if (lines > 300) {
    largeFiles.push({ path: file, lines });
  }
}

largeFiles.sort((a, b) => b.lines - a.lines);
console.log(JSON.stringify(largeFiles, null, 2));
