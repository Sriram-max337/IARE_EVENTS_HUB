/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        base: {
          DEFAULT: '#0D0F12', // near-black app background
          light: '#F7F8FA',   // light mode background
        },
        surface: {
          DEFAULT: '#16191D', // card surface (dark)
          hover: '#1D2126',   // elevated hover state (dark)
          light: '#FFFFFF',
          'light-hover': '#F0F1F4',
        },
        border: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          bright: 'rgba(255,255,255,0.18)',
          light: 'rgba(13,15,18,0.10)',
          'light-bright': 'rgba(13,15,18,0.22)',
        },
        ink: {
          DEFAULT: '#E7E9EC',   // primary text, dark mode
          dim: '#9AA1AB',       // secondary text, dark mode
          faint: '#5B626C',
          light: '#12141A',     // primary text, light mode
          'light-dim': '#5B6270',
        },
        accent: {
          DEFAULT: '#16E0B3', // electric teal
          hover: '#3BEAC4',
          dim: 'rgba(22,224,179,0.14)',
          text: '#0D0F12',
        },
        dept: {
          cse: '#6C8EF5',   // indigo blue
          ece: '#F5A623',   // amber
          eee: '#8BD450',   // lime green
          mech: '#F2637A',  // rose
          civil: '#B98CF2', // violet
          aero: '#4FC3F7',  // sky cyan
        },
        state: {
          green: '#3BD671',
          amber: '#F5B93D',
          red: '#F2555A',
        },
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        none: 'none',
      },
      letterSpacing: {
        tight2: '-0.02em',
      },
    },
  },
  plugins: [],
}
