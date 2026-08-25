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
        outline: '#8e909a',
        'secondary-fixed-dim': '#c6c6cc',
        'on-surface-variant': '#c5c6d0',
        tertiary: '#dee3eb',
        'secondary-fixed': '#e2e2e8',
        'inverse-primary': '#475d90',
        error: '#ffb4ab',
        'tertiary-fixed-dim': '#c2c7cf',
        secondary: '#c6c6cc',
        'primary-fixed-dim': '#b0c6ff',
        'surface-bright': '#2b3b46',
        'on-secondary': '#2f3035',
        'surface-container-highest': '#263742',
        'surface-tint': '#b0c6ff',
        'on-secondary-fixed': '#1a1c20',
        'on-primary': '#162f5e',
        'surface-container': '#11212c',
        'on-secondary-fixed-variant': '#45474c',
        primary: '#d9e2ff',
        'outline-variant': '#44464f',
        'on-surface': '#d3e5f3',
        'on-primary-fixed-variant': '#2f4576',
        'outline-technical': '#424655',
        'tertiary-fixed': '#dee3eb',
        'on-primary-fixed': '#001944',
        'inverse-surface': '#d3e5f3',
        'surface-variant': '#263742',
        'primary-container': '#b0c6ff',
        background: '#04151f',
        'on-tertiary': '#2b3137',
        'tertiary-container': '#c2c7cf',
        'on-primary-container': '#3b5183',
        'on-error-container': '#ffdad6',
        'on-tertiary-container': '#4e535a',
        'on-tertiary-fixed': '#171c22',
        'surface-container-high': '#1b2c37',
        'on-error': '#690005',
        'surface-dim': '#04151f',
        surface: '#04151f',
        'inverse-on-surface': '#22323d',
        'on-tertiary-fixed-variant': '#42474e',
        'on-secondary-container': '#b4b5ba',
        'electric-blue': '#568dff',
        'primary-fixed': '#d9e2ff',
        'on-background': '#d3e5f3',
        'secondary-container': '#45474c',
        'surface-container-low': '#0c1d28',
        'error-container': '#93000a',
        'surface-container-lowest': '#01101a'
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
