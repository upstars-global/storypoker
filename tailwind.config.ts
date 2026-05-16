import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{vue,ts}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        'primary-soft': 'var(--primary-soft)',
        danger: 'var(--danger)',
        success: 'var(--success)',
      },
      backgroundColor: {
        app: 'var(--bg-app)',
        appbar: 'var(--bg-appbar)',
        paper: 'var(--bg-paper)',
        elevated: 'var(--bg-elevated)',
        overlay: 'var(--bg-overlay)',
        skeleton: 'var(--bg-skeleton)',
      },
      textColor: {
        primary: 'var(--text-primary)',
        body: 'var(--text-body)',
        muted: 'var(--text-muted)',
        disabled: 'var(--text-disabled)',
        inverse: 'var(--text-inverse)',
        danger: 'var(--danger)',
        success: 'var(--success)',
      },
      borderColor: {
        DEFAULT: 'var(--border)',
        input: 'var(--border-input)',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        4: 'var(--shadow-4)',
        8: 'var(--shadow-8)',
      },
    },
  },
} satisfies Config
