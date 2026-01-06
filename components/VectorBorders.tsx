import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { latLngToVector3 } from '../utils/geo';

// URL stable d'un GeoJSON basse résolution (rapide) pour les pays
const GEOJSON_URL = 'https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json';

interface VectorBordersProps {
  radius?: number;
}

export const VectorBorders: React.FC<VectorBordersProps> = ({ radius = 5 }) => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error("Erreur chargement GeoJSON", err));
  }, []);

  const lines = useMemo(() => {
    if (!data) return null;

    const points: THREE.Vector3[] = [];

    // Parcours de chaque pays
    data.features.forEach((feature: any) => {
      const geometry = feature.geometry;

      // Fonction pour traiter un polygone (une boucle de coordonnées)
      const processPolygon = (coords: any[]) => {
        for (let i = 0; i < coords.length - 1; i++) {
          const [lng1, lat1] = coords[i];
          const [lng2, lat2] = coords[i + 1];

          // On ajoute les deux points pour faire un segment de ligne
          // On ajoute 0.01 au rayon pour que les lignes flottent juste au dessus du sol
          points.push(latLngToVector3(lat1, lng1, radius + 0.01));
          points.push(latLngToVector3(lat2, lng2, radius + 0.01));
        }
      };

      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(processPolygon);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach(processPolygon);
        });
      }
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [data, radius]);

  if (!lines) return null;

  return (
    <lineSegments geometry={lines}>
      {/* COULEUR ET STYLE DES FRONTIÈRES */}
      <lineBasicMaterial
        color="#4ade80" // Vert tactique (ou Cyan #00ffff)
        transparent={true}
        opacity={0.6}
        linewidth={1} // Note: WebGL gère mal les épaisseurs > 1, mais c'est net
      />
    </lineSegments>
  );
};
