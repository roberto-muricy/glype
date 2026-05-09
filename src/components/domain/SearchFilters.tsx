import { ScrollView, Text, View, Pressable } from 'react-native';
import { tokens } from '@/src/theme/tokens';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatformFilter = 'all' | 'ps4' | 'ps5';
export type ScoreFilter = 'any' | '7' | '8' | '9';
export type SortOrder = 'relevance' | 'score' | 'date';

export interface SearchFiltersState {
  platform: PlatformFilter;
  score: ScoreFilter;
  sort: SortOrder;
}

export const DEFAULT_FILTERS: SearchFiltersState = {
  platform: 'all',
  score: 'any',
  sort: 'relevance',
};

export function hasActiveFilters(f: SearchFiltersState): boolean {
  return f.platform !== 'all' || f.score !== 'any' || f.sort !== 'relevance';
}

// ─── Platform options ─────────────────────────────────────────────────────────

const PLATFORM_OPTIONS: { value: PlatformFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'ps5', label: 'PS5' },
  { value: 'ps4', label: 'PS4' },
];

const SCORE_OPTIONS: { value: ScoreFilter; label: string }[] = [
  { value: 'any', label: 'Qualquer nota' },
  { value: '9', label: '9+' },
  { value: '8', label: '8+' },
  { value: '7', label: '7+' },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'relevance', label: 'Relevância' },
  { value: 'score', label: 'Nota' },
  { value: 'date', label: 'Data' },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (next: SearchFiltersState) => void;
  /** Show sort option only when there are search results */
  showSort?: boolean;
}

export function SearchFilters({ filters, onChange, showSort = false }: SearchFiltersProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 20,
        gap: 6,
        paddingVertical: 6,
        alignItems: 'center',
      }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Platform group */}
      <FilterGroup
        label="Plataforma"
        options={PLATFORM_OPTIONS}
        selected={filters.platform}
        onSelect={(v) => onChange({ ...filters, platform: v as PlatformFilter })}
      />

      <Divider />

      {/* Score group */}
      <FilterGroup
        label="Nota"
        options={SCORE_OPTIONS}
        selected={filters.score}
        onSelect={(v) => onChange({ ...filters, score: v as ScoreFilter })}
      />

      {showSort && (
        <>
          <Divider />
          {/* Sort group */}
          <FilterGroup
            label="Ordenar"
            options={SORT_OPTIONS}
            selected={filters.sort}
            onSelect={(v) => onChange({ ...filters, sort: v as SortOrder })}
          />
        </>
      )}
    </ScrollView>
  );
}

// ─── FilterGroup ──────────────────────────────────────────────────────────────

function FilterGroup<T extends string>({
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              {
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 1,
              },
              active
                ? {
                    backgroundColor: tokens.color.brand.primary,
                    borderColor: tokens.color.brand.primary,
                  }
                : {
                    backgroundColor: 'transparent',
                    borderColor: tokens.color.border.DEFAULT,
                  },
            ]}
          >
            <Text
              style={{
                fontFamily: tokens.fontFamily.regular,
                fontSize: 12,
                lineHeight: 16,
                color: active ? '#ffffff' : tokens.color.text.secondary,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Divider() {
  return (
    <View
      style={{
        width: 1,
        height: 20,
        backgroundColor: tokens.color.border.subtle,
        marginHorizontal: 4,
      }}
    />
  );
}
