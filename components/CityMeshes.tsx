import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { useLODStore } from '../systems/LODManager';

// 7 Building types with varied geometries and colors
const BUILDING_TYPES = {
  RESIDENTIAL_SMALL: {
    geometry: () => new THREE.BoxGeometry(0.012, 0.012, 0.04).translate(0, 0, 0.02),
    color: new THREE.Color('#e8d5b7'),
    heightRange: [0.03, 0.06],
    frequency: 0.35, // Probability weight
    capitalMultiplier: 0.8,
  },
  RESIDENTIAL_MEDIUM: {
    geometry: () => new THREE.BoxGeometry(0.018, 0.018, 0.08).translate(0, 0, 0.04),
    color: new THREE.Color('#d4c4a8'),
    heightRange: [0.06, 0.12],
    frequency: 0.25,
    capitalMultiplier: 0.9,
  },
  RESIDENTIAL_TALL: {
    geometry: () => new THREE.BoxGeometry(0.022, 0.022, 0.18).translate(0, 0, 0.09),
    color: new THREE.Color('#c9b896'),
    heightRange: [0.12, 0.22],
    frequency: 0.1,
    capitalMultiplier: 1.2,
  },
  COMMERCIAL: {
    geometry: () => new THREE.BoxGeometry(0.028, 0.028, 0.14).translate(0, 0, 0.07),
    color: new THREE.Color('#7eb8da'),
    heightRange: [0.1, 0.18],
    frequency: 0.12,
    capitalMultiplier: 1.3,
  },
  INDUSTRIAL: {
    geometry: () => new THREE.CylinderGeometry(0.015, 0.018, 0.08, 8).translate(0, 0.04, 0).rotateX(Math.PI / 2),
    color: new THREE.Color('#8b8b8b'),
    heightRange: [0.05, 0.1],
    frequency: 0.05,
    capitalMultiplier: 0.6,
  },
  SKYSCRAPER: {
    geometry: () => new THREE.BoxGeometry(0.025, 0.025, 0.35).translate(0, 0, 0.175),
    color: new THREE.Color('#4a90a4'),
    heightRange: [0.25, 0.45],
    frequency: 0.08,
    capitalMultiplier: 2.0,
  },
  LANDMARK: {
    geometry: () => {
      // Pyramid-like landmark
      const geo = new THREE.ConeGeometry(0.02, 0.15, 4);
      geo.translate(0, 0.075, 0);
      geo.rotateX(Math.PI / 2);
      return geo;
    },
    color: new THREE.Color('#c9a227'), // Gold
    heightRange: [0.1, 0.2],
    frequency: 0.05,
    capitalMultiplier: 3.0, // Much more common in capitals
  },
};

type BuildingType = keyof typeof BUILDING_TYPES;

// Pre-create materials for each type
const MATERIALS: Record<BuildingType, THREE.MeshStandardMaterial> = {
  RESIDENTIAL_SMALL: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.RESIDENTIAL_SMALL.color,
    roughness: 0.85,
    metalness: 0.05,
  }),
  RESIDENTIAL_MEDIUM: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.RESIDENTIAL_MEDIUM.color,
    roughness: 0.8,
    metalness: 0.05,
  }),
  RESIDENTIAL_TALL: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.RESIDENTIAL_TALL.color,
    roughness: 0.75,
    metalness: 0.1,
  }),
  COMMERCIAL: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.COMMERCIAL.color,
    roughness: 0.3,
    metalness: 0.6,
  }),
  INDUSTRIAL: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.INDUSTRIAL.color,
    roughness: 0.9,
    metalness: 0.2,
  }),
  SKYSCRAPER: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.SKYSCRAPER.color,
    roughness: 0.15,
    metalness: 0.8,
    emissive: new THREE.Color('#1e293b'),
    emissiveIntensity: 0.15,
  }),
  LANDMARK: new THREE.MeshStandardMaterial({
    color: BUILDING_TYPES.LANDMARK.color,
    roughness: 0.4,
    metalness: 0.7,
    emissive: new THREE.Color('#ffd700'),
    emissiveIntensity: 0.1,
  }),
};

// Max instances per type
const MAX_INSTANCES: Record<BuildingType, number> = {
  RESIDENTIAL_SMALL: 6000,
  RESIDENTIAL_MEDIUM: 3000,
  RESIDENTIAL_TALL: 1500,
  COMMERCIAL: 2500,
  INDUSTRIAL: 1000,
  SKYSCRAPER: 800,
  LANDMARK: 200,
};

const DUMMY = new THREE.Object3D();
const UP = new THREE.Vector3(0, 0, 1);

// Seeded random number generator for consistent building placement
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface CityMeshesProps {
  lodLevel: string;
}

