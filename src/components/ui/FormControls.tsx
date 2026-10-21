import React from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeContext';
import { fontFamily, MIN_TOUCH } from '@/theme/tokens';
import { useHaptics } from '@/hooks/useHaptics';
import { AppText } from './AppText';

export interface ChipOption<T extends string | number> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface ChipGroupProps<T extends string | number> {
  options: ChipOption<T>[];
  value: T | T[] | null | undefined;
  onChange: (value: T) => void;
  multiple?: boolean;
  label?: string;
  compact?: boolean;
}

/** Chip selector (single or multiple). Selection is conveyed by color AND a check icon. */
export function ChipGroup<T extends string | number>({ options, value, onChange, multiple, label, compact }: ChipGroupProps<T>) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <AppText variant="bodySmall" weight="medium" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <View style={styles.wrap} accessibilityRole={multiple ? undefined : 'radiogroup'}>
        {options.map((opt) => {
          const isOn = selected(opt.value);
          return (
            <Pressable
              key={String(opt.value)}
              accessibilityRole={multiple ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: isOn, selected: isOn }}
              accessibilityLabel={opt.label}
              onPress={() => {
                haptics.selection();
                onChange(opt.value);
              }}
              style={[
                styles.chip,
                {
                  minHeight: compact ? 40 : MIN_TOUCH,
                  paddingHorizontal: compact ? 12 : 16,
                  backgroundColor: isOn ? theme.colors.primary : theme.colors.surface,
                  borderColor: isOn ? theme.colors.primary : theme.colors.border,
                  borderRadius: theme.radius.pill,
                },
              ]}>
              {opt.icon ? (
                <Ionicons name={opt.icon} size={theme.fs(16)} color={isOn ? theme.colors.textOnPrimary : theme.colors.text} />
              ) : null}
              <AppText variant={compact ? 'bodySmall' : 'body'} weight={isOn ? 'semibold' : 'regular'} style={{ color: isOn ? theme.colors.textOnPrimary : theme.colors.text }}>
                {opt.label}
              </AppText>
              {isOn ? <Ionicons name="checkmark" size={theme.fs(16)} color={theme.colors.textOnPrimary} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface ScaleProps {
  value: number | null | undefined;
  onChange: (value: number) => void;
  min: number;
  max: number;
  label?: string;
  minLabel?: string;
  maxLabel?: string;
}

/** Numeric scale (e.g. 1-10) made of large tappable buttons. */
export function ScaleSelector({ value, onChange, min, max, label, minLabel, maxLabel }: ScaleProps) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  const items: number[] = [];
  for (let i = min; i <= max; i += 1) items.push(i);
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <AppText variant="bodySmall" weight="medium" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <View style={[styles.wrap, { justifyContent: 'space-between' }]} accessibilityRole="radiogroup">
        {items.map((n) => {
          const isOn = value === n;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityState={{ checked: isOn }}
              accessibilityLabel={`${n}`}
              onPress={() => {
                haptics.selection();
                onChange(n);
              }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isOn ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: isOn ? theme.colors.primary : theme.colors.border,
              }}>
              <AppText weight="semibold" style={{ color: isOn ? theme.colors.textOnPrimary : theme.colors.text }}>
                {n}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {minLabel || maxLabel ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="caption" tone="secondary">
            {minLabel}
          </AppText>
          <AppText variant="caption" tone="secondary">
            {maxLabel}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
}

export function NumberStepper({ value, onChange, min = 0, max = 999, step = 1, label, unit }: StepperProps) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <View style={{ gap: 8 }}>
      {label ? (
        <AppText variant="bodySmall" weight="medium" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <View style={[styles.stepper, { borderColor: theme.colors.border, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="-"
          disabled={value <= min}
          onPress={() => {
            haptics.selection();
            set(value - step);
          }}
          style={[styles.stepBtn, { opacity: value <= min ? 0.4 : 1 }]}>
          <Ionicons name="remove" size={22} color={theme.colors.text} />
        </Pressable>
        <AppText variant="h2" style={{ minWidth: 70, textAlign: 'center' }} accessibilityLiveRegion="polite">
          {value}
          {unit ? <AppText tone="secondary"> {unit}</AppText> : null}
        </AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="+"
          disabled={value >= max}
          onPress={() => {
            haptics.selection();
            set(value + step);
          }}
          style={[styles.stepBtn, { opacity: value >= max ? 0.4 : 1 }]}>
          <Ionicons name="add" size={22} color={theme.colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  suffix?: string;
}

export function TextField({ label, error, hint, suffix, style, ...rest }: TextFieldProps) {
  const theme = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="bodySmall" weight="medium" tone="secondary">
        {label}
      </AppText>
      <View
        style={[
          styles.inputRow,
          {
            borderColor: error ? theme.colors.danger : theme.colors.border,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.surface,
          },
        ]}>
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={hint}
          placeholderTextColor={theme.colors.textSecondary}
          {...rest}
          style={[
            {
              flex: 1,
              minHeight: MIN_TOUCH,
              paddingHorizontal: 14,
              color: theme.colors.text,
              fontSize: theme.fs('body'),
              fontFamily: fontFamily.regular,
            },
            style,
          ]}
        />
        {suffix ? (
          <AppText tone="secondary" style={{ paddingRight: 14 }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText variant="caption" tone="secondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

interface SwitchRowProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Toggle row rendered as a large pressable with an explicit on/off icon. */
export function SwitchRow({ label, description, value, onChange, disabled }: SwitchRowProps) {
  const theme = useAppTheme();
  const haptics = useHaptics();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      accessibilityHint={description}
      disabled={disabled}
      onPress={() => {
        haptics.selection();
        onChange(!value);
      }}
      style={[styles.switchRow, { opacity: disabled ? 0.5 : 1, minHeight: MIN_TOUCH }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText weight="medium">{label}</AppText>
        {description ? (
          <AppText variant="bodySmall" tone="secondary">
            {description}
          </AppText>
        ) : null}
      </View>
      <View
        style={{
          width: 52,
          height: 30,
          borderRadius: 15,
          padding: 3,
          backgroundColor: value ? theme.colors.accent : theme.colors.surfaceAlt,
          borderWidth: 1,
          borderColor: value ? theme.colors.accent : theme.colors.border,
          alignItems: value ? 'flex-end' : 'flex-start',
          justifyContent: 'center',
        }}>
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          {value ? <Ionicons name="checkmark" size={14} color={theme.colors.accent} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingVertical: 8 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, padding: 4 },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
});
