import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { LODLevel } from '../systems/LODManager';

// Geometry constants to reuse
// ADJUSTED: Taller and deeper geometries to penetrate terrain without floating or sinking
// We aim for Bottom at -0.05 (Radius 4.95) and Top at >0.1 (Radius 5.1)
// Terrain max height will be limited to ~0.04
const GEOMETRIES = {
  // Box H=0.15. Center Z offset to place bottom at -0.05.
  // Center = -0.05 + 0.075 = 0.025.
  RESIDENTIAL: new THREE.BoxGeometry(0.02, 0.02, 0.15).translate(0, 0, 0.025),

  // Box H=0.2. Bottom -0.05. Center = -0.05 + 0.1 = 0.05.
  COMMERCIAL: new THREE.BoxGeometry(0.03, 0.03, 0.2).translate(0, 0, 0.05),

  // Cylinder H=0.2. Rotated X means Y is Up (Z in world).
  // Translate Y (Up) to 0.05.
  INDUSTRIAL: new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6).translate(0, 0.05, 0).rotateX(Math.PI/2),

  // Box H=0.3. Bottom -0.05. Center = -0.05 + 0.15 = 0.1.
  SKYSCRAPER: new THREE.BoxGeometry(0.025, 0.025, 0.3).translate(0, 0, 0.1)
};

const MATERIALS = {
  RESIDENTIAL: new THREE.MeshStandardMaterial({ color: '#fca5a5', roughness: 0.8 }), // Light red
  COMMERCIAL: new THREE.MeshStandardMaterial({ color: '#93c5fd', metalness: 0.5, roughness: 0.2 }), // Blue glass
  INDUSTRIAL: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.9 }), // Concrete
  SKYSCRAPER: new THREE.MeshStandardMaterial({ color: '#e2e8f0', metalness: 0.8, roughness: 0.1, emissive: '#1e293b', emissiveIntensity: 0.2 })
};

const DUMMY = new THREE.Object3D();

export const CityMeshes: React.FC<{ lodLevel: LODLevel }> = ({ lodLevel }) => {
  const { countries } = useGameStore();

  // Create instanced meshes for each type
  const [resRef, comRef, indRef, skyRef] = [
    useMemo(() => new THREE.InstancedMesh(GEOMETRIES.RESIDENTIAL, MATERIALS.RESIDENTIAL, 4000), []),
    useMemo(() => new THREE.InstancedMesh(GEOMETRIES.COMMERCIAL, MATERIALS.COMMERCIAL, 2000), []),
    useMemo(() => new THREE.InstancedMesh(GEOMETRIES.INDUSTRIAL, MATERIALS.INDUSTRIAL, 1000), []),
    useMemo(() => new THREE.InstancedMesh(GEOMETRIES.SKYSCRAPER, MATERIALS.SKYSCRAPER, 500), [])
  ];

  useMemo(() => {
    let rIdx = 0, cIdx = 0, iIdx = 0, sIdx = 0;

    if (countries) {
      countries.forEach(country => {
        // Only generate detailed buildings in closer views
        const densityFactor = lodLevel === 'CITY_BUILDER' ? 3 : (lodLevel === 'REGIONAL' ? 1 : 0);

        if (densityFactor === 0) return;

        const cities = country.cities || [{ lat: country.lat, lng: country.lng, name: country.name, is_capital: true }];

        cities.forEach((city: any) => {
           // Deterministic seed based on lat/lng
           const seed = Math.abs(city.lat * city.lng);
           const numBuildings = (city.is_capital ? 20 : 5) * densityFactor;

           for (let i = 0; i < numBuildings; i++) {
               // Determine type based on random probability
               const typeRand = (seed + i * 0.1) % 1.0;
               let targetRef: THREE.InstancedMesh | null = null;
               let index = 0;
               let maxCount = 0;

               if (typeRand > 0.9 && city.is_capital) { targetRef = skyRef; index = sIdx++; maxCount=500; }
               else if (typeRand > 0.7) { targetRef = comRef; index = cIdx++; maxCount=2000; }
               else if (typeRand > 0.5) { targetRef = indRef; index = iIdx++; maxCount=1000; }
               else { targetRef = resRef; index = rIdx++; maxCount=4000; }

               if (!targetRef || index >= maxCount) continue;

               // Spread logic
               // CITY_BUILDER: Spread out more to make a "city"
               // REGIONAL: Cluster tightly
               const spread = lodLevel === 'CITY_BUILDER' ? 0.05 : 0.01;

               // Random offset (pseudo-random)
               const angle = (seed + i) * 123.45;
               const dist = ((seed * i) % 100) / 100 * spread;

               const offLat = Math.sin(angle) * dist;
               const offLng = Math.cos(angle) * dist;

               // Position on surface (Radius 5)
               const pos = latLngToVector3(city.lat + offLat, city.lng + offLng, 5);

               DUMMY.position.copy(pos);
               // Look away from center (Sky)
               DUMMY.lookAt(pos.clone().multiplyScalar(2));

               // Scale variation (Width only, keep Height consistent with geometry or scale Z)
               const scaleWidth = 0.8 + ((seed * i * 7) % 50)/50 * 0.4;
               const scaleHeight = 0.8 + ((seed * i * 13) % 100)/100 * 0.5; // Scale height slightly

               DUMMY.scale.set(scaleWidth, scaleWidth, scaleHeight);

               DUMMY.updateMatrix();
               targetRef.setMatrixAt(index, DUMMY.matrix);
           }
        });
      });
    }

    // Update instances
    resRef.count = rIdx;
    comRef.count = cIdx;
    indRef.count = iIdx;
    skyRef.count = sIdx;

    resRef.instanceMatrix.needsUpdate = true;
    comRef.instanceMatrix.needsUpdate = true;
    indRef.instanceMatrix.needsUpdate = true;
    skyRef.instanceMatrix.needsUpdate = true;

  }, [countries, lodLevel, resRef, comRef, indRef, skyRef]);

  // If invisible, don't render
  if (lodLevel === 'GLOBE') return null;

  return (
    <group>
      <primitive object={resRef} />
      <primitive object={comRef} />
      <primitive object={indRef} />
      <primitive object={skyRef} />
    </group>
  );
};
