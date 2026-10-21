import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/ThemeContext';
import { AppText } from '@/components/ui';
import { useHaptics } from '@/hooks/useHaptics';

const ICONS: (keyof typeof Ionicons.glyphMap)[] = ['leaf', 'water', 'sunny', 'moon', 'heart', 'star', 'flower', 'planet'];

interface Card {
  id: number;
  icon: keyof typeof Ionicons.glyphMap;
  matched: boolean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export function buildDeck(pairs = 6): Card[] {
  const icons = ICONS.slice(0, pairs);
  return shuffle(icons.flatMap((icon, i) => [{ id: i * 2, icon, matched: false }, { id: i * 2 + 1, icon, matched: false }]));
}

/** Pair-matching memory game; fully local. Calls onWin when every pair is found. */
export function MemoryGame({ onWin }: { onWin: (moves: number) => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [deck, setDeck] = useState<Card[]>(() => buildDeck());
  const [flipped, setFlipped] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [lock, setLock] = useState(false);
  const won = useMemo(() => deck.every((c) => c.matched), [deck]);

  useEffect(() => {
    if (won) onWin(moves);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won]);

  const flip = (id: number) => {
    if (lock) return;
    const card = deck.find((c) => c.id === id);
    if (!card || card.matched || flipped.includes(id)) return;
    haptics.selection();
    const next = [...flipped, id];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const a = deck.find((c) => c.id === next[0]);
      const b = deck.find((c) => c.id === next[1]);
      if (a && b && a.icon === b.icon) {
        setDeck((d) => d.map((c) => (c.icon === a.icon ? { ...c, matched: true } : c)));
        setFlipped([]);
        haptics.success();
      } else {
        setLock(true);
        setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 700);
      }
    }
  };

  const restart = () => {
    setDeck(buildDeck());
    setFlipped([]);
    setMoves(0);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tone="secondary">{t('sos.distraction.memory.moves', { count: moves })}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sos.distraction.memory.restart')} onPress={restart} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {deck.map((card) => {
          const up = card.matched || flipped.includes(card.id);
          return (
            <Pressable
              key={card.id}
              accessibilityRole="button"
              accessibilityLabel={up ? t('sos.distraction.memory.cardUp') : t('sos.distraction.memory.cardDown')}
              accessibilityState={{ selected: up }}
              onPress={() => flip(card.id)}
              style={{
                width: 72,
                height: 72,
                borderRadius: theme.radius.md,
                backgroundColor: card.matched ? theme.colors.accentSoft : up ? theme.colors.surface : theme.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: card.matched ? theme.colors.accent : theme.colors.border,
              }}>
              {up ? <Ionicons name={card.icon} size={30} color={card.matched ? theme.colors.accentText : theme.colors.primary} /> : <Ionicons name="help" size={22} color={theme.colors.textOnPrimary} />}
            </Pressable>
          );
        })}
      </View>
      {won ? (
        <AppText weight="semibold" tone="success" align="center" accessibilityLiveRegion="polite">
          {t('sos.distraction.memory.won', { count: moves })}
        </AppText>
      ) : null}
    </View>
  );
}

/** Tap the numbers in ascending order. Simple attention task. */
export function NumberOrderGame({ onWin }: { onWin: (seconds: number) => void }) {
  const theme = useAppTheme();
  const { t } = useTranslation();
  const haptics = useHaptics();
  const [numbers, setNumbers] = useState(() => shuffle(Array.from({ length: 16 }, (_, i) => i + 1)));
  const [next, setNext] = useState(1);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [done, setDone] = useState<number | null>(null);

  const tap = (n: number) => {
    if (done !== null) return;
    if (n !== next) {
      haptics.warning();
      return;
    }
    const start = startedAt ?? Date.now();
    if (startedAt === null) setStartedAt(start);
    haptics.selection();
    if (n === 16) {
      const seconds = Math.round((Date.now() - start) / 1000);
      setDone(seconds);
      onWin(seconds);
    }
    setNext(n + 1);
  };

  const restart = () => {
    setNumbers(shuffle(Array.from({ length: 16 }, (_, i) => i + 1)));
    setNext(1);
    setStartedAt(null);
    setDone(null);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText tone="secondary">{t('sos.distraction.order.next', { n: Math.min(16, next) })}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={t('sos.distraction.memory.restart')} onPress={restart} hitSlop={10}>
          <Ionicons name="refresh" size={22} color={theme.colors.primary} />
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
        {numbers.map((n) => {
          const found = n < next;
          return (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={String(n)}
              accessibilityState={{ disabled: found }}
              onPress={() => tap(n)}
              style={{
                width: 64,
                height: 64,
                borderRadius: theme.radius.md,
                backgroundColor: found ? theme.colors.accentSoft : theme.colors.surface,
                borderWidth: 1,
                borderColor: found ? theme.colors.accent : theme.colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="h3" style={{ color: found ? theme.colors.accentText : theme.colors.text }}>
                {n}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      {done !== null ? (
        <AppText weight="semibold" tone="success" align="center" accessibilityLiveRegion="polite">
          {t('sos.distraction.order.won', { count: done })}
        </AppText>
      ) : null}
    </View>
  );
}
