export type LogLevel = 'info' | 'warn' | 'error';

export const logEvent = (level: LogLevel, event: string, context: Record<string, unknown> = {}): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    layer: 'frontend-service',
    ...context,
  };

  const record = JSON.stringify(payload);
  if (level === 'error') {
    console.error(record);
    return;
  }

  if (level === 'warn') {
    console.warn(record);
    return;
  }

  console.log(record);
};
