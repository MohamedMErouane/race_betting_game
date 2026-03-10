import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameState = 'INTRO' | 'MAIN_MENU' | 'CATEGORY_SELECT' | 'CHARACTER_SELECT' | 'BETTING' | 'COUNTDOWN' | 'RACING' | 'FINISHED' | 'LEADERBOARD';

export interface RacerData {
  id: number;
  name: string;
  imagePath: string;
  odds: number; // Payout multiplier
}

export interface BetCategory {
  id: string;
  amount: number;
  currency: 'SOL' | 'SKR';
  label: string;
}

export interface GameStats {
  wins: number;
  losses: number;
  totalBets: number;
  totalWinnings: number;
}

export interface LeaderboardEntry {
  racerId: number;
  players: number;
  prize: number;
}

export interface Top3Entry {
  racerId: number;
  place: number;
  totalBets: number;
  betCount: number;
}

interface GameStoreState {
  // User/Wallet
  username: string | null;
  walletAddress: string | null;
  displayName: string | null;
  solBalance: number;
  balance: number;

  // Game State
  gameState: GameState;
  selectedRacer: number | null;
  selectedCategory: BetCategory | null;
  betAmount: number;
  currentRaceWinner: number | null;
  raceTop3: Top3Entry[];
  playerCount: number;
  bettingTimeLeft: number;

  // Stats
  stats: GameStats;

  // Racers data
  racers: RacerData[];
  
  // Bet categories
  betCategories: BetCategory[];
  
  // Leaderboard
  leaderboard: LeaderboardEntry[];

  // Actions
  connectWallet: (walletAddress: string, displayName: string) => void;
  disconnectWallet: () => void;
  updateSolBalance: (sol: number) => void;
  selectCategory: (category: BetCategory) => void;
  selectRacer: (racerIndex: number) => void;
  placeBet: (racerIndex: number, amount: number) => boolean;
  startBettingRound: () => void;
  tickBettingTimer: () => void;
  startRace: () => void;
  finishRace: (finishOrder: number[]) => void;
  resetForNextRace: () => void;
  setGameState: (state: GameState) => void;
  updateBalance: (amount: number) => void;
  goToMainMenu: () => void;
}

const INITIAL_BALANCE = 1000;

// Define the 10 meme coin racers (using coin PNG assets)
const RACERS: RacerData[] = [
  { id: 1, name: 'Bonk',  imagePath: '/assets/coins/bonk.png',  odds: 10 },
  { id: 2, name: 'Wif',   imagePath: '/assets/coins/wif.png',   odds: 10 },
  { id: 3, name: 'Dodge', imagePath: '/assets/coins/dodge.png', odds: 10 },
  { id: 4, name: 'Brett', imagePath: '/assets/coins/brett.png', odds: 10 },
  { id: 5, name: 'Pengu', imagePath: '/assets/coins/pengu.png', odds: 10 },
  { id: 6, name: 'Pnut',  imagePath: '/assets/coins/Pnut.png',  odds: 10 },
  { id: 7, name: 'Floki', imagePath: '/assets/coins/floki.png', odds: 10 },
  { id: 8, name: 'PENGY', imagePath: '/assets/coins/pengy.png', odds: 10 },
  { id: 9, name: 'Pepe',  imagePath: '/assets/coins/pepe.png',  odds: 10 },
  { id: 10, name: 'SHIB', imagePath: '/assets/coins/shib.png',  odds: 10 },
];

// Betting categories
const BET_CATEGORIES: BetCategory[] = [
  { id: 'sol_005', amount: 0.05, currency: 'SOL', label: '0.05 sol' },
  { id: 'skr_200', amount: 200, currency: 'SKR', label: '200 skr' },
];

