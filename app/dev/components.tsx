import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { tokens } from '@/src/theme/tokens';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Pill,
  SectionHeader,
  Skeleton,
  Switch,
  Tag,
  Toast,
  CheckIcon,
  CloseIcon,
  HomeIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
} from '@/src/components/ui';
import {
  FilterTabs,
  GameCard,
  ReviewCard,
  ScoreBadge,
  ScoreSlider,
  ScoresAggregateBlock,
  StarRating,
} from '@/src/components/domain';

export default function ComponentsSandboxScreen() {
  const router = useRouter();
  return (
    <SafeAreaView className="flex-1 bg-bg-primary" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-5 py-3">
        <View>
          <Text className="text-h1 text-text-primary">Glype Components</Text>
          <Text className="text-caption text-text-secondary">v0.1 · sandbox</Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          hitSlop={8}
          className="rounded-full bg-bg-elevated p-2"
        >
          <CloseIcon size={18} color={tokens.color.text.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 64 }}>
        {/* ============= TOKENS ============= */}
        <SectionHeader title="Tokens · Cores" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          <Swatch label="bg.primary" value={tokens.color.bg.primary} />
          <Swatch label="bg.secondary" value={tokens.color.bg.secondary} />
          <Swatch label="bg.elevated" value={tokens.color.bg.elevated} />
          <Swatch label="bg.surface" value={tokens.color.bg.surface} />
          <Swatch label="brand.primary" value={tokens.color.brand.primary} />
          <Swatch label="brand.light" value={tokens.color.brand.light} />
          <Swatch label="brand.muted" value={tokens.color.brand.muted} />
          <Swatch label="brand.dark" value={tokens.color.brand.dark} />
          <Swatch label="success" value={tokens.color.semantic.success} />
          <Swatch label="warning" value={tokens.color.semantic.warning} />
          <Swatch label="danger" value={tokens.color.semantic.danger} />
        </ScrollView>

        <SectionHeader title="Tokens · Tipografia" />
        <View className="px-5 gap-2">
          <Text className="text-display-1 text-text-primary">Display 1 · 32</Text>
          <Text className="text-h1 text-text-primary">Heading 1 · 22</Text>
          <Text className="text-h2 text-text-primary">Heading 2 · 18</Text>
          <Text className="text-body-lg text-text-body">Body large · 14</Text>
          <Text className="text-body text-text-body">Body · 13</Text>
          <Text className="text-caption text-text-secondary">Caption · 11</Text>
          <Text className="text-section uppercase text-brand-muted">
            Section · 11 tracking
          </Text>
        </View>

        {/* ============= UI BASE ============= */}
        <SectionHeader title="Button" />
        <View className="px-5 gap-3">
          <Row>
            <Button label="Primary" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Ghost" variant="ghost" />
          </Row>
          <Row>
            <Button label="sm" size="sm" />
            <Button label="md" size="md" />
            <Button label="lg" size="lg" />
          </Row>
          <Row>
            <Button label="Disabled" disabled />
            <Button label="Loading" loading />
            <Button
              label="Com ícone"
              icon={<PlusIcon size={16} color={tokens.color.text.primary} />}
            />
          </Row>
          <Row>
            <Button
              variant="icon"
              icon={<HeartIcon size={18} color={tokens.color.text.primary} />}
              accessibilityLabel="Curtir"
            />
            <Button
              variant="icon"
              size="sm"
              icon={<CheckIcon size={14} color={tokens.color.text.primary} />}
              accessibilityLabel="Confirmar"
            />
          </Row>
        </View>

        <SectionHeader title="Card" />
        <View className="px-5 gap-3">
          <Card variant="default">
            <Text className="text-body text-text-body">
              Card default — bg-elevated com border subtle.
            </Text>
          </Card>
          <Card variant="flat">
            <Text className="text-body text-text-body">
              Card flat — sem border.
            </Text>
          </Card>
          <Card variant="gradient">
            <Text className="text-body text-text-body">
              Card gradient — fundo brand-dark + border-accent.
            </Text>
          </Card>
        </View>

        <SectionHeader title="Input" />
        <View className="px-5 gap-3">
          <Input placeholder="Email" />
          <Input placeholder="Buscar jogos..." variant="search" />
        </View>

        <SwitchDemo />

        <SectionHeader title="Avatar" />
        <View className="px-5 flex-row items-center gap-4">
          <Avatar size="sm" name="Roberto" />
          <Avatar size="md" name="Maria Souza" />
          <Avatar size="lg" name="Carlos Pereira" />
          <Avatar
            size="md"
            name="With Image"
            uri="https://i.pravatar.cc/100?u=glype"
          />
        </View>

        <SectionHeader title="Badge" />
        <View className="px-5 flex-row gap-2">
          <Badge label="9.4" variant="score" />
          <Badge label="PS5" variant="platform" />
          <Badge label="Metacritic" variant="external" />
        </View>

        <SectionHeader title="Pill" />
        <View className="px-5 flex-row flex-wrap gap-2">
          <Pill label="RPG" />
          <Pill label="Ação" variant="active" />
          <Pill label="Indie" />
        </View>

        <SectionHeader title="Tag" />
        <View className="px-5 flex-row flex-wrap gap-2">
          <Tag label="Completou" variant="success" />
          <Tag label="Spoiler" variant="danger" />
          <Tag label="40h jogadas" variant="neutral" />
        </View>

        <SectionHeader title="EmptyState" />
        <View className="px-5">
          <Card padding="none">
            <EmptyState
              icon={<HomeIcon size={28} color={tokens.color.brand.primary} />}
              title="Nada por aqui"
              subtitle="Quando houver atividade, ela aparece neste espaço."
              action={<Button label="Explorar" size="sm" />}
            />
          </Card>
        </View>

        <SectionHeader title="Skeleton" />
        <View className="px-5">
          <Skeleton count={3} height={14} />
        </View>

        <SectionHeader title="Toast" />
        <View className="px-5 gap-3">
          <Toast variant="success" title="Review publicado" description="Sua opinião está no ar." />
          <Toast variant="danger" title="Falha ao salvar" description="Tente novamente em instantes." />
          <Toast variant="info" title="Dica" description="Você pode editar reviews depois." />
        </View>

        {/* ============= DOMAIN ============= */}
        <SectionHeader title="ScoreBadge" />
        <View className="px-5 flex-row gap-2">
          <ScoreBadge score={9.4} variant="solid" />
          <ScoreBadge score={9.4} variant="outline" />
          <ScoreBadge score={7.2} variant="solid" size="sm" />
        </View>

        <SectionHeader title="GameCard" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
        >
          <GameCard
            title="Elden Ring"
            genre="Action RPG"
            score={9.6}
            size="sm"
            coverUrl="https://media.rawg.io/media/games/5ec/5ecac5cb026ec26a56efcc546364e348.jpg"
          />
          <GameCard
            title="Sem Cover"
            genre="Indie"
            score={8.3}
            size="sm"
          />
          <GameCard title="MD square" score={7.5} size="md" />
        </ScrollView>
        <View className="px-5 mt-3">
          <GameCard
            title="God of War"
            genre="Adventure"
            score={9.4}
            size="lg"
            coverUrl="https://media.rawg.io/media/games/4be/4be6a6ad0364751a96229c56bf69be59.jpg"
          />
        </View>

        <SectionHeader title="ReviewCard" />
        <View className="px-5 gap-3">
          <ReviewCard
            user={{ username: 'roberto' }}
            score={9.0}
            body="Uma experiência absurda do começo ao fim. Combate fluido, mundo riquíssimo e trilha sonora excepcional. Vou voltar nele de novo no NG+."
            tags={[
              { label: 'Completou', variant: 'success' },
              { label: '60h jogadas', variant: 'neutral' },
            ]}
            likesCount={12}
            liked
          />
          <ReviewCard
            variant="full"
            user={{ username: 'maria' }}
            game={{ title: 'Bloodborne' }}
            score={8.5}
            body="Difícil, frustrante, perfeito. Não é pra todo mundo mas é inesquecível."
            tags={[{ label: 'Spoiler', variant: 'danger' }]}
            likesCount={3}
          />
        </View>

        <SectionHeader title="ScoresAggregateBlock" />
        <View className="px-5">
          <ScoresAggregateBlock
            sources={[
              { source: 'Metacritic', score: 96, max: 100 },
              { source: 'OpenCritic', score: 94, max: 100 },
              { source: 'Comunidade', score: 9.4, max: 10 },
            ]}
          />
        </View>

        <SectionHeader title="StarRating" />
        <StarRatingDemo />

        <SectionHeader title="ScoreSlider" />
        <ScoreSliderDemo />

        <SectionHeader title="FilterTabs" />
        <FilterTabsDemo />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap items-center gap-2">{children}</View>;
}

