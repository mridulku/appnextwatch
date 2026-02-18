import { useCallback } from 'react';

import CatalogCardRow from '../cards/CatalogCardRow';
import SelectFromCatalogModal from '../modals/SelectFromCatalogModal';

function CatalogPickerModal({
  visible,
  title,
  subtitle,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  categories,
  selectedCategory,
  onSelectCategory,
  items,
  selectedIdSet,
  pendingAddId,
  pendingRemoveId,
  getItemId,
  getItemTitle,
  getItemSubtitle,
  getItemImageUrl,
  onAdd,
  onRemove,
  onClose,
  emptyText = 'No items match this filter.',
  selectedActionMode = 'added',
}) {
  const renderRow = useCallback(
    ({ item }) => {
      const id = getItemId(item);
      const isAdded = selectedIdSet.has(id);
      const isBusy = pendingAddId === id || pendingRemoveId === id;

      let actionLabel = 'ADD';
      let actionVariant = 'accent';
      let actionDisabled = false;
      let onAction = () => onAdd(id);

      if (isAdded) {
        if (selectedActionMode === 'remove' && onRemove) {
          actionLabel = isBusy ? '...' : 'REMOVE';
          actionVariant = 'muted';
          actionDisabled = isBusy;
          onAction = () => onRemove(id);
        } else {
          actionLabel = 'ADDED';
          actionVariant = 'success';
          actionDisabled = true;
          onAction = undefined;
        }
      } else if (isBusy) {
        actionLabel = '...';
        actionDisabled = true;
      }

      return (
        <CatalogCardRow
          title={getItemTitle(item)}
          subtitle={getItemSubtitle(item)}
          imageUrl={getItemImageUrl ? getItemImageUrl(item) : null}
          selected={isAdded}
          actionLabel={actionLabel}
          actionVariant={actionVariant}
          actionDisabled={actionDisabled}
          onAction={onAction}
          onPress={actionDisabled ? undefined : onAction}
        />
      );
    },
    [
      getItemId,
      getItemImageUrl,
      getItemSubtitle,
      getItemTitle,
      onAdd,
      onRemove,
      pendingAddId,
      pendingRemoveId,
      selectedActionMode,
      selectedIdSet,
    ],
  );

  return (
    <SelectFromCatalogModal
      visible={visible}
      title={title}
      subtitle={subtitle}
      searchPlaceholder={searchPlaceholder}
      searchValue={searchValue}
      onSearchChange={onSearchChange}
      categories={categories}
      selectedCategory={selectedCategory}
      onSelectCategory={onSelectCategory}
      data={items}
      keyExtractor={(item) => getItemId(item)}
      renderItem={renderRow}
      onClose={onClose}
      doneLabel="Done"
      emptyText={emptyText}
    />
  );
}

export default CatalogPickerModal;
