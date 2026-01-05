import { Country, Message } from '../types';
import { GoogleGenerativeAI as GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// === CONFIGURATION DES CLÉS (Sécurité : Vérifie qu'elles existent) ===
const KEYS = {
  GOOGLE: import.meta.env.VITE_GOOGLE_API_KEY,
  GROQ: import.meta.env.VITE_GROQ_API_KEY,
  MISTRAL: import.meta.env.VITE_MISTRAL_API_KEY
};

// === LE CASTING GRATUIT ===
const MODELS = {
  // CONSEILLER : Gemini 1.5 Flash (Google)
  // Pourquoi ? 1 Million de tokens de contexte GRATUIT. Il se souvient de tout.
  ADVISOR: 'gemini-1.5-flash',

  // DIPLOMATE : Llama 3.3 70B (via Groq)
  // Pourquoi ? C'est le plus rapide du monde (500 tokens/sec) et gratuit actuellement.
  DIPLOMAT: 'llama-3.3-70b-versatile',

  // SECOURS : Mistral Nemo (Mistral)
  // Pourquoi ? Très bon en français si les autres plantent.
  FALLBACK: 'open-mistral-nemo'
};

// === 1. MOTEUR GOOGLE (Direct) ===
const callGoogle = async (systemPrompt: string, history: Message[], temperature: number) => {
  if (!KEYS.GOOGLE) return null;
  const ai = new GoogleGenAI(KEYS.GOOGLE);
  try {
    const model = ai.getGenerativeModel({
      model: MODELS.ADVISOR,
      systemInstruction: systemPrompt,
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }]
    });

    // Conversion format Google
    const chat = model.startChat({
      history: history.map(m => ({
        role: m.from === 'player' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    });

    const result = await chat.sendMessage("Analyse et réponds.");
    return result.response.text();
  } catch (e) {
    console.error("Google Error:", e);
    return null;
  }
};

// === 2. MOTEUR GROQ (Direct - Compatible OpenAI) ===
const callGroq = async (systemPrompt: string, history: Message[], temperature: number) => {
  if (!KEYS.GROQ) return null;
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.from === 'player' ? 'user' : 'assistant', content: m.content }))
    ];

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEYS.GROQ}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODELS.DIPLOMAT,
        messages: messages,
        temperature: temperature,
        max_tokens: 1024
      })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  } catch (e) {
    console.error("Groq Error:", e);
    return null;
  }
};

// === 3. MOTEUR MISTRAL (Direct) ===
const callMistral = async (systemPrompt: string, history: Message[]) => {
  if (!KEYS.MISTRAL) return null;
  try {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.from === 'player' ? 'user' : 'assistant', content: m.content }))
    ];
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${KEYS.MISTRAL}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODELS.FALLBACK, messages: messages })
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content;
  } catch (e) { return null; }
};

// === ROUTEUR INTELLIGENT ===
const askAI = async (prompt: string, history: Message[], type: 'FAST' | 'SMART') => {
  let response = null;

  // STRATÉGIE :
  // Si on veut de la vitesse (Diplomatie) -> GROQ en premier
  // Si on veut de l'analyse (Conseiller) -> GOOGLE en premier

  if (type === 'FAST') {
    response = await callGroq(prompt, history, 0.8);
    if (!response) response = await callGoogle(prompt, history, 0.8); // Fallback
  } else {
    response = await callGoogle(prompt, history, 0.6);
    if (!response) response = await callGroq(prompt, history, 0.6); // Fallback
  }

  // Si tout échoue, on tente Mistral
  if (!response) response = await callMistral(prompt, history);

  return response || "⚠️ Erreur : Tous les canaux sont brouillés (Vérifiez vos clés API).";
};

