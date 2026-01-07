import React, { useEffect, useState, useMemo } from 'react';
import * as THREE from 'three';
import { latLngToVector3 } from '../utils/geo';
import { useFrame } from '@react-three/fiber';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { extend, Object3DNode } from '@react-three/fiber';

// Extend so we can use <lineSegments2> in JSX
extend({ LineSegments2, LineMaterial, LineGeometry });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      lineSegments2: Object3DNode<LineSegments2, typeof LineSegments2>;
      lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
      lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
    }
  }
}

// URL stable d'un GeoJSON basse résolution (rapide) pour les pays
const GEOJSON_URL = '/assets/countries.geo.json';

interface VectorBordersProps {
  radius?: number;
  lodLevel?: 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY_BUILDER';
}

export const VectorBorders: React.FC<VectorBordersProps> = ({ radius = 5, lodLevel = 'GLOBE' }) => {
  const [data, setData] = useState<any>(null);
  const materialRef = React.useRef<LineMaterial>(null);

  useEffect(() => {
    fetch(GEOJSON_URL)
      .then(res => res.json())
      .then(setData)
      .catch(err => console.error("Erreur chargement GeoJSON", err));
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;

    const positions: number[] = [];

    // Parcours de chaque pays
    data.features.forEach((feature: any) => {
      const geo = feature.geometry;

      const processPolygon = (coords: any[]) => {
        for (let i = 0; i < coords.length - 1; i++) {
          const [lng1, lat1] = coords[i];
          const [lng2, lat2] = coords[i + 1];

          // On ajoute 0.02 au rayon pour éviter le z-fighting avec le terrain
          const p1 = latLngToVector3(lat1, lng1, radius + 0.02);
          const p2 = latLngToVector3(lat2, lng2, radius + 0.02);

          positions.push(p1.x, p1.y, p1.z);
          positions.push(p2.x, p2.y, p2.z);
        }
      };

      if (geo.type === 'Polygon') {
        geo.coordinates.forEach(processPolygon);
      } else if (geo.type === 'MultiPolygon') {
        geo.coordinates.forEach((polygon: any) => {
          polygon.forEach(processPolygon);
        });
      }
    });

    const geo = new LineGeometry();
    geo.setPositions(positions);
    return geo;
  }, [data, radius]);

  // Animation du pulse si besoin, ou juste mise à jour des couleurs
  useFrame((state) => {
    if (materialRef.current) {
        materialRef.current.resolution.set(state.size.width, state.size.height);

        // Pulse effect for 'detailed' style
        if (lodLevel === 'REGIONAL' || lodLevel === 'CONTINENTAL') {
            const time = state.clock.getElapsedTime();
            const pulse = (Math.sin(time * 2) + 1) * 0.5; // 0 to 1
            materialRef.current.opacity = 0.6 + pulse * 0.4; // 0.6 to 1.0
        }
    }
  });

  const config = useMemo(() => {
      switch(lodLevel) {
          case 'CITY_BUILDER':
              return { visible: false }; // Hidden
          case 'REGIONAL':
              return { color: '#4ade80', linewidth: 3, opacity: 0.8, visible: true };
          case 'CONTINENTAL':
              return { color: '#4ade80', linewidth: 2, opacity: 0.7, visible: true };
          case 'GLOBE':
          default:
              return { color: '#4ade80', linewidth: 1, opacity: 0.5, visible: true };
      }
  }, [lodLevel]);

  if (!geometry) return null;

  return (
    <lineSegments2 geometry={geometry} visible={config.visible}>
      <lineMaterial
        ref={materialRef}
        color={config.color}
        linewidth={config.linewidth} // In pixels
        resolution={[window.innerWidth, window.innerHeight]} // Will be updated in useFrame
        dashed={false}
        transparent={true}
        opacity={config.opacity}
      />
    </lineSegments2>
  );
};
