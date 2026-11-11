export type ThemeId =
  | 'oxford-gold'
  | 'kiswah-noir'
  | 'istanbul-sapphire'
  | 'imperial-violet'
  | 'burgundy-velvet'
  | 'desert-scroll'
  | 'madinah-emerald';

export interface ThemeTokens {
  '--bg-base': string;
  '--bg-elev': string;
  '--surface': string;
  '--surface-2': string;
  '--border': string;
  '--accent': string;
  '--accent-2': string;
  '--accent-text': string;
  '--on-accent': string;
  '--accent-soft': string;
  '--accent-glow': string;
  '--card-sheen': string;
  '--card-sheen-line'?: string;
  '--text-primary': string;
  '--text-secondary': string;
  '--success': string;
  '--warning': string;
  '--danger': string;

  /* Theme Signature Tokens (Structural Identity Beyond Color) */
  '--sig-radius'?: string;
  '--sig-border'?: string;
  '--sig-glow'?: string;
  '--sig-pattern'?: string;
  '--sig-motif'?: string;
  '--sig-head-family'?: string;
  '--sig-head-tracking'?: string;
  '--sig-head-transform'?: string;
  '--sig-head-style'?: string;
}

export interface ThemeSignature {
  radius: string;
  border: string;
  glow: string;
  pattern: string;
  motif: string;
  headingFamily: string;
  headingTracking: string;
  headingTransform: string;
  headingStyle: string;
}

export interface AppTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  tokens: ThemeTokens;
  signature?: ThemeSignature;
}