export const useGameStore = create<GameStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      username: null,
      walletAddress: null,
      displayName: null,
      solBalance: 0,
      balance: 0,
      gameState: 'INTRO',
      selectedRacer: null,
      selectedCategory: null,
      betAmount: 0,
      currentRaceWinner: null,
      raceTop3: [],
      playerCount: Math.floor(Math.random() * 500) + 1000,
      bettingTimeLeft: 0,
      stats: {
        wins: 0,
        losses: 0,
        totalBets: 0,
        totalWinnings: 0,
      },
      racers: RACERS,
      betCategories: BET_CATEGORIES,
      leaderboard: [],

      // Connect wallet (real Solana wallet)
      connectWallet: (walletAddress: string, displayName: string) => {
        set({
          username: displayName,
          walletAddress,
          displayName,
          gameState: 'MAIN_MENU',
        });
      },

      // Disconnect wallet
      disconnectWallet: () => {
        set({
          username: null,
          walletAddress: null,
          displayName: null,
          solBalance: 0,
          balance: 0,
          gameState: 'MAIN_MENU',
          selectedRacer: null,
          selectedCategory: null,
          betAmount: 0,
          currentRaceWinner: null,
          stats: {
            wins: 0,
            losses: 0,
            totalBets: 0,
            totalWinnings: 0,
          },
        });
      },

      // Update real SOL balance from chain
      updateSolBalance: (sol: number) => {
        set({ solBalance: sol });
      },

      // Select betting category
      selectCategory: (category: BetCategory) => {
        set({
          selectedCategory: category,
          betAmount: category.currency === 'SKR' ? category.amount : category.amount * 1000, // Convert SOL to credits equivalent
          gameState: 'CHARACTER_SELECT',
        });
      },

      // Select racer
      selectRacer: (racerIndex: number) => {
        set({ selectedRacer: racerIndex });
      },

      // Place bet
      placeBet: (racerIndex: number, amount: number): boolean => {
        const { balance, bettingTimeLeft } = get();

        if (bettingTimeLeft <= 0) {
          return false;
        }

        if (amount <= 0 || amount > balance) {
          return false;
        }

        set({
          selectedRacer: racerIndex,
          betAmount: amount,
          balance: balance - amount,
          gameState: 'BETTING',
        });

        return true;
      },

      // Start betting round (15-second window)
      startBettingRound: () => {
        set((state) => {
          const selectedCategory = state.selectedCategory ?? state.betCategories[0];
          const betAmount = selectedCategory.currency === 'SKR'
            ? selectedCategory.amount
            : selectedCategory.amount * 1000;

          return {
            gameState: 'CATEGORY_SELECT',
            bettingTimeLeft: 15,
            selectedRacer: null,
            selectedCategory,
            betAmount,
            currentRaceWinner: null,
            leaderboard: [],
          };
        });
      },

      // Countdown betting timer and auto-start race
      tickBettingTimer: () => {
        const { gameState, bettingTimeLeft } = get();

        if (!['CATEGORY_SELECT', 'CHARACTER_SELECT', 'BETTING'].includes(gameState)) {
          return;
        }

        if (bettingTimeLeft <= 1) {
          set({
            bettingTimeLeft: 0,
            gameState: 'COUNTDOWN',
          });
          return;
        }

        set({ bettingTimeLeft: bettingTimeLeft - 1 });
      },

      // Start race
      startRace: () => {
        set({ gameState: 'RACING' });
      },

      // Finish race
      finishRace: (finishOrder: number[]) => {
        const { selectedRacer, betAmount, balance, stats, racers } = get();
        const winnerIndex = finishOrder[0] ?? 0;
        const hasPlacedBet = selectedRacer !== null && betAmount > 0;
        const isWin = hasPlacedBet && selectedRacer === winnerIndex;

        let payout = 0;
        let newBalance = balance;

        if (isWin) {
          const racer = racers[winnerIndex];
          payout = betAmount * racer.odds;
          newBalance = balance + payout;
        }

        // Build top 3 with mock bet data
        const raceTop3: Top3Entry[] = finishOrder.slice(0, 3).map((racerId, idx) => ({
          racerId,
          place: idx + 1,
          totalBets: Math.floor(Math.random() * 500) + 100,
          betCount: Math.floor(Math.random() * 80) + 10,
        }));

        // Generate leaderboard from actual finish order
        const leaderboard: LeaderboardEntry[] = finishOrder.slice(0, 3).map((racerId, idx) => ({
          racerId,
          players: raceTop3[idx]?.betCount ?? 0,
          prize: [600, 200, 100][idx] ?? 0,
        }));

        set({
          currentRaceWinner: winnerIndex,
          raceTop3,
          gameState: 'FINISHED',
          balance: newBalance,
          leaderboard,
          stats: {
            wins: stats.wins + (isWin ? 1 : 0),
            losses: stats.losses + (hasPlacedBet && !isWin ? 1 : 0),
            totalBets: stats.totalBets + (hasPlacedBet ? 1 : 0),
            totalWinnings: stats.totalWinnings + payout,
          },
        });
      },

      // Reset for next race
      resetForNextRace: () => {
        set({
          gameState: 'MAIN_MENU',
          selectedRacer: null,
          selectedCategory: null,
          betAmount: 0,
          currentRaceWinner: null,
          raceTop3: [],
          leaderboard: [],
          bettingTimeLeft: 0,
        });
      },

      // Set game state
      setGameState: (state: GameState) => {
        set({ gameState: state });
      },

      // Update balance (for testing/admin)
      updateBalance: (amount: number) => {
        set({ balance: amount });
      },

      // Go to main menu
      goToMainMenu: () => {
        set({
          gameState: 'MAIN_MENU',
          selectedRacer: null,
          selectedCategory: null,
          betAmount: 0,
        });
      },
    }),
    {
      name: 'race-game-storage',
      partialize: (state) => ({
        username: state.username,
        walletAddress: state.walletAddress,
        displayName: state.displayName,
        balance: state.balance,
        stats: state.stats,
      }),
      onRehydrateStorage: () => (state) => {
        // When state is rehydrated, ensure gameState is valid
        if (state) {
          const validStates: GameState[] = ['INTRO', 'MAIN_MENU', 'CATEGORY_SELECT', 'CHARACTER_SELECT', 'BETTING', 'COUNTDOWN', 'RACING', 'FINISHED', 'LEADERBOARD'];
          if (!validStates.includes(state.gameState)) {
            state.gameState = state.username ? 'MAIN_MENU' : 'INTRO';
          }
          // Always start at main menu if user is logged in, or intro if not
          if (state.username) {
            state.gameState = 'MAIN_MENU';
          } else {
            state.gameState = 'INTRO';
          }
        }
      },
    }
  )
);
