import { create } from 'zustand';

// LOD Levels
export type LODLevel = 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY_BUILDER';

// Comprehensive feature configuration per LOD level
export interface LODFeatures {
  // Terrain
  terrainSegments: number;
  showRelief: boolean;
  reliefIntensity: number;

  // Political overlay
  showPoliticalOverlay: boolean;
  politicalOpacity: number;

  // Borders
  showBorders: boolean;
  borderWidth: number;
  borderGlow: number;

  // Cities
  showCapitals: boolean;
  showCities: boolean;
  showBuildings: boolean;
  buildingDetail: 'none' | 'simple' | 'detailed';

  // Roads
  showHighways: boolean;
  showNationalRoads: boolean;
  showRegionalRoads: boolean;
  showLocalRoads: boolean;

  // Vegetation
  showVegetation: boolean;
  vegetationDensity: number;

  // Labels
  showCountryLabels: boolean;
  showCityLabels: boolean;
  labelScale: number;

  // Camera
  minDistance: number;
  maxDistance: number;
  rotateSpeed: number;
  zoomSpeed: number;
  panSpeed: number;
  enablePan: boolean;
  maxPolarAngle: number;
  minPolarAngle: number;
  fov: number;
  targetMode: 'center' | 'surface_follow' | 'surface_lock';
}

// Distance thresholds for LOD transitions
export const LOD_DISTANCE_THRESHOLDS = {
  GLOBE: { min: 12, max: 80 },
  CONTINENTAL: { min: 6, max: 12 },
  REGIONAL: { min: 3, max: 6 },
  CITY_BUILDER: { min: 0.5, max: 3 },
} as const;

// Complete LOD configurations
export const LOD_CONFIGS: Record<LODLevel, LODFeatures> = {
  GLOBE: {
    // Terrain
    terrainSegments: 64,
    showRelief: false,
    reliefIntensity: 0,

    // Political
    showPoliticalOverlay: false,
    politicalOpacity: 0,

    // Borders
    showBorders: true,
    borderWidth: 1,
    borderGlow: 0,

    // Cities
    showCapitals: true,
    showCities: false,
    showBuildings: false,
    buildingDetail: 'none',

    // Roads
    showHighways: false,
    showNationalRoads: false,
    showRegionalRoads: false,
    showLocalRoads: false,

    // Vegetation
    showVegetation: false,
    vegetationDensity: 0,

    // Labels
    showCountryLabels: true,
    showCityLabels: false,
    labelScale: 1.5,

    // Camera
    minDistance: 12,
    maxDistance: 80,
    rotateSpeed: 0.8,
    zoomSpeed: 1.2,
    panSpeed: 0,
    enablePan: false,
    maxPolarAngle: Math.PI * 0.85,
    minPolarAngle: Math.PI * 0.15,
    fov: 45,
    targetMode: 'center',
  },

  CONTINENTAL: {
    // Terrain
    terrainSegments: 128,
    showRelief: true,
    reliefIntensity: 0.3,

    // Political
    showPoliticalOverlay: true,
    politicalOpacity: 0.4,

    // Borders
    showBorders: true,
    borderWidth: 2,
    borderGlow: 0.3,

    // Cities
    showCapitals: true,
    showCities: false,
    showBuildings: false,
    buildingDetail: 'none',

    // Roads
    showHighways: true,
    showNationalRoads: false,
    showRegionalRoads: false,
    showLocalRoads: false,

    // Vegetation
    showVegetation: false,
    vegetationDensity: 0,

    // Labels
    showCountryLabels: true,
    showCityLabels: true,
    labelScale: 1.0,

    // Camera
    minDistance: 6,
    maxDistance: 12,
    rotateSpeed: 0.5,
    zoomSpeed: 1.0,
    panSpeed: 0.3,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.85,
    minPolarAngle: Math.PI * 0.15,
    fov: 50,
    targetMode: 'surface_follow',
  },

  REGIONAL: {
    // Terrain
    terrainSegments: 256,
    showRelief: true,
    reliefIntensity: 0.7,

    // Political
    showPoliticalOverlay: true,
    politicalOpacity: 0.3,

    // Borders
    showBorders: true,
    borderWidth: 3,
    borderGlow: 0.5,

    // Cities
    showCapitals: true,
    showCities: true,
    showBuildings: true,
    buildingDetail: 'simple',

    // Roads
    showHighways: true,
    showNationalRoads: true,
    showRegionalRoads: true,
    showLocalRoads: false,

    // Vegetation
    showVegetation: false,
    vegetationDensity: 0,

    // Labels
    showCountryLabels: false,
    showCityLabels: true,
    labelScale: 0.7,

    // Camera
    minDistance: 3,
    maxDistance: 6,
    rotateSpeed: 0.3,
    zoomSpeed: 0.8,
    panSpeed: 0.6,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.9,
    minPolarAngle: Math.PI * 0.05,
    fov: 55,
    targetMode: 'surface_lock',
  },

  CITY_BUILDER: {
    // Terrain
    terrainSegments: 512,
    showRelief: true,
    reliefIntensity: 1.0,

    // Political
    showPoliticalOverlay: false,
    politicalOpacity: 0,

    // Borders
    showBorders: false,
    borderWidth: 0,
    borderGlow: 0,

    // Cities
    showCapitals: true,
    showCities: true,
    showBuildings: true,
    buildingDetail: 'detailed',

    // Roads
    showHighways: true,
    showNationalRoads: true,
    showRegionalRoads: true,
    showLocalRoads: true,

    // Vegetation
    showVegetation: true,
    vegetationDensity: 1.0,

    // Labels
    showCountryLabels: false,
    showCityLabels: true,
    labelScale: 0.5,

    // Camera
    minDistance: 0.5,
    maxDistance: 3,
    rotateSpeed: 0.2,
    zoomSpeed: 0.5,
    panSpeed: 1.0,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.97,
    minPolarAngle: 0.03,
    fov: 60,
    targetMode: 'surface_lock',
  },
};