// === DONNÉES STATIQUES ===
export const MOCK_COUNTRIES: Country[] = [
  {
    id: 'germany', name: 'Germany', name_fr: 'Allemagne', flag: '🇩🇪', region: 'europe', tier: 1, lat: 51.1657, lng: 10.4515, leader_name: 'Olaf Scholz',
    leader_personality: { style: 'pragmatic', risk_tolerance: 0.05, honor_importance: 0.98, trustworthiness: 0.95 },
    cities: [{ name: 'Berlin', lat: 52.52, lng: 13.405, is_capital: true }],
    economy: { gdp: 4500, growth_rate: -0.01, debt_ratio: 0.6, treasury: 150, inflation: 3.5, currency_strength: 90, energy: { production: 400, consumption: 540, balance: -140, stock: 20, market_price_local: 75 }, agriculture: { production: 100, consumption: 90, balance: 10, stock: 50, market_price_local: 240 }, industry: { production: 800, consumption: 750, balance: 50, stock: 100, market_price_local: 710 }, tech: { production: 95, consumption: 80, balance: 15, stock: 0, market_price_local: 0 }, resources: { oil: 5, food: 70, minerals: 40, tech: 98 }, stability: 0.95 }, military: { strength: 180, morale: 0.6, tech_level: 10, nuclear: false, deployed_forces: [] }, stability: 0.9
  },
  {
    id: 'france', name: 'France', name_fr: 'France', flag: '🇫🇷', region: 'europe', tier: 1, lat: 46.2276, lng: 2.2137, leader_name: 'Emmanuel Macron',
    leader_personality: { style: 'cooperative', risk_tolerance: 0.3, honor_importance: 0.6, trustworthiness: 0.7 },
    cities: [{ name: 'Paris', lat: 48.8566, lng: 2.3522, is_capital: true }],
    economy: { gdp: 2700, growth_rate: 0.01, debt_ratio: 1.1, treasury: 30, inflation: 2.5, currency_strength: 90, energy: { production: 600, consumption: 450, balance: 150, stock: 40, market_price_local: 55 }, agriculture: { production: 200, consumption: 100, balance: 100, stock: 80, market_price_local: 230 }, industry: { production: 400, consumption: 450, balance: -50, stock: 30, market_price_local: 720 }, tech: { production: 80, consumption: 80, balance: 0, stock: 0, market_price_local: 0 }, resources: { oil: 10, food: 90, minerals: 20, tech: 85 }, stability: 0.8 }, military: { strength: 200, morale: 0.8, tech_level: 9, nuclear: true, deployed_forces: [] }, stability: 0.7
  },
  {
    id: 'usa', name: 'USA', name_fr: 'États-Unis', flag: '🇺🇸', region: 'americas', tier: 1, lat: 37.0902, lng: -95.7129, leader_name: 'Joe Biden',
    leader_personality: { style: 'pragmatic', risk_tolerance: 0.4, honor_importance: 0.7, trustworthiness: 0.8 },
    cities: [{ name: 'Washington D.C.', lat: 38.8951, lng: -77.0364, is_capital: true }],
    economy: { gdp: 24000, growth_rate: 0.02, debt_ratio: 0.6, treasury: 100, inflation: 2.0, currency_strength: 100, energy: { production: 5000, consumption: 4500, balance: 500, stock: 500, market_price_local: 40 }, agriculture: { production: 1000, consumption: 600, balance: 400, stock: 200, market_price_local: 200 }, industry: { production: 2000, consumption: 2100, balance: -100, stock: 150, market_price_local: 680 }, tech: { production: 100, consumption: 90, balance: 10, stock: 0, market_price_local: 0 }, resources: { oil: 100, food: 200, minerals: 50, tech: 100 }, stability: 0.9 }, military: { strength: 1000, morale: 0.9, tech_level: 10, nuclear: true, deployed_forces: [] }, stability: 0.8
  },
  {
    id: 'china', name: 'China', name_fr: 'Chine', flag: '🇨🇳', region: 'asia', tier: 1, lat: 35.8617, lng: 104.1954, leader_name: 'Xi Jinping',
    leader_personality: { style: 'expansionist', risk_tolerance: 0.6, honor_importance: 0.5, trustworthiness: 0.4 },
    cities: [{ name: 'Beijing', lat: 39.9042, lng: 116.4074, is_capital: true }],
    economy: { gdp: 18000, growth_rate: 0.05, debt_ratio: 0.8, treasury: 3000, inflation: 1.0, currency_strength: 70, energy: { production: 7000, consumption: 7500, balance: -500, stock: 100, market_price_local: 50 }, agriculture: { production: 1200, consumption: 1300, balance: -100, stock: 500, market_price_local: 260 }, industry: { production: 5000, consumption: 3000, balance: 2000, stock: 1000, market_price_local: 600 }, tech: { production: 80, consumption: 70, balance: 10, stock: 0, market_price_local: 0 }, resources: { oil: 40, food: 150, minerals: 100, tech: 80 }, stability: 0.85 }, military: { strength: 1200, morale: 0.85, tech_level: 8, nuclear: true, deployed_forces: [] }, stability: 0.9
  },
  {
    id: 'russia', name: 'Russia', name_fr: 'Russie', flag: '🇷🇺', region: 'asia', tier: 1, lat: 61.524, lng: 105.3188, leader_name: 'Vladimir Putin',
    leader_personality: { style: 'aggressive', risk_tolerance: 0.8, honor_importance: 0.3, trustworthiness: 0.2 },
    cities: [{ name: 'Moscow', lat: 55.7558, lng: 37.6173, is_capital: true }],
    economy: { gdp: 1700, growth_rate: 0.01, debt_ratio: 0.2, treasury: 100, inflation: 8.0, currency_strength: 40, energy: { production: 2000, consumption: 1000, balance: 1000, stock: 200, market_price_local: 30 }, agriculture: { production: 150, consumption: 100, balance: 50, stock: 100, market_price_local: 200 }, industry: { production: 300, consumption: 400, balance: -100, stock: 50, market_price_local: 750 }, tech: { production: 40, consumption: 90, balance: -50, stock: 0, market_price_local: 0 }, resources: { oil: 100, food: 80, minerals: 90, tech: 40 }, stability: 0.7 }, military: { strength: 900, morale: 0.7, tech_level: 7, nuclear: true, deployed_forces: [] }, stability: 0.6
  }
];

