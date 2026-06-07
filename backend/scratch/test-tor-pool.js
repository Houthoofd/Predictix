import { getActiveTorPorts, getTorPortFromPool } from '../src/utils/torSessionManager.js';

async function runTest() {
  console.log('--- Testing Tor SOCKS Workers Pool ---');
  console.log('Scanning active Tor ports...');
  const activePorts = await getActiveTorPorts();
  console.log('Active Tor ports found:', activePorts);

  if (activePorts.length === 0) {
    console.log('No active Tor ports found. (Make sure Tor is running if you want to test routing)');
  } else {
    console.log('Rotating ports 5 times:');
    for (let i = 0; i < 5; i++) {
      const port = await getTorPortFromPool();
      console.log(`Selection ${i + 1}: Port ${port}`);
    }
  }
  console.log('--- Test finished ---');
}

runTest().catch(console.error);
