import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		screens: {
			'xs': '475px',
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'2xl': '1536px'
		},
		extend: {
			fontFamily: {
				sans: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['"Be Vietnam Pro"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
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
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				info: 'hsl(var(--info))',
			},
			backgroundImage: {
				'gradient-navy': 'linear-gradient(135deg, hsl(220 90% 25%) 0%, hsl(220 80% 35%) 100%)',
				'gradient-gold': 'linear-gradient(135deg, hsl(45 95% 55%) 0%, hsl(45 90% 45%) 100%)',
				'gradient-teal': 'linear-gradient(135deg, hsl(180 70% 45%) 0%, hsl(180 65% 40%) 100%)',
				'gradient-subtle': 'linear-gradient(180deg, hsl(220 20% 98%) 0%, hsl(220 15% 96%) 100%)',
			},
			boxShadow: {
				'navy': '0 8px 32px hsl(220 90% 25% / 0.25)',
				'gold-glow': '0 0 24px hsl(45 95% 55% / 0.3)',
				'card-elevated': '0 1px 3px hsl(220 20% 90%), 0 10px 40px -10px hsl(220 30% 85%), 0 0 0 1px hsl(220 10% 90%) inset',
			},
			keyframes: {
				// Staggered page load animations
				'hero-reveal': {
					'0%': { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
					'100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
				},
				'fade-in-up': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' },
				},
				'slide-in-right': {
					'0%': { opacity: '0', transform: 'translateX(-20px)' },
					'100%': { opacity: '1', transform: 'translateX(0)' },
				},
				// Micro-interactions
				'button-press': {
					'0%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(0.98) translateY(1px)' },
					'100%': { transform: 'scale(1) translateY(0)' },
				},
				// Grain texture animation
				'grain-shift': {
					'0%, 100%': { transform: 'translate(0, 0)' },
					'10%': { transform: 'translate(-5%, -10%)' },
					'20%': { transform: 'translate(-15%, 5%)' },
					'30%': { transform: 'translate(7%, -25%)' },
					'40%': { transform: 'translate(-5%, 25%)' },
					'50%': { transform: 'translate(-15%, 10%)' },
					'60%': { transform: 'translate(15%, 0%)' },
					'70%': { transform: 'translate(0%, 15%)' },
					'80%': { transform: 'translate(3%, 35%)' },
					'90%': { transform: 'translate(-10%, 10%)' },
				},
			},
			animation: {
				'hero-reveal': 'hero-reveal 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards',
				'fade-in-up': 'fade-in-up 0.4s ease-out forwards',
				'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
				'button-press': 'button-press 0.2s ease-out',
				'grain-shift': 'grain-shift 8s steps(10) infinite',
			},
			fontSize: {
				'2xs': ['0.625rem', { lineHeight: '1.4' }],   // 10px — for truly tiny labels only
				'xs':  ['0.75rem',  { lineHeight: '1.4' }],   // 12px
				'sm':  ['0.875rem', { lineHeight: '1.5' }],   // 14px
				'base':['1rem',     { lineHeight: '1.5' }],   // 16px
				'lg':  ['1.125rem', { lineHeight: '1.4' }],   // 18px
				'xl':  ['1.25rem',  { lineHeight: '1.3' }],   // 20px
				'2xl': ['1.5rem',   { lineHeight: '1.25' }],  // 24px
				'3xl': ['1.875rem', { lineHeight: '1.2' }],   // 30px
				'4xl': ['2.25rem',  { lineHeight: '1.15' }],  // 36px
			},
			fontWeight: {
				thin: '100',
				extralight: '200',
				light: '300',
				normal: '400',
				medium: '500',
				semibold: '600',
				bold: '700',
				extrabold: '800',
				black: '900',
			},
			lineHeight: {
				none: '1',
				tight: '1.15',
				snug: '1.3',
				normal: '1.4',
				relaxed: '1.5',
				loose: '1.65',
			},
			letterSpacing: {
				tighter: '-0.05em',
				tight: '-0.025em',
				normal: '0em',
				wide: '0.025em',
				wider: '0.05em',
				widest: '0.1em',
			},
		}
	},
	plugins: [
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require("tailwindcss-animate"),
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		require("@tailwindcss/typography"),
	],
} satisfies Config;