// Zustand store interface
interface LODState {
  // Current state
  currentLOD: LODLevel;
  previousLOD: LODLevel | null;
  features: LODFeatures;
  cameraDistance: number;

  // Transition state
  isTransitioning: boolean;
  transitionProgress: number;
  transitionStartTime: number;
  transitionDuration: number;

  // Actions
  setLOD: (level: LODLevel) => void;
  setCameraDistance: (distance: number) => void;
  checkAndUpdateLOD: (distance: number) => boolean;
  startTransition: (from: LODLevel, to: LODLevel) => void;
  updateTransition: (progress: number) => void;
  endTransition: () => void;
  getInterpolatedFeatures: () => LODFeatures;
}

// Calculate LOD level from camera distance
export function getLODFromDistance(distance: number): LODLevel {
  if (distance > LOD_DISTANCE_THRESHOLDS.GLOBE.min) return 'GLOBE';
  if (distance > LOD_DISTANCE_THRESHOLDS.CONTINENTAL.min) return 'CONTINENTAL';
  if (distance > LOD_DISTANCE_THRESHOLDS.REGIONAL.min) return 'REGIONAL';
  return 'CITY_BUILDER';
}

// Interpolate between two feature sets
function interpolateFeatures(from: LODFeatures, to: LODFeatures, t: number): LODFeatures {
  const lerp = (a: number, b: number) => a + (b - a) * t;

  return {
    // Terrain - use target values for non-numeric
    terrainSegments: Math.round(lerp(from.terrainSegments, to.terrainSegments)),
    showRelief: t > 0.5 ? to.showRelief : from.showRelief,
    reliefIntensity: lerp(from.reliefIntensity, to.reliefIntensity),

    // Political
    showPoliticalOverlay: t > 0.5 ? to.showPoliticalOverlay : from.showPoliticalOverlay,
    politicalOpacity: lerp(from.politicalOpacity, to.politicalOpacity),

    // Borders
    showBorders: t > 0.5 ? to.showBorders : from.showBorders,
    borderWidth: lerp(from.borderWidth, to.borderWidth),
    borderGlow: lerp(from.borderGlow, to.borderGlow),

    // Cities
    showCapitals: t > 0.5 ? to.showCapitals : from.showCapitals,
    showCities: t > 0.5 ? to.showCities : from.showCities,
    showBuildings: t > 0.5 ? to.showBuildings : from.showBuildings,
    buildingDetail: t > 0.5 ? to.buildingDetail : from.buildingDetail,

    // Roads
    showHighways: t > 0.5 ? to.showHighways : from.showHighways,
    showNationalRoads: t > 0.5 ? to.showNationalRoads : from.showNationalRoads,
    showRegionalRoads: t > 0.5 ? to.showRegionalRoads : from.showRegionalRoads,
    showLocalRoads: t > 0.5 ? to.showLocalRoads : from.showLocalRoads,

    // Vegetation
    showVegetation: t > 0.5 ? to.showVegetation : from.showVegetation,
    vegetationDensity: lerp(from.vegetationDensity, to.vegetationDensity),

    // Labels
    showCountryLabels: t > 0.5 ? to.showCountryLabels : from.showCountryLabels,
    showCityLabels: t > 0.5 ? to.showCityLabels : from.showCityLabels,
    labelScale: lerp(from.labelScale, to.labelScale),

    // Camera parameters
    minDistance: lerp(from.minDistance, to.minDistance),
    maxDistance: lerp(from.maxDistance, to.maxDistance),
    rotateSpeed: lerp(from.rotateSpeed, to.rotateSpeed),
    zoomSpeed: lerp(from.zoomSpeed, to.zoomSpeed),
    panSpeed: lerp(from.panSpeed, to.panSpeed),
    enablePan: t > 0.5 ? to.enablePan : from.enablePan,
    maxPolarAngle: lerp(from.maxPolarAngle, to.maxPolarAngle),
    minPolarAngle: lerp(from.minPolarAngle, to.minPolarAngle),
    fov: lerp(from.fov, to.fov),
    targetMode: t > 0.5 ? to.targetMode : from.targetMode,
  };
}

