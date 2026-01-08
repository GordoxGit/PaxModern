// LODManager.ts - Gestion centralisée des niveaux de détail
import { create } from 'zustand';

export type LODLevel = 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY_BUILDER';

export interface LODFeatures {
  // Terrain
  terrainSegments: number;
  showRelief: boolean;
  reliefIntensity: number;

  // Politique
  showPoliticalOverlay: boolean;
  politicalOpacity: number;

  // Frontières
  showBorders: boolean;
  borderWidth: number;
  borderGlow: number;

  // Villes
  showCapitals: boolean;
  showCities: boolean;
  showBuildings: boolean;
  buildingDetail: 'none' | 'simple' | 'detailed';

  // Routes
  showHighways: boolean;
  showNationalRoads: boolean;
  showRegionalRoads: boolean;
  showLocalRoads: boolean;

  // Végétation
  showVegetation: boolean;
  vegetationDensity: number;

  // Labels
  showCountryLabels: boolean;
  showCityLabels: boolean;
  labelScale: number;
}

export const LOD_CONFIGS: Record<LODLevel, LODFeatures> = {
  GLOBE: {
    terrainSegments: 64,
    showRelief: false,
    reliefIntensity: 0,
    showPoliticalOverlay: false,
    politicalOpacity: 0,
    showBorders: true,
    borderWidth: 1,
    borderGlow: 0,
    showCapitals: true,
    showCities: false,
    showBuildings: false,
    buildingDetail: 'none',
    showHighways: false,
    showNationalRoads: false,
    showRegionalRoads: false,
    showLocalRoads: false,
    showVegetation: false,
    vegetationDensity: 0,
    showCountryLabels: true,
    showCityLabels: false,
    labelScale: 1.5,
  },
  CONTINENTAL: {
    terrainSegments: 128,
    showRelief: true,
    reliefIntensity: 0.3,
    showPoliticalOverlay: true,
    politicalOpacity: 0.4,
    showBorders: true,
    borderWidth: 2,
    borderGlow: 0.3,
    showCapitals: true,
    showCities: false,
    showBuildings: false,
    buildingDetail: 'none',
    showHighways: true,
    showNationalRoads: false,
    showRegionalRoads: false,
    showLocalRoads: false,
    showVegetation: false,
    vegetationDensity: 0,
    showCountryLabels: true,
    showCityLabels: true,
    labelScale: 1.0,
  },
  REGIONAL: {
    terrainSegments: 256,
    showRelief: true,
    reliefIntensity: 0.7,
    showPoliticalOverlay: true,
    politicalOpacity: 0.3,
    showBorders: true,
    borderWidth: 3,
    borderGlow: 0.5,
    showCapitals: true,
    showCities: true,
    showBuildings: true,
    buildingDetail: 'simple',
    showHighways: true,
    showNationalRoads: true,
    showRegionalRoads: true,
    showLocalRoads: false,
    showVegetation: false,
    vegetationDensity: 0,
    showCountryLabels: false,
    showCityLabels: true,
    labelScale: 0.7,
  },
  CITY_BUILDER: {
    terrainSegments: 512,
    showRelief: true,
    reliefIntensity: 1.0,
    showPoliticalOverlay: false,
    politicalOpacity: 0,
    showBorders: false,
    borderWidth: 0,
    borderGlow: 0,
    showCapitals: true,
    showCities: true,
    showBuildings: true,
    buildingDetail: 'detailed',
    showHighways: true,
    showNationalRoads: true,
    showRegionalRoads: true,
    showLocalRoads: true,
    showVegetation: true,
    vegetationDensity: 1.0,
    showCountryLabels: false,
    showCityLabels: true,
    labelScale: 0.5,
  },
};

// Store Zustand pour état global LOD
interface LODState {
  currentLOD: LODLevel;
  features: LODFeatures;
  transitionProgress: number;
  isTransitioning: boolean;

  setLOD: (level: LODLevel) => void;
  startTransition: (from: LODLevel, to: LODLevel) => void;
  updateTransition: (progress: number) => void;
  endTransition: () => void;
}

export const useLODStore = create<LODState>((set, get) => ({
  currentLOD: 'GLOBE',
  features: LOD_CONFIGS.GLOBE,
  transitionProgress: 0,
  isTransitioning: false,

  setLOD: (level) => set({
    currentLOD: level,
    features: LOD_CONFIGS[level]
  }),

  startTransition: (from, to) => set({
    isTransitioning: true,
    transitionProgress: 0
  }),

  updateTransition: (progress) => {
    const state = get();
    set({ transitionProgress: progress });

    // Interpoler les features pendant la transition
    // (optionnel, pour transitions ultra-smooth)
  },

  endTransition: () => set({
    isTransitioning: false,
    transitionProgress: 1
  }),
}));

// Hook pour obtenir les features actuelles
export function useLODFeatures(): LODFeatures {
  return useLODStore((state) => state.features);
}

// Hook pour obtenir le LOD actuel
export function useCurrentLOD(): LODLevel {
  return useLODStore((state) => state.currentLOD);
}

// Ajouter cette fonction exportée à la fin du fichier
export const getLODFromDistance = (distance: number, current: LODLevel): LODLevel => {
  // LOGIQUE HYSTÉRÉSIS : On laisse une marge pour éviter le clignotement

  // Transition GLOBE <-> CONTINENTAL
  if (current === 'GLOBE') {
    if (distance < 18) return 'CONTINENTAL'; // On rentre
    return 'GLOBE';
  }
  if (current === 'CONTINENTAL') {
    if (distance > 22) return 'GLOBE'; // On sort (Marge de 4 unités)
    if (distance < 10) return 'REGIONAL';
    return 'CONTINENTAL';
  }

  // Transition CONTINENTAL <-> REGIONAL
  if (current === 'REGIONAL') {
    if (distance > 12) return 'CONTINENTAL';
    if (distance < 6) return 'CITY_BUILDER';
    return 'REGIONAL';
  }

  // Transition REGIONAL <-> CITY
  if (current === 'CITY_BUILDER') {
    if (distance > 7) return 'REGIONAL';
    return 'CITY_BUILDER';
  }

  return 'GLOBE';
};
