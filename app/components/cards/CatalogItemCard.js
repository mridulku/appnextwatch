import { memo } from 'react';

import CatalogItemCardBase from '../../ui/components/CatalogItemCard';

function CatalogItemCard({
  title,
  subtitle,
  imageUrl,
  onPress,
  primaryActionLabel,
  onPrimaryAction,
  primaryActionDisabled = false,
  primaryActionVariant = 'accent',
  rightControls,
  rightAction,
  badges = [],
  selected = false,
}) {
  return (
    <CatalogItemCardBase
      title={title}
      subtitle={subtitle}
      imageUrl={imageUrl}
      onPress={onPress}
      selected={selected}
      badges={badges}
      actionLabel={primaryActionLabel || 'ADD'}
      actionVariant={primaryActionVariant}
      actionDisabled={primaryActionDisabled}
      onAction={onPrimaryAction}
      rightAction={rightAction || rightControls}
    />
  );
}

export default memo(CatalogItemCard);
