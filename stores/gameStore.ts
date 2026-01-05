
import { create } from 'zustand';
import { Game, Country, GameEvent, Conversation, Message } from '../types';

interface GameState {
  currentGame: Game | null;
  countries: Country[];
  events: GameEvent[];
  conversations: Conversation[];
  advisorMessages: Message[];
  selectedCountry: string | null;
  activeConversationId: string | null;
  
  // UI States
  isAdvisorOpen: boolean; 
  isDiplomacyListOpen: boolean;
  isPaused: boolean;
  
  setGame: (game: Game) => void;
  setCountries: (countries: Country[]) => void;
  addEvent: (event: GameEvent) => void;
  selectCountry: (countryId: string | null) => void;
  
  // Gestion Conversations
  openConversation: (conversationId: string) => void;
  closeConversation: () => void;
  addMessage: (conversationId: string, message: Message) => void;
  toggleDiplomacyList: () => void;
  
  // Actions Conseiller
  toggleAdvisor: () => void;
  addAdvisorMessage: (message: Message) => void;
  
  togglePause: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentGame: null,
  countries: [],
  events: [],
  conversations: [],
  advisorMessages: [{
    from: 'system',
    content: "Initialisation du Conseiller Stratégique v2.5. En attente de données diplomatiques...",
    timestamp: Date.now()
  }],
  selectedCountry: null,
  activeConversationId: null,
  
  isAdvisorOpen: false,
  isDiplomacyListOpen: false,
  isPaused: true,
  
  setGame: (game) => set({ 
    currentGame: game,
    // Réinitialisation totale pour éviter la persistance entre les parties
    events: [],
    conversations: [],
    advisorMessages: [{
      from: 'system',
      content: "Initialisation du Conseiller Stratégique v2.5. En attente de données diplomatiques...",
      timestamp: Date.now()
    }],
    selectedCountry: null,
    activeConversationId: null,
    isAdvisorOpen: false,
    isDiplomacyListOpen: false,
    isPaused: true
  }),
  setCountries: (countries) => set({ countries }),
  addEvent: (event) => set((state) => ({ 
    events: [event, ...state.events].slice(0, 100) 
  })),
  selectCountry: (countryId) => set({ selectedCountry: countryId }),
  
  openConversation: (conversationId) => set({ activeConversationId: conversationId, isDiplomacyListOpen: false }),
  closeConversation: () => set({ activeConversationId: null }),
  addMessage: (conversationId, message) => set((state) => {
    const conversationIndex = state.conversations.findIndex(c => c.id === conversationId);
    let newConversations = [...state.conversations];
    
    if (conversationIndex === -1) {
      newConversations.push({
        id: conversationId,
        participants: [],
        messages: [message],
        status: 'active'
      });
    } else {
      newConversations[conversationIndex] = {
        ...newConversations[conversationIndex],
        messages: [...newConversations[conversationIndex].messages, message]
      };
    }
    
    return { conversations: newConversations };
  }),
  
  toggleDiplomacyList: () => set((state) => ({ isDiplomacyListOpen: !state.isDiplomacyListOpen })),
  
  toggleAdvisor: () => set((state) => ({ isAdvisorOpen: !state.isAdvisorOpen })),
  addAdvisorMessage: (message) => set((state) => ({ 
    advisorMessages: [...state.advisorMessages, message] 
  })),
  
  togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
}));
