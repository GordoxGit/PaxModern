import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { Line } from '@react-three/drei';

export const RoadNetwork = ({ lodLevel }: { lodLevel: string }) => {
  const { countries } = useGameStore();

  const config = useMemo(() => {
    switch (lodLevel) {
      case 'GLOBE':
        return { show: false };
      case 'CONTINENTAL':
        return { show: false }; // Too cluttered
      case 'REGIONAL':
        return { show: true, type: 'HIGHWAY', width: 2.0, color: '#f59e0b', opacity: 0.6 };
      case 'CITY':
        return { show: true, type: 'ALL', width: 4.0, color: '#fbbf24', opacity: 0.9 };
      default:
        return { show: false };
    }
  }, [lodLevel]);

  const roadLines = useMemo(() => {
    if (!config.show || !countries) return [];

    const lines: THREE.Vector3[][] = [];

    countries.forEach(country => {
        if (country.cities && country.cities.length > 1) {
             const capital = country.cities.find((c: any) => c.is_capital) || country.cities[0];

             country.cities.forEach((city: any) => {
                 if (city === capital) return;

                 const dLat = Math.abs(capital.lat - city.lat);
                 const dLng = Math.abs(capital.lng - city.lng);
                 if (dLat + dLng > 20) return;

                 // FIXED: Use radius 5.035 to clear terrain (max 5.02) and sit flush/above buildings
                 const start = latLngToVector3(capital.lat, capital.lng, 5.035);
                 const end = latLngToVector3(city.lat, city.lng, 5.035);

                 const subdivisions = 24;
                 const points: THREE.Vector3[] = [];

                 for(let i=0; i<=subdivisions; i++) {
                     const t = i / subdivisions;
                     const v = new THREE.Vector3().copy(start).lerp(end, t).normalize().multiplyScalar(5.035);
                     points.push(v);
                 }
                 lines.push(points);
             });
        }
    });

    return lines;
  }, [countries, config]);

  if (!config.show || roadLines.length === 0) return null;

  return (
    <group>
      {roadLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          color={config.color}
          lineWidth={config.width}
          transparent
          opacity={config.opacity}
          depthWrite={false}
        />
      ))}
    </group>
  );
};
