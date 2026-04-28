import { observability } from './observability.js';

let sentryClient = null;

export const initErrorTracking = async () => {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    observability.logger.warn('error_tracking_disabled', { reason: 'missing_sentry_dsn' });
    return;
  }

  try {
    const sentry = await import('@sentry/node');
    sentry.init({ dsn, tracesSampleRate: 0.2 });
    sentryClient = sentry;
    observability.logger.info('error_tracking_enabled', { provider: 'sentry' });
  } catch (error) {
    observability.logger.error('error_tracking_init_failed', {
      provider: 'sentry',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const captureBackendException = (error, context = {}) => {
  const message = error instanceof Error ? error.message : String(error);
  observability.logger.error('backend_exception', { message, ...context });

  if (sentryClient) {
    sentryClient.captureException(error, { extra: context });
  }
};
