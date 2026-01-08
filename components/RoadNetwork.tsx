import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { useLODStore } from '../systems/LODManager';

// Road type configurations
type RoadType = 'HIGHWAY' | 'NATIONAL' | 'REGIONAL' | 'LOCAL';

interface RoadStyle {
  color: number;
  width: number;
  opacity: number;
  dashScale: number;
  dashSize: number;
  gapSize: number;
}

const ROAD_STYLES: Record<RoadType, RoadStyle> = {
  HIGHWAY: {
    color: 0xff6b35, // Orange
    width: 4,
    opacity: 0.9,
    dashScale: 0,
    dashSize: 0,
    gapSize: 0,
  },
  NATIONAL: {
    color: 0xffc107, // Yellow
    width: 2.5,
    opacity: 0.8,
    dashScale: 0,
    dashSize: 0,
    gapSize: 0,
  },
  REGIONAL: {
    color: 0xadb5bd, // Light gray
    width: 1.5,
    opacity: 0.7,
    dashScale: 1,
    dashSize: 3,
    gapSize: 1,
  },
  LOCAL: {
    color: 0x6c757d, // Dark gray
    width: 1,
    opacity: 0.6,
    dashScale: 0.5,
    dashSize: 2,
    gapSize: 0.5,
  },
};

// Connection between two cities
interface RoadConnection {
  from: { lat: number; lng: number; isCapital: boolean };
  to: { lat: number; lng: number; isCapital: boolean };
  type: RoadType;
  distance: number;
}

// Create a spherical Bezier curve between two points on the globe
function createSphericalBezierCurve(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  segments: number = 32
): number[] {
  // Calculate the midpoint and lift it slightly above the sphere
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const midNormalized = mid.normalize();

  // Control point height above surface (creates arc)
  const arcHeight = start.distanceTo(end) * 0.1;
  const controlPoint = midNormalized.multiplyScalar(radius + arcHeight);

  // Create quadratic Bezier curve
  const curve = new THREE.QuadraticBezierCurve3(
    start.clone().normalize().multiplyScalar(radius),
    controlPoint,
    end.clone().normalize().multiplyScalar(radius)
  );

  // Get points along the curve
  const points = curve.getPoints(segments);

  // Convert to flat array for LineGeometry
  const positions: number[] = [];
  points.forEach((p) => {
    // Normalize and project to sphere surface
    const normalized = p.clone().normalize().multiplyScalar(radius);
    positions.push(normalized.x, normalized.y, normalized.z);
  });

  return positions;
}

// Calculate road type based on cities
function determineRoadType(
  fromCity: { lat: number; lng: number; isCapital: boolean },
  toCity: { lat: number; lng: number; isCapital: boolean },
  distance: number
): RoadType {
  // Both capitals = Highway
  if (fromCity.isCapital && toCity.isCapital) {
    return 'HIGHWAY';
  }

  // One capital = National
  if (fromCity.isCapital || toCity.isCapital) {
    return distance < 10 ? 'NATIONAL' : 'HIGHWAY';
  }

  // Between major cities (short distance) = Regional
  if (distance < 5) {
    return 'REGIONAL';
  }

  // Local roads for very close cities
  if (distance < 2) {
    return 'LOCAL';
  }

  return 'REGIONAL';
}

interface RoadNetworkProps {
  lodLevel: string;
}

