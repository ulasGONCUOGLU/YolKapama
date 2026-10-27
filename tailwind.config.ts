import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
    './app/error.vue'
  ],
  theme: {
    extend: {
      colors: {
        outline: 'rgb(var(--c-outline) / <alpha-value>)',
        'secondary-fixed-dim': 'rgb(var(--c-secondary-fixed-dim) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--c-on-surface-variant) / <alpha-value>)',
        tertiary: 'rgb(var(--c-tertiary) / <alpha-value>)',
        'secondary-fixed': 'rgb(var(--c-secondary-fixed) / <alpha-value>)',
        'inverse-primary': 'rgb(var(--c-inverse-primary) / <alpha-value>)',
        error: 'rgb(var(--c-error) / <alpha-value>)',
        'tertiary-fixed-dim': 'rgb(var(--c-tertiary-fixed-dim) / <alpha-value>)',
        secondary: 'rgb(var(--c-secondary) / <alpha-value>)',
        'primary-fixed-dim': 'rgb(var(--c-primary-fixed-dim) / <alpha-value>)',
        'surface-bright': 'rgb(var(--c-surface-bright) / <alpha-value>)',
        'on-secondary': 'rgb(var(--c-on-secondary) / <alpha-value>)',
        'surface-container-highest': 'rgb(var(--c-surface-container-highest) / <alpha-value>)',
        'surface-tint': 'rgb(var(--c-surface-tint) / <alpha-value>)',
        'on-secondary-fixed': 'rgb(var(--c-on-secondary-fixed) / <alpha-value>)',
        'on-primary': 'rgb(var(--c-on-primary) / <alpha-value>)',
        'surface-container': 'rgb(var(--c-surface-container) / <alpha-value>)',
        'on-secondary-fixed-variant': 'rgb(var(--c-on-secondary-fixed-variant) / <alpha-value>)',
        primary: 'rgb(var(--c-primary) / <alpha-value>)',
        'outline-variant': 'rgb(var(--c-outline-variant) / <alpha-value>)',
        'on-surface': 'rgb(var(--c-on-surface) / <alpha-value>)',
        'on-primary-fixed-variant': 'rgb(var(--c-on-primary-fixed-variant) / <alpha-value>)',
        'outline-technical': 'rgb(var(--c-outline-technical) / <alpha-value>)',
        'tertiary-fixed': 'rgb(var(--c-tertiary-fixed) / <alpha-value>)',
        'on-primary-fixed': 'rgb(var(--c-on-primary-fixed) / <alpha-value>)',
        'inverse-surface': 'rgb(var(--c-inverse-surface) / <alpha-value>)',
        'surface-variant': 'rgb(var(--c-surface-variant) / <alpha-value>)',
        'primary-container': 'rgb(var(--c-primary-container) / <alpha-value>)',
        background: 'rgb(var(--c-background) / <alpha-value>)',
        'on-tertiary': 'rgb(var(--c-on-tertiary) / <alpha-value>)',
        'tertiary-container': 'rgb(var(--c-tertiary-container) / <alpha-value>)',
        'on-primary-container': 'rgb(var(--c-on-primary-container) / <alpha-value>)',
        'on-error-container': 'rgb(var(--c-on-error-container) / <alpha-value>)',
        'on-tertiary-container': 'rgb(var(--c-on-tertiary-container) / <alpha-value>)',
        'on-tertiary-fixed': 'rgb(var(--c-on-tertiary-fixed) / <alpha-value>)',
        'surface-container-high': 'rgb(var(--c-surface-container-high) / <alpha-value>)',
        'on-error': 'rgb(var(--c-on-error) / <alpha-value>)',
        'surface-dim': 'rgb(var(--c-surface-dim) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        'inverse-on-surface': 'rgb(var(--c-inverse-on-surface) / <alpha-value>)',
        'on-tertiary-fixed-variant': 'rgb(var(--c-on-tertiary-fixed-variant) / <alpha-value>)',
        'on-secondary-container': 'rgb(var(--c-on-secondary-container) / <alpha-value>)',
        'electric-blue': 'rgb(var(--c-electric-blue) / <alpha-value>)',
        'primary-fixed': 'rgb(var(--c-primary-fixed) / <alpha-value>)',
        'on-background': 'rgb(var(--c-on-background) / <alpha-value>)',
        'secondary-container': 'rgb(var(--c-secondary-container) / <alpha-value>)',
        'surface-container-low': 'rgb(var(--c-surface-container-low) / <alpha-value>)',
        'error-container': 'rgb(var(--c-error-container) / <alpha-value>)',
        'surface-container-lowest': 'rgb(var(--c-surface-container-lowest) / <alpha-value>)',
        zebra: 'rgb(var(--c-zebra) / <alpha-value>)',
        'danger-soft': 'rgb(var(--c-danger-soft) / <alpha-value>)'
      },
      borderRadius: {
        DEFAULT: '0.125rem',
        lg: '0.25rem',
        xl: '0.5rem',
        full: '0.75rem'
      },
      spacing: {
        'base-unit': '4px',
        'margin-canvas': '24px',
        'sidebar-expanded': '15vw',
        'max-content-width': '1440px',
        'sidebar-collapsed': '64px',
        'table-cell-padding-y': '8px',
        'table-cell-padding-x': '12px',
        gutter: '16px'
      },
      fontFamily: {
        'headline-md': ['Inter'],
        'label-sm': ['JetBrains Mono'],
        'body-lg': ['Inter'],
        'data-tabular': ['JetBrains Mono'],
        'headline-lg': ['Inter'],
        display: ['Inter'],
        'body-md': ['Inter']
      },
      fontSize: {
        'headline-md': ['20px', { lineHeight: '1.4', fontWeight: '500' }],
        'label-sm': ['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '500' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'data-tabular': ['13px', { lineHeight: '1.6', fontWeight: '400' }],
        'headline-lg': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        display: ['32px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '600' }],
        'body-md': ['14px', { lineHeight: '1.5', fontWeight: '400' }]
      }
    }
  }
}
