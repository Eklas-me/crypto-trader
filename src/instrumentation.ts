import cron from 'node-cron';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runBackgroundScan } = await import('./workers/background-scanner');
    const { startTradeMonitor } = await import('./workers/trade-monitor');
    const { startAIBrain } = await import('./workers/ai-worker');
    
    if (!(global as any).__cronStarted) {
      console.log('🚀 [Instrumentation] Starting background scanner cron job...');
      
      cron.schedule('*/5 * * * *', async () => {
        await runBackgroundScan();
      });

      (global as any).__cronStarted = true;
      
      setTimeout(() => {
        runBackgroundScan().catch(console.error);
        startTradeMonitor().catch(console.error);
        startAIBrain().catch(console.error);
      }, 10000);
    }
  }
}
