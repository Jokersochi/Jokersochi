const METRIC_KEYS = {
  leadResponseTimeMs: 'lead_response_time_ms',
  scheduleConversion: 'schedule_conversion_ratio',
  noShowRatio: 'no_show_ratio',
  escalationCount: 'escalation_count',
  inboundDrop: 'inbound_drop_count',
  schedulerFailure: 'scheduler_failure_count',
  summaryDeliveryFailure: 'summary_delivery_failure_count',
};

const state = {
  startedAt: new Date().toISOString(),
  leadResponseSamples: [],
  schedule: { attempted: 0, converted: 0 },
  appointments: { scheduled: 0, noShows: 0 },
  escalationCount: 0,
  alerts: [],
  counters: {
    inboundDrop: 0,
    schedulerFailure: 0,
    summaryDeliveryFailure: 0,
  },
};

const thresholds = {
  inboundDrop: Number(process.env.P0_INBOUND_DROP_THRESHOLD ?? 5),
  schedulerFailure: Number(process.env.P0_SCHEDULER_FAILURE_THRESHOLD ?? 3),
  summaryDeliveryFailure: Number(process.env.P0_SUMMARY_DELIVERY_THRESHOLD ?? 2),
};

const createJsonLog = (level, event, context = {}) => {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    service: 'monopoly-ws-backend',
    ...context,
  };

  const line = JSON.stringify(record);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
};

const evaluateAlert = (name, value, threshold) => {
  if (value < threshold) return;

  const alreadyOpen = state.alerts.some((alert) => alert.name === name && alert.status === 'open');
  if (alreadyOpen) return;

  const alert = {
    name,
    severity: 'P0',
    status: 'open',
    value,
    threshold,
    triggeredAt: new Date().toISOString(),
  };
  state.alerts.push(alert);
  createJsonLog('error', 'p0_alert_triggered', alert);
};

export const observability = {
  logger: {
    info: (event, context) => createJsonLog('info', event, context),
    warn: (event, context) => createJsonLog('warn', event, context),
    error: (event, context) => createJsonLog('error', event, context),
  },
  metrics: {
    recordLeadResponseTime: (latencyMs) => {
      state.leadResponseSamples.push(latencyMs);
    },
    recordScheduleAttempt: ({ converted }) => {
      state.schedule.attempted += 1;
      if (converted) {
        state.schedule.converted += 1;
      }
    },
    recordAppointmentOutcome: ({ noShow }) => {
      state.appointments.scheduled += 1;
      if (noShow) {
        state.appointments.noShows += 1;
      }
    },
    incrementEscalation: () => {
      state.escalationCount += 1;
    },
    incrementInboundDrop: () => {
      state.counters.inboundDrop += 1;
      evaluateAlert('inbound_drop', state.counters.inboundDrop, thresholds.inboundDrop);
    },
    incrementSchedulerFailure: () => {
      state.counters.schedulerFailure += 1;
      evaluateAlert('scheduler_failure', state.counters.schedulerFailure, thresholds.schedulerFailure);
    },
    incrementSummaryDeliveryFailure: () => {
      state.counters.summaryDeliveryFailure += 1;
      evaluateAlert('summary_delivery_failure', state.counters.summaryDeliveryFailure, thresholds.summaryDeliveryFailure);
    },
    snapshot: () => {
      const leadAvg = state.leadResponseSamples.length
        ? state.leadResponseSamples.reduce((acc, item) => acc + item, 0) / state.leadResponseSamples.length
        : 0;
      const scheduleConversion = state.schedule.attempted
        ? state.schedule.converted / state.schedule.attempted
        : 0;
      const noShowRatio = state.appointments.scheduled
        ? state.appointments.noShows / state.appointments.scheduled
        : 0;

      return {
        [METRIC_KEYS.leadResponseTimeMs]: Number(leadAvg.toFixed(2)),
        [METRIC_KEYS.scheduleConversion]: Number(scheduleConversion.toFixed(3)),
        [METRIC_KEYS.noShowRatio]: Number(noShowRatio.toFixed(3)),
        [METRIC_KEYS.escalationCount]: state.escalationCount,
        [METRIC_KEYS.inboundDrop]: state.counters.inboundDrop,
        [METRIC_KEYS.schedulerFailure]: state.counters.schedulerFailure,
        [METRIC_KEYS.summaryDeliveryFailure]: state.counters.summaryDeliveryFailure,
      };
    },
    dailyHealthReport: () => ({
      generatedAt: new Date().toISOString(),
      serviceStart: state.startedAt,
      metrics: observability.metrics.snapshot(),
      openAlerts: state.alerts.filter((alert) => alert.status === 'open'),
    }),
  },
};
