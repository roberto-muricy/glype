import { ScrollView, Text, View } from 'react-native';
import { cn } from '@/src/utils/cn';
import { Pill } from '../ui/Pill';

export interface FilterTabOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterTabsProps {
  options: FilterTabOption[];
  selected: string;
  onSelect: (value: string) => void;
  variant?: 'default' | 'withCount';
  className?: string;
}

/** Lista horizontal de pills com seleção controlada. */
export function FilterTabs({
  options,
  selected,
  onSelect,
  variant = 'default',
  className,
}: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      className={cn(className)}
    >
      {options.map((opt) => {
        const isActive = opt.value === selected;
        const label =
          variant === 'withCount' && opt.count != null
            ? `${opt.label}`
            : opt.label;
        return (
          <Pill
            key={opt.value}
            label={label}
            variant={isActive ? 'active' : 'default'}
            onPress={() => onSelect(opt.value)}
          >
            {variant === 'withCount' && opt.count != null && (
              <View className="ml-2 rounded-full bg-bg-surface px-2 py-0.5">
                <Text className="text-caption text-text-body">{opt.count}</Text>
              </View>
            )}
          </Pill>
        );
      })}
    </ScrollView>
  );
}
