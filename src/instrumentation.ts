import cron from 'node-cron';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Dynamically import the scanner so it only loads in the Node.js runtime (not Edge)
    const { runBackgroundScan } = await import('./workers/background-scanner');
    
    // Make sure we only start the cron job once to prevent memory leaks in dev
    if (!(global as any).__cronStarted) {
      console.log('🚀 [Instrumentation] Starting background scanner cron job...');
      
      // Run the scanner every 5 minutes
      cron.schedule('*/5 * * * *', async () => {
        await runBackgroundScan();
      });

      // Mark as started
      (global as any).__cronStarted = true;
      
      // Run an initial scan 10 seconds after boot
      setTimeout(() => {
        runBackgroundScan().catch(console.error);
      }, 10000);
    }
  }
}
