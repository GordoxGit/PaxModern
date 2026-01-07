export interface TerrainLOD {
  level: 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY';
  sphereSegments: number;
  textureSize: '2K' | '4K' | '8K';
  features: {
    showSatellite: boolean;
    showPoliticalOverlay: boolean;
    showRelief: boolean;
    showCities: boolean;
    showRoads: boolean;
    showBuildings: boolean;
    showVegetation: boolean;
  };
}

export const TERRAIN_LOD_CONFIG: Record<string, TerrainLOD> = {
  GLOBE: {
    level: 'GLOBE',
    sphereSegments: 64,
    textureSize: '2K',
    features: {
      showSatellite: true,
      showPoliticalOverlay: false,
      showRelief: false,
      showCities: false,
      showRoads: false,
      showBuildings: false,
      showVegetation: false
    }
  },

  CONTINENTAL: {
    level: 'CONTINENTAL',
    sphereSegments: 128,
    textureSize: '4K',
    features: {
      showSatellite: true,
      showPoliticalOverlay: true,
      showRelief: true, // Bump map active
      showCities: true, // Capitals
      showRoads: false,
      showBuildings: false,
      showVegetation: false
    }
  },

  REGIONAL: {
    level: 'REGIONAL',
    sphereSegments: 256,
    textureSize: '8K',
    features: {
      showSatellite: true,
      showPoliticalOverlay: true,
      showRelief: true,
      showCities: true,
      showRoads: true,
      showBuildings: true, // Simple cubes
      showVegetation: false
    }
  },

  CITY: {
    level: 'CITY',
    sphereSegments: 512, // High res for displacement
    textureSize: '8K',
    features: {
      showSatellite: false, // Could be replaced by detail map if available, or just high res sat
      showPoliticalOverlay: false,
      showRelief: true,
      showCities: true,
      showRoads: true,
      showBuildings: true, // Detailed
      showVegetation: true
    }
  }
};
