
# 🍊 Hyligotchi

A React library for creating interactive Tamagotchi-style digital pets with customizable features and orange-themed gameplay.

## ✨ Features

- 🎮 **Interactive Digital Pet**: Complete tamagotchi experience with feeding, playing, and care
- 🍊 **Orange Theme**: Built-in orange-themed storyline and gameplay elements
- 📱 **Responsive Widget**: Mini widget that expands to full experience
- 🎭 **Tutorial System**: Configurable story-driven tutorial for new users
- ⚙️ **Highly Configurable**: Extensive customization options
- 🎨 **Retro LCD Aesthetic**: Authentic pixel art and LCD styling
- 📊 **State Management**: Built-in state management with external callbacks
- 🎯 **TypeScript**: Full TypeScript support with proper type definitions

## 📦 Installation

```bash
npm install hyligotchi
```

## 🚀 Basic Usage

```tsx
import React, { useState } from 'react';
import { TamagotchiLibrary, PetStateChange } from 'hyligotchi';

function App() {
  const [showTutorial, setShowTutorial] = useState(true);
  const [petState, setPetState] = useState<PetStateChange | null>(null);

  const handleStateChange = (state: PetStateChange) => {
    setPetState(state);
    console.log('Pet state:', state);
  };

  return (
    <div>
      <TamagotchiLibrary 
        enabled={true}
        showTutorial={showTutorial}
        onTutorialComplete={() => setShowTutorial(false)}
        onStateChange={handleStateChange}
      />
      
      {petState && (
        <div>
          <p>Happiness: {petState.happiness}/10</p>
          <p>Hunger: {petState.hunger}/10</p>
        </div>
      )}
    </div>
  );
}
```

## 🎯 TypeScript Support

**✅ Fully TypeScript Ready!** This library provides complete type safety with:

- 📝 **Complete Type Definitions**: All components, hooks, and utilities are fully typed
- 🔍 **IntelliSense Support**: Full autocomplete and hover information in your IDE
- ⚡ **Compile-time Safety**: Catch errors before runtime
- 📚 **Self-Documenting**: Types serve as inline documentation

**🔗 [See Complete TypeScript Usage Guide →](./TYPESCRIPT_USAGE.md)**

## 🎛️ Configuration Options

### TamagotchiLibraryProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | - | Whether the tamagotchi is active |
| `showTutorial` | `boolean` | `true` | Show tutorial for new users |
| `onTutorialComplete` | `() => void` | - | Callback when tutorial completes |
| `position` | `'fixed' \| 'absolute' \| 'relative'` | `'fixed'` | CSS position for mini widget |
| `style` | `React.CSSProperties` | `{ bottom: 20, right: 20 }` | CSS styles for mini widget |
| `miniSize` | `number` | `120` | Size of mini widget in pixels |
| `expandOnClick` | `boolean` | `true` | Whether mini widget expands on click |
| `onExpand` | `() => void` | - | Callback when widget expands |
| `onCollapse` | `() => void` | - | Callback when widget collapses |
| `onStateChange` | `(state: any) => void` | - | Callback for pet state changes |
| `deviceImage` | `string` | - | Custom device image URL |
| `backgroundImage` | `string` | - | Custom background image URL |
| `username` | `string` | - | User identifier (future use) |

## 🎮 Advanced Usage

### Conditional Tutorial

```tsx
import React, { useState, useEffect } from 'react';
import { TamagotchiLibrary } from 'hyligotchi';

function App() {
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    // Show tutorial only for new users
    const hasSeenTutorial = localStorage.getItem('hyligotchi-tutorial-completed');
    setShowTutorial(!hasSeenTutorial);
  }, []);

  const handleTutorialComplete = () => {
    localStorage.setItem('hyligotchi-tutorial-completed', 'true');
    setShowTutorial(false);
  };

  return (
    <TamagotchiLibrary 
      enabled={true}
      showTutorial={showTutorial}
      onTutorialComplete={handleTutorialComplete}
      position="fixed"
      style={{ bottom: 20, right: 20 }}
      miniSize={100}
    />
  );
}
```

### Custom Styling

```tsx
<TamagotchiLibrary 
  enabled={true}
  showTutorial={false}
  position="absolute"
  style={{
    top: 50,
    left: 50,
    transform: 'scale(1.5)',
    zIndex: 1000
  }}
  miniSize={80}
/>
```

### State Management

```tsx
import React, { useState } from 'react';
import { TamagotchiLibrary } from 'hyligotchi';

function App() {
  const [petState, setPetState] = useState(null);

  const handleStateChange = (state) => {
    setPetState(state);
    // Save to your backend, localStorage, etc.
    console.log('Pet stats:', {
      happiness: state.happiness,
      hunger: state.hunger,
      needsCleaning: state.needsCleaning
    });
  };

  return (
    <div>
      <TamagotchiLibrary 
        enabled={true}
        onStateChange={handleStateChange}
      />
      
      {petState && (
        <div>
          <h3>Pet Status</h3>
          <p>Happiness: {petState.happiness}/10</p>
          <p>Hunger: {petState.hunger}/10</p>
        </div>
      )}
    </div>
  );
}
```

## 🔧 Advanced Components

For advanced users, individual components are also exported:

```tsx
import { 
  FullTamagotchi, 
  MiniTamagotchi,
  useTamagotchiState,
  useMenuState 
} from 'hyligotchi';
```

## 🎨 Customization

### Custom Assets

You can provide custom device and background images:

```tsx
<TamagotchiLibrary 
  enabled={true}
  deviceImage="/my-custom-device.png"
  backgroundImage="/my-custom-background.png"
/>
```

### Disable Tutorial

For production apps where you handle onboarding separately:

```tsx
<TamagotchiLibrary 
  enabled={true}
  showTutorial={false}
/>
```

## 🌟 Story & Tutorial

The library includes an engaging story-driven tutorial where users:

1. 📡 Receive a mysterious signal from space
2. 👽 Discover a lost alien creature near orange groves
3. 🍊 Learn the alien loves oranges and needs care
4. 🤝 Build trust through interaction and feeding
5. 🎮 Master the control system (LEFT/MIDDLE/RIGHT buttons)
6. 🚀 Begin their journey as the alien's guardian

## 🔄 State Object

The `onStateChange` callback provides:

```typescript
{
  happiness: number;        // 1-10 happiness level
  hunger: number;          // 1-10 hunger level  
  characterPosition: { x: number; y: number };
  needsCleaning: boolean;  // Whether pet needs cleaning
  showPoo: boolean;        // Whether poo is visible
  foodBalances: FoodBalances;    // Available food items
  healthBalances: HealthBalances; // Available health items
}
```

## 🏗️ Development

### Building the Library

```bash
# Build library for distribution
npm run build:lib

# Build demo app
npm run build:demo

# Development mode
npm run dev
```

### Local Development

```bash
git clone https://github.com/your-username/hyligotchi.git
cd hyligotchi
npm install
npm run dev
```

## 📄 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🐛 Issues

If you find any issues, please report them on the [GitHub Issues](https://github.com/your-username/hyligotchi/issues) page.
