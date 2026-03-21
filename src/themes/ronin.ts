export const RONIN = {
  // ── Standard theme tokens ────────────────────────────────
  bg:        '#060608',
  dark:      '#0a0a0a',
  card:      '#0f0f14',
  border:    '#1e1e28',
  accent:    '#c41e3a',       // blood red
  accentDim: '#7a1020',
  accentBg:  'rgba(196,30,58,0.1)',
  gold:      '#d4af37',
  text:      '#f5e6c8',       // rice paper
  muted:     '#4a4a5a',
  green:     '#4a7c59',       // bamboo green
  red:       '#c41e3a',
  blue:      '#4a9eff',
  mode:      'dark' as const,
  name:      'RONIN',

  // ── Backward compat (used by RoninInkWash.tsx) ──────────
  background: '#060608',
  primary:    '#0a0a0a',
  accentSoft: '#ffb7c5',     // cherry blossom
  success:    '#4a7c59',
  rank_labels: ['浪人', '足軽', '侍', '武士', '大将', '伝説'],
};
