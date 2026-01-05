import { Country, Game, Message, Region } from '../types';
// Note: On n'utilise plus @google/genai, tout passe par OpenRouter via fetch standard.

// === CONFIGURATION INFRASTRUCTURE ===
const API_BASE = 'http://localhost:8000/api';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const SITE_URL = 'http://localhost:3000';
const SITE_NAME = 'Pax Modern';

// === CASTING DES INTELLIGENCES ARTIFICIELLES ===
const AI_CASTING = {
  // 1. LE STRATÈGE (Conseiller & USA)
  // Deepseek v3.2 : Roi du raisonnement, idéal pour la logique implacable.
  STRATEGIST: 'deepseek/deepseek-v3.2',

  // 2. LE DIPLOMATE RAPIDE (Europe / Défaut)
  // Gemini 2.5 Flash : Rapide, efficace, bon quota gratuit.
  DIPLOMAT_FAST: 'google/gemini-2.5-flash',

  // 3. L'IMPRÉVISIBLE (Russie / Iran / Dictatures)
  // Chimera : Modèle "fusion" créatif, moins censuré, parfait pour les menaces.
  CREATIVE: 'tngtech/deepseek-r1t2-chimera',

  // 4. L'ASIATIQUE TECH (Chine / Japon)
  // Xiaomi Mimo : Modèle optimisé chinois, pour une "saveur" locale réaliste.
  ASIAN_TECH: 'xiaomi/mimo-v2-flash-20251210',

  // 5. LE LEGACY (Fallback)
  // Une version stable de Deepseek en cas de pépin.
  LEGACY: 'deepseek/deepseek-chat-v3-0324'
};

// === DONNÉES STATIQUES (Gardées de l'ancienne version) ===
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

// === FONCTION UTILITAIRE : APPEL OPENROUTER ===
const callOpenRouter = async (systemPrompt: string, history: Message[], modelId: string, temperature: number = 0.7) => {
  if (!OPENROUTER_API_KEY) {
    console.error("ERREUR CRITIQUE: Clé VITE_OPENROUTER_API_KEY manquante dans .env.local");
    return "⚠️ Erreur Système : Clé API introuvable.";
  }

  // Formatage OpenAI standard
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(m => ({
      role: m.from === 'player' ? 'user' : 'assistant',
      content: m.content
    }))
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: modelId,
        messages: messages,
        temperature: temperature,
        max_tokens: 1024,
        top_p: 0.9
      })
    });

    const data = await response.json();

    if (data.error) {
        console.error("OpenRouter Error:", data.error);
        return `[ERREUR COM] ${data.error.message}`;
    }

    return data.choices?.[0]?.message?.content || "...";
  } catch (e) {
    console.error("Network Error", e);
    return "Liaison satellite interrompue (Timeout).";
  }
};

