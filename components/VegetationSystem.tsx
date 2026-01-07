import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { LODLevel } from '../systems/LODManager';

// Cone H=0.15. Bottom at -0.05.
// Center Y = -0.05 + 0.15/2 = -0.05 + 0.075 = 0.025.
const TREE_GEO = new THREE.ConeGeometry(0.015, 0.15, 5);
TREE_GEO.translate(0, 0.025, 0);
TREE_GEO.rotateX(Math.PI/2); // Point outwards

const TREE_MAT = new THREE.MeshStandardMaterial({ color: '#166534', roughness: 0.9 });

const DUMMY = new THREE.Object3D();

export const VegetationSystem: React.FC<{ lodLevel: LODLevel }> = ({ lodLevel }) => {
  const { countries } = useGameStore();

  const meshRef = useMemo(() => new THREE.InstancedMesh(TREE_GEO, TREE_MAT, 5000), []);

  useMemo(() => {
    if (lodLevel !== 'CITY_BUILDER') {
        meshRef.count = 0;
        return;
    }

    let idx = 0;
    if (countries) {
        countries.forEach(country => {
            // Only spawn trees around cities for now (parks/suburbs)
            if (country.cities) {
                country.cities.forEach((city: any) => {
                     // 10-20 trees per city
                     const numTrees = 15;
                     for(let i=0; i<numTrees; i++) {
                         if (idx >= 5000) return;

                         // Place in a ring around the city (Suburbs)
                         const angle = Math.random() * Math.PI * 2;
                         const dist = 0.06 + Math.random() * 0.04; // Further out than buildings

                         const pos = latLngToVector3(city.lat + Math.sin(angle)*dist*20, city.lng + Math.cos(angle)*dist*20, 5);

                         DUMMY.position.copy(pos);
                         DUMMY.lookAt(pos.clone().multiplyScalar(2));

                         const scale = 0.5 + Math.random() * 1.0;
                         // Scale affects Z (Height) too, so base height 0.15 * scale 0.5 = 0.075. Still tall enough.
                         DUMMY.scale.set(scale, scale, scale);
                         DUMMY.updateMatrix();

                         meshRef.setMatrixAt(idx++, DUMMY.matrix);
                     }
                });
            }
        });
    }
    meshRef.count = idx;
    meshRef.instanceMatrix.needsUpdate = true;
  }, [countries, lodLevel, meshRef]);

  return <primitive object={meshRef} />;
};
