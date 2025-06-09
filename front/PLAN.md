# Plan: Fix Wallet Integration Issues (Simplified)

## Issues to Address

1. **Mini Tamagotchi Changes**: The mini widget should remain unchanged and always show, regardless of wallet connection status
2. **Full Tamagotchi Wallet Screen**: When wallet is not connected in full view, show an in-game style screen (LCD style) with a message to connect wallet on the website
3. **React Hooks Error**: "React has detected a change in the order of Hooks" - caused by conditional return before hooks

## Root Cause Analysis

### Hooks Error
The error occurs in `TamagotchiLibrary.tsx` because we have a conditional return (wallet check) at lines 71-96 BEFORE the `useCallback` hook at line 98. This violates React's Rules of Hooks which require:
- Hooks must be called in the exact same order on every render
- No conditional returns before all hooks are called

## Solution Plan (Simplified)

### Phase 1: Fix Hooks Order in TamagotchiLibrary
1. Move ALL hooks (useCallback) to the top, before any conditional logic
2. Remove the wallet check from TamagotchiLibrary entirely - it should never prevent rendering
3. Always render the mini tamagotchi regardless of wallet status

### Phase 2: Create Simple In-Game Message Screen
1. Create a new `WalletRequiredScreen.tsx` component that matches the LCD game style:
   - Use the same font and styling as other game screens
   - Show simple message: "WALLET REQUIRED" / "CONNECT ON WEBSITE"
   - No buttons or interactions - purely informational
   - User must close the tamagotchi and connect wallet on the main website

2. Move wallet checking logic into `FullTamagotchi`:
   - Check wallet status when rendering screens
   - If wallet required but not connected, show `WalletRequiredScreen`
   - Otherwise show normal game screens

### Phase 3: Remove onWalletRequired Callback
1. Since connection happens on website, remove `onWalletRequired` prop
2. Remove `handleWalletRequired` from MainSection
3. Keep wallet interface for transactions only

## Implementation Steps

1. **Fix TamagotchiLibrary.tsx**:
   ```tsx
   // Move ALL hooks to the top
   const handleExpand = useCallback(...);
   const handleCollapse = useCallback(...);
   
   // Remove entire wallet check block (lines 71-96)
   // Remove onWalletRequired from props
   ```

2. **Create WalletRequiredScreen.tsx**:
   ```tsx
   // Simple LCD-style screen
   // "WALLET REQUIRED"
   // "CONNECT ON WEBSITE"
   // No interactions
   ```

3. **Update FullTamagotchi.tsx**:
   ```tsx
   const renderScreen = () => {
     // Check wallet first if required
     if (wallet && !wallet.isConnected) {
       return <WalletRequiredScreen />;
     }
     // ... rest of screen logic
   }
   ```

4. **Simplify MainSection.tsx**:
   - Remove `handleWalletRequired` function
   - Remove `onWalletRequired` prop from TamagotchiLibrary
   - Keep wallet interface for transactions only

## Benefits
- ✅ Fixes React hooks error by ensuring consistent hook order
- ✅ Mini tamagotchi always visible (better UX)
- ✅ Simple message directs users to connect on website
- ✅ No complex connection flow inside game
- ✅ Cleaner separation - website handles auth, game just uses wallet

## Testing Checklist
- [ ] Mini widget shows regardless of wallet status
- [ ] No React hooks errors in console
- [ ] Message screen shows in LCD style when wallet not connected
- [ ] User can close tamagotchi and connect on website
- [ ] After connecting on website, tamagotchi works normally