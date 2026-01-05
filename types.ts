
export interface Game {
  id: string;
  name: string;
  player_country: string;
  player_leader: PlayerLeader;
  game_date: number;
  speed_setting: SpeedSetting;
  region: Region;
  mode: GameMode;
}

export interface PlayerLeader {
  name: string;
  rise_to_power: "election" | "coup" | "revolution" | "succession" | "custom" | "incumbent";
  rise_description?: string;
  traits: {
    authoritarian: number;
    economic: number;
    foreign: number;
    religious: number;
  };
  background?: string;
  reputation: {
    legitimacy: number;
    trustworthiness: number;
    predictability: number;
  };
}

export interface City {
  name: string;
  lat: number;
  lng: number;
  is_capital: boolean;
}

export interface Country {
  id: string;
  name: string;
  name_fr?: string;
  flag: string;
  tier: 1 | 2 | 3;
  region?: string;
  lat: number;
  lng: number;
  leader_name: string;
  leader_personality: LeaderPersonality;
  cities?: City[];
  economy: Economy;
  military: Military;
  stability: number;
}

export interface LeaderPersonality {
  style: "aggressive" | "pragmatic" | "isolationist" | "expansionist" | "cooperative";
  risk_tolerance: number;
  honor_importance: number;
  trustworthiness: number;
}

export interface ResourceStats {
  production: number;
  consumption: number;
  balance: number;
  stock: number;
  market_price_local: number;
}

export interface Economy {
  gdp: number;
  growth_rate: number;
  debt_ratio: number;
  treasury: number;
  inflation: number;
  currency_strength: number;
  energy: ResourceStats;
  agriculture: ResourceStats;
  industry: ResourceStats;
  tech: ResourceStats;
  resources: {
    oil: number;
    food: number;
    minerals: number;
    tech: number;
  };
  stability: number;
}

export interface Military {
  strength: number;
  morale: number;
  tech_level: number;
  nuclear: boolean;
  deployed_forces: DeployedForce[];
}

export interface DeployedForce {
  unit_type: string;
  strength: number;
  location: string;
}

export interface Message {
  from: string;
  content: string;
  timestamp: number;
  isDraft?: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  messages: Message[];
  status: "active" | "closed";
}

export interface GameEvent {
  id: number;
  game_date: number;
  event_type: string;
  actors: string[];
  summary: string;
  importance: number;
}

export type SpeedSetting = "paused" | "slow" | "normal" | "fast" | "ultra";
export type Region = "world" | "europe" | "asia" | "africa" | "americas";
export type GameMode = "sandbox" | "domination" | "economic" | "religious";
