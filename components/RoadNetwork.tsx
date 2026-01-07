import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

export const RoadNetwork = ({ lodLevel }: { lodLevel: string }) => {
  const { countries } = useGameStore();

  const lines = useMemo(() => {
    if (!countries) return null;

    const points: THREE.Vector3[] = [];

    // Simple logic: Connect cities within the same country
    countries.forEach(country => {
        if (country.cities && country.cities.length > 1) {
            for (let i = 0; i < country.cities.length - 1; i++) {
                const start = country.cities[i];
                const end = country.cities[i+1];

                const p1 = latLngToVector3(start.lat, start.lng, 5.01);
                const p2 = latLngToVector3(end.lat, end.lng, 5.01);

                // Add points for line segments
                points.push(p1);
                points.push(p2);
            }
        }
        // Also connect capital to first few cities
        if (country.cities) {
             const capital = country.cities.find(c => c.is_capital) || country.cities[0];
             country.cities.forEach(city => {
                 if (city !== capital) {
                    const p1 = latLngToVector3(capital.lat, capital.lng, 5.01);
                    const p2 = latLngToVector3(city.lat, city.lng, 5.01);
                    points.push(p1);
                    points.push(p2);
                 }
             });
        }
    });

    if (points.length === 0) return null;

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return geometry;
  }, [countries]);

  if (!lines) return null;

  return (
    <lineSegments geometry={lines}>
      <lineBasicMaterial color="#fbbf24" transparent opacity={0.6} linewidth={1} depthTest={false} renderOrder={1} />
    </lineSegments>
  );
};
