import { StyleSheet, Text, View } from 'react-native';
import { palette, radius, spacing } from '../theme/colors';

interface OperationalHealthCardProps {
  generatedAt: string;
  leadResponseTimeMs: number;
  scheduleConversion: number;
  noShowRatio: number;
  escalationCount: number;
}

export const OperationalHealthCard = ({
  generatedAt,
  leadResponseTimeMs,
  scheduleConversion,
  noShowRatio,
  escalationCount,
}: OperationalHealthCardProps) => (
  <View style={styles.card}>
    <Text style={styles.title}>Pilot health report</Text>
    <Text style={styles.meta}>Updated: {new Date(generatedAt).toLocaleTimeString()}</Text>
    <View style={styles.grid}>
      <Metric label="Lead response" value={`${leadResponseTimeMs} ms`} />
      <Metric label="Schedule conversion" value={`${Math.round(scheduleConversion * 100)}%`} />
      <Metric label="No-show ratio" value={`${Math.round(noShowRatio * 100)}%`} />
      <Metric label="Escalations" value={`${escalationCount}`} />
    </View>
  </View>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.metricBox}>
    <Text style={styles.metricLabel}>{label}</Text>
    <Text style={styles.metricValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0F172A',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  title: {
    color: palette.text,
    fontWeight: '700',
    fontSize: 16,
  },
  meta: {
    color: palette.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metricBox: {
    width: '48%',
    backgroundColor: '#111827',
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  metricLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  metricValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
