import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ITEM_PLACEHOLDER_IMAGE } from '../../../../core/placeholders';
import COLORS from '../../../../theme/colors';
import UI_TOKENS from '../../../../ui/tokens';

function GroupCard({
  title,
  imageUrl,
  count,
  countLabel = 'items',
  children,
  defaultExpanded = false,
  subtitle = '',
  variant = 'primary',
  expanded: controlledExpanded,
  onToggle,
}) {
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(defaultExpanded);
  const nested = variant === 'nested';
  const expanded = typeof controlledExpanded === 'boolean' ? controlledExpanded : uncontrolledExpanded;

  function handleToggle() {
    if (typeof onToggle === 'function') {
      onToggle();
      return;
    }
    setUncontrolledExpanded((prev) => !prev);
  }

  return (
    <View style={styles.groupCardWrap}>
      <TouchableOpacity
        style={[styles.groupCard, nested ? styles.groupCardNested : styles.groupCardPrimary]}
        activeOpacity={0.9}
        onPress={handleToggle}
      >
        <Image
          source={imageUrl ? { uri: imageUrl } : ITEM_PLACEHOLDER_IMAGE}
          style={[styles.groupImage, nested ? styles.groupImageNested : styles.groupImagePrimary]}
          resizeMode="cover"
        />
        <View style={styles.groupTextWrap}>
          <Text style={[styles.groupTitle, nested ? styles.groupTitleNested : styles.groupTitlePrimary]}>{title}</Text>
          <Text style={[styles.groupMeta, nested ? styles.groupMetaNested : styles.groupMetaPrimary]}>
            {count} {countLabel}{count === 1 ? '' : 's'}{subtitle ? ` • ${subtitle}` : ''}
          </Text>
        </View>
        <View style={[styles.groupChevronWrap, nested ? styles.groupChevronWrapNested : null]}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.muted} />
        </View>
      </TouchableOpacity>
      {expanded ? (
        <View style={[styles.groupChildren, nested ? styles.groupChildrenNested : styles.groupChildrenPrimary]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function CatalogGroupSection({
  section,
  renderItem,
  getSectionMeta,
  countLabel = 'items',
  expandedKeys,
  onToggleKey,
}) {
  if (section.type === 'flat') {
    return (
      <View style={styles.groupWrap}>
        {section.items.map((item) => renderItem(item))}
      </View>
    );
  }

  if (section.type === 'section') {
    const meta = getSectionMeta?.({ title: section.title, type: section.type }) || {};
    const sectionKey = `section:${section.title}`;
    return (
      <GroupCard
        title={section.title}
        imageUrl={meta.imageUrl}
        count={section.items.length}
        subtitle={meta.subtitle}
        variant="primary"
        countLabel={countLabel}
        expanded={expandedKeys?.has(sectionKey)}
        onToggle={onToggleKey ? () => onToggleKey(sectionKey) : undefined}
      >
        {section.items.map((item) => renderItem(item))}
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
        imageUrl={meta.imageUrl}
        count={nestedCount}
        subtitle={meta.subtitle}
        variant="primary"
        countLabel={countLabel}
        expanded={expandedKeys?.has(sectionKey)}
        onToggle={onToggleKey ? () => onToggleKey(sectionKey) : undefined}
      >
        {section.groups.map((group) => {
          const nestedMeta = getSectionMeta?.({ title: group.title, type: 'subsection', parentTitle: section.title }) || {};
          const nestedKey = `subsection:${section.title}:${group.title}`;
          return (
            <View key={`${section.title}_${group.title}`} style={styles.nestedGroupWrap}>
              <GroupCard
                title={group.title}
                imageUrl={nestedMeta.imageUrl}
                count={group.items.length}
                subtitle={nestedMeta.subtitle}
                variant="nested"
                countLabel={countLabel}
                expanded={expandedKeys?.has(nestedKey)}
                onToggle={onToggleKey ? () => onToggleKey(nestedKey) : undefined}
              >
                {group.items.map((item) => renderItem(item))}
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
    borderRadius: UI_TOKENS.radius.lg,
    borderWidth: UI_TOKENS.border.hairline,
    padding: UI_TOKENS.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: UI_TOKENS.spacing.sm,
  },
  groupCardPrimary: {
    borderColor: 'rgba(245,201,106,0.42)',
    backgroundColor: 'rgba(245,201,106,0.1)',
  },
  groupCardNested: {
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: COLORS.card,
  },
  groupImage: {
    borderRadius: UI_TOKENS.card.imageRadius,
    borderWidth: UI_TOKENS.border.hairline,
    borderColor: 'rgba(162,167,179,0.24)',
    backgroundColor: 'rgba(162,167,179,0.1)',
  },
  groupImagePrimary: {
    width: UI_TOKENS.card.imageSize + 4,
    height: UI_TOKENS.card.imageSize + 4,
  },
  groupImageNested: {
    width: UI_TOKENS.card.imageSize - 8,
    height: UI_TOKENS.card.imageSize - 8,
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
    fontSize: UI_TOKENS.typography.subtitle + 3,
  },
  groupTitleNested: {
    color: COLORS.text,
    fontSize: UI_TOKENS.typography.subtitle + 1,
  },
  groupMeta: {
    marginTop: 4,
  },
  groupMetaPrimary: {
    color: COLORS.accent,
    fontSize: UI_TOKENS.typography.meta + 1,
    fontWeight: '700',
  },
  groupMetaNested: {
    color: COLORS.muted,
    fontSize: UI_TOKENS.typography.meta,
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
    paddingLeft: UI_TOKENS.spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(245,201,106,0.24)',
  },
  groupChildrenNested: {
    marginLeft: UI_TOKENS.spacing.sm,
  },
  nestedGroupWrap: {
    marginTop: UI_TOKENS.spacing.xs,
  },
});

export default CatalogGroupSection;
