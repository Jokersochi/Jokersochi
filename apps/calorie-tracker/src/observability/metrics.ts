export interface OpsMetrics {
  leadResponseTimeMs: number[];
  scheduleAttempted: number;
  scheduleConverted: number;
  appointmentsScheduled: number;
  noShows: number;
  escalationCount: number;
}

const state: OpsMetrics = {
  leadResponseTimeMs: [],
  scheduleAttempted: 0,
  scheduleConverted: 0,
  appointmentsScheduled: 0,
  noShows: 0,
  escalationCount: 0,
};

export const metrics = {
  recordLeadResponseTime: (ms: number) => {
    state.leadResponseTimeMs.push(ms);
  },
  recordScheduleConversion: (converted: boolean) => {
    state.scheduleAttempted += 1;
    if (converted) {
      state.scheduleConverted += 1;
    }
  },
  recordNoShow: (isNoShow: boolean) => {
    state.appointmentsScheduled += 1;
    if (isNoShow) {
      state.noShows += 1;
    }
  },
  incrementEscalation: () => {
    state.escalationCount += 1;
  },
  snapshot: () => {
    const avgLeadResponse = state.leadResponseTimeMs.length
      ? state.leadResponseTimeMs.reduce((acc, item) => acc + item, 0) / state.leadResponseTimeMs.length
      : 0;

    return {
      leadResponseTimeMs: Number(avgLeadResponse.toFixed(2)),
      scheduleConversion: state.scheduleAttempted
        ? Number((state.scheduleConverted / state.scheduleAttempted).toFixed(3))
        : 0,
      noShowRatio: state.appointmentsScheduled
        ? Number((state.noShows / state.appointmentsScheduled).toFixed(3))
        : 0,
      escalationCount: state.escalationCount,
    };
  },
  dailyHealthReport: () => ({
    generatedAt: new Date().toISOString(),
    metrics: metrics.snapshot(),
    status: 'pilot',
  }),
};
