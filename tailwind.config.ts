import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				islamic: {
					gold: 'hsl(var(--islamic-gold))',
					emerald: 'hsl(var(--islamic-emerald))',
					deepGreen: 'hsl(var(--islamic-deep-green))',
					gradient: 'var(--islamic-gold-gradient)',
					border: 'var(--islamic-gold-border)',
					glow: 'var(--islamic-gold-glow)',
					shimmer: 'var(--islamic-gold-shimmer)'
				},
				'bg-base': 'var(--bg-base)',
				'bg-elev': 'var(--bg-elev)',
				'surface': 'var(--surface)',
				'surface-2': 'var(--surface-2)',
				'accent-token': 'var(--accent)',
				'accent-2': 'var(--accent-2)',
				'accent-text': 'var(--accent-text)',
				'on-accent': 'var(--on-accent)',
				'accent-soft': 'var(--accent-soft)',
				'accent-glow': 'var(--accent-glow)',
				'card-sheen': 'var(--card-sheen)',
				'text-primary': 'var(--text-primary)',
				'text-secondary': 'var(--text-secondary)',
				'theme-border': 'var(--border)',
			},
			fontFamily: {
				arabic: ['"Amiri"', '"Scheherazade New"', '"Traditional Arabic"', 'ui-serif', 'Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
				amiri: ['"Amiri"', '"Scheherazade New"', '"Traditional Arabic"', 'serif'],
				sans: [
					'ui-sans-serif',
					'system-ui',
					'-apple-system',
					'BlinkMacSystemFont',
					'Segoe UI',
					'Roboto',
					'Helvetica Neue',
					'Arial',
					'Noto Sans',
					'sans-serif',
				],
				serif: [
					'ui-serif',
					'Georgia',
					'Cambria',
					'Times New Roman',
					'Times',
					'serif'
				],
				mono: [
					'ui-monospace',
					'SFMono-Regular',
					'Menlo',
					'Monaco',
					'Consolas',
					'Liberation Mono',
					'Courier New',
					'monospace'
				],
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-gold': 'var(--gradient-gold)',
				'gradient-premium': 'var(--gradient-premium)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-gold-shimmer': 'var(--gradient-gold-shimmer)',
				'gradient-elegant': 'var(--gradient-elegant)',
				'gradient-islamic': 'var(--islamic-gold-gradient)'
			},
			boxShadow: {
				sm: 'var(--shadow-sm)',
				md: 'var(--shadow-md)',
				lg: 'var(--shadow-lg)',
				glow: 'var(--shadow-glow)',
				gold: 'var(--shadow-gold)',
				'elevation-1': 'var(--elevation-1)',
				'elevation-2': 'var(--elevation-2)',
				'elevation-3': 'var(--elevation-3)',
				'elevation-4': 'var(--elevation-4)',
				'elevation-6': 'var(--elevation-6)',
				'2xs': 'var(--shadow-2xs)',
				xs: 'var(--shadow-xs)',
				xl: 'var(--shadow-xl)',
				'2xl': 'var(--shadow-2xl)',
				goldLux: 'var(--shadow-gold-lux)',
				goldPremium: 'var(--shadow-gold-premium)',
				islamic: 'var(--islamic-gold-glow)',
				elegan: 'var(--shadow-elegant)'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				premium: 'calc(var(--radius) + 2px)',
				islamic: 'calc(var(--radius) + 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				shimmerSlide: {
					'0%': {
						transform: 'translateX(-100%)',
					},
					'100%': {
						transform: 'translateX(100%)',
					}
				},
				microHover: {
					'0%': {
						transform: 'translateY(0)',
					},
					'100%': {
						transform: 'translateY(-2px)',
					}
				},
				microPress: {
					'0%': {
						transform: 'scale(1)',
					},
					'100%': {
						transform: 'scale(0.95)',
					}
				},
				goldShimmer: {
					'0%': {
						backgroundPosition: '-500% 0',
					},
					'100%': {
						backgroundPosition: '500% 0',
					}
				},
				islamicShimmer: {
					'0%': {
						backgroundPosition: '-500% 0',
					},
					'100%': {
						backgroundPosition: '500% 0',
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				shimmer: 'shimmerSlide 2s infinite',
				goldShimmer: 'goldShimmer 3s infinite',
				islamicShimmer: 'islamicShimmer 3s infinite',
				microHover: 'microHover 0.3s ease-out',
				microPress: 'microPress 0.2s ease-out'
			}
		}
	},
  plugins: [tailwindcssAnimate],
} satisfies Config;
