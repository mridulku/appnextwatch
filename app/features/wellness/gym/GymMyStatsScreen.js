import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import useGymStats from '../../../hooks/useGymStats';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

const BODY_COMPOSITION_RANGES = {
  totalBodyWaterL: [40.5, 49.5],
  proteinKg: [10.9, 13.3],
  mineralKg: [3.75, 4.59],
  bodyFatMassKg: [8.7, 17.3],
  weightKg: [61.3, 82.9],
};

const RESEARCH_PARAMETER_RANGES = {
  fatFreeMassKg: [56.1, 67.6],
  bmrKcal: [1480, 2085],
  obesityDegreePct: [90, 110],
  smiKgM2: [7.0, 9.0],
  recommendedCaloriesKcal: [2200, 2800],
};

const MUSCLE_FAT_BANDS = {
  weightKg: { min: 55, normal: [61.3, 82.9], max: 115, unit: 'kg' },
  smmKg: { min: 20, normal: [29, 36], max: 45, unit: 'kg' },
  bodyFatMassKg: { min: 4, normal: [8.7, 17.3], max: 30, unit: 'kg' },
};

const OBESITY_BANDS = {
  bmi: { min: 10, normal: [18.5, 25], max: 40, unit: '' },
  pbfPct: { min: 5, normal: [10, 20], max: 35, unit: '%' },
};

const HEALTH_BANDS = {
  waistHipRatio: { min: 0.7, normal: [0.8, 0.9], max: 1.2, unit: '' },
  visceralFatLevel: { min: 1, normal: [1, 9], max: 20, unit: '' },
};

function formatDateTime(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatNumber(value, digits = 1, suffix = '') {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '—';
  return `${parsed.toFixed(digits)}${suffix}`;
}

function getRangeStatus(value, [min, max]) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (numeric < min) return 'Below';
  if (numeric > max) return 'Above';
  return 'Normal';
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function InfoCard({ title, subtitle, children, compact = false }) {
  return (
    <View style={[styles.card, compact ? styles.cardCompact : null]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

function TestCard({ test, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.testCard, selected ? styles.testCardSelected : null]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={styles.testCardLabel}>{test.label}</Text>
      <Text style={styles.testCardScore}>{test.inBodyScore}/100</Text>
      <Text style={styles.testCardDate}>{formatDateShort(test.capturedAt)}</Text>
    </TouchableOpacity>
  );
}

function BackButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.backPill} activeOpacity={0.9} onPress={onPress}>
      <Text style={styles.backPillText}>Choose another test</Text>
    </TouchableOpacity>
  );
}

function MetricRow({ label, value }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function RangeMetricRow({ label, value, range, unit, digits = 1 }) {
  const lower = range?.[0];
  const upper = range?.[1];
  const status = range ? getRangeStatus(value, range) : '—';
  return (
    <View style={styles.rangeRow}>
      <View style={styles.rangeRowTop}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricValue}>{formatNumber(value, digits, unit ? ` ${unit}` : '')}</Text>
      </View>
      {range ? (
        <View style={styles.rangeRowBottom}>
          <Text style={styles.rangeHint}>{`Normal range: ${formatNumber(lower, digits)}${unit ? ` ${unit}` : ''} - ${formatNumber(upper, digits)}${unit ? ` ${unit}` : ''}`}</Text>
          <Text style={styles.rangeStatus}>{status}</Text>
        </View>
      ) : null}
    </View>
  );
}

function AnalysisBarRow({ label, value, config, digits = 1 }) {
  const numeric = Number(value);
  const min = config?.min ?? 0;
  const max = config?.max ?? 100;
  const [normalMin, normalMax] = config?.normal ?? [min, max];
  const markerLeft = `${clamp01((numeric - min) / (max - min)) * 100}%`;
  const normalLeft = `${clamp01((normalMin - min) / (max - min)) * 100}%`;
  const normalWidth = `${clamp01((normalMax - normalMin) / (max - min)) * 100}%`;
  const status = getRangeStatus(numeric, [normalMin, normalMax]);

  return (
    <View style={styles.analysisRow}>
      <View style={styles.analysisHeader}>
        <Text style={styles.analysisLabel}>{label}</Text>
        <Text style={styles.analysisValue}>{formatNumber(numeric, digits, config?.unit ? ` ${config.unit}` : '')}</Text>
      </View>
      <View style={styles.scaleLabels}>
        <Text style={styles.scaleLabel}>Under</Text>
        <Text style={styles.scaleLabel}>Normal</Text>
        <Text style={styles.scaleLabel}>Over</Text>
      </View>
      <View style={styles.analysisTrack}>
        <View style={styles.analysisTrackBase} />
        <View style={[styles.analysisNormalBand, { left: normalLeft, width: normalWidth }]} />
        <View style={[styles.analysisMarker, { left: markerLeft }]} />
      </View>
      <View style={styles.rangeRowBottom}>
        <Text style={styles.rangeHint}>{`Normal: ${formatNumber(normalMin, digits)}${config?.unit ? ` ${config.unit}` : ''} - ${formatNumber(normalMax, digits)}${config?.unit ? ` ${config.unit}` : ''}`}</Text>
        <Text style={styles.rangeStatus}>{status}</Text>
      </View>
    </View>
  );
}

