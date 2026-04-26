import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import SelectedCatalogItemCard from '../../../../components/cards/SelectedCatalogItemCard';
import { ITEM_PLACEHOLDER_IMAGE } from '../../../../core/placeholders';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';

function navigateToVariantList(navigation, movement, selectedCatalogIdSet) {
  navigation.navigate('ExerciseVariants', {
    movementId: movement.id,
    movementName: movement?.name,
    movement,
    selectedCatalogIds: Array.from(selectedCatalogIdSet || []),
  });
}

function navigateToVariantDetail(navigation, movement, variantId = null, isAdded = false) {
  navigation.navigate('ExerciseDetail', {
    movementId: movement.id,
    exerciseId: variantId,
    selectedVariantId: variantId,
    exerciseName: variantId ? (movement?.variants || []).find((variant) => variant.id === variantId)?.name || movement?.name : movement?.name,
    movementName: movement?.name,
    item: variantId ? (movement?.variants || []).find((variant) => variant.id === variantId) || null : null,
    movement,
    fromCatalog: true,
    isAdded,
  });
}

function VariantCard({ movement, variant, navigation, isAdded }) {
  const variantLabel = variant?.variantLabel || variant?.variant_label || variant?.equipment || 'Variant';
  return (
    <SelectedCatalogItemCard
      title={variant?.name || 'Variant'}
      subtitle={`${variantLabel} • ${variant?.muscle || variant?.primary_muscle_group || movement?.muscle || 'Muscle'} • ${variant?.equipment || 'Equipment'}`}
      imageUrl={variant?.image_url || movement?.image_url || null}
      badges={isAdded ? [{ label: '★ Favorite', tone: 'warn' }] : []}
      onPress={() => navigateToVariantDetail(navigation, movement, variant.id, isAdded)}
      topAction={{
        iconName: 'create-outline',
        onPress: () => navigateToVariantDetail(navigation, movement, variant.id, isAdded),
      }}
    />
  );
}

