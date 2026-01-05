import { Country, Message, Game } from '../types';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// === CONFIGURATION DES CLÉS (Sécurité : Vérifie qu'elles existent) ===
// Assurez-vous que .env.local contient : VITE_GOOGLE_API_KEY, VITE_GROQ_API_KEY, VITE_MISTRAL_API_KEY
const KEYS = {
  GOOGLE: import.meta.env.VITE_GOOGLE_API_KEY,
  GROQ: import.meta.env.VITE_GROQ_API_KEY,
  MISTRAL: import.meta.env.VITE_MISTRAL_API_KEY
};

// === LE CASTING "TRIO GRATUIT" ===
const MODELS = {
  // CONSEILLER : Gemini 2.0 Flash Experimental (Google)
  // Le modèle "Next Gen" de Google. Plus intelligent que le 1.5 Pro, et GRATUIT en preview.
  ADVISOR: 'gemini-2.0-flash-exp',

  // DIPLOMATE : Llama 3.3 70B (via Groq)
  // Le champion de l'Open Source. Vitesse extrême (500 tokens/s) et excellent en RP.
  DIPLOMAT: 'llama-3.3-70b-versatile',

  // SECOURS : Mistral Nemo (Mistral)
  // Le modèle français optimisé, parfait pour dépanner.
  FALLBACK: 'open-mistral-nemo'
};

// === 1. MOTEUR GOOGLE (Le Cerveau - Direct) ===
const callGoogle = async (systemPrompt: string, history: Message[], temperature: number) => {
  if (!KEYS.GOOGLE) { console.warn("Pas de clé Google"); return null; }

  const ai = new GoogleGenerativeAI(KEYS.GOOGLE);
  try {
    const model = ai.getGenerativeModel({
      model: MODELS.ADVISOR, // Utilise gemini-2.0-flash-exp
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

// === 2. MOTEUR GROQ (Le Speedster - Direct) ===
const callGroq = async (systemPrompt: string, history: Message[], temperature: number) => {
  if (!KEYS.GROQ) { console.warn("Pas de clé Groq"); return null; }

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

// === 3. MOTEUR MISTRAL (Le Roue de Secours - Direct) ===
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
  // DIPLOMATIE (Tchat) -> On veut que ça aille vite -> GROQ (Llama 3.3)
  // CONSEILLER (Stratégie) -> On veut que ce soit intelligent -> GOOGLE (Gemini 2.0)

  if (type === 'FAST') {
    response = await callGroq(prompt, history, 0.8);
    if (!response) response = await callGoogle(prompt, history, 0.8); // Fallback Google
  } else {
    response = await callGoogle(prompt, history, 0.6);
    if (!response) response = await callGroq(prompt, history, 0.6); // Fallback Groq
  }

  // Si tout échoue, on tente Mistral
  if (!response) response = await callMistral(prompt, history);

  return response || "⚠️ Erreur : Tous les canaux sont brouillés (Vérifiez vos clés API dans .env.local).";
};

// === EXPORTS API ===

// Données Mock des pays (Indispensable pour que le jeu tourne sans BDD)
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

export const diplomacyApi = {
  sendMessage: async (gameId: string, conversationId: string, messageContent: string, targetCountryId: string, history: Message[], playerContext: any, currentDate: string) => {

    const targetCountry = MOCK_COUNTRIES.find(c => c.id === targetCountryId);
    if (!targetCountry) return { data: { aiMessage: { from: 'system', content: "Erreur Cible", timestamp: Date.now() } } };

    const systemPrompt = `
    DÉBUT DE SESSION : Simulation Diplomatique.
    DATE : ${currentDate}.
    TU ES : ${targetCountry.leader_name} de ${targetCountry.name_fr}.
    TON INTERLOCUTEUR : ${playerContext.leaderName} (${playerContext.countryName}).

    PERSONNALITÉ : ${JSON.stringify(targetCountry.leader_personality)}.
    CONTEXTE ÉCO : PIB ${targetCountry.economy.gdp}B, Armée ${targetCountry.military.strength}k hommes.

    RÈGLES : Réponds en TEXTE BRUT. Sois stratégique, méfiant ou allié selon l'historique. Max 3 phrases sauf si négociation complexe.
    `;

    // Utilisation du profil FAST (Groq - Llama 3.3) pour la diplomatie
    const content = await askAI(systemPrompt, history, 'FAST');

    const cleanText = (content || "...")
      .replace(/\*\*/g, '')
      .replace(/^#+ /gm, '')
      .trim();

    return { data: { aiMessage: { from: targetCountryId, content: cleanText, timestamp: Date.now() } } };
  }
};

export const advisorApi = {
    ask: async (query: string, history: Message[], targetName?: string | null) => {
        const historyContext = history.map(m => `[${m.from === 'player' ? 'JOUEUR' : 'AUTRE'}] "${m.content}"`).join('\n');
        const prompt = `
        RÔLE: Conseiller Stratégique Machiavélique.
        CONTEXTE ACTUEL:
        ${targetName ? `Négociation avec ${targetName}` : 'Analyse générale'}

        HISTORIQUE RÉCENT:
        ${historyContext.slice(-3000)}

        QUESTION DU JOUEUR: "${query}"

        Réponds de manière concise, cynique et utile. Propose une action concrète.
        `;

        // Utilisation du profil SMART (Google Gemini 2.0 Flash Exp) pour le conseiller
        const response = await askAI("Tu es un conseiller stratégique.", [{from: 'player', content: prompt, timestamp: 0} as Message], 'SMART');
        return response;
    }
};

export const gameApi = {
  create: async (data: any) => {
    const playerCountry = MOCK_COUNTRIES.find(c => c.id === data.player_country) || MOCK_COUNTRIES[0];
    const gameData: any = {
        id: 'local-' + Date.now(),
        name: data.name,
        player_country: playerCountry.id,
        player_leader: {
            name: playerCountry.leader_name,
            rise_to_power: 'incumbent',
            reputation: { legitimacy: 0.8, trustworthiness: 0.5, predictability: 0.5 },
            traits: { authoritarian: 0, economic: 0, foreign: 0, religious: 0 }
        },
        game_date: 0,
        speed_setting: 'normal',
        region: 'world',
        mode: 'sandbox'
    };
    return { data: gameData };
  },
  get: (id: string) => ({
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
  }),
};

export const countryApi = {
  list: async () => ({ data: MOCK_COUNTRIES }),
};
