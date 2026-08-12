import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Local-First approach using zustand's persist middleware (saves to localStorage)
export const useGameStore = create(
  persist(
    (set, get) => ({
      // State
      tables: [], // Array of table objects: { card_id, serial_number, matrix }
      calledNumbers: [], // Array of numbers called in the current round
      gameModes: ['tabla_llena'], // Array of active game modes
      winningTables: [], // Array of card_ids that have won and are currently displaying
      acknowledgedWinners: [], // Array of card_ids that won but have been dismissed to continue playing

      // Actions
      addTable: (tableData) => set((state) => {
        // Prevent duplicate tables
        const exists = state.tables.find(t => t.card_id === tableData.card_id);
        if (exists) return state;
        return { tables: [...state.tables, tableData] };
      }),

      setGameMode: (mode) => set({ gameModes: [mode], acknowledgedWinners: [] }),
      toggleGameMode: (mode) => set((state) => {
        let current = state.gameModes || [];
        if (typeof current === 'string') current = [current]; // Legacy state handling
        
        let newModes;
        if (current.includes(mode)) {
          // If it's the only one selected, do not allow deselecting it.
          if (current.length === 1) return state;
          newModes = current.filter(m => m !== mode);
        } else {
          newModes = [...current, mode];
        }
        return { gameModes: newModes, acknowledgedWinners: [] };
      }),

      callNumber: (num) => set((state) => {
        if (state.calledNumbers.includes(num)) return state;
        const newCalled = [...state.calledNumbers, num];
        return { calledNumbers: newCalled };
      }),

      undoLastNumber: () => set((state) => {
        if (state.calledNumbers.length === 0) return state;
        const newCalled = state.calledNumbers.slice(0, -1);
        return { calledNumbers: newCalled };
      }),

      setWinningTables: (winners) => set({ winningTables: winners }),

      dismissWinners: () => set((state) => ({
        acknowledgedWinners: [...state.acknowledgedWinners, ...state.winningTables],
        winningTables: []
      })),

      resetRound: () => set({ calledNumbers: [], winningTables: [], acknowledgedWinners: [] }),

      clearAllTables: () => set({ tables: [], calledNumbers: [], winningTables: [], acknowledgedWinners: [] }),
    }),
    {
      name: 'bingo-game-storage', // key in localStorage
    }
  )
);