export const RoadNetwork: React.FC<RoadNetworkProps> = ({ lodLevel }) => {
  const { size } = useThree();
  const { countries } = useGameStore();
  const features = useLODStore((state) => state.features);

  // Generate road connections between cities
  const connections = useMemo((): RoadConnection[] => {
    if (!countries) return [];

    const result: RoadConnection[] = [];

    countries.forEach((country) => {
      if (!country.cities || country.cities.length < 2) return;

      const capital = country.cities.find((c: any) => c.is_capital) || country.cities[0];

      country.cities.forEach((city: any) => {
        if (city === capital) return;

        // Calculate approximate distance
        const dLat = Math.abs(capital.lat - city.lat);
        const dLng = Math.abs(capital.lng - city.lng);
        const distance = Math.sqrt(dLat * dLat + dLng * dLng);

        // Skip very distant cities (different regions)
        if (distance > 25) return;

        const roadType = determineRoadType(
          { lat: capital.lat, lng: capital.lng, isCapital: true },
          { lat: city.lat, lng: city.lng, isCapital: city.is_capital },
          distance
        );

        result.push({
          from: { lat: capital.lat, lng: capital.lng, isCapital: true },
          to: { lat: city.lat, lng: city.lng, isCapital: city.is_capital },
          type: roadType,
          distance,
        });
      });

      // Connect non-capital cities to each other (regional/local roads)
      const nonCapitalCities = country.cities.filter((c: any) => !c.is_capital);
      for (let i = 0; i < nonCapitalCities.length; i++) {
        for (let j = i + 1; j < nonCapitalCities.length; j++) {
          const cityA = nonCapitalCities[i];
          const cityB = nonCapitalCities[j];

          const dLat = Math.abs(cityA.lat - cityB.lat);
          const dLng = Math.abs(cityA.lng - cityB.lng);
          const distance = Math.sqrt(dLat * dLat + dLng * dLng);

          // Only connect very close cities
          if (distance > 5) continue;

          result.push({
            from: { lat: cityA.lat, lng: cityA.lng, isCapital: false },
            to: { lat: cityB.lat, lng: cityB.lng, isCapital: false },
            type: distance < 2 ? 'LOCAL' : 'REGIONAL',
            distance,
          });
        }
      }
    });

    return result;
  }, [countries]);

  // Create Line2 objects for each road type
  const roadLines = useMemo(() => {
    const lines: { line: Line2; type: RoadType; geometry: LineGeometry; material: LineMaterial }[] = [];

    // Filter connections based on features
    const filteredConnections = connections.filter((conn) => {
      switch (conn.type) {
        case 'HIGHWAY':
          return features.showHighways;
        case 'NATIONAL':
          return features.showNationalRoads;
        case 'REGIONAL':
          return features.showRegionalRoads;
        case 'LOCAL':
          return features.showLocalRoads;
        default:
          return false;
      }
    });

    filteredConnections.forEach((conn) => {
      const style = ROAD_STYLES[conn.type];

      // Convert coordinates to 3D positions
      const start = latLngToVector3(conn.from.lat, conn.from.lng, 5.04);
      const end = latLngToVector3(conn.to.lat, conn.to.lng, 5.04);

      // Create spherical Bezier curve
      const positions = createSphericalBezierCurve(start, end, 5.04, 24);

      // Create geometry
      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      // Create material
      const material = new LineMaterial({
        color: style.color,
        linewidth: style.width,
        transparent: true,
        opacity: style.opacity,
        depthTest: true,
        depthWrite: false,
        resolution: new THREE.Vector2(size.width, size.height),
        dashed: style.dashScale > 0,
        dashScale: style.dashScale,
        dashSize: style.dashSize,
        gapSize: style.gapSize,
      });

      // Create line
      const line = new Line2(geometry, material);
      line.computeLineDistances();

      lines.push({ line, type: conn.type, geometry, material });
    });

    return lines;
  }, [connections, features, size.width, size.height]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      roadLines.forEach(({ geometry, material }) => {
        geometry.dispose();
        material.dispose();
      });
    };
  }, [roadLines]);

  // Check if any roads should be shown
  const showAnyRoads = features.showHighways ||
    features.showNationalRoads ||
    features.showRegionalRoads ||
    features.showLocalRoads;

  if (!showAnyRoads || roadLines.length === 0) {
    return null;
  }

  return (
    <group>
      {roadLines.map(({ line }, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
};
