import { useCallback, useEffect, useMemo, useState } from 'react';

import { getOrCreateAppUser } from '../core/api/foodInventoryDb';
import {
  addUserSelection,
  listCatalogItems,
  listUserSelections,
  removeUserSelection,
} from '../core/api/catalogSelectionDb';

function defaultCategoryResolver(value) {
  return String(value || '').trim() || 'Other';
}

function defaultSearchText(catalogRow) {
  return [catalogRow?.name, catalogRow?.category]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export default function useCatalogSelection({
  user,
  config,
}) {
  const {
    catalogTable,
    catalogSelect,
    catalogOrderBy = 'name',
    userTable,
    userSelect,
    userOrderBy = 'created_at',
    userFkColumn,
    joinKey,
    categoryOrder = [],
    getCatalogCategory = (row) => defaultCategoryResolver(row?.category),
    getCatalogSearchText = defaultSearchText,
    defaultCategory = 'All',
    insertPayload = {},
  } = config;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [appUserId, setAppUserId] = useState(null);
  const [catalogRows, setCatalogRows] = useState([]);
  const [userRows, setUserRows] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  const [modalVisible, setModalVisible] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [pendingAddId, setPendingAddId] = useState(null);
  const [pendingRemoveId, setPendingRemoveId] = useState(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearchQuery(searchInput.trim().toLowerCase());
    }, 280);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const hydrate = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const appUser = await getOrCreateAppUser({
        username: user?.username || 'demo_user',
        name: user?.name || 'Demo User',
      });
      setAppUserId(appUser.id);

      const [catalog, userSelections] = await Promise.all([
        listCatalogItems({
          table: catalogTable,
          select: catalogSelect,
          orderBy: catalogOrderBy,
        }),
        listUserSelections({
          table: userTable,
          userId: appUser.id,
          select: userSelect,
          orderBy: userOrderBy,
        }),
      ]);

      setCatalogRows(catalog);
      setUserRows(userSelections);
    } catch (nextError) {
      setError(nextError?.message || 'Unable to load selection data right now.');
    } finally {
      setLoading(false);
    }
  }, [
    catalogOrderBy,
    catalogSelect,
    catalogTable,
    user?.name,
    user?.username,
    userOrderBy,
    userSelect,
    userTable,
  ]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const selectedCatalogIdSet = useMemo(() => {
    return new Set(
      userRows
        .map((row) => row[userFkColumn])
        .filter(Boolean),
    );
  }, [userRows, userFkColumn]);

  const categoryFilters = useMemo(() => {
    const categories = Array.from(
      new Set(
        catalogRows
          .map((row) => getCatalogCategory(row))
          .filter(Boolean),
      ),
    );

    const prioritized = categoryOrder.filter((category) => categories.includes(category));
    const remaining = categories
      .filter((category) => !prioritized.includes(category))
      .sort((a, b) => a.localeCompare(b));

    return ['All', ...prioritized, ...remaining];
  }, [catalogRows, categoryOrder, getCatalogCategory]);

  const filteredCatalogRows = useMemo(() => {
    return catalogRows.filter((row) => {
      const category = getCatalogCategory(row);
      const searchText = getCatalogSearchText(row);
      const matchesCategory = selectedCategory === 'All' || selectedCategory === category;
      const matchesSearch = !searchQuery || searchText.includes(searchQuery);
      return matchesCategory && matchesSearch;
    });
  }, [catalogRows, getCatalogCategory, getCatalogSearchText, selectedCategory, searchQuery]);

  const groupedUserSections = useMemo(() => {
    const grouped = userRows.reduce((acc, row) => {
      const catalogItem = row[joinKey];
      if (!catalogItem) return acc;
      const category = getCatalogCategory(catalogItem);
      if (!acc[category]) acc[category] = [];
      acc[category].push(row);
      return acc;
    }, {});

    const order = [
      ...categoryOrder.filter((category) => grouped[category]?.length),
      ...Object.keys(grouped)
        .filter((category) => !categoryOrder.includes(category))
        .sort((a, b) => a.localeCompare(b)),
    ];

    return order.map((category) => ({
      title: category,
      itemCount: grouped[category].length,
      data: grouped[category],
    }));
  }, [userRows, joinKey, getCatalogCategory, categoryOrder]);

  const openAddModal = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCategory(defaultCategory);
    setModalVisible(true);
  };

  const closeAddModal = () => {
    setModalVisible(false);
  };

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const addCatalogItem = async (catalogId) => {
    if (!appUserId || !catalogId) return;

    try {
      setPendingAddId(catalogId);
      setError('');
      await addUserSelection({
        table: userTable,
        userId: appUserId,
        fkColumn: userFkColumn,
        fkValue: catalogId,
        payload: insertPayload,
      });

      const nextRows = await listUserSelections({
        table: userTable,
        userId: appUserId,
        select: userSelect,
        orderBy: userOrderBy,
      });
      setUserRows(nextRows);
    } catch (nextError) {
      setError(nextError?.message || 'Could not add item right now.');
    } finally {
      setPendingAddId(null);
    }
  };

  const removeCatalogItem = async (catalogId) => {
    if (!appUserId || !catalogId) return;

    const previousRows = userRows;
    setUserRows((prev) => prev.filter((row) => row[userFkColumn] !== catalogId));

    try {
      setPendingRemoveId(catalogId);
      setError('');
      await removeUserSelection({
        table: userTable,
        userId: appUserId,
        fkColumn: userFkColumn,
        fkValue: catalogId,
      });
    } catch (nextError) {
      setUserRows(previousRows);
      setError(nextError?.message || 'Could not remove item right now.');
    } finally {
      setPendingRemoveId(null);
    }
  };

  return {
    loading,
    error,
    appUserId,
    catalogRows,
    userRows,
    groupedUserSections,
    expandedCategories,
    categoryFilters,
    filteredCatalogRows,
    selectedCatalogIdSet,
    modalVisible,
    searchInput,
    selectedCategory,
    pendingAddId,
    pendingRemoveId,
    setSearchInput,
    setSelectedCategory,
    setError,
    openAddModal,
    closeAddModal,
    toggleCategory,
    addCatalogItem,
    removeCatalogItem,
    hydrate,
  };
}
