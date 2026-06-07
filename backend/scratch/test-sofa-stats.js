import { exec } from 'child_process';

function fetchSofaStats(eventId) {
  return new Promise((resolve, reject) => {
    const cmd = `curl.exe -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://api.sofascore.com/api/v1/event/${eventId}/statistics"`;
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
    const eventId = 16231268;
    const json = await fetchSofaStats(eventId);
    if (json.statistics) {
      for (const section of json.statistics) {
        console.log(`\n--- Period: ${section.period} ---`);
        const overviewGroup = section.groups.find(g => g.groupName === 'Match overview');
        if (overviewGroup) {
          const cornersItem = overviewGroup.statisticsItems.find(i => i.name === 'Corner kicks');
          if (cornersItem) {
            console.log(`Corner kicks: Home [${cornersItem.home}] vs Away [${cornersItem.away}]`);
          } else {
            console.log("Corner kicks not found in overview group.");
          }
        } else {
          console.log("Match overview group not found.");
        }
      }
    }
  } catch (err) {
    console.error("Test failed:", err);
  }
}

test();
