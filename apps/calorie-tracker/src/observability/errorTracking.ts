import Constants from 'expo-constants';
import { logEvent } from './logger';

let sentryModule: { captureException: (error: unknown, context?: unknown) => void } | null = null;

export const initErrorTracking = async (): Promise<void> => {
  const dsn = (Constants.expoConfig as { extra?: Record<string, string> })?.extra?.sentryDsn;
  if (!dsn) {
    logEvent('warn', 'error_tracking_disabled', { reason: 'missing_dsn' });
    return;
  }

  try {
    const sentry = await import('@sentry/react-native');
    sentry.init({ dsn, tracesSampleRate: 0.1 });
    sentryModule = sentry;
    logEvent('info', 'error_tracking_enabled', { provider: 'sentry' });
  } catch (error) {
    logEvent('error', 'error_tracking_init_failed', {
      provider: 'sentry',
      message: error instanceof Error ? error.message : String(error),
    });
  }
};

export const captureAppError = (error: unknown, context: Record<string, unknown> = {}): void => {
  logEvent('error', 'frontend_exception', {
    message: error instanceof Error ? error.message : String(error),
    ...context,
  });

  if (sentryModule) {
    sentryModule.captureException(error, { extra: context });
  }
};
