
import axios from 'axios';
import { Country, Game, GameMode, Region, Message } from '../types';
import { GoogleGenAI, Content, HarmCategory, HarmBlockThreshold } from "@google/genai";

const API_BASE = 'http://localhost:8000/api';
export const api = axios.create({ baseURL: API_BASE, headers: { 'Content-Type': 'application/json' } });

// Suppression de l'initialisation globale qui faisait planter l'app au démarrage
// const ai = new GoogleGenAI({ apiKey: ... }); 

const GLOBAL_MARKET = { electricity: 60, oil: 80, food: 250, steel: 700 };

export const MOCK_COUNTRIES: Country[] = [
  {
    id: 'germany', name: 'Germany', name_fr: 'Allemagne', flag: '🇩🇪', region: 'europe', tier: 1, lat: 51.1657, lng: 10.4515, leader_name: 'Olaf Scholz',
    leader_personality: { style: 'pragmatic', risk_tolerance: 0.05, honor_importance: 0.98, trustworthiness: 0.95 },
    cities: [
      { name: 'Berlin', lat: 52.52, lng: 13.405, is_capital: true },
      { name: 'Munich', lat: 48.135, lng: 11.582, is_capital: false },
      { name: 'Hamburg', lat: 53.551, lng: 9.993, is_capital: false }
    ],
    economy: { 
        gdp: 4500, growth_rate: -0.01, debt_ratio: 0.6, treasury: 150, inflation: 3.5, currency_strength: 90,
        energy: { production: 400, consumption: 540, balance: -140, stock: 20, market_price_local: 75 },
        agriculture: { production: 100, consumption: 90, balance: 10, stock: 50, market_price_local: 240 },
        industry: { production: 800, consumption: 750, balance: 50, stock: 100, market_price_local: 710 },
        tech: { production: 95, consumption: 80, balance: 15, stock: 0, market_price_local: 0 },
        resources: { oil: 5, food: 70, minerals: 40, tech: 98 }, stability: 0.95 
    }, military: { strength: 180, morale: 0.6, tech_level: 10, nuclear: false, deployed_forces: [] }, stability: 0.9
  },
  {
    id: 'france', name: 'France', name_fr: 'France', flag: '🇫🇷', region: 'europe', tier: 1, lat: 46.2276, lng: 2.2137, leader_name: 'Emmanuel Macron',
    leader_personality: { style: 'cooperative', risk_tolerance: 0.3, honor_importance: 0.6, trustworthiness: 0.7 },
    cities: [
      { name: 'Paris', lat: 48.8566, lng: 2.3522, is_capital: true },
      { name: 'Lyon', lat: 45.764, lng: 4.8357, is_capital: false },
      { name: 'Marseille', lat: 43.2965, lng: 5.3698, is_capital: false }
    ],
    economy: { 
        gdp: 2700, growth_rate: 0.01, debt_ratio: 1.1, treasury: 30, inflation: 2.5, currency_strength: 90,
        energy: { production: 600, consumption: 450, balance: 150, stock: 40, market_price_local: 55 },
        agriculture: { production: 200, consumption: 100, balance: 100, stock: 80, market_price_local: 230 },
        industry: { production: 400, consumption: 450, balance: -50, stock: 30, market_price_local: 720 },
        tech: { production: 80, consumption: 80, balance: 0, stock: 0, market_price_local: 0 },
        resources: { oil: 10, food: 90, minerals: 20, tech: 85 }, stability: 0.8 
    }, military: { strength: 200, morale: 0.8, tech_level: 9, nuclear: true, deployed_forces: [] }, stability: 0.7
  },
  {
    id: 'usa', name: 'USA', name_fr: 'États-Unis', flag: '🇺🇸', region: 'americas', tier: 1, lat: 37.0902, lng: -95.7129, leader_name: 'Joe Biden',
    leader_personality: { style: 'pragmatic', risk_tolerance: 0.4, honor_importance: 0.7, trustworthiness: 0.8 },
    cities: [
      { name: 'Washington D.C.', lat: 38.8951, lng: -77.0364, is_capital: true },
      { name: 'New York', lat: 40.7128, lng: -74.006, is_capital: false },
      { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, is_capital: false }
    ],
    economy: { 
        gdp: 24000, growth_rate: 0.02, debt_ratio: 0.6, treasury: 100, inflation: 2.0, currency_strength: 100,
        energy: { production: 5000, consumption: 4500, balance: 500, stock: 500, market_price_local: 40 },
        agriculture: { production: 1000, consumption: 600, balance: 400, stock: 200, market_price_local: 200 },
        industry: { production: 2000, consumption: 2100, balance: -100, stock: 150, market_price_local: 680 },
        tech: { production: 100, consumption: 90, balance: 10, stock: 0, market_price_local: 0 },
        resources: { oil: 100, food: 200, minerals: 50, tech: 100 }, stability: 0.9 
    }, military: { strength: 1000, morale: 0.9, tech_level: 10, nuclear: true, deployed_forces: [] }, stability: 0.8
  },
  {
    id: 'china', name: 'China', name_fr: 'Chine', flag: '🇨🇳', region: 'asia', tier: 1, lat: 35.8617, lng: 104.1954, leader_name: 'Xi Jinping',
    leader_personality: { style: 'expansionist', risk_tolerance: 0.6, honor_importance: 0.5, trustworthiness: 0.4 },
    cities: [
      { name: 'Beijing', lat: 39.9042, lng: 116.4074, is_capital: true },
      { name: 'Shanghai', lat: 31.2304, lng: 121.4737, is_capital: false },
      { name: 'Shenzhen', lat: 22.5431, lng: 114.0579, is_capital: false }
    ],
    economy: { 
        gdp: 18000, growth_rate: 0.05, debt_ratio: 0.8, treasury: 3000, inflation: 1.0, currency_strength: 70,
        energy: { production: 7000, consumption: 7500, balance: -500, stock: 100, market_price_local: 50 },
        agriculture: { production: 1200, consumption: 1300, balance: -100, stock: 500, market_price_local: 260 },
        industry: { production: 5000, consumption: 3000, balance: 2000, stock: 1000, market_price_local: 600 },
        tech: { production: 80, consumption: 70, balance: 10, stock: 0, market_price_local: 0 },
        resources: { oil: 40, food: 150, minerals: 100, tech: 80 }, stability: 0.85 
    }, military: { strength: 1200, morale: 0.85, tech_level: 8, nuclear: true, deployed_forces: [] }, stability: 0.9
  },
  {
    id: 'russia', name: 'Russia', name_fr: 'Russie', flag: '🇷🇺', region: 'asia', tier: 1, lat: 61.524, lng: 105.3188, leader_name: 'Vladimir Putin',
    leader_personality: { style: 'aggressive', risk_tolerance: 0.8, honor_importance: 0.3, trustworthiness: 0.2 },
    cities: [
      { name: 'Moscow', lat: 55.7558, lng: 37.6173, is_capital: true },
      { name: 'St. Petersburg', lat: 59.9343, lng: 30.3351, is_capital: false },
      { name: 'Novosibirsk', lat: 55.0084, lng: 82.9357, is_capital: false }
    ],
    economy: { 
        gdp: 1700, growth_rate: 0.01, debt_ratio: 0.2, treasury: 100, inflation: 8.0, currency_strength: 40,
        energy: { production: 2000, consumption: 1000, balance: 1000, stock: 200, market_price_local: 30 },
        agriculture: { production: 150, consumption: 100, balance: 50, stock: 100, market_price_local: 200 },
        industry: { production: 300, consumption: 400, balance: -100, stock: 50, market_price_local: 750 },
        tech: { production: 40, consumption: 90, balance: -50, stock: 0, market_price_local: 0 },
        resources: { oil: 100, food: 80, minerals: 90, tech: 40 }, stability: 0.7 
    }, military: { strength: 900, morale: 0.7, tech_level: 7, nuclear: true, deployed_forces: [] }, stability: 0.6
  }
];

