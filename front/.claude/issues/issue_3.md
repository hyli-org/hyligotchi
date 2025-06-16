# Break Down Large Components

  Priority: MediumLabels: refactoring, maintainability

  Problem:
  FullTamagotchi.tsx is 890 lines with 7+ useEffect hooks and multiple responsibilities.

  Current Structure:
  // FullTamagotchi.tsx - Too many responsibilities
  export const FullTamagotchi: React.FC<Props> = ({ ... }) => {
    // 71-90: API state management
    // 82-90: Multiple useEffect hooks
    // 326-386: Initialization logic
    // 431-466: Sync logic
    // 532-593: Complex render logic
    // 642-818: Inline share functionality
    // ... 890 lines total
  };

  Desired Structure:
  // FullTamagotchi.tsx - Orchestrator only
  export const FullTamagotchi: React.FC<Props> = ({ ... }) => {
    const { state, actions } = useTamagotchiCore(identity);

    return (
      <TamagotchiProvider value={{ state, actions }}>
        <TamagotchiLayout>
          <TamagotchiGame />
          <ShareModal />
        </TamagotchiLayout>
      </TamagotchiProvider>
    );
  };

  // Separate files:
  // - useTamagotchiCore.ts (state management)
  // - TamagotchiGame.tsx (game UI)
  // - ShareModal.tsx (sharing functionality)
  // - useTamagotchiSync.ts (API sync logic)

  Benefits:
  - Easier to test individual pieces
  - Better code reusability
  - Clearer separation of concerns
  - Easier to maintain and debug

  Acceptance Criteria:
  - No component > 200 lines
  - Extract custom hooks for logic
  - Create presentational components
  - Separate API logic from UI

