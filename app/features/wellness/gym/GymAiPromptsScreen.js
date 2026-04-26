import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { listAiPromptConfigs, updateAiPromptConfig } from '../../../core/api/aiPromptConfigsDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function labelForUseCase(config) {
  return config?.title || config?.use_case_key || 'AI prompt';
}

export default function GymAiPromptsScreen({ embedded = false, showHeader = true }) {
  const [configs, setConfigs] = useState([]);
  const [selectedKey, setSelectedKey] = useState(null);
  const [draft, setDraft] = useState({
    system_prompt: '',
    data_attachment_spec: '',
    response_structure: '',
  });
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle');
  const [saveError, setSaveError] = useState('');

  const loadConfigs = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const rows = await listAiPromptConfigs({ scopeKey: 'gym' });
      setConfigs(rows);
      setSelectedKey((current) => {
        if (current && rows.some((row) => row.use_case_key === current)) return current;
        return rows[0]?.use_case_key || null;
      });
      setStatus('ready');
    } catch (err) {
      setError(err?.message || 'Could not load AI prompt configs.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const selectedConfig = useMemo(
    () => configs.find((row) => row.use_case_key === selectedKey) || null,
    [configs, selectedKey],
  );

  useEffect(() => {
    if (!selectedConfig) {
      setDraft({ system_prompt: '', data_attachment_spec: '', response_structure: '' });
      return;
    }
    setDraft({
      system_prompt: selectedConfig.system_prompt || '',
      data_attachment_spec: selectedConfig.data_attachment_spec || '',
      response_structure: selectedConfig.response_structure || '',
    });
    setSaveStatus('idle');
    setSaveError('');
  }, [selectedConfig]);

  const dirty = Boolean(
    selectedConfig
      && (
        draft.system_prompt !== (selectedConfig.system_prompt || '')
        || draft.data_attachment_spec !== (selectedConfig.data_attachment_spec || '')
        || draft.response_structure !== (selectedConfig.response_structure || '')
      ),
  );

  const onSave = useCallback(async () => {
    if (!selectedConfig || !dirty) return;
    setSaveStatus('saving');
    setSaveError('');
    try {
      const updated = await updateAiPromptConfig({
        useCaseKey: selectedConfig.use_case_key,
        patch: {
          system_prompt: draft.system_prompt,
          data_attachment_spec: draft.data_attachment_spec,
          response_structure: draft.response_structure,
        },
      });
      setConfigs((current) => current.map((row) => (
        row.use_case_key === updated.use_case_key ? updated : row
      )));
      setSaveStatus('saved');
    } catch (err) {
      setSaveError(err?.message || 'Could not save AI prompt config.');
      setSaveStatus('error');
    }
  }, [dirty, draft, selectedConfig]);

  return (
    <View style={[styles.screen, embedded && styles.embeddedScreen]}>
      {showHeader ? (
        <View style={styles.header}>
          <Text style={styles.title}>AI prompts</Text>
          <Text style={styles.subtitle}>
            Manage the prompt, attached data description, and expected response shape for gym AI use cases.
          </Text>
        </View>
      ) : null}

      {status === 'loading' ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.stateText}>Loading AI prompt configs...</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {status === 'ready' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Use cases</Text>
            <Text style={styles.sectionSubtitle}>Choose the gym AI workflow you want to inspect or revise.</Text>
            <View style={styles.useCaseList}>
              {configs.map((config) => {
                const selected = config.use_case_key === selectedKey;
                return (
                  <TouchableOpacity
                    key={config.use_case_key}
                    style={[styles.useCaseButton, selected && styles.useCaseButtonActive]}
                    onPress={() => setSelectedKey(config.use_case_key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.useCaseTitle, selected && styles.useCaseTitleActive]}>
                      {labelForUseCase(config)}
                    </Text>
                    {config.subtitle ? (
                      <Text style={[styles.useCaseSubtitle, selected && styles.useCaseSubtitleActive]}>
                        {config.subtitle}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {selectedConfig ? (
            <View style={styles.sectionCard}>
              <View style={styles.editorHeader}>
                <View style={styles.editorHeaderTextWrap}>
                  <Text style={styles.sectionTitle}>{labelForUseCase(selectedConfig)}</Text>
                  {selectedConfig.subtitle ? (
                    <Text style={styles.sectionSubtitle}>{selectedConfig.subtitle}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[styles.saveButton, !dirty && styles.saveButtonDisabled]}
                  onPress={onSave}
                  disabled={!dirty || saveStatus === 'saving'}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.saveButtonText, !dirty && styles.saveButtonTextDisabled]}>
                    {saveStatus === 'saving' ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Prompt sent to OpenAI</Text>
                <TextInput
                  style={[styles.textArea, styles.promptArea]}
                  value={draft.system_prompt}
                  onChangeText={(value) => {
                    setDraft((current) => ({ ...current, system_prompt: value }));
                    setSaveStatus('idle');
                    setSaveError('');
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="System prompt"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Data attached</Text>
                <TextInput
                  style={styles.textArea}
                  value={draft.data_attachment_spec}
                  onChangeText={(value) => {
                    setDraft((current) => ({ ...current, data_attachment_spec: value }));
                    setSaveStatus('idle');
                    setSaveError('');
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="Describe the payload attached to the prompt"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>Response structure</Text>
                <TextInput
                  style={styles.textArea}
                  value={draft.response_structure}
                  onChangeText={(value) => {
                    setDraft((current) => ({ ...current, response_structure: value }));
                    setSaveStatus('idle');
                    setSaveError('');
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="Expected response format"
                  placeholderTextColor={COLORS.muted}
                />
              </View>

              {saveStatus === 'saved' ? <Text style={styles.savedText}>Saved.</Text> : null}
              {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  embeddedScreen: {
    paddingTop: UI_TOKENS.spacing.sm,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    marginTop: 6,
    fontSize: 15,
    lineHeight: 21,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 28,
    gap: 14,
  },
  stateCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stateText: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
  },
  errorCard: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(166,87,84,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(212,120,120,0.44)',
  },
  errorText: {
    color: COLORS.dangerText || '#ffb4b4',
    fontSize: 15,
    lineHeight: 20,
  },
  sectionCard: {
    borderRadius: 28,
    padding: 18,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 14,
    marginTop: 5,
    lineHeight: 19,
  },
  useCaseList: {
    marginTop: 14,
    gap: 10,
  },
  useCaseButton: {
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  useCaseButtonActive: {
    backgroundColor: 'rgba(140,118,74,0.22)',
    borderColor: COLORS.accent,
  },
  useCaseTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '700',
  },
  useCaseTitleActive: {
    color: COLORS.accent,
  },
  useCaseSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  useCaseSubtitleActive: {
    color: COLORS.textMuted || COLORS.muted,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  editorHeaderTextWrap: {
    flex: 1,
  },
  saveButton: {
    minWidth: 84,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.surfaceMuted || COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveButtonText: {
    color: COLORS.bg,
    fontSize: 15,
    fontWeight: '800',
  },
  saveButtonTextDisabled: {
    color: COLORS.muted,
  },
  fieldBlock: {
    marginTop: 16,
  },
  fieldLabel: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 120,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },
  promptArea: {
    minHeight: 160,
  },
  savedText: {
    color: COLORS.successText || '#98d59c',
    marginTop: 14,
    fontSize: 14,
    fontWeight: '700',
  },
});
