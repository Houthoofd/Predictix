const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}/api`;

async function monitorRepair() {
  try {
    console.log("🚀 Starting global data repair batch via Predictix API...");
    
    // 1. Trigger the repair batch
    const startRes = await fetch(`${BASE_URL}/predictions/integrity-batch/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const startData = await startRes.json();
    if (!startRes.ok || !startData.success) {
      console.error("❌ Failed to start repair:", startData.error?.message || startData.message);
      return;
    }
    
    console.log(`✓ ${startData.message}`);
    console.log("Streaming repair logs in real-time. Press Ctrl+C to stop monitoring (the process will continue running in the background).\n");

    // 2. Poll the status and print logs
    let lastLogIndex = 0;
    let isRunning = true;
    
    while (isRunning) {
      const statusRes = await fetch(`${BASE_URL}/predictions/integrity-batch/status?t=${Date.now()}`);
      if (statusRes.ok) {
        const { data } = await statusRes.json();
        
        // Print new logs
        if (data.logs && data.logs.length > lastLogIndex) {
          const newLogs = data.logs.slice(lastLogIndex);
          newLogs.forEach(log => console.log(log));
          lastLogIndex = data.logs.length;
        }
        
        // Update state
        isRunning = (data.status === 'running');
        
        if (!isRunning) {
          console.log(`\n🏁 Repair batch finished. Status: ${data.status}. Success: ${data.successCount}, Errors: ${data.errorCount}.`);
        }
      } else {
        console.error("⚠️ Failed to poll status. Server might be restarting...");
      }
      
      if (isRunning) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  } catch (error) {
    console.error("❌ Network or Execution Error:", error.message);
    console.log("Make sure the Predictix backend server is running (usually npm run dev).");
  }
}

monitorRepair();
