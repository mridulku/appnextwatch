import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import COLORS from '../../../theme/colors';

const GOALS = [
  { label: 'Hypertrophy', value: 'hypertrophy' },
  { label: 'Strength', value: 'strength' },
  { label: 'Fat loss', value: 'fat_loss' },
  { label: 'General fitness', value: 'general' },
];

const EXPERIENCE = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
];

const DAYS_PER_WEEK = [3, 4, 5, 6];
const SESSION_MINUTES = [30, 45, 60, 75, 90];

const EQUIPMENT = [
  { label: 'Commercial gym', value: 'commercial_gym' },
  { label: 'Home gym', value: 'home_gym' },
  { label: 'Minimal equipment', value: 'minimal' },
];

const MUSCLE_FOCUS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];
const AVOID_CHIPS = ['overhead', 'deep_squat', 'deadlift', 'bench_press', 'running'];
const LIFT_KEYS = ['bench', 'squat', 'deadlift_or_hinge', 'overhead_press'];

const STEPS = [
  { id: 'goal', title: 'What is the primary goal?', helper: 'This sets the baseline emphasis for the block.' },
  { id: 'experience', title: 'How experienced is the trainee?', helper: 'Used for volume and progression defaults.' },
  { id: 'schedule', title: 'What schedule is realistic?', helper: 'Pick days/week and session duration.' },
  { id: 'equipment', title: 'What equipment is available?', helper: 'Program templates adapt to available tools.' },
  { id: 'priorities', title: 'Any muscle priorities?', helper: 'Optional focus areas for volume allocation.' },
  { id: 'constraints', title: 'Constraints or injury notes?', helper: 'Optional; keep it short and actionable.' },
  { id: 'initialization', title: 'How should week 1 initialize?', helper: 'Use known working numbers or calibration.' },
];

const INITIAL_FORM_ANSWERS = {
  goal_primary: null,
  experience: null,
  days_per_week: null,
  session_minutes: null,
  equipment: null,
  constraints: {
    injuries: '',
    avoid: [],
  },
  priorities: {
    focus_muscles: [],
  },
  initialization: {
    knows_numbers: null,
    anchors: {},
    rir_preference: 2,
  },
};

