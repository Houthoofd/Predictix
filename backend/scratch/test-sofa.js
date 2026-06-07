import { exec } from 'child_process';

function fetchSofa(query) {
  return new Promise((resolve, reject) => {
    // Escape the query for command line
    const safeQuery = encodeURIComponent(query);
    const cmd = `curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://api.sofascore.com/api/v1/search/all?q=${safeQuery}"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      try {
        const json = JSON.parse(stdout);
        resolve(json);
      } catch (err) {
        reject(new Error("Failed to parse JSON. Output: " + stdout.substring(0, 200)));
      }
    });
  });
}

async function test() {
  try {
    const json = await fetchSofa("Gent");
    console.log("Success! Found keys:", Object.keys(json));
    if (json.results) {
      console.log("Number of results:", json.results.length);
      const teams = json.results.filter(r => r.type === 'team');
      console.log("Teams found:", teams.map(t => ({ id: t.entity?.id, name: t.entity?.name, sport: t.entity?.sport?.name })));
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
