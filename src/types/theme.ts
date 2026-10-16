export type ThemeId =
  | 'oxford-gold'
  | 'madinah-emerald'
  | 'imperial-violet'
  | 'burgundy-velvet'
  | 'desert-scroll';

export interface ThemeTokens {
  '--bg-base': string;
  '--bg-elev': string;
  '--surface': string;
  '--surface-2': string;
  '--border': string;
  '--accent': string;
  '--accent-text': string;
  '--on-accent': string;
  '--accent-soft': string;
  '--accent-glow': string;
  '--text-primary': string;
  '--text-secondary': string;
  '--success': string;
  '--warning': string;
  '--danger': string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  tokens: ThemeTokens;
}