function MovementCard({ movement, navigation, selectedCatalogIdSet, depth = 0 }) {
  const variants = movement?.variants || [];
  const favoriteCount = useMemo(
    () => variants.reduce((sum, variant) => sum + (selectedCatalogIdSet.has(variant.id) ? 1 : 0), 0),
    [selectedCatalogIdSet, variants],
  );
  const primaryVariant = variants.find((variant) => variant?.isPrimaryVariant || variant?.is_primary_variant) || variants[0] || null;
  const imageUrl = movement?.image_url || primaryVariant?.image_url || null;
  const subtitleParts = [movement?.muscle || movement?.primary_muscle_group || 'Exercise'];
  if (favoriteCount) subtitleParts.push(`${favoriteCount} favorite${favoriteCount === 1 ? '' : 's'}`);
  const hasMultipleVariants = variants.length > 1;
  const openMovement = () => {
    if (hasMultipleVariants) {
      navigateToVariantList(navigation, movement, selectedCatalogIdSet);
      return;
    }
    navigateToVariantDetail(
      navigation,
      movement,
      primaryVariant?.id || null,
      primaryVariant ? selectedCatalogIdSet.has(primaryVariant.id) : false,
    );
  };

  return (
    <View style={[styles.movementWrap, depth > 0 ? styles.movementWrapNested : null]}>
      <TouchableOpacity
        style={[styles.movementCard, depth > 0 ? styles.movementCardNested : null]}
        activeOpacity={0.92}
        onPress={openMovement}
      >
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={styles.movementImage}
          resizeMode="cover"
        />
        <View style={styles.movementTextWrap}>
          <Text style={styles.movementTitle}>{movement?.name || 'Movement'}</Text>
          <Text style={styles.movementMeta}>{subtitleParts.join(' • ')}</Text>
        </View>
        <View style={styles.movementActions}>
          {hasMultipleVariants ? (
            <View style={styles.viewButton}>
              <Text style={styles.viewButtonText}>{variants.length} {variants.length === 1 ? 'variant' : 'variants'}</Text>
            </View>
          ) : null}
          <View style={styles.chevronPill}>
            <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function GroupCard({ title, count, children, defaultExpanded = false, subtitle = '', variant = 'primary', expanded: expandedProp, onToggle }) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const nested = variant === 'nested';
  const expanded = typeof expandedProp === 'boolean' ? expandedProp : internalExpanded;

  const handleToggle = () => {
    if (typeof onToggle === 'function') {
      onToggle();
      return;
    }
    setInternalExpanded((prev) => !prev);
  };

  return (
    <View style={styles.groupCardWrap}>
      <TouchableOpacity
        style={[styles.groupCard, nested ? styles.groupCardNested : styles.groupCardPrimary]}
        activeOpacity={0.9}
        onPress={handleToggle}
      >
        <View style={[styles.groupMarker, nested ? styles.groupMarkerNested : styles.groupMarkerPrimary]} />
        <View style={styles.groupTextWrap}>
          <Text style={[styles.groupTitle, nested ? styles.groupTitleNested : styles.groupTitlePrimary]}>{title}</Text>
          <Text style={[styles.groupMeta, nested ? styles.groupMetaNested : styles.groupMetaPrimary]}>
            {count} movement{count === 1 ? '' : 's'}{subtitle ? ` • ${subtitle}` : ''}
          </Text>
        </View>
        <View style={[styles.groupChevronWrap, nested ? styles.groupChevronWrapNested : null]}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
      {expanded ? <View style={[styles.groupChildren, nested ? styles.groupChildrenNested : styles.groupChildrenPrimary]}>{children}</View> : null}
    </View>
  );
}

function renderMovementRows(items, navigation, selectedCatalogIdSet, options = {}) {
  const { depth = 0 } = options;
  return items.map((movement) => (
    <View key={movement.id} style={styles.cardWrap}>
      <MovementCard
        movement={movement}
        navigation={navigation}
        selectedCatalogIdSet={selectedCatalogIdSet}
        depth={depth}
      />
    </View>
  ));
}

function ExerciseGroupSection({ section, navigation, selectedCatalogIdSet, getSectionMeta, expansionState, onToggleExpansion }) {
  if (section.type === 'flat') {
    return <View style={styles.groupWrap}>{renderMovementRows(section.items, navigation, selectedCatalogIdSet)}</View>;
  }

  if (section.type === 'section') {
    const meta = getSectionMeta?.({ title: section.title, type: section.type }) || {};
    const sectionKey = `section:${section.title}`;
    return (
      <GroupCard
        title={section.title}
        count={section.items.length}
        subtitle={meta.subtitle}
        variant="primary"
        expanded={expansionState ? Boolean(expansionState[sectionKey]) : undefined}
        onToggle={onToggleExpansion ? () => onToggleExpansion(sectionKey) : undefined}
      >
        {renderMovementRows(section.items, navigation, selectedCatalogIdSet, { depth: 1 })}
      </GroupCard>
    );
  }

  if (section.type === 'nested') {
    const meta = getSectionMeta?.({ title: section.title, type: section.type }) || {};
    const nestedCount = section.groups.reduce((sum, group) => sum + group.items.length, 0);
    const sectionKey = `section:${section.title}`;
    return (
      <GroupCard
        title={section.title}
        count={nestedCount}
        subtitle={meta.subtitle}
        variant="primary"
        expanded={expansionState ? Boolean(expansionState[sectionKey]) : undefined}
        onToggle={onToggleExpansion ? () => onToggleExpansion(sectionKey) : undefined}
      >
        {section.groups.map((group) => {
          const groupMeta = getSectionMeta?.({ title: group.title, type: 'subsection', parentTitle: section.title }) || {};
          const groupKey = `subsection:${section.title}:${group.title}`;
          return (
            <View key={`${section.title}_${group.title}`} style={styles.nestedGroupWrap}>
              <GroupCard
                title={group.title}
                count={group.items.length}
                subtitle={groupMeta.subtitle}
                variant="nested"
                expanded={expansionState ? Boolean(expansionState[groupKey]) : undefined}
                onToggle={onToggleExpansion ? () => onToggleExpansion(groupKey) : undefined}
              >
                {renderMovementRows(group.items, navigation, selectedCatalogIdSet, { depth: 2 })}
              </GroupCard>
            </View>
          );
        })}
      </GroupCard>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  groupWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  groupCardWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  groupCard: {
    borderRadius: 14,
    borderWidth: UI_TOKENS.border.hairline,
    paddingHorizontal: UI_TOKENS.spacing.md,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  groupCardPrimary: {
    borderColor: 'rgba(245,201,106,0.26)',
    backgroundColor: 'rgba(245,201,106,0.08)',
  },
  groupCardNested: {
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  groupMarker: {
    borderRadius: 999,
    flexShrink: 0,
  },
  groupMarkerPrimary: {
    width: 10,
    height: 10,
    backgroundColor: 'rgba(245,201,106,0.92)',
  },
  groupMarkerNested: {
    width: 8,
    height: 8,
    backgroundColor: 'rgba(162,167,179,0.9)',
  },
  groupTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  groupTitle: {
    fontWeight: '700',
  },
  groupTitlePrimary: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
  },
  groupTitleNested: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle,
  },
  groupMeta: {
    marginTop: 4,
  },
  groupMetaPrimary: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '600',
  },
  groupMetaNested: {
    color: COLORS.muted,
    fontSize: 11,
  },
  groupChevronWrap: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupChevronWrapNested: {
    opacity: 0.85,
  },
  groupChildren: {
    marginTop: UI_TOKENS.spacing.xs,
  },
  groupChildrenPrimary: {
    marginLeft: UI_TOKENS.spacing.md,
    paddingLeft: UI_TOKENS.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(245,201,106,0.22)',
  },
  groupChildrenNested: {
    marginLeft: UI_TOKENS.spacing.md,
    paddingLeft: UI_TOKENS.spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(162,167,179,0.18)',
  },
  nestedGroupWrap: {
    marginTop: UI_TOKENS.spacing.xs,
  },
  cardWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
  movementWrap: {
    marginBottom: UI_TOKENS.spacing.xs,
  },
  movementWrapNested: {
    marginLeft: UI_TOKENS.spacing.xs,
  },
  movementCard: {
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.22)',
    backgroundColor: COLORS.card,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  movementCardNested: {
    borderColor: 'rgba(162,167,179,0.18)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  movementImage: {
    width: UI_TOKENS.card.imageSize,
    height: UI_TOKENS.card.imageSize,
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  movementTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  movementTitle: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 2,
    fontWeight: '700',
  },
  movementMeta: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
    marginTop: 4,
  },
  movementActions: {
    alignItems: 'center',
    gap: UI_TOKENS.spacing.xs,
  },
  viewButton: {
    minWidth: 74,
    minHeight: 34,
    borderRadius: UI_TOKENS.radius.sm,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.3)',
    backgroundColor: 'rgba(162,167,179,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: UI_TOKENS.spacing.sm,
  },
  viewButtonText: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.meta,
    fontWeight: '700',
  },
  chevronPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  variantList: {
    marginTop: UI_TOKENS.spacing.xs,
    marginLeft: UI_TOKENS.spacing.md,
    paddingLeft: UI_TOKENS.spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(245,201,106,0.24)',
  },
  variantWrap: {
    marginBottom: UI_TOKENS.spacing.sm,
  },
});

export default ExerciseGroupSection;