function OptionButton({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.optionButton, selected ? styles.optionButtonSelected : null]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Chip({ label, selected, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : null]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function toPrettyLabel(value) {
  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function computeProgramSeed(formAnswers) {
  const isStrength = formAnswers.goal_primary === 'strength';
  const experience = formAnswers.experience || 'beginner';
  const days = Number(formAnswers.days_per_week || 3);
  const calibrationPath = formAnswers.initialization?.knows_numbers === false;
  const rirPref = Number(formAnswers.initialization?.rir_preference || 2);

  const weeklySetRanges = {
    beginner: [8, 10],
    intermediate: [10, 14],
    advanced: [12, 16],
  };

  const splitTemplate = days === 3
    ? 'full-body A/B/optional C'
    : days === 4
      ? 'upper/lower'
      : 'push/pull/legs (+ optional upper/arms)';

  return {
    block_length_weeks: 12,
    phase: experience === 'beginner' ? 'base' : 'build',
    split_template: splitTemplate,
    rep_ranges: {
      main: isStrength ? [3, 6] : [6, 10],
      accessories: isStrength ? [8, 12] : [10, 15],
    },
    target_RIR: calibrationPath
      ? {
          main: rirPref,
          accessories: [Math.max(0, rirPref - 1), rirPref],
        }
      : {
          main: 2,
          accessories: [1, 2],
        },
    weekly_sets_targets: {
      major_muscles: weeklySetRanges[experience] || weeklySetRanges.beginner,
    },
    progression_rule: {
      type: 'double_progression',
      rule: 'Increase load when all sets hit the top of the rep range at target RIR.',
      load_increment_pct: [2.5, 5],
    },
    deload_policy: {
      trigger: 'every_5th_week_or_fatigue_flag',
      action: 'reduce_sets_40_keep_intensity_moderate',
    },
  };
}

function TestFormOnboardingSandboxScreen() {
  const [stepIndex, setStepIndex] = useState(0);
  const [formAnswers, setFormAnswers] = useState(INITIAL_FORM_ANSWERS);
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [exportedJson, setExportedJson] = useState('');
  const [copyState, setCopyState] = useState('');

  const currentStep = STEPS[stepIndex];
  const isResults = stepIndex >= STEPS.length;
  const progress = isResults ? 1 : (stepIndex + 1) / STEPS.length;

  const programSeed = useMemo(() => computeProgramSeed(formAnswers), [formAnswers]);
  const finalExportObject = useMemo(
    () => ({ formAnswers, programSeed }),
    [formAnswers, programSeed],
  );
  const finalExportJson = useMemo(() => JSON.stringify(finalExportObject, null, 2), [finalExportObject]);

  const stepValid = useMemo(() => {
    if (isResults) return true;
    switch (currentStep.id) {
      case 'goal':
        return Boolean(formAnswers.goal_primary);
      case 'experience':
        return Boolean(formAnswers.experience);
      case 'schedule':
        return Boolean(formAnswers.days_per_week && formAnswers.session_minutes);
      case 'equipment':
        return Boolean(formAnswers.equipment);
      case 'priorities':
        return true;
      case 'constraints':
        return true;
      case 'initialization':
        if (formAnswers.initialization.knows_numbers === null) return false;
        if (formAnswers.initialization.knows_numbers === false) {
          return [0, 1, 2, 3].includes(formAnswers.initialization.rir_preference);
        }
        return true;
      default:
        return false;
    }
  }, [currentStep, formAnswers, isResults]);

  const toggleArrayItem = (path, value) => {
    setFormAnswers((prev) => {
      const source = path === 'focus_muscles' ? prev.priorities.focus_muscles : prev.constraints.avoid;
      const nextList = source.includes(value)
        ? source.filter((item) => item !== value)
        : [...source, value];

      if (path === 'focus_muscles') {
        return {
          ...prev,
          priorities: { ...prev.priorities, focus_muscles: nextList },
        };
      }
      return {
        ...prev,
        constraints: { ...prev.constraints, avoid: nextList },
      };
    });
  };

  const updateAnchor = (liftKey, field, value) => {
    setFormAnswers((prev) => ({
      ...prev,
      initialization: {
        ...prev.initialization,
        anchors: {
          ...prev.initialization.anchors,
          [liftKey]: {
            ...prev.initialization.anchors?.[liftKey],
            [field]: value,
          },
        },
      },
    }));
  };

  const goNext = () => {
    if (isResults) return;
    setStepIndex((prev) => prev + 1);
  };

  const goBack = () => {
    if (isResults) {
      setStepIndex(STEPS.length - 1);
      return;
    }
    setStepIndex((prev) => Math.max(0, prev - 1));
  };

  const restart = () => {
    setFormAnswers(INITIAL_FORM_ANSWERS);
    setStepIndex(0);
    setExportedJson('');
    setJsonExpanded(false);
    setCopyState('');
  };

  const exportJson = () => {
    setExportedJson(finalExportJson);
  };

  const copyJson = () => {
    setCopyState('Copied');
    setTimeout(() => setCopyState(''), 1200);
  };

  const renderStepBody = () => {
    if (currentStep.id === 'goal') {
      return GOALS.map((item) => (
        <OptionButton
          key={item.value}
          label={item.label}
          selected={formAnswers.goal_primary === item.value}
          onPress={() => setFormAnswers((prev) => ({ ...prev, goal_primary: item.value }))}
        />
      ));
    }

    if (currentStep.id === 'experience') {
      return EXPERIENCE.map((item) => (
        <OptionButton
          key={item.value}
          label={item.label}
          selected={formAnswers.experience === item.value}
          onPress={() => setFormAnswers((prev) => ({ ...prev, experience: item.value }))}
        />
      ));
    }

    if (currentStep.id === 'schedule') {
      return (
        <View style={styles.blockWrap}>
          <Text style={styles.groupLabel}>Days per week</Text>
          <View style={styles.chipsWrap}>
            {DAYS_PER_WEEK.map((day) => (
              <Chip
                key={`day_${day}`}
                label={`${day} days`}
                selected={formAnswers.days_per_week === day}
                onPress={() => setFormAnswers((prev) => ({ ...prev, days_per_week: day }))}
              />
            ))}
          </View>

          <Text style={[styles.groupLabel, styles.groupSpacing]}>Session length</Text>
          <View style={styles.chipsWrap}>
            {SESSION_MINUTES.map((minutes) => (
              <Chip
                key={`min_${minutes}`}
                label={`${minutes} min`}
                selected={formAnswers.session_minutes === minutes}
                onPress={() => setFormAnswers((prev) => ({ ...prev, session_minutes: minutes }))}
              />
            ))}
          </View>
        </View>
      );
    }

    if (currentStep.id === 'equipment') {
      return EQUIPMENT.map((item) => (
        <OptionButton
          key={item.value}
          label={item.label}
          selected={formAnswers.equipment === item.value}
          onPress={() => setFormAnswers((prev) => ({ ...prev, equipment: item.value }))}
        />
      ));
    }

    if (currentStep.id === 'priorities') {
      return (
        <View style={styles.chipsWrap}>
          {MUSCLE_FOCUS.map((item) => (
            <Chip
              key={item}
              label={toPrettyLabel(item)}
              selected={formAnswers.priorities.focus_muscles.includes(item)}
              onPress={() => toggleArrayItem('focus_muscles', item)}
            />
          ))}
        </View>
      );
    }

    if (currentStep.id === 'constraints') {
      return (
        <View style={styles.blockWrap}>
          <Text style={styles.groupLabel}>Injury / constraint notes</Text>
          <TextInput
            value={formAnswers.constraints.injuries}
            onChangeText={(text) =>
              setFormAnswers((prev) => ({
                ...prev,
                constraints: { ...prev.constraints, injuries: text },
              }))
            }
            placeholder="e.g. right shoulder irritation with overhead pressing"
            placeholderTextColor={COLORS.muted}
            style={styles.textArea}
            multiline
          />

          <Text style={[styles.groupLabel, styles.groupSpacing]}>Avoid patterns (optional)</Text>
          <View style={styles.chipsWrap}>
            {AVOID_CHIPS.map((item) => (
              <Chip
                key={item}
                label={toPrettyLabel(item)}
                selected={formAnswers.constraints.avoid.includes(item)}
                onPress={() => toggleArrayItem('avoid', item)}
              />
            ))}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.blockWrap}>
        <Text style={styles.groupLabel}>Initialization path</Text>
        <OptionButton
          label="I know my working weights"
          selected={formAnswers.initialization.knows_numbers === true}
          onPress={() =>
            setFormAnswers((prev) => ({
              ...prev,
              initialization: { ...prev.initialization, knows_numbers: true },
            }))
          }
        />
        <OptionButton
          label="I want a calibration week"
          selected={formAnswers.initialization.knows_numbers === false}
          onPress={() =>
            setFormAnswers((prev) => ({
              ...prev,
              initialization: { ...prev.initialization, knows_numbers: false },
            }))
          }
        />

        {formAnswers.initialization.knows_numbers === true ? (
          <View style={styles.anchorWrap}>
            <Text style={styles.groupLabel}>Anchor lifts (optional)</Text>
            {LIFT_KEYS.map((liftKey) => (
              <View key={liftKey} style={styles.anchorRow}>
                <Text style={styles.anchorName}>{toPrettyLabel(liftKey)}</Text>
                <TextInput
                  value={String(formAnswers.initialization.anchors?.[liftKey]?.weight || '')}
                  onChangeText={(text) => updateAnchor(liftKey, 'weight', text.replace(/[^0-9.]/g, ''))}
                  placeholder="kg"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="numeric"
                  style={styles.anchorInput}
                />
                <TextInput
                  value={String(formAnswers.initialization.anchors?.[liftKey]?.reps || '')}
                  onChangeText={(text) => updateAnchor(liftKey, 'reps', text.replace(/[^0-9]/g, ''))}
                  placeholder="reps"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="number-pad"
                  style={styles.anchorInput}
                />
              </View>
            ))}
          </View>
        ) : null}

        {formAnswers.initialization.knows_numbers === false ? (
          <View style={styles.calibrationWrap}>
            <Text style={styles.groupLabel}>Preferred RIR target for calibration week</Text>
            <View style={styles.chipsWrap}>
              {[1, 2, 3].map((rir) => (
                <Chip
                  key={`rir_${rir}`}
                  label={`RIR ${rir}`}
                  selected={formAnswers.initialization.rir_preference === rir}
                  onPress={() =>
                    setFormAnswers((prev) => ({
                      ...prev,
                      initialization: { ...prev.initialization, rir_preference: rir },
                    }))
                  }
                />
              ))}
            </View>
            <Text style={styles.helperMini}>Week 1 will calibrate loads before progression.</Text>
          </View>
        ) : null}
      </View>
    );
  };

  if (isResults) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultsTitle}>Form Onboarding Results</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Goal</Text>
              <Text style={styles.summaryValue}>{toPrettyLabel(formAnswers.goal_primary || '—')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Schedule</Text>
              <Text style={styles.summaryValue}>
                {formAnswers.days_per_week || '—'} days • {formAnswers.session_minutes || '—'} min
              </Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Equipment</Text>
              <Text style={styles.summaryValue}>{toPrettyLabel(formAnswers.equipment || '—')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Experience</Text>
              <Text style={styles.summaryValue}>{toPrettyLabel(formAnswers.experience || '—')}</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Constraints</Text>
              <Text style={styles.summaryValue}>
                {formAnswers.constraints.injuries || 'None'}
              </Text>
            </View>
          </View>

          <View style={styles.seedCard}>
            <Text style={styles.seedTitle}>Program Seed</Text>
            <Text style={styles.seedLine}>Phase: {toPrettyLabel(programSeed.phase)}</Text>
            <Text style={styles.seedLine}>Main rep range: {programSeed.rep_ranges.main[0]}-{programSeed.rep_ranges.main[1]}</Text>
            <Text style={styles.seedLine}>Accessory rep range: {programSeed.rep_ranges.accessories[0]}-{programSeed.rep_ranges.accessories[1]}</Text>
            <Text style={styles.seedLine}>
              Weekly sets target: {programSeed.weekly_sets_targets.major_muscles[0]}-{programSeed.weekly_sets_targets.major_muscles[1]}
            </Text>
            <Text style={styles.seedLine}>Progression: {programSeed.progression_rule.type}</Text>
            <Text style={styles.seedLine}>Deload: {programSeed.deload_policy.action}</Text>
          </View>

          <TouchableOpacity
            style={styles.jsonToggle}
            activeOpacity={0.9}
            onPress={() => setJsonExpanded((prev) => !prev)}
          >
            <Text style={styles.jsonToggleText}>{jsonExpanded ? 'Hide JSON' : 'Show JSON'}</Text>
            <Ionicons name={jsonExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={COLORS.muted} />
          </TouchableOpacity>

          {jsonExpanded ? (
            <View style={styles.jsonCard}>
              <Text style={styles.jsonText}>{finalExportJson}</Text>
              <TouchableOpacity style={styles.copyBtn} activeOpacity={0.9} onPress={copyJson}>
                <Ionicons name="copy-outline" size={12} color={COLORS.muted} />
                <Text style={styles.copyBtnText}>{copyState || 'Copy'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {exportedJson ? (
            <View style={styles.exportCard}>
              <Text style={styles.exportTitle}>Export JSON</Text>
              <Text style={styles.exportText}>{exportedJson}</Text>
            </View>
          ) : null}

          <View style={styles.resultsActions}>
            <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={restart}>
              <Text style={styles.secondaryBtnText}>Restart</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.9} onPress={exportJson}>
              <Text style={styles.primaryBtnText}>Export JSON</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.stepCounter}>Step {stepIndex + 1} of {STEPS.length}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Text style={styles.stepTitle}>{currentStep.title}</Text>
        <Text style={styles.stepHelper}>{currentStep.helper}</Text>

        <ScrollView style={styles.stepBody} contentContainerStyle={styles.stepBodyContent} showsVerticalScrollIndicator={false}>
          {renderStepBody()}
        </ScrollView>

        <View style={styles.navRow}>
          <TouchableOpacity style={styles.secondaryBtn} activeOpacity={0.9} onPress={goBack} disabled={stepIndex === 0}>
            <Text style={[styles.secondaryBtnText, stepIndex === 0 ? styles.disabledText : null]}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, !stepValid ? styles.primaryBtnDisabled : null]}
            activeOpacity={stepValid ? 0.9 : 1}
            disabled={!stepValid}
            onPress={goNext}
          >
            <Text style={[styles.primaryBtnText, !stepValid ? styles.disabledPrimaryText : null]}>
              {stepIndex === STEPS.length - 1 ? 'See Results' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  stepCounter: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  progressTrack: {
    marginTop: 6,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(162,167,179,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accent,
  },
  stepTitle: {
    marginTop: 14,
    color: COLORS.text,
    fontSize: 29,
    fontWeight: '700',
    lineHeight: 35,
  },
  stepHelper: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 13,
  },
  stepBody: {
    flex: 1,
    marginTop: 14,
  },
  stepBodyContent: {
    gap: 8,
    paddingBottom: 8,
  },
  optionButton: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  optionButtonSelected: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  optionText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
  },
  optionTextSelected: {
    color: COLORS.accent,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipSelected: {
    borderColor: 'rgba(245,201,106,0.5)',
    backgroundColor: 'rgba(245,201,106,0.14)',
  },
  chipText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextSelected: {
    color: COLORS.accent,
  },
  blockWrap: {
    gap: 10,
  },
  groupLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  groupSpacing: {
    marginTop: 8,
  },
  textArea: {
    minHeight: 88,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: 11,
    paddingVertical: 9,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  anchorWrap: {
    marginTop: 8,
    gap: 8,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  anchorName: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  anchorInput: {
    width: 68,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.26)',
    backgroundColor: COLORS.card,
    color: COLORS.text,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  calibrationWrap: {
    marginTop: 8,
    gap: 8,
  },
  helperMini: {
    color: COLORS.muted,
    fontSize: 12,
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.52)',
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryBtnDisabled: {
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: 'rgba(162,167,179,0.16)',
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 13,
    fontWeight: '800',
  },
  disabledPrimaryText: {
    color: COLORS.muted,
  },
  secondaryBtn: {
    minWidth: 94,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  disabledText: {
    color: COLORS.muted,
  },
  resultsTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  summaryGrid: {
    gap: 8,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.2)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    marginTop: 2,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '700',
  },
  seedCard: {
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,201,106,0.34)',
    backgroundColor: 'rgba(245,201,106,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 3,
  },
  seedTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  seedLine: {
    color: COLORS.muted,
    fontSize: 12,
  },
  jsonToggle: {
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jsonToggleText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  jsonCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: 'rgba(162,167,179,0.08)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  jsonText: {
    color: COLORS.text,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
  copyBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.28)',
    backgroundColor: COLORS.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  copyBtnText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  exportCard: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(90,209,232,0.26)',
    backgroundColor: 'rgba(90,209,232,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  exportTitle: {
    color: '#73D9FF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  exportText: {
    color: COLORS.text,
    fontFamily: 'Courier',
    fontSize: 11,
    lineHeight: 16,
  },
  resultsActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingBottom: 4,
  },
});

export default TestFormOnboardingSandboxScreen;

