import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import CatalogItemCard from '../../../ui/components/CatalogItemCard';
import { listGymTemplates } from '../../../core/api/gymTemplatesDb';
import COLORS from '../../../theme/colors';
import UI_TOKENS from '../../../ui/tokens';

function GymTemplatesHomeScreen({ navigation, embedded = false, showHeader = true }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [inlineError, setInlineError] = useState('');
  const [templates, setTemplates] = useState([]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setInlineError('');
      const rows = await listGymTemplates();
      setTemplates(rows);
    } catch (error) {
      setInlineError(error?.message || 'Could not load templates right now.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      hydrate();
    }, [hydrate]),
  );

  const RootContainer = embedded ? View : SafeAreaView;

  if (loading) {
    return (
      <RootContainer style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading templates...</Text>
        </View>
      </RootContainer>
    );
  }

  return (
    <RootContainer style={styles.safeArea}>
      <View style={[styles.container, embedded && styles.containerEmbedded]}>
        <View style={styles.headerWrap}>
          {showHeader ? (
            <>
              <Text style={styles.title}>Templates</Text>
              <Text style={styles.subtitle}>Standard Push / Pull / Legs structures you can use as session blueprints.</Text>
            </>
          ) : null}
        </View>

        {inlineError ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{inlineError}</Text>
            <TouchableOpacity style={styles.retryButton} activeOpacity={0.9} onPress={hydrate}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={[styles.listContent, { paddingBottom: 130 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {templates.map((template) => (
            <CatalogItemCard
              key={template.id}
              title={template.name}
              subtitle={`${template.focus || 'Gym template'} • ${template.exerciseCount} exercises`}
              badges={[{ label: `${template.exerciseCount} exercises`, tone: 'default' }]}
              actionLabel="VIEW"
              actionVariant="muted"
              onPress={() => navigation?.navigate('GymTemplateDetail', { templateId: template.id, title: template.name })}
              onAction={() => navigation?.navigate('GymTemplateDetail', { templateId: template.id, title: template.name })}
            />
          ))}
        </ScrollView>
      </View>

      <View style={[styles.bottomBar, { bottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity
          style={styles.voiceButton}
          activeOpacity={0.92}
          onPress={() => Alert.alert('Voice Command', 'Template voice command is coming soon.')}
        >
          <Ionicons name="mic" size={18} color={COLORS.bg} />
          <Text style={styles.voiceButtonText}>Voice Command</Text>
        </TouchableOpacity>
      </View>
    </RootContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  containerEmbedded: {
    paddingTop: 6,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 13,
  },
  headerWrap: {
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 30,
    fontWeight: '700',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  errorCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.4)',
    backgroundColor: 'rgba(255,124,123,0.12)',
    padding: 12,
    marginBottom: 10,
  },
  errorText: {
    color: '#FFB4A8',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 10,
    alignSelf: 'flex-start',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,124,123,0.45)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  retryText: {
    color: '#FFB4A8',
    fontWeight: '700',
    fontSize: 12,
  },
  listContent: {
    gap: UI_TOKENS.spacing.xs,
  },
  bottomBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    minHeight: 74,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(18,25,43,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  voiceButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  voiceButtonText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default GymTemplatesHomeScreen;
