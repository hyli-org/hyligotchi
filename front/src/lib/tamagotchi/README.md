# Tamagotchi Library

A reusable React library for embedding a tamagotchi virtual pet into any application.

## Features

- 🎮 **Mini Widget Mode**: Small device preview that can be positioned anywhere
- 🖥️ **Full Screen Mode**: Complete tamagotchi experience with all features
- 🎯 **Simple Integration**: Just one component with straightforward props
- 💾 **State Management**: Built-in state persistence and change callbacks
- 🎨 **Customizable**: Configure images, positioning, and behavior

## Installation

This library is currently embedded in the project. To use it in your app:

```tsx
import { TamagotchiLibrary } from './lib/tamagotchi';
```

## Basic Usage

```tsx
import React, { useState } from 'react';
import { TamagotchiLibrary } from './lib/tamagotchi';

function App() {
  const [showTamagotchi, setShowTamagotchi] = useState(true);
  
  return (
    <div>
      <h1>My App</h1>
      
      <button onClick={() => setShowTamagotchi(!showTamagotchi)}>
        Toggle Tamagotchi
      </button>
      
      <TamagotchiLibrary enabled={showTamagotchi} />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | required | Show/hide the tamagotchi |
| `position` | `'fixed' \| 'absolute' \| 'relative'` | `'fixed'` | Positioning mode for mini widget |
| `style` | `React.CSSProperties` | `{ bottom: 20, right: 20 }` | CSS styles for mini widget positioning |
| `miniSize` | `number` | `120` | Size of the mini widget in pixels |
| `expandOnClick` | `boolean` | `true` | Whether clicking mini widget opens full screen |
| `onExpand` | `() => void` | - | Callback when tamagotchi is expanded |
| `onCollapse` | `() => void` | - | Callback when tamagotchi is collapsed |
| `onStateChange` | `(state) => void` | - | Callback when tamagotchi state changes |
| `initialState` | `object` | - | Initial state for the tamagotchi |
| `deviceImage` | `string` | `'/hyligotchi-full.png'` | Path to device image |
| `backgroundImage` | `string` | `'/background.png'` | Path to background image |

## Advanced Usage

### Custom Positioning

```tsx
<TamagotchiLibrary 
  enabled={true}
  position="absolute"
  style={{ top: 10, left: 10 }}
  miniSize={80}
/>
```

### State Persistence

```tsx
function App() {
  const [savedState, setSavedState] = useState(
    JSON.parse(localStorage.getItem('tamagotchi-state') || '{}')
  );
  
  return (
    <TamagotchiLibrary 
      enabled={true}
      initialState={savedState}
      onStateChange={(state) => {
        setSavedState(state);
        localStorage.setItem('tamagotchi-state', JSON.stringify(state));
      }}
    />
  );
}
```

### Different Positions

```tsx
// Top left corner
<TamagotchiLibrary 
  enabled={true}
  style={{ top: 20, left: 20 }}
/>

// Bottom center
<TamagotchiLibrary 
  enabled={true}
  style={{ bottom: 20, left: '50%', transform: 'translateX(-50%)' }}
/>

// Inline with content
<div style={{ position: 'relative', height: 200 }}>
  <TamagotchiLibrary 
    enabled={true}
    position="absolute"
    style={{ top: 0, right: 0 }}
    miniSize={60}
  />
</div>
```

## Component Structure

The library consists of:

- **MiniTamagotchi**: The small widget showing just the device PNG
- **FullTamagotchi**: The full-screen modal experience
- **TamagotchiLibrary**: The main wrapper component

## Development

### Building as Standalone Package

To extract this as a standalone npm package:

1. Copy the `src/lib/tamagotchi` folder to a new project
2. Add required dependencies to package.json:
   ```json
   {
     "peerDependencies": {
       "react": "^18.0.0 || ^19.0.0",
       "react-dom": "^18.0.0 || ^19.0.0"
     }
   }
   ```
3. Build with your preferred bundler (Vite, Rollup, etc.)

### Extending Features

You can extend the library by:

1. Adding new menu items to `ACTION_CYCLE` in `config/deviceConfig.ts`
2. Creating new screen components in `components/screens/`
3. Adding new food/health types in `utils/`
4. Customizing the character appearance in `components/ui/Character.tsx`

## API Reference

### Hooks

```tsx
// Use tamagotchi state directly
import { useTamagotchiState } from './lib/tamagotchi';

const {
  happiness,
  hunger,
  characterPosition,
  // ... other state
} = useTamagotchiState();
```

### Components

```tsx
// Use individual components
import { MiniTamagotchi, FullTamagotchi } from './lib/tamagotchi';

// Custom implementation
<MiniTamagotchi 
  size={100}
  position="fixed"
  style={{ bottom: 0, right: 0 }}
  onClick={() => console.log('Clicked!')}
/>
```

## License

This library is part of the Hyligotchi project.

## Environment Variables

If you want to integrate the Tamagotchi library with your own API for food and health balances, you can set the following environment variable:

### `VITE_HYLIGOTCHI_API_URL`

**Optional** - The base URL for your Hyligotchi API endpoints.

- **Default**: `http://localhost:3001/api`
- **Example**: `https://api.yourdomain.com/hyligotchi`

```bash
# In your .env file
VITE_HYLIGOTCHI_API_URL=https://api.yourdomain.com/hyligotchi
```

The library will automatically append the following endpoints to this base URL:
- `/food-balances` - GET, POST (consume/add)
- `/health-balances` - GET, POST (consume/add)

**Note**: If you don't set this environment variable, the library will work perfectly fine using mock data for food and health balances. The API integration is completely optional. 