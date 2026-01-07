import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// Types de bâtiments avec géométries variées
const BUILDING_TYPES = {
  RESIDENTIAL_SMALL: {
    // 0.05 height
    geometry: new THREE.BoxGeometry(0.015, 0.015, 0.05).translate(0, 0, 0.025),
    color: new THREE.Color('#e8d5b7'),
    heightRange: [0.03, 0.08]
  },
  RESIDENTIAL_MEDIUM: {
    // 0.1 height
    geometry: new THREE.BoxGeometry(0.02, 0.02, 0.1).translate(0, 0, 0.05),
    color: new THREE.Color('#d4c4a8'),
    heightRange: [0.08, 0.15]
  },
  RESIDENTIAL_TALL: {
    // 0.2 height
    geometry: new THREE.BoxGeometry(0.025, 0.025, 0.2).translate(0, 0, 0.1),
    color: new THREE.Color('#c9b896'),
    heightRange: [0.15, 0.25]
  },
  COMMERCIAL: {
    // Extrude geometry cannot be constant if we want variation, but for instancing we need constant geo.
    // We'll use a Box that looks like a building block
    geometry: new THREE.BoxGeometry(0.03, 0.03, 0.12).translate(0, 0, 0.06),
    color: new THREE.Color('#7eb8da'),
    heightRange: [0.1, 0.2]
  },
  INDUSTRIAL: {
    // Cylinder
    geometry: new THREE.CylinderGeometry(0.015, 0.02, 0.1, 8).translate(0, 0.05, 0).rotateX(Math.PI/2),
    color: new THREE.Color('#8b8b8b'),
    heightRange: [0.05, 0.12]
  },
  SKYSCRAPER: {
    geometry: new THREE.BoxGeometry(0.03, 0.03, 0.4).translate(0, 0, 0.2),
    color: new THREE.Color('#4a90a4'),
    heightRange: [0.3, 0.5]
  }
};

const MATERIALS = {
  RESIDENTIAL_SMALL: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.RESIDENTIAL_SMALL.color, roughness: 0.8 }),
  RESIDENTIAL_MEDIUM: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.RESIDENTIAL_MEDIUM.color, roughness: 0.8 }),
  RESIDENTIAL_TALL: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.RESIDENTIAL_TALL.color, roughness: 0.8 }),
  COMMERCIAL: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.COMMERCIAL.color, metalness: 0.5, roughness: 0.2 }),
  INDUSTRIAL: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.INDUSTRIAL.color, roughness: 0.9 }),
  SKYSCRAPER: new THREE.MeshStandardMaterial({ color: BUILDING_TYPES.SKYSCRAPER.color, metalness: 0.8, roughness: 0.1, emissive: '#1e293b', emissiveIntensity: 0.2 })
};

const DUMMY = new THREE.Object3D();
const UP = new THREE.Vector3(0, 0, 1); // BoxGeometry is translated along Z, so 'up' is +Z locally

export const CityMeshes: React.FC<{ lodLevel: string }> = ({ lodLevel }) => {
  const { countries } = useGameStore();

  // Define Refs for all types
  const meshRefs = {
    RESIDENTIAL_SMALL: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.RESIDENTIAL_SMALL.geometry, MATERIALS.RESIDENTIAL_SMALL, 5000), []),
    RESIDENTIAL_MEDIUM: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.RESIDENTIAL_MEDIUM.geometry, MATERIALS.RESIDENTIAL_MEDIUM, 2000), []),
    RESIDENTIAL_TALL: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.RESIDENTIAL_TALL.geometry, MATERIALS.RESIDENTIAL_TALL, 1000), []),
    COMMERCIAL: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.COMMERCIAL.geometry, MATERIALS.COMMERCIAL, 2000), []),
    INDUSTRIAL: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.INDUSTRIAL.geometry, MATERIALS.INDUSTRIAL, 1000), []),
    SKYSCRAPER: useMemo(() => new THREE.InstancedMesh(BUILDING_TYPES.SKYSCRAPER.geometry, MATERIALS.SKYSCRAPER, 500), [])
  };

  useMemo(() => {
    // Reset counts
    const counts = {
      RESIDENTIAL_SMALL: 0,
      RESIDENTIAL_MEDIUM: 0,
      RESIDENTIAL_TALL: 0,
      COMMERCIAL: 0,
      INDUSTRIAL: 0,
      SKYSCRAPER: 0
    };

    if (countries) {
      countries.forEach(country => {
        if (!country.cities) return;

        // Density factor
        const densityFactor = lodLevel === 'CITY' ? 3 : (lodLevel === 'REGIONAL' ? 1 : 0);
        if (densityFactor === 0) return;

        country.cities.forEach((city: any) => {
          const seed = Math.abs(city.lat * city.lng);
          const isCapital = city.is_capital;
          const baseCount = isCapital ? 30 : 10;
          const numBuildings = baseCount * densityFactor;

          // Distribution Logic
          for (let i = 0; i < numBuildings; i++) {
             const rand = (seed + i * 0.1337) % 1.0;
             let type: keyof typeof meshRefs;

             if (isCapital) {
               if (rand > 0.9) type = 'SKYSCRAPER';
               else if (rand > 0.7) type = 'COMMERCIAL';
               else if (rand > 0.5) type = 'RESIDENTIAL_TALL';
               else if (rand > 0.3) type = 'RESIDENTIAL_MEDIUM';
               else type = 'RESIDENTIAL_SMALL';
             } else {
               if (rand > 0.95) type = 'SKYSCRAPER'; // Rare
               else if (rand > 0.85) type = 'COMMERCIAL';
               else if (rand > 0.8) type = 'INDUSTRIAL';
               else if (rand > 0.5) type = 'RESIDENTIAL_MEDIUM';
               else type = 'RESIDENTIAL_SMALL';
             }

             // Check limit
             if (counts[type] >= meshRefs[type].count) continue;

             // Placement
             const spread = lodLevel === 'CITY' ? 0.06 : 0.02; // Wider spread in close view
             const angle = (seed + i) * 17.0;
             const dist = ((seed * i) % 100) / 100 * spread;

             const offLat = Math.sin(angle) * dist;
             const offLng = Math.cos(angle) * dist;

             // FIXED: Place at 5.03 to be above max displacement (5.02)
             const pos = latLngToVector3(city.lat + offLat, city.lng + offLng, 5.03);

             DUMMY.position.copy(pos);

             // FIXED: Use quaternion to align UP (+Z) with surface normal (pos.normalize())
             // BoxGeometry is created along Z-axis (translate 0,0,H/2)
             DUMMY.quaternion.setFromUnitVectors(UP, pos.clone().normalize());

             // Random Scale (Variation)
             const scaleXY = 0.8 + ((seed * i * 3) % 40)/100;
             const scaleZ = 0.8 + ((seed * i * 7) % 50)/100;
             DUMMY.scale.set(scaleXY, scaleXY, scaleZ);

             DUMMY.updateMatrix();
             meshRefs[type].setMatrixAt(counts[type]++, DUMMY.matrix);
          }
        });
      });
    }

    // Update instances
    Object.keys(meshRefs).forEach((key) => {
       const k = key as keyof typeof meshRefs;
       meshRefs[k].count = counts[k];
       meshRefs[k].instanceMatrix.needsUpdate = true;
    });

  }, [countries, lodLevel]);

  if (lodLevel === 'GLOBE' || lodLevel === 'CONTINENTAL') return null;

  return (
    <group>
      {Object.keys(meshRefs).map((key) => (
        <primitive key={key} object={meshRefs[key as keyof typeof meshRefs]} />
      ))}
    </group>
  );
};
