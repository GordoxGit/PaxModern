import React, { useMemo, useRef, useEffect } from 'react';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { latLngToVector3 } from '../utils/geo';
import { useLODStore, LODLevel } from '../systems/LODManager';

interface VectorBordersProps {
  radius?: number;
  lodLevel: string;
}

// Border styling configuration per LOD level
const BORDER_STYLES: Record<LODLevel, { linewidth: number; opacity: number; visible: boolean; glow: number }> = {
  GLOBE: {
    linewidth: 1.0,
    opacity: 0.5,
    visible: true,
    glow: 0,
  },
  CONTINENTAL: {
    linewidth: 1.5,
    opacity: 0.6,
    visible: true,
    glow: 0.3,
  },
  REGIONAL: {
    linewidth: 2.5,
    opacity: 0.8,
    visible: true,
    glow: 0.5,
  },
  CITY_BUILDER: {
    linewidth: 0,
    opacity: 0,
    visible: false,
    glow: 0,
  },
};

export const VectorBorders: React.FC<VectorBordersProps> = ({ radius = 5.01, lodLevel }) => {
  const { size } = useThree();
  const groupRef = useRef<THREE.Group>(null);

  // Get LOD features from store
  const features = useLODStore((state) => state.features);

  // Load GeoJSON data
  const geoJsonData = useLoader(THREE.FileLoader, '/assets/countries.geo.json', (loader) => {
    loader.setResponseType('json');
  });

  // Create line geometries and materials
  const borderLines = useMemo(() => {
    const data = geoJsonData as any;
    const lines: { line: Line2; geometry: LineGeometry; material: LineMaterial }[] = [];

    if (!data?.features) return lines;

    // Process each country's borders
    data.features.forEach((feature: any) => {
      const geometry = feature.geometry;
      if (!geometry) return;

      const processRing = (coords: number[][]) => {
        if (coords.length < 2) return;

        const positions: number[] = [];

        // Convert coordinates to 3D positions on sphere
        coords.forEach(([lon, lat]) => {
          const vec = latLngToVector3(lat, lon, radius);
          positions.push(vec.x, vec.y, vec.z);
        });

        // Close the ring by connecting back to start
        if (coords.length > 2) {
          const firstVec = latLngToVector3(coords[0][1], coords[0][0], radius);
          positions.push(firstVec.x, firstVec.y, firstVec.z);
        }

        if (positions.length < 6) return; // Need at least 2 points

        // Create geometry
        const lineGeometry = new LineGeometry();
        lineGeometry.setPositions(positions);

        // Create material with Pax Modern green color
        const lineMaterial = new LineMaterial({
          color: 0x4ade80, // Pax Modern green
          linewidth: 1.5,
          transparent: true,
          opacity: 0.5,
          depthTest: true,
          depthWrite: false,
          resolution: new THREE.Vector2(size.width, size.height),
          worldUnits: false, // Use screen-space line width
        });

        // Create Line2
        const line = new Line2(lineGeometry, lineMaterial);
        line.computeLineDistances();

        lines.push({ line, geometry: lineGeometry, material: lineMaterial });
      };

      const processPolygon = (polygon: number[][][]) => {
        polygon.forEach((ring) => processRing(ring));
      };

      if (geometry.type === 'Polygon') {
        processPolygon(geometry.coordinates);
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon: number[][][]) => processPolygon(polygon));
      }
    });

    return lines;
  }, [geoJsonData, radius, size.width, size.height]);

  // Update materials based on LOD level
  useFrame(() => {
    if (!borderLines.length) return;

    const style = BORDER_STYLES[lodLevel as LODLevel] || BORDER_STYLES.GLOBE;

    // Apply styles to all border materials
    borderLines.forEach(({ material, line }) => {
      // Update visibility
      line.visible = style.visible && features.showBorders;

      if (!line.visible) return;

      // Update line width based on LOD
      material.linewidth = style.linewidth + features.borderWidth * 0.5;
      material.opacity = style.opacity;

      // Update resolution for proper screen-space rendering
      material.resolution.set(size.width, size.height);

      // Add glow effect by adjusting emissive-like properties
      if (style.glow > 0) {
        // Slightly brighter color for glow effect
        const glowIntensity = 1 + style.glow * 0.3;
        material.color.setRGB(
          0.29 * glowIntensity,
          0.87 * glowIntensity,
          0.5 * glowIntensity
        );
      } else {
        material.color.setHex(0x4ade80);
      }

      material.needsUpdate = true;
    });
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      borderLines.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
    };
  }, [borderLines]);

  if (!features.showBorders) return null;

  return (
    <group ref={groupRef}>
      {borderLines.map(({ line }, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
};
