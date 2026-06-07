import { isTorActive, isTorRouting, healTorPort, getActiveTorPorts } from '../src/utils/torSessionManager.js';

async function testTorHealth() {
  console.log("=====================================================");
  console.log(" TESTING TOR HEALTH DIAGNOSTICS & SELF-HEALING");
  console.log("=====================================================");
  
  const activePorts = await getActiveTorPorts();
  console.log(`Active TCP Ports detected: ${activePorts.join(', ') || 'None'}`);
  
  if (activePorts.length === 0) {
    console.warn("No active Tor ports. Please make sure Tor is running on port 9050 before running this test.");
    return;
  }
  
  for (const port of activePorts) {
    console.log(`\nTesting routing on Port ${port}...`);
    const routingOk = await isTorRouting(port);
    console.log(`Port ${port} routing status: ${routingOk ? '✓ WORKING (Traffic OK)' : '✗ BLOCKED/OFFLINE'}`);
    
    if (routingOk) {
      console.log("Simulating a self-healing trigger on a healthy port (should report already healthy)...");
      const healed = await healTorPort(port);
      console.log(`Heal Port outcome: ${healed ? '✓ SUCCESS (Healthy)' : '✗ FAILED'}`);
    } else {
      console.log("Port is offline. Running self-healing sequence...");
      const healed = await healTorPort(port);
      console.log(`Self-healing outcome: ${healed ? '✓ SUCCESS (Port recovered)' : '✗ FAILED'}`);
    }
  }
  
  console.log("\n=====================================================");
  console.log(" TEST COMPLETED");
  console.log("=====================================================");
}

testTorHealth().catch(err => console.error("Test Error:", err));
