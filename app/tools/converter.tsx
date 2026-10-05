import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useStore } from '@/store/useStore';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { IconButton } from '@/components/IconButton';
import { colors, typography, spacing, radius, shadows } from '@/constants/theme';
import { Currency } from '@/types';
import { CURRENCIES } from '@/constants/currencies';
import { approxRate } from '@/constants/approxRates';
import { roundMoney } from '@/utils/helpers';

const findCurrency = (code: string): Currency =>
  CURRENCIES.find(c => c.code === code) ?? CURRENCIES[0];

export default function ConverterScreen() {
  const converter = useStore(s => s.converter);
  const setConverterPrefs = useStore(s => s.setConverterPrefs);
  const swapConverterCurrencies = useStore(s => s.swapConverterCurrencies);

  const primary = findCurrency(converter.primary);
  const secondary = findCurrency(converter.secondary);

  const [amountPrimary, setAmountPrimary] = useState('1');
  const [amountSecondary, setAmountSecondary] = useState(
    String(roundMoney(converter.rate))
  );
  const [rateText, setRateText] = useState(String(converter.rate));
  const [pickerFor, setPickerFor] = useState<'primary' | 'secondary' | null>(null);

  // Which side the user is actively editing, so the other one updates
  // without fighting back.
  const editing = useRef<'primary' | 'secondary'>('primary');

  const recomputeFromPrimary = (amount: string, rate: number) => {
    const n = parseFloat(amount);
    setAmountSecondary(Number.isFinite(n) ? String(roundMoney(n * rate)) : '');
  };
  const recomputeFromSecondary = (amount: string, rate: number) => {
    const n = parseFloat(amount);
    setAmountPrimary(Number.isFinite(n) && rate > 0 ? String(roundMoney(n / rate)) : '');
  };

  const handlePrimaryChange = (text: string) => {
    editing.current = 'primary';
    setAmountPrimary(text);
    recomputeFromPrimary(text, converter.rate);
  };

  const handleSecondaryChange = (text: string) => {
    editing.current = 'secondary';
    setAmountSecondary(text);
    recomputeFromSecondary(text, converter.rate);
  };

  const handleRateChange = (text: string) => {
    setRateText(text);
    const rate = parseFloat(text);
    if (!Number.isFinite(rate) || rate <= 0) return;
    setConverterPrefs({ rate });
    if (editing.current === 'secondary') recomputeFromSecondary(amountSecondary, rate);
    else recomputeFromPrimary(amountPrimary, rate);
  };

  const handleSwap = () => {
    swapConverterCurrencies();
    setAmountPrimary(amountSecondary);
    setAmountSecondary(amountPrimary);
    setRateText(String(converter.rate > 0 ? roundMoney(1 / converter.rate) : converter.rate));
  };

  const handlePickCurrency = (c: Currency) => {
    const nextPrimary   = pickerFor === 'primary'   ? c.code : converter.primary;
    const nextSecondary = pickerFor === 'secondary' ? c.code : converter.secondary;
    const nextRate = approxRate(nextPrimary, nextSecondary);
    setConverterPrefs({ primary: nextPrimary, secondary: nextSecondary, rate: nextRate });
    setRateText(String(nextRate));
    recomputeFromPrimary(amountPrimary, nextRate);
    setPickerFor(null);
  };

  const CurrencyRow = ({
    label, currency, amount, onChangeAmount, onPickCurrency,
  }: {
    label: string;
    currency: Currency;
    amount: string;
    onChangeAmount: (t: string) => void;
    onPickCurrency: () => void;
  }) => (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <View style={styles.cardRow}>
        <TouchableOpacity style={styles.currencyChip} onPress={onPickCurrency} activeOpacity={0.7}>
          <Text style={styles.currencySymbol}>{currency.symbol}</Text>
          <Text style={styles.currencyCode}>{currency.code}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.accent} />
        </TouchableOpacity>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={onChangeAmount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor={colors.textLabel}
          maxLength={18}
          textAlign="right"
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <IconButton name="chevron-back" onPress={() => router.back()} accessibilityLabel="Go back" />
        <Text style={styles.title}>Currency Converter</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <CurrencyRow
          label="PRIMARY"
          currency={primary}
          amount={amountPrimary}
          onChangeAmount={handlePrimaryChange}
          onPickCurrency={() => setPickerFor('primary')}
        />

        <TouchableOpacity style={styles.swapBtn} onPress={handleSwap} activeOpacity={0.75}>
          <Ionicons name="swap-vertical" size={18} color={colors.white} />
        </TouchableOpacity>

        <CurrencyRow
          label="SECONDARY"
          currency={secondary}
          amount={amountSecondary}
          onChangeAmount={handleSecondaryChange}
          onPickCurrency={() => setPickerFor('secondary')}
        />

        <View style={styles.rateCard}>
          <Ionicons name="pricetag-outline" size={16} color={colors.textMuted} />
          <Text style={styles.rateLabel}>1 {primary.code} =</Text>
          <TextInput
            style={styles.rateInput}
            value={rateText}
            onChangeText={handleRateChange}
            keyboardType="decimal-pad"
            maxLength={15}
          />
          <Text style={styles.rateLabel}>{secondary.code}</Text>
        </View>

        <Text style={styles.note}>
          QuickExpenses works offline and doesn't fetch live exchange rates. The rate above is
          a starting estimate — edit it to whatever rate you need.
        </Text>
      </KeyboardAvoidingView>

      <CurrencyPicker
        visible={pickerFor !== null}
        selectedCode={pickerFor === 'primary' ? primary.code : secondary.code}
        onSelect={handlePickCurrency}
        onClose={() => setPickerFor(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgApp },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.base,
    paddingTop: spacing.base,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
    color: colors.textPrimary,
  },

  body: { flex: 1, padding: spacing.base },

  card: {
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    ...shadows.sm,
  },
  cardLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  currencyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentSoft,
    borderRadius: radius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  currencySymbol: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.bold,
    color: colors.accent,
  },
  currencyCode: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
  },
  amountInput: {
    flex: 1,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold,
    color: colors.textPrimary,
    padding: 0,
  },

  swapBtn: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
    ...shadows.md,
  },

  rateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgCard,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.base,
    marginTop: spacing.xl,
    ...shadows.sm,
  },
  rateLabel: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    color: colors.textPrimary,
  },
  rateInput: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
    color: colors.accent,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    paddingVertical: 2,
  },

  note: {
    fontSize: typography.sizes.xs,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: spacing.base,
    paddingHorizontal: spacing.xs,
  },
});
