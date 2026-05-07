/**
 * Glype logo mark: top-down analog thumbstick.
 *
 * Locked construction (from brand guide):
 *   viewBox 100×100
 *   Socket ring: cx=50 cy=50 r=38, stroke-width=6, fill=none
 *   Cap:         cx=61.3 cy=38.7 r=18, fill=solid
 *   Cap is NE 45° offset from socket center — never change this.
 *
 * Approved tone values:
 *   'blue'  — #0066FF on dark (primary)
 *   'white' — #FFFFFF on blue surface
 *   'ink'   — #0A0A0F on light surface (mono)
 */

import Svg, { Circle } from 'react-native-svg';
import { Text, View } from 'react-native';

type Tone = 'blue' | 'white' | 'ink';

interface GlypeMarkProps {
  /** Rendered size in px (both width and height). Default 32. */
  size?: number;
  tone?: Tone;
  accessibilityLabel?: string;
}

const TONES: Record<Tone, string> = {
  blue:  '#0066FF',
  white: '#FFFFFF',
  ink:   '#0A0A0F',
};

/** Just the thumbstick symbol — use when space is tight. */
export function GlypeMark({ size = 32, tone = 'blue', accessibilityLabel = 'Glype' }: GlypeMarkProps) {
  const color = TONES[tone];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      {/* Socket ring */}
      <Circle cx="50" cy="50" r="38" stroke={color} strokeWidth="6" fill="none" />
      {/* Cap — NE 45°, locked at 47% of socket diameter */}
      <Circle cx="61.3" cy="38.7" r="18" fill={color} />
    </Svg>
  );
}

interface GlyeLogoProps extends GlypeMarkProps {
  /**
   * 'horizontal' — mark + wordmark side by side (default)
   * 'mark'       — symbol only (no wordmark)
   */
  layout?: 'horizontal' | 'mark';
}

/**
 * Full logo lockup: thumbstick mark + "Glype" wordmark in Space Grotesk 600.
 * Uses the horizontal lockup by default (mark height ≈ 1.6× cap height).
 */
export function GlypeLogo({ size = 32, tone = 'blue', layout = 'horizontal', accessibilityLabel = 'Glype' }: GlyeLogoProps) {
  if (layout === 'mark') {
    return <GlypeMark size={size} tone={tone} accessibilityLabel={accessibilityLabel} />;
  }

  const color = TONES[tone];
  // Wordmark font size ≈ mark size × 0.8 to align cap heights
  const wordmarkSize = Math.round(size * 0.8);
  const gap = Math.round(size * 0.3);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap }}
      accessible
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    >
      <GlypeMark size={size} tone={tone} accessibilityLabel="" />
      <Text
        style={{
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: wordmarkSize,
          letterSpacing: -0.025 * wordmarkSize,
          color,
          lineHeight: wordmarkSize * 1.1,
        }}
        allowFontScaling={false}
      >
        Glype
      </Text>
    </View>
  );
}
