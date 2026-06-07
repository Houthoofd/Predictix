import { exec } from 'child_process';

function fetchSofaEvents(dateStr) {
  return new Promise((resolve, reject) => {
    const cmd = `curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://api.sofascore.com/api/v1/sport/football/scheduled-events/${dateStr}"`;
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
    const dateStr = "2026-06-03";
    console.log("Fetching events for:", dateStr);
    const json = await fetchSofaEvents(dateStr);
    console.log("Success! Keys in response:", Object.keys(json));
    if (json.events) {
      console.log("Number of events:", json.events.length);
      // Let's inspect a few events
      const samples = json.events.slice(0, 3);
      console.log("Sample event details:", JSON.stringify(samples.map(e => ({
        id: e.id,
        tournamentName: e.tournament?.name,
        homeTeam: e.homeTeam?.name,
        awayTeam: e.awayTeam?.name,
        status: e.status?.type,
        homeScore: e.homeScore?.display,
        awayScore: e.awayScore?.display
      })), null, 2));
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
