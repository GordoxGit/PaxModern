// VectorBordersLine.tsx - Frontières en THREE.Line (résolution infinie)
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { extend, Object3DNode } from '@react-three/fiber';
import { latLngToVector3 } from '../utils/geo';

extend({ Line2, LineMaterial, LineGeometry });

declare module '@react-three/fiber' {
  interface ThreeElements {
    line2: Object3DNode<Line2, typeof Line2>;
    lineMaterial: Object3DNode<LineMaterial, typeof LineMaterial>;
    lineGeometry: Object3DNode<LineGeometry, typeof LineGeometry>;
  }
}

interface VectorBordersProps {
  geoJson: any;
  radius: number;
  currentLOD: string;
}

export function VectorBordersLine({ geoJson, radius, currentLOD }: VectorBordersProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Convertir GeoJSON en lignes 3D
  const borderLines = useMemo(() => {
    const lines: { geometry: LineGeometry, id: string }[] = [];
    if (!geoJson) return [];

    geoJson.features.forEach((feature: any, fIndex: number) => {
      if (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon') {
        const polygons = feature.geometry.type === 'Polygon'
          ? [feature.geometry.coordinates]
          : feature.geometry.coordinates;

        polygons.forEach((polygon: any, pIndex: number) => {
          polygon.forEach((ring: any, rIndex: number) => {
            // Skip inner rings (holes) if simplified rendering desired, but keeping them for accuracy
            // Convert coordinates lat/lon to 3D positions
            const positions: number[] = [];

            ring.forEach(([lon, lat]: [number, number]) => {
              const pos = latLngToVector3(lat, lon, radius + 0.015); // Slightly above surface
              positions.push(pos.x, pos.y, pos.z);
            });

            // Create LineGeometry
            const geometry = new LineGeometry();
            geometry.setPositions(positions);

            lines.push({ geometry, id: `${fIndex}-${pIndex}-${rIndex}` });
          });
        });
      }
    });

    return lines;
  }, [geoJson, radius]);

  // Adapter épaisseur et opacité
  // Note: LineMaterial is uniform for all lines in this implementation if we want performant single draw calls?
  // But Line2 is one mesh per line.
  // We can render them.

  return (
    <group ref={groupRef}>
      {borderLines.map((line) => (
        <SingleBorderLine key={line.id} geometry={line.geometry} currentLOD={currentLOD} />
      ))}
    </group>
  );
}

function SingleBorderLine({ geometry, currentLOD }: { geometry: LineGeometry, currentLOD: string }) {
    const matRef = useRef<LineMaterial>(null);

    useFrame((state) => {
        if (!matRef.current) return;

        // Update resolution
        matRef.current.resolution.set(state.size.width, state.size.height);

        const distance = state.camera.position.length();

        // Épaisseur adaptative
        if (distance > 15) {
            matRef.current.linewidth = 1;
            matRef.current.opacity = 0.4;
        } else if (distance > 8) {
            matRef.current.linewidth = 2;
            matRef.current.opacity = 0.6;
        } else if (distance > 4) {
            matRef.current.linewidth = 3;
            matRef.current.opacity = 0.8;
        } else {
            // Mode City - fade out borders
            matRef.current.opacity = Math.max(0, (distance - 1) * 0.5);
        }

        if (currentLOD === 'CITY_BUILDER' && distance < 2) {
             matRef.current.visible = false;
        } else {
             matRef.current.visible = true;
        }
    });

    return (
        <line2 geometry={geometry}>
            <lineMaterial
                ref={matRef}
                color={0x4ade80}
                linewidth={2}
                transparent
                depthTest={true}
                depthWrite={false}
            />
        </line2>
    );
}