// Create the Zustand store
export const useLODStore = create<LODState>((set, get) => ({
  // Initial state
  currentLOD: 'GLOBE',
  previousLOD: null,
  features: LOD_CONFIGS.GLOBE,
  cameraDistance: 20,

  // Transition state
  isTransitioning: false,
  transitionProgress: 0,
  transitionStartTime: 0,
  transitionDuration: 0.5, // 500ms transitions

  // Actions
  setLOD: (level: LODLevel) => {
    set({
      currentLOD: level,
      features: LOD_CONFIGS[level],
    });
  },

  setCameraDistance: (distance: number) => {
    set({ cameraDistance: distance });
  },

  checkAndUpdateLOD: (distance: number) => {
    const state = get();
    const newLOD = getLODFromDistance(distance);

    if (newLOD !== state.currentLOD && !state.isTransitioning) {
      state.startTransition(state.currentLOD, newLOD);
      return true;
    }

    set({ cameraDistance: distance });
    return false;
  },

  startTransition: (from: LODLevel, to: LODLevel) => {
    set({
      isTransitioning: true,
      previousLOD: from,
      currentLOD: to,
      transitionProgress: 0,
      transitionStartTime: performance.now(),
    });
  },

  updateTransition: (progress: number) => {
    const state = get();
    const clampedProgress = Math.min(1, Math.max(0, progress));

    if (clampedProgress >= 1) {
      state.endTransition();
      return;
    }

    set({ transitionProgress: clampedProgress });
  },

  endTransition: () => {
    const state = get();
    set({
      isTransitioning: false,
      transitionProgress: 1,
      previousLOD: null,
      features: LOD_CONFIGS[state.currentLOD],
    });
  },

  getInterpolatedFeatures: () => {
    const state = get();

    if (!state.isTransitioning || !state.previousLOD) {
      return LOD_CONFIGS[state.currentLOD];
    }

    // Apply easing function (ease-in-out quad)
    const t = state.transitionProgress;
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    return interpolateFeatures(
      LOD_CONFIGS[state.previousLOD],
      LOD_CONFIGS[state.currentLOD],
      easedT
    );
  },
}));

// Convenience hooks
export function useLODFeatures(): LODFeatures {
  return useLODStore((state) => state.features);
}

export function useCurrentLOD(): LODLevel {
  return useLODStore((state) => state.currentLOD);
}

export function useLODTransition() {
  return useLODStore((state) => ({
    isTransitioning: state.isTransitioning,
    progress: state.transitionProgress,
    previousLOD: state.previousLOD,
    currentLOD: state.currentLOD,
  }));
}

// Legacy compatibility - mapping old TERRAIN_LOD_CONFIG structure
export const TERRAIN_LOD_CONFIG: Record<string, { level: LODLevel; sphereSegments: number; features: Record<string, boolean> }> = {
  GLOBE: {
    level: 'GLOBE',
    sphereSegments: 64,
    features: {
      showSatellite: true,
      showPoliticalOverlay: false,
      showRelief: false,
      showCities: false,
      showRoads: false,
      showBuildings: false,
      showVegetation: false,
    },
  },
  CONTINENTAL: {
    level: 'CONTINENTAL',
    sphereSegments: 128,
    features: {
      showSatellite: true,
      showPoliticalOverlay: true,
      showRelief: true,
      showCities: true,
      showRoads: false,
      showBuildings: false,
      showVegetation: false,
    },
  },
  REGIONAL: {
    level: 'REGIONAL',
    sphereSegments: 256,
    features: {
      showSatellite: true,
      showPoliticalOverlay: true,
      showRelief: true,
      showCities: true,
      showRoads: true,
      showBuildings: true,
      showVegetation: false,
    },
  },
  CITY: {
    level: 'CITY_BUILDER',
    sphereSegments: 512,
    features: {
      showSatellite: false,
      showPoliticalOverlay: false,
      showRelief: true,
      showCities: true,
      showRoads: true,
      showBuildings: true,
      showVegetation: true,
    },
  },
};
