import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// Vegetation Types
const VEGETATION_TYPES = {
  TREE_DECIDUOUS: {
    // Cone: Default is Y-up. We rotate it to Z-up? No, let's keep it consistent.
    // If we want Z-up logic like buildings, we should rotate geometry.
    // Standard Cone is height along Y.
    // Let's RotateX(PI/2) -> height along Z.
    geometry: new THREE.ConeGeometry(0.008, 0.025, 6).translate(0, 0.0125, 0).rotateX(Math.PI/2),
    color: new THREE.Color('#228b22'),
    count: 3000
  },
  TREE_CONIFER: {
    geometry: new THREE.ConeGeometry(0.006, 0.03, 4).translate(0, 0.015, 0).rotateX(Math.PI/2),
    color: new THREE.Color('#1e5128'),
    count: 3000
  },
  BUSH: {
    geometry: new THREE.SphereGeometry(0.005, 4, 4).translate(0, 0, 0.0025),
    color: new THREE.Color('#4ade80'),
    count: 2000
  }
};

const DUMMY = new THREE.Object3D();
const UP = new THREE.Vector3(0, 0, 1);

export const VegetationSystem = ({ lodLevel }: { lodLevel: string }) => {
  const { countries } = useGameStore();

  const meshes = {
    TREE_DECIDUOUS: useMemo(() => new THREE.InstancedMesh(VEGETATION_TYPES.TREE_DECIDUOUS.geometry, new THREE.MeshStandardMaterial({color: VEGETATION_TYPES.TREE_DECIDUOUS.color}), VEGETATION_TYPES.TREE_DECIDUOUS.count), []),
    TREE_CONIFER: useMemo(() => new THREE.InstancedMesh(VEGETATION_TYPES.TREE_CONIFER.geometry, new THREE.MeshStandardMaterial({color: VEGETATION_TYPES.TREE_CONIFER.color}), VEGETATION_TYPES.TREE_CONIFER.count), []),
    BUSH: useMemo(() => new THREE.InstancedMesh(VEGETATION_TYPES.BUSH.geometry, new THREE.MeshStandardMaterial({color: VEGETATION_TYPES.BUSH.color}), VEGETATION_TYPES.BUSH.count), [])
  };

  useMemo(() => {
     const counts = { TREE_DECIDUOUS: 0, TREE_CONIFER: 0, BUSH: 0 };

     if (countries && lodLevel === 'CITY') {
        countries.forEach(country => {
           if (!country.cities) return;

           country.cities.forEach((city: any) => {
               // Generate vegetation ring AROUND the city (green belt)
               // Radius from 0.03 to 0.08
               const seed = Math.abs(city.lat * city.lng);
               const numTrees = 50;

               for(let i=0; i<numTrees; i++) {
                   const typeRand = (seed + i * 0.7) % 1.0;
                   let type: keyof typeof meshes;
                   if (typeRand > 0.6) type = 'TREE_DECIDUOUS';
                   else if (typeRand > 0.3) type = 'TREE_CONIFER';
                   else type = 'BUSH';

                   if (counts[type] >= meshes[type].count) continue;

                   const angle = (seed + i) * 5.0;
                   const dist = 0.03 + ((seed * i) % 100)/100 * 0.04;

                   const offLat = Math.sin(angle) * dist;
                   const offLng = Math.cos(angle) * dist;

                   // FIXED: Altitude 5.03 to clear terrain
                   const pos = latLngToVector3(city.lat + offLat, city.lng + offLng, 5.03);

                   DUMMY.position.copy(pos);
                   // FIXED: Quaternion alignment
                   DUMMY.quaternion.setFromUnitVectors(UP, pos.clone().normalize());

                   const scale = 0.5 + Math.random() * 1.0;
                   DUMMY.scale.set(scale, scale, scale);

                   DUMMY.updateMatrix();
                   meshes[type].setMatrixAt(counts[type]++, DUMMY.matrix);
               }
           });
        });
     }

     Object.keys(meshes).forEach(key => {
         const k = key as keyof typeof meshes;
         meshes[k].count = counts[k];
         meshes[k].instanceMatrix.needsUpdate = true;
     });

  }, [countries, lodLevel]);

  if (lodLevel !== 'CITY') return null;

  return (
    <group>
       {Object.keys(meshes).map(key => (
          <primitive key={key} object={meshes[key as keyof typeof meshes]} />
       ))}
    </group>
  );
};
