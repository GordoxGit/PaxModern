// ProceduralBuildings.tsx - Bâtiments générés procéduralement
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useLODFeatures } from '../systems/LODManager';
import { City } from '../types';

// Types de bâtiments avec leurs caractéristiques
const BUILDING_TYPES = {
  RESIDENTIAL_SMALL: {
    baseSize: [0.03, 0.05, 0.03],
    heightRange: [0.02, 0.05],
    color: '#d4a574', // Beige
    frequency: 0.4,
  },
  RESIDENTIAL_MEDIUM: {
    baseSize: [0.04, 0.08, 0.04],
    heightRange: [0.05, 0.12],
    color: '#c9b896',
    frequency: 0.25,
  },
  RESIDENTIAL_TALL: {
    baseSize: [0.03, 0.15, 0.03],
    heightRange: [0.12, 0.25],
    color: '#b8a888',
    frequency: 0.1,
  },
  COMMERCIAL: {
    baseSize: [0.06, 0.1, 0.06],
    heightRange: [0.08, 0.2],
    color: '#7ba3c9', // Bleu verre
    frequency: 0.15,
  },
  INDUSTRIAL: {
    baseSize: [0.08, 0.04, 0.08],
    heightRange: [0.03, 0.08],
    color: '#8b8b8b', // Gris
    frequency: 0.05,
  },
  SKYSCRAPER: {
    baseSize: [0.04, 0.3, 0.04],
    heightRange: [0.25, 0.5],
    color: '#5a8ab5', // Bleu métal
    frequency: 0.04,
  },
  LANDMARK: {
    baseSize: [0.05, 0.15, 0.05],
    heightRange: [0.1, 0.2],
    color: '#c9a227', // Or
    frequency: 0.01,
  },
};

interface ProceduralBuildingsProps {
  cities: City[];
  globeRadius: number;
}

export function ProceduralBuildings({ cities, globeRadius }: ProceduralBuildingsProps) {
  const features = useLODFeatures();

  // Générer les instances de bâtiments
  const buildingInstances = useMemo(() => {
    if (!features.showBuildings || features.buildingDetail === 'none') {
      return null;
    }

    const instances: Map<string, THREE.Matrix4[]> = new Map();
    Object.keys(BUILDING_TYPES).forEach(type => instances.set(type, []));

    cities.forEach((city) => {
      // Convert city lat/lng to position
      // Note: city object usually has lat/lng. If not, we skip.
      if (typeof city.lat !== 'number' || typeof city.lng !== 'number') return;

      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lng + 180) * (Math.PI / 180);
      const cityPos = new THREE.Vector3(
        -globeRadius * Math.sin(phi) * Math.cos(theta),
        globeRadius * Math.cos(phi),
        globeRadius * Math.sin(phi) * Math.sin(theta)
      );

      // Nombre de bâtiments selon population et si capitale
      const isCapital = city.is_capital;
      const baseBuildingCount = isCapital ? 50 : 15;
      const buildingCount = features.buildingDetail === 'detailed'
        ? baseBuildingCount * 3
        : baseBuildingCount;

      // Générer bâtiments autour de la ville
      for (let i = 0; i < buildingCount; i++) {
        // Position aléatoire dans un rayon autour de la ville
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 0.02 * (isCapital ? 1.5 : 1);

        // Position sur la sphère
        const basePos = cityPos.clone();
        const tangent1 = new THREE.Vector3().crossVectors(basePos, new THREE.Vector3(0, 1, 0)).normalize();
        const tangent2 = new THREE.Vector3().crossVectors(basePos, tangent1).normalize();

        const offset = tangent1.multiplyScalar(Math.cos(angle) * distance)
          .add(tangent2.multiplyScalar(Math.sin(angle) * distance));

        const buildingPos = basePos.add(offset).normalize().multiplyScalar(globeRadius);

        // Choisir type de bâtiment selon probabilités
        const typeRoll = Math.random();
        let cumulative = 0;
        let selectedType = 'RESIDENTIAL_SMALL';

        for (const [type, config] of Object.entries(BUILDING_TYPES)) {
          // @ts-ignore
          cumulative += config.frequency;
          if (typeRoll <= cumulative) {
            selectedType = type;
            break;
          }
        }

        // Ajuster pour capitales (plus de gratte-ciels)
        if (isCapital && Math.random() < 0.2) {
          selectedType = 'SKYSCRAPER';
        }

        // Créer matrice de transformation
        const config = BUILDING_TYPES[selectedType as keyof typeof BUILDING_TYPES];
        const height = config.heightRange[0] + Math.random() * (config.heightRange[1] - config.heightRange[0]);

        const matrix = new THREE.Matrix4();

        // Position
        matrix.setPosition(buildingPos);

        // Rotation pour aligner avec la normale de la sphère
        const up = buildingPos.clone().normalize();
        const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
        const rotMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
        matrix.multiply(rotMatrix);

        // Scale
        const scale = new THREE.Matrix4().makeScale(
          config.baseSize[0],
          height,
          config.baseSize[2]
        );
        matrix.multiply(scale);

        instances.get(selectedType)!.push(matrix);
      }
    });

    return instances;
  }, [cities, features.showBuildings, features.buildingDetail, globeRadius]);

  // Créer les InstancedMesh pour chaque type
  const meshes = useMemo(() => {
    if (!buildingInstances) return [];

    return Array.from(buildingInstances.entries()).map(([type, matrices]) => {
      if (matrices.length === 0) return null;

      const config = BUILDING_TYPES[type as keyof typeof BUILDING_TYPES];

      // Géométrie selon le type
      let geometry: THREE.BufferGeometry;
      if (type === 'INDUSTRIAL') {
        geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
      } else if (type === 'LANDMARK') {
        geometry = new THREE.ConeGeometry(0.5, 1, 4);
      } else {
        geometry = new THREE.BoxGeometry(1, 1, 1);
      }

      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        roughness: 0.7,
        metalness: type === 'SKYSCRAPER' ? 0.5 : 0.1,
      });

      const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);

      matrices.forEach((matrix, i) => {
        mesh.setMatrixAt(i, matrix);
      });

      mesh.instanceMatrix.needsUpdate = true;

      return { type, mesh };
    }).filter(Boolean);
  }, [buildingInstances]);

  if (!features.showBuildings) return null;

  return (
    <group>
      {meshes.map((item) => (
        item ? <primitive key={item.type} object={item.mesh} /> : null
      ))}
    </group>
  );
}
