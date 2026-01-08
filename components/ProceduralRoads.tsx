// ProceduralRoads.tsx - Routes générées entre villes
import { useMemo } from 'react';
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { useLODFeatures } from '../systems/LODManager';
import { City } from '../types';
import { extend, Object3DNode } from '@react-three/fiber';

extend({ Line2, LineMaterial, LineGeometry });

const ROAD_STYLES = {
  HIGHWAY: {
    color: 0xff6b35, // Orange
    width: 4,
    dashScale: 0,
    minPopulation: 1000000,
  },
  NATIONAL: {
    color: 0xffc107, // Jaune
    width: 2.5,
    dashScale: 0,
    minPopulation: 500000,
  },
  REGIONAL: {
    color: 0xadb5bd, // Gris clair
    width: 1.5,
    dashScale: 1,
    minPopulation: 100000,
  },
  LOCAL: {
    color: 0x6c757d, // Gris foncé
    width: 1,
    dashScale: 0.5,
    minPopulation: 0,
  },
};

interface ProceduralRoadsProps {
  cities: City[];
  globeRadius: number;
}

export function ProceduralRoads({ cities, globeRadius }: ProceduralRoadsProps) {
  const features = useLODFeatures();

  const roads = useMemo(() => {
    const lines: THREE.Object3D[] = [];

    // Créer connexions entre villes
    const connections = generateCityConnections(cities, globeRadius);

    connections.forEach(({ from, to, type }) => {
      const style = ROAD_STYLES[type as keyof typeof ROAD_STYLES];

      // Vérifier si ce type de route doit être affiché
      if (type === 'HIGHWAY' && !features.showHighways) return;
      if (type === 'NATIONAL' && !features.showNationalRoads) return;
      if (type === 'REGIONAL' && !features.showRegionalRoads) return;
      if (type === 'LOCAL' && !features.showLocalRoads) return;

      // Créer courbe de Bézier sur la sphère
      const fromPos = latLngToVector3(from.lat, from.lng, globeRadius);
      const toPos = latLngToVector3(to.lat, to.lng, globeRadius);
      const curve = createSphericalBezier(fromPos, toPos, globeRadius);
      const points = curve.getPoints(50);

      const positions: number[] = [];
      points.forEach(p => {
        positions.push(p.x, p.y, p.z);
      });

      const geometry = new LineGeometry();
      geometry.setPositions(positions);

      const material = new LineMaterial({
        color: style.color,
        linewidth: style.width,
        dashed: style.dashScale > 0,
        dashScale: style.dashScale,
        dashSize: 3,
        gapSize: 1,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      });

      const line = new Line2(geometry, material);
      line.computeLineDistances();
      lines.push(line);
    });

    return lines;
  }, [cities, features, globeRadius]);

  return (
    <group>
      {roads.map((road, i) => (
        <primitive key={i} object={road} />
      ))}
    </group>
  );
}

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);
    return new THREE.Vector3(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
    );
}

// Générer les connexions logiques entre villes
function generateCityConnections(cities: City[], globeRadius: number): Array<{from: City, to: City, type: string}> {
  const connections: Array<{from: City, to: City, type: string}> = [];

  // Trier par importance (is_capital d'abord)
  const sortedCities = [...cities].sort((a, b) => (b.is_capital ? 1 : 0) - (a.is_capital ? 1 : 0));

  // Capitales connectées entre elles (highways)
  const capitals = sortedCities.filter(c => c.is_capital);
  for (let i = 0; i < capitals.length; i++) {
    for (let j = i + 1; j < capitals.length; j++) {
      const posI = latLngToVector3(capitals[i].lat, capitals[i].lng, globeRadius);
      const posJ = latLngToVector3(capitals[j].lat, capitals[j].lng, globeRadius);
      const dist = posI.distanceTo(posJ);

      if (dist < 2) { // Seulement si assez proches
        connections.push({ from: capitals[i], to: capitals[j], type: 'HIGHWAY' });
      }
    }
  }

  // Autres villes connectées à la capitale la plus proche
  const otherCities = sortedCities.filter(c => !c.is_capital);
  otherCities.forEach(city => {
    if (capitals.length === 0) return;
    const cityPos = latLngToVector3(city.lat, city.lng, globeRadius);

    let nearest = capitals[0];
    let minDist = Infinity;

    capitals.forEach(cap => {
        const capPos = latLngToVector3(cap.lat, cap.lng, globeRadius);
        const d = cityPos.distanceTo(capPos);
        if (d < minDist) {
            minDist = d;
            nearest = cap;
        }
    });

    if (minDist < 1.5) {
        connections.push({ from: city, to: nearest, type: 'NATIONAL' });
    }
  });

  return connections;
}

// Créer une courbe de Bézier suivant la surface de la sphère
function createSphericalBezier(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number
): THREE.QuadraticBezierCurve3 {
  // Point de contrôle au milieu, légèrement au-dessus de la sphère
  const mid = start.clone().add(end).multiplyScalar(0.5).normalize();
  const controlPoint = mid.multiplyScalar(radius * 1.05);

  return new THREE.QuadraticBezierCurve3(
    start.clone().normalize().multiplyScalar(radius + 0.005),
    controlPoint,
    end.clone().normalize().multiplyScalar(radius + 0.005)
  );
}
