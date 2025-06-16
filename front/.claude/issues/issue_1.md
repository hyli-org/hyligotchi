# Extract Inline Styles to Theme System

Priority: HighLabels: refactoring, performance, tech-debt

Problem:
Every component uses inline styles, causing style objects to be recreated on every render. The LCD screen style is duplicated
across 12+ components.

Current Code:
// TamagotchiScreen.tsx:38-49
It's possible that there's inline style in other places. think deeply about the codebase and look at every file to make sure to fix it everywhere

Desired Solution:
// theme/index.ts
export const theme = {
colors: {
lcd: '#c3d68b',
lcdBorder: '#a7b86d',
shadow: 'rgba(0,0,0,0.2)'
},
fonts: {
pixel: "'Press Start 2P', monospace"
},
components: {
lcdScreen: {
backgroundColor: '$colors.lcd',
border: '1px solid $colors.lcdBorder',
boxShadow: 'inset 0 0 10px

fonts.pixel'
}
}
} as const;

// Using CSS Modules or styled-components
import styles from './TamagotchiScreen.module.css';

Benefits:

    50%+ reduction in re-renders from style object recreation
    Single source of truth for design tokens
    Easier theming and dark mode support
    Reduced bundle size from style deduplication

Acceptance Criteria:

    Create theme configuration with all design tokens
    Replace all inline styles with CSS Modules or styled-components
    No hardcoded colors or spacing values in components
    Document theme usage in README
