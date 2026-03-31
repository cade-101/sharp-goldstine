export const VALKYRIE = {
  // ── Standard theme tokens ────────────────────────────────
  bg:        '#0d0618',
  dark:      '#1a0a2e',
  card:      '#1e1030',
  border:    '#3d2a5a',
  accent:    '#c0c8d8',       // storm silver
  accentDim: '#6b7a8e',
  accentBg:  'rgba(192,200,216,0.1)',
  gold:      '#d4af37',
  text:      '#e8f0ff',
  muted:     '#6b5a7e',
  green:     '#4a9eff',       // electric blue
  red:       '#7b2d8b',
  blue:      '#7b8fff',
  mode:      'dark' as const,
  name:      'VALKYRIE',

  // ── Backward compat ─────────────────────────────────────
  background:  '#0d0618',
  primary:     '#1a0a2e',
  accentBright:'#e8f0ff',    // lightning white
  success:     '#4a9eff',
  danger:      '#7b2d8b',
};

export default VALKYRIE;
