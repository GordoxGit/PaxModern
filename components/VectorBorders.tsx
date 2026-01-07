import React, { useMemo, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { extend, ReactThreeFiber } from '@react-three/fiber';
import { latLngToVector3 } from '../utils/geo';

extend({ LineSegments2, LineMaterial, LineGeometry });

declare global {
  namespace JSX {
    interface IntrinsicElements {
      lineSegments2: ReactThreeFiber.Object3DNode<LineSegments2, typeof LineSegments2>;
      lineMaterial: ReactThreeFiber.Object3DNode<LineMaterial, typeof LineMaterial>;
      lineGeometry: ReactThreeFiber.Object3DNode<LineGeometry, typeof LineGeometry>;
    }
  }
}

interface VectorBordersProps {
  radius?: number;
  lodLevel: string;
}

export const VectorBorders: React.FC<VectorBordersProps> = ({ radius = 5.01, lodLevel }) => {
  const geoJsonData = useLoader(THREE.FileLoader, '/assets/countries.geo.json', (loader) => {
    loader.setResponseType('json');
  });

  const materialRef = useRef<LineMaterial>(null);

  const geometry = useMemo(() => {
    const data = geoJsonData as any;
    const positions: number[] = [];

    // Helper to convert lat/lon to vector
    const addPoint = (lon: number, lat: number) => {
      // NOTE: GeoJSON is usually [lon, lat], but latLngToVector3 takes (lat, lon)
      const vec = latLngToVector3(lat, lon, radius);
      return [vec.x, vec.y, vec.z];
    };

    data.features.forEach((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return;

      const processPolygon = (coords: any[]) => {
         for (let i = 0; i < coords.length - 1; i++) {
           const p1 = addPoint(coords[i][0], coords[i][1]);
           const p2 = addPoint(coords[i+1][0], coords[i+1][1]);
           positions.push(...p1, ...p2);
         }
      };

      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring: any) => processPolygon(ring));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: any) => {
          polygon.forEach((ring: any) => processPolygon(ring));
        });
      }
    });

    const geo = new LineGeometry();
    geo.setPositions(positions);
    return geo;
  }, [geoJsonData, radius]);

  // Update styles based on LOD
  useFrame((state) => {
     if (materialRef.current) {
        materialRef.current.resolution.set(state.size.width, state.size.height);

        // Dynamic styling
        // GLobe: Thin, green
        // City: Hidden or very faint
        if (lodLevel === 'CITY') {
            materialRef.current.visible = false;
        } else if (lodLevel === 'REGIONAL') {
            materialRef.current.visible = true;
            materialRef.current.linewidth = 3;
            materialRef.current.opacity = 0.8;
            // Pulse effect?
            // materialRef.current.opacity = 0.6 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        } else {
            materialRef.current.visible = true;
            materialRef.current.linewidth = 1.5;
            materialRef.current.opacity = 0.5;
        }
     }
  });

  return (
    <lineSegments2 geometry={geometry}>
      <lineMaterial
        ref={materialRef}
        color={0x4ade80}
        linewidth={1.5}
        resolution={[window.innerWidth, window.innerHeight]}
        transparent
        opacity={0.5}
        depthTest={true} // Enable depth test so mountains hide borders behind them
        depthWrite={false}
      />
    </lineSegments2>
  );
};
