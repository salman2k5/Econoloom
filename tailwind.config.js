/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#101923',
        recess: '#0B1219',
        panel: '#14202E',
        elevated: '#1B2A3C',
        glass: 'rgba(20, 32, 46, 0.92)',
        border: {
          subtle: '#253548',
          hairline: '#1D2B3A',
          focus: '#D5A653',
        },
        text: {
          primary: '#F3EFE5',
          secondary: '#B4BFCC',
          muted: '#7E8D9E',
        },
        intel: {
          amber: '#D5A653',
          amberLight: '#E6C27A',
          amberDim: 'rgba(213, 166, 83, 0.14)',
          slate: '#7CA3C7',
          crimson: '#E05A6D',
          sage: '#38B688',
        },
        stress: {
          none: '#526275',
          low: '#6BA3BE',
          moderate: '#D5A653',
          high: '#D97742',
          severe: '#E05A6D',
        },
        mitigation: {
          cyan: '#38B688',
        },
        tier: {
          observed: '#38B688',
          derived: '#7CA3C7',
          parameter: '#B392CE',
          user: '#D5A653',
          illustrative: '#8E9BAE',
        },
      },
      fontFamily: {
        display: [
          'Iowan Old Style',
          'Palatino Linotype',
          'Book Antiqua',
          'Georgia',
          'Times New Roman',
          'serif',
        ],
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'ui-monospace',
          'SFMono-Regular',
          'Consolas',
          'monospace',
        ],
      },
      boxShadow: {
        panel: '0 10px 28px -6px rgba(5, 10, 15, 0.65)',
        glow: '0 0 0 1px rgba(213, 166, 83, 0.45), 0 6px 20px rgba(8, 13, 20, 0.65)',
      },
    },
  },
  plugins: [],
};
