/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#fafafa',
        surface: '#ffffff',
        line: {
          DEFAULT: '#e9e9ec',
          strong: '#dcdce1',
        },
        ink: {
          DEFAULT: '#111114',
          2: '#45454f',
          3: '#5e5e6a',
          4: '#6f6f7b',
        },
        accent: {
          DEFAULT: '#145c46',
          hover: '#0f4635',
          soft: '#e9f1ed',
          ring: '#9cc4b3',
        },
        state: {
          scheduled: '#4b4b55',
          progress: '#9a5b0b',
          done: '#145c46',
          cancelled: '#9c3529',
        },
        primary: {
          50: '#e9f1ed',
          100: '#d3e4dc',
          200: '#b7d4c8',
          300: '#9cc4b3',
          400: '#5c9c82',
          500: '#2c7d61',
          600: '#145c46',
          700: '#0f4635',
          800: '#0b3628',
          900: '#08281d',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        micro: ['11px', { lineHeight: '16px', letterSpacing: '0.06em' }],
        meta: ['12px', { lineHeight: '18px' }],
        body: ['13px', { lineHeight: '20px' }],
        lead: ['15px', { lineHeight: '22px' }],
        title: ['18px', { lineHeight: '26px', letterSpacing: '-0.01em' }],
        page: ['22px', { lineHeight: '30px', letterSpacing: '-0.02em' }],
      },
      boxShadow: {
        lift: '0 1px 2px rgba(17,17,20,0.04), 0 12px 32px -12px rgba(17,17,20,0.18)',
      },
      transitionTimingFunction: {
        rail: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
