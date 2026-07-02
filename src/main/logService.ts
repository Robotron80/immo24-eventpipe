export interface LogEntry {
  level: 'info' | 'warn' | 'error'
  message: string
  context?: Record<string, unknown>
}

export function writeLog(entry: LogEntry): void {
  const payload = {
    ts: new Date().toISOString(),
    ...entry,
  }
  console.log(JSON.stringify(payload))
}
