import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

const HELPER_OBJECT = new THREE.Object3D();

export const CityMeshes: React.FC = () => {
  const { countries } = useGameStore();

  const meshRef = useMemo(() => {
    // On prévoit large : 1000 bâtiments max
    const geometry = new THREE.BoxGeometry(0.02, 0.02, 0.1); // Des petits gratte-ciels
    geometry.translate(0, 0, 0.05); // On remonte le pivot à la base
    const material = new THREE.MeshStandardMaterial({
        color: '#aaaaaa',
        emissive: '#001133',
        roughness: 0.2,
        metalness: 0.8
    });
    return new THREE.InstancedMesh(geometry, material, 1000);
  }, []);

  // Calcul des positions
  useMemo(() => {
    let index = 0;
    if (countries) {
      countries.forEach(country => {
        // Si le pays a des villes définies (cities), on les utilise
        // Sinon on met juste la capitale (basée sur lat/lng du pays)
        const cities = country.cities || [{ lat: country.lat, lng: country.lng, name: country.name, is_capital: true }];

        cities.forEach(city => {
            // On crée un petit cluster de 5 à 10 bâtiments par ville pour faire "City Builder"
            const buildingCount = 5 + Math.floor(Math.random() * 5);

            for(let i=0; i<buildingCount; i++) {
                if (index >= 1000) return; // Prevent overflow

                // Petit décalage aléatoire pour ne pas qu'ils soient tous empilés
                const offsetLat = (Math.random() - 0.5) * 0.5;
                const offsetLng = (Math.random() - 0.5) * 0.5;

                // Position sur la sphère (Rayon 5)
                const pos = latLngToVector3(
                    (city.lat) + offsetLat,
                    (city.lng) + offsetLng,
                    5
                );

                HELPER_OBJECT.position.copy(pos);
                // CORRECTION: Point OUTWARDS (Sky) not INWARDS (Center)
                // pos is vector from center (0,0,0) to surface.
                // We want to look at a point further along that vector.
                HELPER_OBJECT.lookAt(pos.x * 2, pos.y * 2, pos.z * 2);

                // Échelle aléatoire (hauteur des immeubles)
                const scale = 0.5 + Math.random() * 1.5;
                HELPER_OBJECT.scale.set(1, 1, scale);

                HELPER_OBJECT.updateMatrix();
                meshRef.setMatrixAt(index++, HELPER_OBJECT.matrix);
            }
        });
      });
    }
    meshRef.instanceMatrix.needsUpdate = true;
  }, [countries, meshRef]);

  return <primitive object={meshRef} />;
};
