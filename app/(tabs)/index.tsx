import { FixedExpenseListItem } from '@/components/FixedExpenseListItem';
import { MonthSelector } from '@/components/MonthSelector';
import { PlannedIncomeListItem } from '@/components/PlannedIncomeListItem';
import { TransactionListItem } from '@/components/TransactionListItem';
import { ValuesVisibilityButton } from '@/components/ValuesVisibilityButton';
import { useMonth } from '@/context/MonthContext';
import { useValuesVisibility } from '@/context/ValuesVisibilityContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { pt } from '@/locales/pt';
import { getAllCategories } from '@/services/categoryService';
import {
  getCategorySpendingByMonth,
  getMonthlyTotals,
  getTransactionsByMonth,
  updateTransactionPaid,
} from '@/services/transactionService';
import { formatDateStr, getMonthRange, parseDateStr } from '@/utils/dateUtils';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import React, { useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type FilterState = {
  nameQuery: string;
  categoryIds: number[];
  startDate: string | null;
  endDate: string | null;
  transactionType: 'all' | 'income' | 'expense';
};

const EMPTY_FILTER: FilterState = {
  nameQuery: '',
  categoryIds: [],
  startDate: null,
  endDate: null,
  transactionType: 'all',
};

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { formatCurrency } = useValuesVisibility();
  const { selectedMonth } = useMonth();
  const categories = useMemo(() => getAllCategories(), []);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactionsExpanded, setTransactionsExpanded] = useState(true);
  const [plannedExpensesExpanded, setPlannedExpensesExpanded] = useState(true);
  const [fixedExpensesExpanded, setFixedExpensesExpanded] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filter, setFilter] = useState<FilterState>(EMPTY_FILTER);
  const [draftFilter, setDraftFilter] = useState<FilterState>(EMPTY_FILTER);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const { startDate: monthStartDate, endDate: monthEndDateExclusive } = useMemo(
    () => getMonthRange(selectedMonth.month, selectedMonth.year),
    [selectedMonth]
  );
  const monthStart = useMemo(() => parseDateStr(monthStartDate), [monthStartDate]);
  const monthEndInclusive = useMemo(
    () => parseDateStr(formatDateStr(new Date(parseDateStr(monthEndDateExclusive).getTime() - 86400000))),
    [monthEndDateExclusive]
  );

  const isFilterActive =
    filter.nameQuery.trim().length > 0 ||
    filter.categoryIds.length > 0 ||
    filter.startDate != null ||
    filter.endDate != null ||
    filter.transactionType !== 'all';

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              setDraftFilter(filter);
              setFilterModalVisible(true);
            }}
            style={({ pressed }) => [
              styles.filterHeaderButton,
              pressed && styles.pressed,
            ]}
            hitSlop={8}
          >
            <FontAwesome
              name="filter"
              size={20}
              color={isFilterActive ? colors.tint : colors.text}
            />
          </Pressable>
          <ValuesVisibilityButton />
        </View>
      ),
    });
  }, [navigation, filter, isFilterActive, colors.text, colors.tint]);

  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey((k) => k + 1);
    }, []),
  );

  const { income, expense, balance } = useMemo(
    () => getMonthlyTotals(selectedMonth),
    [selectedMonth, refreshKey],
  );

  const allTransactions = useMemo(
    () => getTransactionsByMonth(selectedMonth),
    [selectedMonth, refreshKey],
  );

  const filteredTransactions = useMemo(() => {
    const query = filter.nameQuery.trim().toLowerCase();
    return allTransactions.filter((t) => {
      const matchesName = query.length === 0 || t.name.toLowerCase().includes(query);
      const matchesCategory =
        filter.categoryIds.length === 0 || (t.category_id != null && filter.categoryIds.includes(t.category_id));
      const matchesStartDate = filter.startDate == null || t.date >= filter.startDate;
      const matchesEndDate = filter.endDate == null || t.date <= filter.endDate;
      const matchesType = filter.transactionType === 'all' || t.type === filter.transactionType;
      return matchesName && matchesCategory && matchesStartDate && matchesEndDate && matchesType;
    });
  }, [allTransactions, filter]);

  const regularTransactions = useMemo(() => {
    const list = filteredTransactions.filter(
      (t) => t.fixed_expense_id == null && (t.planned ?? 0) !== 1
    );
    return [...list].sort((a, b) => {
      const dateCmp = (b.date || '').localeCompare(a.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.category_name || '').localeCompare(b.category_name || '');
    });
  }, [filteredTransactions]);

  const plannedTransactions = useMemo(() => {
    const list = filteredTransactions.filter(
      (t) => t.fixed_expense_id == null && (t.planned ?? 0) === 1
    );
    return [...list].sort((a, b) => {
      const paidCmp = (a.paid ?? 0) - (b.paid ?? 0);
      if (paidCmp !== 0) return paidCmp;
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.category_name || '').localeCompare(b.category_name || '');
    });
  }, [filteredTransactions]);

  const fixedExpenseTransactions = useMemo(() => {
    const list = filteredTransactions.filter((t) => t.fixed_expense_id != null);
    return [...list].sort((a, b) => {
      const paidCmp = (a.paid ?? 0) - (b.paid ?? 0);
      if (paidCmp !== 0) return paidCmp;
      const dateCmp = (a.date || '').localeCompare(b.date || '');
      if (dateCmp !== 0) return dateCmp;
      return (a.category_name || '').localeCompare(b.category_name || '');
    });
  }, [filteredTransactions]);

  const getSectionSubtotal = (transactions: typeof allTransactions) =>
    transactions.reduce((sum, tx) => {
      const sign = tx.type === 'income' ? 1 : -1;
      return sum + tx.amount * sign;
    }, 0);

  const regularSubtotal = useMemo(() => getSectionSubtotal(regularTransactions), [regularTransactions]);
  const plannedSubtotal = useMemo(() => getSectionSubtotal(plannedTransactions), [plannedTransactions]);
  const fixedSubtotal = useMemo(() => getSectionSubtotal(fixedExpenseTransactions), [fixedExpenseTransactions]);
  const filteredTotal = useMemo(() => getSectionSubtotal(filteredTransactions), [filteredTransactions]);

  const handleTogglePaid = (id: number, paid: number) => {
    updateTransactionPaid({ id, paid });
    setRefreshKey((k) => k + 1);
  };

  const categoriesOverLimit = useMemo(() => {
    const spending = getCategorySpendingByMonth(selectedMonth);
    return spending.filter((c) => c.limit != null && c.spent > (c.limit ?? 0));
  }, [selectedMonth, refreshKey]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const toggleCategoryInDraft = (categoryId: number) => {
    setDraftFilter((prev) => {
      const exists = prev.categoryIds.includes(categoryId);
      return {
        ...prev,
        categoryIds: exists
          ? prev.categoryIds.filter((id) => id !== categoryId)
          : [...prev.categoryIds, categoryId],
      };
    });
  };

  const applyFilters = () => {
    if (
      draftFilter.startDate != null &&
      draftFilter.endDate != null &&
      draftFilter.startDate > draftFilter.endDate
    ) {
      Alert.alert(pt.filterInvalidDateRangeTitle, pt.filterInvalidDateRangeMessage);
      return;
    }
    if (
      (draftFilter.startDate != null &&
        (draftFilter.startDate < monthStartDate || draftFilter.startDate >= monthEndDateExclusive)) ||
      (draftFilter.endDate != null &&
        (draftFilter.endDate < monthStartDate || draftFilter.endDate >= monthEndDateExclusive))
    ) {
      Alert.alert(pt.filterOutOfMonthRangeTitle, pt.filterOutOfMonthRangeMessage);
      return;
    }
    setFilter(draftFilter);
    setFilterModalVisible(false);
  };

  const clearDraftFilters = () => {
    setDraftFilter(EMPTY_FILTER);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <MonthSelector />

      <View style={styles.cardsRow}>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.totalIncome}
          </Text>
          <Text style={[styles.cardValue, { color: colors.income }]}>
            {formatCurrency(income)}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.totalExpense}
          </Text>
          <Text style={[styles.cardValue, { color: colors.expense }]}>
            {formatCurrency(expense)}
          </Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.theme.card }]}>
          <Text style={[styles.cardLabel, { color: colors.tabIconDefault }]}>
            {pt.balance}
          </Text>
          <Text
            style={[
              styles.cardValue,
              { color: balance >= 0 ? colors.income : colors.expense },
            ]}
          >
            {formatCurrency(balance)}
          </Text>
        </View>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          onPress={() => router.push('/add-expense')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.expenseButton },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name='arrow-up' size={18} color='#fff' />
          <Text style={styles.actionButtonText}>{pt.addExpense}</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/add-income')}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: colors.incomeButton },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome name='arrow-down' size={18} color='#fff' />
          <Text style={styles.actionButtonText}>{pt.addIncome}</Text>
        </Pressable>
      </View>

      {categoriesOverLimit.length > 0 && (
        <View style={styles.section}>
          <Text
            style={[
              styles.sectionTitle,
              styles.sectionTitlePadded,
              { color: colors.text },
            ]}
          >
            {pt.categoriesOverLimit}
          </Text>
          {categoriesOverLimit.map((c) => (
            <View
              key={c.categoryId}
              style={[
                styles.overLimitCard,
                { backgroundColor: colors.theme.warning + '20' },
              ]}
            >
              <Text style={[styles.overLimitName, { color: colors.text }]}>
                {c.categoryName}
              </Text>
              <Text
                style={[
                  styles.overLimitAmount,
                  { color: colors.theme.warning },
                ]}
              >
                {formatCurrency(c.spent)} / {formatCurrency(c.limit ?? 0)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Pressable
          onPress={() => setTransactionsExpanded((e) => !e)}
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && styles.pressed,
          ]}
        >
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {pt.transactions}
            </Text>
            <Text style={[styles.sectionSubtotal, { color: colors.tabIconDefault }]}>
              {pt.subtotal}: {formatCurrency(regularSubtotal)}
            </Text>
          </View>
          <FontAwesome
            name={transactionsExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={colors.tabIconDefault}
          />
        </Pressable>
        {transactionsExpanded && (
          <>
            {regularTransactions.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                {isFilterActive
                  ? 'Nenhuma transação encontrada com os filtros aplicados'
                  : pt.noTransactions}
              </Text>
            ) : (
              regularTransactions.map((tx) => (
                <TransactionListItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                />
              ))
            )}
          </>
        )}
      </View>

      <View style={styles.section}>
          <Pressable
            onPress={() => setPlannedExpensesExpanded((e) => !e)}
            style={({ pressed }) => [
              styles.sectionHeader,
              pressed && styles.pressed,
            ]}
          >
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {pt.planned}
              </Text>
              <Text style={[styles.sectionSubtotal, { color: colors.tabIconDefault }]}>
                {pt.subtotal}: {formatCurrency(plannedSubtotal)}
              </Text>
            </View>
            <FontAwesome
              name={plannedExpensesExpanded ? 'chevron-down' : 'chevron-right'}
              size={18}
              color={colors.tabIconDefault}
            />
          </Pressable>
          {plannedExpensesExpanded && (
            <>
              {plannedTransactions.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
                  {isFilterActive
                    ? 'Nenhum item planejado encontrado com os filtros aplicados'
                    : pt.noPlanned}
                </Text>
              ) : (
                plannedTransactions.map((tx) =>
                  tx.type === 'expense' ? (
                    <FixedExpenseListItem
                      key={tx.id}
                      transaction={tx}
                      onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                      onTogglePaid={handleTogglePaid}
                    />
                  ) : (
                    <PlannedIncomeListItem
                      key={tx.id}
                      transaction={tx}
                      onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                      onTogglePaid={handleTogglePaid}
                    />
                  )
                )
              )}
            </>
          )}
      </View>

      <View style={styles.section}>
        <Pressable
          onPress={() => setFixedExpensesExpanded((e) => !e)}
          style={({ pressed }) => [
            styles.sectionHeader,
            pressed && styles.pressed,
          ]}
        >
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {pt.fixedExpenses}
            </Text>
            <Text style={[styles.sectionSubtotal, { color: colors.tabIconDefault }]}>
              {pt.subtotal}: {formatCurrency(fixedSubtotal)}
            </Text>
          </View>
          <FontAwesome
            name={fixedExpensesExpanded ? 'chevron-down' : 'chevron-right'}
            size={18}
            color={colors.tabIconDefault}
          />
        </Pressable>
        {fixedExpensesExpanded && (
          <>
            {fixedExpenseTransactions.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                {isFilterActive
                  ? 'Nenhum gasto fixo encontrado com os filtros aplicados'
                  : pt.noFixedExpenses}
              </Text>
            ) : (
              fixedExpenseTransactions.map((tx) => (
                <FixedExpenseListItem
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/edit-transaction?id=${tx.id}`)}
                  onTogglePaid={handleTogglePaid}
                />
              ))
            )}
          </>
        )}
      </View>

      {isFilterActive && (
        <View
          style={[
            styles.filteredTotalContainer,
            { backgroundColor: colors.theme.card },
          ]}
        >
          <Text style={[styles.filteredTotalLabel, { color: colors.tabIconDefault }]}>
            {pt.filteredTotal}
          </Text>
          <Text
            style={[
              styles.filteredTotalValue,
              { color: filteredTotal >= 0 ? colors.income : colors.expense },
            ]}
          >
            {formatCurrency(filteredTotal)}
          </Text>
        </View>
      )}

      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable
            style={[styles.filterModalContent, { backgroundColor: colors.theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.filterModalTitle, { color: colors.text }]}>
              {pt.filter}
            </Text>

            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                {pt.filterName}
              </Text>
              <TextInput
                style={[
                  styles.filterInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.text,
                    borderColor: colors.tabIconDefault,
                  },
                ]}
                placeholder={pt.filterNamePlaceholder}
                placeholderTextColor={colors.tabIconDefault}
                value={draftFilter.nameQuery}
                onChangeText={(nameQuery) =>
                  setDraftFilter((prev) => ({ ...prev, nameQuery }))
                }
              />
            </View>

            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                {pt.filterType}
              </Text>
              <View style={styles.filterTypeRow}>
                {(['all', 'income', 'expense'] as const).map((type) => {
                  const selected = draftFilter.transactionType === type;
                  const label =
                    type === 'all'
                      ? pt.filterTypeAll
                      : type === 'income'
                        ? pt.filterTypeIncome
                        : pt.filterTypeExpense;
                  return (
                    <Pressable
                      key={type}
                      onPress={() =>
                        setDraftFilter((prev) => ({ ...prev, transactionType: type }))
                      }
                      style={[
                        styles.filterTypeChip,
                        {
                          borderColor: selected ? colors.tint : colors.tabIconDefault,
                          backgroundColor: selected ? colors.tint + '20' : 'transparent',
                        },
                      ]}
                    >
                      <Text style={{ color: colors.text }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                {pt.filterCategories}
              </Text>
              <View style={styles.filterCategoriesWrap}>
                {categories.map((category) => {
                  const selected = draftFilter.categoryIds.includes(category.id);
                  return (
                    <Pressable
                      key={category.id}
                      onPress={() => toggleCategoryInDraft(category.id)}
                      style={[
                        styles.filterCategoryChip,
                        {
                          borderColor: selected ? colors.tint : colors.tabIconDefault,
                          backgroundColor: selected ? colors.tint + '20' : 'transparent',
                        },
                      ]}
                    >
                      <View style={[styles.filterChipDot, { backgroundColor: category.color }]} />
                      <Text style={{ color: colors.text }}>{category.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterField}>
              <Text style={[styles.filterLabel, { color: colors.text }]}>
                {pt.filterPeriod}
              </Text>
              <View style={styles.filterDateRow}>
                <Pressable
                  onPress={() => setShowStartDatePicker(true)}
                  style={[
                    styles.filterDateButton,
                    { borderColor: colors.tabIconDefault, backgroundColor: colors.background },
                  ]}
                >
                  <Text style={{ color: colors.text }}>
                    {draftFilter.startDate ?? pt.startDate}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowEndDatePicker(true)}
                  style={[
                    styles.filterDateButton,
                    { borderColor: colors.tabIconDefault, backgroundColor: colors.background },
                  ]}
                >
                  <Text style={{ color: colors.text }}>
                    {draftFilter.endDate ?? pt.endDate}
                  </Text>
                </Pressable>
              </View>
              {showStartDatePicker && (
                <DateTimePicker
                  value={
                    draftFilter.startDate
                      ? parseDateStr(draftFilter.startDate)
                      : monthStart
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={monthStart}
                  maximumDate={monthEndInclusive}
                  onChange={(_, d) => {
                    setShowStartDatePicker(Platform.OS === 'ios');
                    if (!d) return;
                    const value = formatDateStr(d);
                    setDraftFilter((prev) => ({ ...prev, startDate: value }));
                  }}
                />
              )}
              {showEndDatePicker && (
                <DateTimePicker
                  value={
                    draftFilter.endDate
                      ? parseDateStr(draftFilter.endDate)
                      : monthEndInclusive
                  }
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  minimumDate={monthStart}
                  maximumDate={monthEndInclusive}
                  onChange={(_, d) => {
                    setShowEndDatePicker(Platform.OS === 'ios');
                    if (!d) return;
                    const value = formatDateStr(d);
                    setDraftFilter((prev) => ({ ...prev, endDate: value }));
                  }}
                />
              )}
            </View>

            <View style={styles.filterActions}>
              <Pressable
                onPress={clearDraftFilters}
                style={({ pressed }) => [
                  styles.filterActionButton,
                  {
                    borderColor: colors.tabIconDefault,
                    backgroundColor: colors.background,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: colors.text }}>{pt.clearFilters}</Text>
              </Pressable>
              <Pressable
                onPress={() => setFilterModalVisible(false)}
                style={({ pressed }) => [
                  styles.filterActionButton,
                  {
                    borderColor: colors.tabIconDefault,
                    backgroundColor: colors.background,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: colors.text }}>{pt.cancel}</Text>
              </Pressable>
              <Pressable
                onPress={applyFilters}
                style={({ pressed }) => [
                  styles.filterActionButton,
                  {
                    borderColor: colors.tint,
                    backgroundColor: colors.tint,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>{pt.applyFilters}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtotal: {
    fontSize: 13,
    marginTop: 2,
  },
  sectionTitlePadded: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  overLimitCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  overLimitName: {
    fontSize: 15,
    fontWeight: '600',
  },
  overLimitAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.9,
  },
  emptyText: {
    marginHorizontal: 16,
    fontSize: 15,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterHeaderButton: {
    padding: 8,
    marginRight: 4,
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  filterModalContent: {
    borderRadius: 12,
    padding: 16,
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  filterField: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  filterCategoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTypeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTypeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterCategoryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  filterDateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterDateButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  filterActionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filteredTotalContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  filteredTotalLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  filteredTotalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
});