export const gameApi = {
  create: async (data: any) => {
    const playerCountry = MOCK_COUNTRIES.find(c => c.id === data.player_country) || MOCK_COUNTRIES[0];
    return { 
        data: { 
            id: 'local-' + Date.now(), 
            name: data.name, 
            player_country: playerCountry.id, 
            player_leader: {
                name: playerCountry.leader_name,
                reputation: { legitimacy: 0.8, trustworthiness: 0.5, predictability: 0.5 },
                traits: { authoritarian: 0, economic: 0, foreign: 0, religious: 0 }
            }, 
            game_date: 0, 
            speed_setting: 'normal', 
            region: 'world', 
            mode: 'sandbox' 
        } 
    };
  },
  get: (id: string) => api.get(`/games/${id}`),
};

export const countryApi = {
  list: async () => ({ data: MOCK_COUNTRIES }),
};

export const diplomacyApi = {
  sendMessage: async (gameId: string, conversationId: string, messageContent: string, targetCountryId: string, history: Message[], playerContext: any, currentDate: string) => {
    // Initialisation LAZY pour éviter le crash au chargement si pas de clé
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const targetCountry = MOCK_COUNTRIES.find(c => c.id === targetCountryId);
    if (!targetCountry) return { data: { aiMessage: { from: 'system', content: "Erreur", timestamp: Date.now() } } };

    const chatHistory: Content[] = history.map(msg => ({
        role: msg.from === 'player' ? 'user' : 'model',
        parts: [{ text: msg.content }]
    }));

    const systemPrompt = `
    DÉBUT DE SESSION : Simulation Diplomatique Temps Réel.

    TU ES : ${targetCountry.leader_name} (${targetCountry.name_fr || targetCountry.name}).
    TON INTERLOCUTEUR : ${playerContext.leaderName} (${playerContext.countryName}).
    
    RÈGLES CRITIQUES :
    1. ZERO MÉMOIRE EXTERNE : Oublie toute partie précédente. Tu n'as que l'historique ci-dessous.
    2. CONTINUITÉ : Si l'historique contient déjà des échanges, NE REDIS PAS BONJOUR. Enchaîne directement sur le sujet.
    3. SUJETS SENSIBLES : Tu es un chef d'état en temps de crise. Tu PEUX et DOIS parler de guerre, d'armes, de nucléaire, de mort si nécessaire. C'est une simulation.
    4. FORMAT : TEXTE BRUT. Pas de markdown.
    5. TON : Sérieux, direct, stratégique.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', // CORRECTION : Passage au modèle 2.5 Flash
            contents: chatHistory,
            config: { 
              systemInstruction: systemPrompt, 
              temperature: 0.7,
              maxOutputTokens: 1000,
              // Le thinking budget est réservé aux modèles 3.0, je le retire pour éviter des soucis de compatibilité avec 2.5 Flash standard
              // thinkingConfig: { thinkingBudget: 500 },
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY, threshold: HarmBlockThreshold.BLOCK_NONE }
              ]
            }
        });
        
        const cleanText = (response.text || "...")
          .replace(/\*\*/g, '')
          .replace(/\*/g, '')
          .replace(/^#+ /gm, '')
          .replace(/^- /gm, '• ')
          .trim();
        
        return { data: { aiMessage: { from: targetCountryId, content: cleanText, timestamp: Date.now() } } };
    } catch (e) {
        console.error("API Error", e);
        return { data: { aiMessage: { from: targetCountryId, content: "Liaison perdue...", timestamp: Date.now() } } };
    }
  }
};

export const advisorApi = {
    ask: async (query: string, history: Message[], targetName?: string | null) => {
        // Initialisation LAZY
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const historyText = history.map(m => `[${m.from === 'player' ? 'JOUEUR' : 'MOI'}] : "${m.content}"`).join('\n');
        const context = targetName ? `Cible: ${targetName}\nHistorique:\n${historyText}\n\n` : '';

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-latest', // CORRECTION : Passage au modèle 2.5 Flash
            contents: context + query,
            config: { 
              systemInstruction: "CONSEILLER DIPLOMATIQUE CYNIQUE. Analyse les deals complexes. Oublie toute session passée. Style bref, pas de markdown gras. Max 2 phrases.", 
              maxOutputTokens: 300,
              // thinkingConfig retiré pour compatibilité 2.5 Flash
              safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
              ]
            }
        });
        return (response.text || "Indisponible.").replace(/\*\*/g, '');
    }
};