function SegmentCell({ label, item }) {
  return (
    <View style={styles.segmentCell}>
      <Text style={styles.segmentLabel}>{label}</Text>
      <Text style={styles.segmentValue}>{formatNumber(item?.kg)} kg</Text>
      <Text style={styles.segmentStatus}>{item?.status || '—'}</Text>
    </View>
  );
}

function GymMyStatsScreen({ embedded = false, showHeader = true, topContent = null }) {
  const { loading, error, stats, hasAnyData, hydrate } = useGymStats();
  const [selectedTestId, setSelectedTestId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const tests = useMemo(
    () => (Array.isArray(stats.gymBodyCompositionTests) ? stats.gymBodyCompositionTests : []),
    [stats.gymBodyCompositionTests],
  );

  const selectedTest = useMemo(() => {
    if (!tests.length || !selectedTestId) return null;
    return tests.find((item) => item.id === selectedTestId) || null;
  }, [selectedTestId, tests]);

  const RootContainer = embedded ? View : SafeAreaView;

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading body profile...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {topContent}
        {showHeader ? (
          <View style={styles.heroHeader}>
            <Text style={styles.heroTitle}>Profile</Text>
            <Text style={styles.heroSubtitle}>InBody test snapshots and body composition details.</Text>
          </View>
        ) : null}

        {!hasAnyData || !tests.length ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No body composition tests yet</Text>
            <Text style={styles.emptySubtitle}>Add a test image or values to populate this section.</Text>
          </View>
        ) : !selectedTest ? (
          <InfoCard title="Choose a test" subtitle="Open a saved InBody report to view all details.">
            <View style={styles.testChooserRow}>
              {tests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  selected={false}
                  onPress={() => setSelectedTestId(test.id)}
                />
              ))}
            </View>
          </InfoCard>
        ) : (
          <>
            <BackButton onPress={() => setSelectedTestId(null)} />

            <InfoCard title={selectedTest.label} subtitle={`Captured ${formatDateTime(selectedTest.capturedAt)}`}>
              <View style={styles.topMetaRow}>
                <View style={styles.scoreWrap}>
                  <Text style={styles.scoreLabel}>Body score</Text>
                  <Text style={styles.scoreValue}>{selectedTest.inBodyScore}</Text>
                  <Text style={styles.scoreSuffix}>/100</Text>
                </View>
                <View style={styles.metaGrid}>
                  <MetricRow label="Height" value={`${selectedTest.heightCm} cm`} />
                  <MetricRow label="Age" value={String(selectedTest.ageYears)} />
                  <MetricRow label="Gender" value={selectedTest.gender} />
                </View>
              </View>
            </InfoCard>

            <InfoCard title="Body Composition Analysis">
              <RangeMetricRow label="Total Body Water" value={selectedTest.bodyCompositionAnalysis?.totalBodyWaterL} range={BODY_COMPOSITION_RANGES.totalBodyWaterL} unit="L" />
              <RangeMetricRow label="Protein" value={selectedTest.bodyCompositionAnalysis?.proteinKg} range={BODY_COMPOSITION_RANGES.proteinKg} unit="kg" />
              <RangeMetricRow label="Mineral" value={selectedTest.bodyCompositionAnalysis?.mineralKg} range={BODY_COMPOSITION_RANGES.mineralKg} unit="kg" digits={2} />
              <RangeMetricRow label="Body Fat Mass" value={selectedTest.bodyCompositionAnalysis?.bodyFatMassKg} range={BODY_COMPOSITION_RANGES.bodyFatMassKg} unit="kg" />
              <RangeMetricRow label="Weight" value={selectedTest.bodyCompositionAnalysis?.weightKg} range={BODY_COMPOSITION_RANGES.weightKg} unit="kg" />
            </InfoCard>

            <InfoCard title="Muscle-Fat Analysis">
              <AnalysisBarRow label="Weight" value={selectedTest.muscleFatAnalysis?.weightKg} config={MUSCLE_FAT_BANDS.weightKg} />
              <AnalysisBarRow label="SMM" value={selectedTest.muscleFatAnalysis?.smmKg} config={MUSCLE_FAT_BANDS.smmKg} />
              <AnalysisBarRow label="Body Fat Mass" value={selectedTest.muscleFatAnalysis?.bodyFatMassKg} config={MUSCLE_FAT_BANDS.bodyFatMassKg} />
            </InfoCard>

            <InfoCard title="Obesity Analysis">
              <AnalysisBarRow label="BMI" value={selectedTest.obesityAnalysis?.bmi} config={OBESITY_BANDS.bmi} />
              <AnalysisBarRow label="PBF" value={selectedTest.obesityAnalysis?.pbfPct} config={OBESITY_BANDS.pbfPct} />
            </InfoCard>

            <InfoCard title="Weight Control">
              <MetricRow label="Target Weight" value={`${formatNumber(selectedTest.weightControl?.targetWeightKg)} kg`} />
              <MetricRow label="Weight Control" value={`${formatNumber(selectedTest.weightControl?.weightControlKg)} kg`} />
              <MetricRow label="Fat Control" value={`${formatNumber(selectedTest.weightControl?.fatControlKg)} kg`} />
              <MetricRow label="Muscle Control" value={`${formatNumber(selectedTest.weightControl?.muscleControlKg)} kg`} />
            </InfoCard>

            <InfoCard title="Obesity Evaluation">
              <MetricRow label="BMI" value={selectedTest.obesityEvaluation?.bmi || '—'} />
              <MetricRow label="PBF" value={selectedTest.obesityEvaluation?.pbf || '—'} />
            </InfoCard>

            <InfoCard title="Waist-Hip Ratio / Visceral Fat">
              <AnalysisBarRow label="Waist-Hip Ratio" value={selectedTest.waistHipRatio} config={HEALTH_BANDS.waistHipRatio} digits={2} />
              <AnalysisBarRow label="Visceral Fat Level" value={selectedTest.visceralFatLevel} config={HEALTH_BANDS.visceralFatLevel} digits={0} />
            </InfoCard>

            <InfoCard title="Research Parameters">
              <RangeMetricRow label="Fat Free Mass" value={selectedTest.researchParameters?.fatFreeMassKg} range={RESEARCH_PARAMETER_RANGES.fatFreeMassKg} unit="kg" />
              <RangeMetricRow label="BMR" value={selectedTest.researchParameters?.bmrKcal} range={RESEARCH_PARAMETER_RANGES.bmrKcal} unit="kcal" digits={0} />
              <RangeMetricRow label="Obesity Degree" value={selectedTest.researchParameters?.obesityDegreePct} range={RESEARCH_PARAMETER_RANGES.obesityDegreePct} unit="%" digits={0} />
              <RangeMetricRow label="SMI" value={selectedTest.researchParameters?.smiKgM2} range={RESEARCH_PARAMETER_RANGES.smiKgM2} unit="kg/m²" />
              <RangeMetricRow label="Recommended Calorie Intake" value={selectedTest.researchParameters?.recommendedCaloriesKcal} range={RESEARCH_PARAMETER_RANGES.recommendedCaloriesKcal} unit="kcal" digits={0} />
            </InfoCard>

            <InfoCard title="Segmental Lean Analysis">
              <View style={styles.segmentGrid}>
                <SegmentCell label="Left Arm" item={selectedTest.segmentalLeanAnalysis?.leftArm} />
                <SegmentCell label="Right Arm" item={selectedTest.segmentalLeanAnalysis?.rightArm} />
                <SegmentCell label="Trunk" item={selectedTest.segmentalLeanAnalysis?.trunk} />
                <SegmentCell label="Left Leg" item={selectedTest.segmentalLeanAnalysis?.leftLeg} />
                <SegmentCell label="Right Leg" item={selectedTest.segmentalLeanAnalysis?.rightLeg} />
              </View>
            </InfoCard>

            <InfoCard title="Segmental Fat Analysis">
              <View style={styles.segmentGrid}>
                <SegmentCell label="Left Arm" item={selectedTest.segmentalFatAnalysis?.leftArm} />
                <SegmentCell label="Right Arm" item={selectedTest.segmentalFatAnalysis?.rightArm} />
                <SegmentCell label="Trunk" item={selectedTest.segmentalFatAnalysis?.trunk} />
                <SegmentCell label="Left Leg" item={selectedTest.segmentalFatAnalysis?.leftLeg} />
                <SegmentCell label="Right Leg" item={selectedTest.segmentalFatAnalysis?.rightLeg} />
              </View>
            </InfoCard>

            <InfoCard title="Impedance">
              <MetricRow
                label="20 kHz"
                value={`RA ${formatNumber(selectedTest.impedance?.khz20?.ra, 1)} · LA ${formatNumber(selectedTest.impedance?.khz20?.la, 1)} · TR ${formatNumber(selectedTest.impedance?.khz20?.tr, 1)} · RL ${formatNumber(selectedTest.impedance?.khz20?.rl, 1)} · LL ${formatNumber(selectedTest.impedance?.khz20?.ll, 1)}`}
              />
              <MetricRow
                label="100 kHz"
                value={`RA ${formatNumber(selectedTest.impedance?.khz100?.ra, 1)} · LA ${formatNumber(selectedTest.impedance?.khz100?.la, 1)} · TR ${formatNumber(selectedTest.impedance?.khz100?.tr, 1)} · RL ${formatNumber(selectedTest.impedance?.khz100?.rl, 1)} · LL ${formatNumber(selectedTest.impedance?.khz100?.ll, 1)}`}
              />
            </InfoCard>
          </>
        )}

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  content: {
    padding: UI_TOKENS.spacing.md,
    paddingBottom: UI_TOKENS.spacing.xl,
    gap: UI_TOKENS.spacing.sm,
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  heroHeader: {
    gap: UI_TOKENS.spacing.xs,
  },
  heroTitle: {
    color: COLORS.text,
    fontSize: 34,
    fontWeight: '700',
  },
  heroSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle + 1,
  },
  emptyCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.sm,
  },
  cardCompact: {
    gap: UI_TOKENS.spacing.xs,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  cardBody: {
    gap: UI_TOKENS.spacing.sm,
  },
  testChooserRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.sm,
  },
  testCard: {
    flex: 1,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card2,
    padding: UI_TOKENS.spacing.md,
    gap: UI_TOKENS.spacing.xs,
  },
  testCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.tintCard,
  },
  testCardLabel: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.sectionTitle,
    fontWeight: '700',
  },
  testCardScore: {
    color: COLORS.accent,
    fontSize: 28,
    fontWeight: '800',
  },
  testCardDate: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.caption,
  },
  backPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: 10,
    borderRadius: UI_TOKENS.radius.pill,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card2,
  },
  backPillText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.caption,
    fontWeight: '700',
  },
  topMetaRow: {
    flexDirection: 'row',
    gap: UI_TOKENS.spacing.md,
  },
  scoreWrap: {
    width: 132,
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(245, 196, 86, 0.06)',
    paddingVertical: UI_TOKENS.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  scoreValue: {
    color: COLORS.text,
    fontSize: 52,
    fontWeight: '800',
    lineHeight: 56,
  },
  scoreSuffix: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.sectionTitle,
    fontWeight: '600',
  },
  metaGrid: {
    flex: 1,
    gap: UI_TOKENS.spacing.xs,
    justifyContent: 'center',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(162,167,179,0.18)',
  },
  metricLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.subtitle,
    flex: 1,
    paddingRight: UI_TOKENS.spacing.sm,
  },
  metricValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.sectionTitle,
    fontWeight: '700',
  },
  rangeRow: {
    gap: 4,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(162,167,179,0.18)',
  },
  rangeRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rangeRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  rangeHint: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.caption,
    flex: 1,
  },
  rangeStatus: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.caption,
    fontWeight: '700',
  },
  analysisRow: {
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(162,167,179,0.18)',
  },
  analysisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  analysisLabel: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '600',
  },
  analysisValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  analysisTrack: {
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  analysisTrackBase: {
    height: 10,
    borderRadius: UI_TOKENS.radius.pill,
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  analysisNormalBand: {
    position: 'absolute',
    top: 5,
    height: 10,
    borderRadius: UI_TOKENS.radius.pill,
    backgroundColor: 'rgba(62, 173, 140, 0.36)',
  },
  analysisMarker: {
    position: 'absolute',
    top: 1,
    width: 4,
    height: 18,
    marginLeft: -2,
    borderRadius: 2,
    backgroundColor: COLORS.accent,
  },
  segmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: UI_TOKENS.spacing.sm,
  },
  segmentCell: {
    width: '48%',
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card2,
    padding: UI_TOKENS.spacing.sm,
    gap: 4,
  },
  segmentLabel: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.caption,
  },
  segmentValue: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '700',
  },
  segmentStatus: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.caption,
    fontWeight: '700',
  },
  errorCard: {
    borderRadius: UI_TOKENS.radius.md,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(200, 70, 70, 0.08)',
    padding: UI_TOKENS.spacing.md,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: UI_TOKENS.typography.subtitle,
    fontWeight: '600',
  },
});

export default GymMyStatsScreen;
