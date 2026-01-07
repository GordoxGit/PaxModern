import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { Line } from '@react-three/drei';

export const RoadNetwork = ({ lodLevel }: { lodLevel: string }) => {
  const { countries } = useGameStore();

  // 1. Define Road Types & Styles
  const config = useMemo(() => {
    switch (lodLevel) {
      case 'GLOBE':
        return { show: false };
      case 'CONTINENTAL':
        // Only highways (Red/Orange)
        return { show: true, type: 'HIGHWAY', width: 2, color: '#ef4444', opacity: 0.8 };
      case 'REGIONAL':
        // Major roads (Yellow/Orange)
        return { show: true, type: 'MAJOR', width: 1.5, color: '#f59e0b', opacity: 0.7 };
      case 'CITY_BUILDER':
        // All roads, detailed style (Bright)
        return { show: true, type: 'ALL', width: 4, color: '#fbbf24', opacity: 0.9, glow: true };
      default:
        return { show: false };
    }
  }, [lodLevel]);

  // 2. Generate Road Segments
  const roadLines = useMemo(() => {
    if (!config.show || !countries) return [];

    const lines: THREE.Vector3[][] = [];

    countries.forEach(country => {
        if (country.cities) {
             const capital = country.cities.find((c: any) => c.is_capital) || country.cities[0];

             country.cities.forEach((city: any) => {
                 if (city === capital) return;

                 const start = latLngToVector3(capital.lat, capital.lng, 5.005);
                 const end = latLngToVector3(city.lat, city.lng, 5.005);

                 // Subdivide the line to follow earth curvature
                 const subdivisions = 20;
                 const points: THREE.Vector3[] = [];

                 for(let i=0; i<=subdivisions; i++) {
                     const t = i / subdivisions;
                     // Slerp logic manually implemented (or simple lerp + normalize for spheres)
                     const v = new THREE.Vector3().copy(start).lerp(end, t).normalize().multiplyScalar(5.005);
                     points.push(v);
                 }
                 lines.push(points);
             });
        }
    });

    return lines;
  }, [countries, config]);

  if (!config.show || roadLines.length === 0) return null;

  // Render multiple <Line> components (Drei Line uses Line2 internally, supporting width)
  // Grouping them might be heavy if there are too many, but for MOCK data it's fine.
  // Ideally we would merge geometry into a single LineSegments2 but Drei's Line is easier for now.
  // To optimize, we render one Line component with multiple segments if supported, but Drei Line takes one set of points.
  // We will map them.

  return (
    <group>
      {roadLines.map((points, i) => (
        <Line
          key={i}
          points={points}       // Array of Vector3
          color={config.color}
          lineWidth={config.width} // In pixels (this works unlike standard line)
          transparent
          opacity={config.opacity}
          depthWrite={false} // Avoid z-fighting artifacts
        />
      ))}
    </group>
  );
};