function Swatch({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center" style={{ width: 88 }}>
      <View
        style={{ backgroundColor: value, height: 56, width: 88 }}
        className="rounded-lg border border-border-subtle"
      />
      <Text className="text-caption text-text-body mt-1">{label}</Text>
      <Text className="text-caption text-text-tertiary">{value}</Text>
    </View>
  );
}

function SwitchDemo() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <>
      <SectionHeader title="Switch" />
      <View className="px-5 flex-row items-center gap-6">
        <View className="flex-row items-center gap-3">
          <Switch value={a} onValueChange={setA} accessibilityLabel="A" />
          <Text className="text-body text-text-body">{a ? 'on' : 'off'}</Text>
        </View>
        <View className="flex-row items-center gap-3">
          <Switch value={b} onValueChange={setB} accessibilityLabel="B" />
          <Text className="text-body text-text-body">{b ? 'on' : 'off'}</Text>
        </View>
        <Switch value disabled onValueChange={() => undefined} accessibilityLabel="Disabled" />
      </View>
    </>
  );
}

function StarRatingDemo() {
  const [v, setV] = useState(7);
  return (
    <View className="px-5 gap-3">
      <StarRating value={9.5} />
      <StarRating value={6.5} />
      <StarRating value={3} />
      <View className="flex-row items-center gap-3">
        <StarRating value={v} onChange={setV} />
        <Text className="text-body text-text-body">{v.toFixed(1)} / 10</Text>
      </View>
    </View>
  );
}

function ScoreSliderDemo() {
  const [v, setV] = useState(8);
  return (
    <View className="px-5">
      <ScoreSlider value={v} onValueChange={setV} />
    </View>
  );
}

function FilterTabsDemo() {
  const [selected, setSelected] = useState('all');
  return (
    <FilterTabs
      selected={selected}
      onSelect={setSelected}
      variant="withCount"
      options={[
        { value: 'all', label: 'Todos', count: 124 },
        { value: 'playing', label: 'Jogando', count: 8 },
        { value: 'played', label: 'Jogados', count: 52 },
        { value: 'wishlist', label: 'Wishlist', count: 17 },
      ]}
    />
  );
}

// Mantém imports usados por enquanto
void SearchIcon;