// === API DIPLOMATIE (Le cœur du jeu) ===
export const diplomacyApi = {
  sendMessage: async (gameId: string, conversationId: string, messageContent: string, targetCountryId: string, history: Message[], playerContext: any, currentDate: string) => {

    const targetCountry = MOCK_COUNTRIES.find(c => c.id === targetCountryId);
    if (!targetCountry) return { data: { aiMessage: { from: 'system', content: "Erreur Cible", timestamp: Date.now() } } };

    // Prompt Système (Contextualisation)
    const systemPrompt = `
    SIMULATION GÉOPOLITIQUE TRÈS HAUTE FIDÉLITÉ.
    DATE : ${currentDate}.

    TU INCARNES : ${targetCountry.leader_name}, dirigeant de : ${targetCountry.name_fr || targetCountry.name}.
    TON INTERLOCUTEUR : ${playerContext.leaderName} (${playerContext.countryName}).

    TA PERSONNALITÉ : ${JSON.stringify(targetCountry.leader_personality)}.
    TON ÉTAT : PIB ${targetCountry.economy.gdp}B, Stabilité ${(targetCountry.stability * 100).toFixed(0)}%.

    DIRECTIVES :
    1. Réponds en TEXTE BRUT (Pas de markdown, pas de gras).
    2. Sois bref (max 3 phrases) sauf si la négociation l'exige.
    3. Défends tes intérêts nationaux avec cynisme si nécessaire.
    4. Tu as le droit de bluffer ou de menacer.
    `;

    // SÉLECTION DYNAMIQUE DU MODÈLE (Casting)
    let selectedModel = AI_CASTING.DIPLOMAT_FAST; // Par défaut : Gemini 2.5
    let temp = 0.75;

    switch (targetCountryId) {
        case 'china':
            selectedModel = AI_CASTING.ASIAN_TECH; // Xiaomi Mimo
            temp = 0.6; // Plus froid/calculateur
            break;
        case 'russia':
        case 'iran':
        case 'north_korea':
            selectedModel = AI_CASTING.CREATIVE; // Chimera
            temp = 0.85; // Plus imprévisible/agressif
            break;
        case 'usa':
            selectedModel = AI_CASTING.STRATEGIST; // Deepseek 3.2
            temp = 0.7; // Très logique
            break;
        default:
            selectedModel = AI_CASTING.DIPLOMAT_FAST; // Europe & Reste du monde
            break;
    }

    console.log(`[DIPLOMACY] Envoi message à ${targetCountryId} via ${selectedModel}`);
    const aiResponse = await callOpenRouter(systemPrompt, history, selectedModel, temp);

    // Nettoyage léger
    const cleanText = aiResponse.replace(/\*\*/g, '').trim();

    return { data: { aiMessage: { from: targetCountryId, content: cleanText, timestamp: Date.now() } } };
  }
};

// === API CONSEILLER (Le Cerveau) ===
export const advisorApi = {
    ask: async (query: string, history: Message[], targetName?: string | null) => {
        const historyContext = history.map(m => `[${m.from === 'player' ? 'JOUEUR' : 'AUTRE'}] "${m.content}"`).join('\n');

        const prompt = `
        RÔLE: Conseiller Stratégique Machiavélique de Haut Niveau.
        CONTEXTE ACTUEL: ${targetName ? `Négociation en cours avec ${targetName}` : 'Analyse de la situation globale'}.

        HISTORIQUE RÉCENT DES ÉCHANGES:
        ${historyContext.slice(-3000)}

        DEMANDE DU JOUEUR: "${query}"

        TA MISSION :
        Donne une analyse lucide, cynique et utile. Propose une action concrète.
        Sois bref.
        `;

        // Pour le conseiller, on veut le MEILLEUR modèle de raisonnement disponible
        console.log(`[ADVISOR] Réflexion via ${AI_CASTING.STRATEGIST}`);
        const response = await callOpenRouter(prompt, [{from: 'player', content: 'Analyse.', timestamp: 0} as Message], AI_CASTING.STRATEGIST, 0.6);

        return response || "Je suis en train d'analyser les rapports... (Silence radio)";
    }
};

// === AUTRES SERVICES (Mock) ===
export const gameApi = {
  create: async (data: any) => {
    const playerCountry = MOCK_COUNTRIES.find(c => c.id === data.player_country) || MOCK_COUNTRIES[0];
    return { data: { id: 'local-' + Date.now(), name: data.name, player_country: playerCountry.id, player_leader: { name: playerCountry.leader_name, reputation: { legitimacy: 0.8, trustworthiness: 0.5, predictability: 0.5 }, traits: { authoritarian: 0, economic: 0, foreign: 0, religious: 0 } }, game_date: 0, speed_setting: 'normal', region: 'world', mode: 'sandbox' } };
  },
  get: (id: string) => ({ data: { /* Mock data si nécessaire */ } }), // Simplifié pour éviter erreurs build
};

export const countryApi = {
  list: async () => ({ data: MOCK_COUNTRIES }),
};
