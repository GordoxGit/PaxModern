export type LODLevel = 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY_BUILDER';

export interface LODConfig {
  minDistance: number;
  maxDistance: number;
}

export const LOD_THRESHOLDS: Record<LODLevel, LODConfig> = {
  GLOBE: { minDistance: 20, maxDistance: Infinity },
  CONTINENTAL: { minDistance: 12, maxDistance: 20 },
  REGIONAL: { minDistance: 7, maxDistance: 12 },
  CITY_BUILDER: { minDistance: 0, maxDistance: 7 },
};

export const getLODLevel = (distance: number): LODLevel => {
  if (distance >= LOD_THRESHOLDS.GLOBE.minDistance) return 'GLOBE';
  if (distance >= LOD_THRESHOLDS.CONTINENTAL.minDistance) return 'CONTINENTAL';
  if (distance >= LOD_THRESHOLDS.REGIONAL.minDistance) return 'REGIONAL';
  return 'CITY_BUILDER';
};

export interface LODFeatures {
    showGlobeTexture: boolean;
    showPoliticalOverlay: boolean;
    showProvinces: boolean;
    showRoads: boolean;
    showBuildings: boolean;
    showVegetation: boolean;
    showDetailedTerrain: boolean;
    borderStyle: 'simple' | 'detailed' | 'hidden';
    labelSize: 'large' | 'medium' | 'small' | 'hidden';
}

export const getLODFeatures = (lod: LODLevel): LODFeatures => {
    switch (lod) {
        case 'GLOBE':
            return {
                showGlobeTexture: true,
                showPoliticalOverlay: false,
                showProvinces: false,
                showRoads: false,
                showBuildings: false,
                showVegetation: false,
                showDetailedTerrain: false,
                borderStyle: 'simple',
                labelSize: 'large'
            };
        case 'CONTINENTAL':
            return {
                showGlobeTexture: true,
                showPoliticalOverlay: true,
                showProvinces: false,
                showRoads: false,
                showBuildings: false,
                showVegetation: false,
                showDetailedTerrain: false,
                borderStyle: 'detailed',
                labelSize: 'medium'
            };
        case 'REGIONAL':
            return {
                showGlobeTexture: false,
                showPoliticalOverlay: true,
                showProvinces: true,
                showRoads: true,
                showBuildings: true,
                showVegetation: false,
                showDetailedTerrain: true,
                borderStyle: 'detailed',
                labelSize: 'small'
            };
        case 'CITY_BUILDER':
            return {
                showGlobeTexture: false,
                showPoliticalOverlay: false,
                showProvinces: true,
                showRoads: true,
                showBuildings: true,
                showVegetation: true,
                showDetailedTerrain: true,
                borderStyle: 'hidden',
                labelSize: 'hidden'
            };
    }
};