export const CityMeshes: React.FC<CityMeshesProps> = ({ lodLevel }) => {
  const { countries } = useGameStore();
  const features = useLODStore((state) => state.features);
  const meshesRef = useRef<Map<BuildingType, THREE.InstancedMesh>>(new Map());

  // Create instanced meshes for each building type
  const instancedMeshes = useMemo(() => {
    const meshes = new Map<BuildingType, THREE.InstancedMesh>();

    (Object.keys(BUILDING_TYPES) as BuildingType[]).forEach((type) => {
      const config = BUILDING_TYPES[type];
      const geometry = config.geometry();
      const material = MATERIALS[type];
      const mesh = new THREE.InstancedMesh(geometry, material, MAX_INSTANCES[type]);
      mesh.frustumCulled = true;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      meshes.set(type, mesh);
    });

    return meshes;
  }, []);

  // Store reference
  useEffect(() => {
    meshesRef.current = instancedMeshes;
  }, [instancedMeshes]);

  // Populate buildings based on cities
  useMemo(() => {
    if (!countries || !features.showBuildings) return;

    const counts: Record<BuildingType, number> = {
      RESIDENTIAL_SMALL: 0,
      RESIDENTIAL_MEDIUM: 0,
      RESIDENTIAL_TALL: 0,
      COMMERCIAL: 0,
      INDUSTRIAL: 0,
      SKYSCRAPER: 0,
      LANDMARK: 0,
    };

    // Calculate density factor based on LOD
    const isDetailed = features.buildingDetail === 'detailed';
    const isSimple = features.buildingDetail === 'simple';
    const densityFactor = isDetailed ? 3 : (isSimple ? 1 : 0);

    if (densityFactor === 0) {
      // Hide all buildings
      instancedMeshes.forEach((mesh) => {
        mesh.count = 0;
        mesh.instanceMatrix.needsUpdate = true;
      });
      return;
    }

    // Process each country's cities
    countries.forEach((country) => {
      if (!country.cities) return;

      country.cities.forEach((city: any) => {
        const isCapital = city.is_capital;
        const seed = Math.abs(city.lat * 1000 + city.lng);

        // Base building count - more for capitals
        const baseCount = isCapital ? 40 : 12;
        const numBuildings = Math.floor(baseCount * densityFactor);

        // Distribute buildings around the city
        for (let i = 0; i < numBuildings; i++) {
          // Seeded random values for consistent placement
          const rand1 = seededRandom(seed + i * 0.1337);
          const rand2 = seededRandom(seed + i * 0.2674);
          const rand3 = seededRandom(seed + i * 0.4011);
          const rand4 = seededRandom(seed + i * 0.5348);

          // Select building type based on probabilities
          let cumulativeProb = 0;
          let selectedType: BuildingType = 'RESIDENTIAL_SMALL';

          const types = Object.keys(BUILDING_TYPES) as BuildingType[];
          for (const type of types) {
            const config = BUILDING_TYPES[type];
            const adjustedFreq = config.frequency * (isCapital ? config.capitalMultiplier : 1);
            cumulativeProb += adjustedFreq;

            if (rand1 <= cumulativeProb / 1.5) { // Normalize
              selectedType = type;
              break;
            }
          }

          // Check instance limit
          if (counts[selectedType] >= MAX_INSTANCES[selectedType]) continue;

          const mesh = instancedMeshes.get(selectedType);
          if (!mesh) continue;

          // Calculate position around city center
          const spreadRadius = isDetailed ? 0.08 : 0.04;
          const angle = rand2 * Math.PI * 2;
          const distance = rand3 * spreadRadius;

          // Offset from city center
          const offsetLat = Math.sin(angle) * distance * 0.8;
          const offsetLng = Math.cos(angle) * distance;

          // Position on globe surface (slightly above)
          const position = latLngToVector3(
            city.lat + offsetLat,
            city.lng + offsetLng,
            5.025 // Above terrain displacement
          );

          DUMMY.position.copy(position);

          // Align building with globe surface normal
          DUMMY.quaternion.setFromUnitVectors(UP, position.clone().normalize());

          // Random scale variation
          const scaleXY = 0.7 + rand4 * 0.6; // 0.7 to 1.3
          const scaleZ = 0.7 + seededRandom(seed + i * 0.6685) * 0.8; // 0.7 to 1.5

          DUMMY.scale.set(scaleXY, scaleXY, scaleZ);
          DUMMY.updateMatrix();

          mesh.setMatrixAt(counts[selectedType], DUMMY.matrix);
          counts[selectedType]++;
        }
      });
    });

    // Update instance counts and matrices
    instancedMeshes.forEach((mesh, type) => {
      mesh.count = counts[type];
      mesh.instanceMatrix.needsUpdate = true;
    });

  }, [countries, features.showBuildings, features.buildingDetail, instancedMeshes]);

  // Cleanup geometries on unmount
  useEffect(() => {
    return () => {
      instancedMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
      });
    };
  }, [instancedMeshes]);

  // Don't render if buildings shouldn't be shown
  if (!features.showBuildings || features.buildingDetail === 'none') {
    return null;
  }

  return (
    <group>
      {Array.from(instancedMeshes.values()).map((mesh, index) => (
        <primitive key={index} object={mesh} />
      ))}
    </group>
  );
};