// === EXPORTS API (Inchangés pour le reste de l'app) ===

export const diplomacyApi = {
  sendMessage: async (gameId: any, conversationId: any, messageContent: any, targetCountryId: any, history: any, playerContext: any, currentDate: any) => {
    // On recrée le contexte système ici (abrégé pour l'exemple)
    const targetCountry = MOCK_COUNTRIES.find(c => c.id === targetCountryId);
    const prompt = `TU ES ${targetCountry?.leader_name || 'Chef'}. DATE: ${currentDate}. INTERLOCUTEUR: ${playerContext.leaderName}. Réponds court et réaliste.`;

    // Appel Rapide (Groq)
    const content = await askAI(prompt, history, 'FAST');
    return { data: { aiMessage: { from: targetCountryId, content: content, timestamp: Date.now() } } };
  }
};

export const advisorApi = {
  ask: async (query: any, history: any, targetName: any) => {
    const prompt = `RÔLE: Conseiller Stratégique. CONTEXTE: ${targetName || 'Global'}. QUESTION: "${query}". Sois machiavélique.`;

    // Appel Intelligent (Google)
    const content = await askAI(prompt, [{ from: 'player', content: 'Analyse', timestamp: 0 }], 'SMART');
    return content;
  }
};

export const gameApi = {
  create: async (d:any) => {
     const playerCountry = MOCK_COUNTRIES.find(c => c.id === d.player_country) || MOCK_COUNTRIES[0];
     return {
       data: {
         id: '1',
         ...d,
         player_leader: {
           name: playerCountry.leader_name,
           rise_to_power: 'incumbent' as const,
           traits: { authoritarian: 0, economic: 0, foreign: 0, religious: 0 },
           reputation: { legitimacy: 0.8, trustworthiness: 0.5, predictability: 0.5 }
         },
         game_date: 0,
         speed_setting: 'normal' as const,
         region: 'world' as const,
         mode: 'sandbox' as const
       }
     };
  },
  get: (id:any) => ({
    data: {
      id: '1',
      name: 'Partie Test',
      player_country: 'france',
      player_leader: {
        name: 'Emmanuel Macron',
        rise_to_power: 'election' as const,
        traits: { authoritarian: 0, economic: 0, foreign: 0, religious: 0 },
        reputation: { legitimacy: 0.8, trustworthiness: 0.5, predictability: 0.5 }
      },
      game_date: 0,
      speed_setting: 'normal' as const,
      region: 'world' as const,
      mode: 'sandbox' as const
    }
  })
};

export const countryApi = { list: async () => ({ data: MOCK_COUNTRIES }) };
