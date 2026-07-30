// Singleton in-memory process status tracker

const globalStatus = global as unknown as {
  __systemStartTime?: number;
  __totalScanCount?: number;
};

if (!globalStatus.__systemStartTime) {
  globalStatus.__systemStartTime = Date.now();
  globalStatus.__totalScanCount = 0;
}

export function getSystemStartTime(): number {
  return globalStatus.__systemStartTime || Date.now();
}

export function incrementScanCount() {
  globalStatus.__totalScanCount = (globalStatus.__totalScanCount || 0) + 1;
}

export function getTotalScanCount(): number {
  return globalStatus.__totalScanCount || 0;
}

export function getUptimeFormatted(): string {
  const diffMs = Date.now() - getSystemStartTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const remHours = hours % 24;
  const remMinutes = minutes % 60;

  if (days > 0) {
    return `${days}d ${remHours}h ${remMinutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${remMinutes}m`;
  }
  return `${minutes}m ${seconds % 60}s`;
}
