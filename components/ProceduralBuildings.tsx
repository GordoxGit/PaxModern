import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { City } from '../types';

// RESSOURCES PARTAGÉES (Créées 1 seule fois -> Gain Perf x100)
const GEOMETRIES = {
  BOX: new THREE.BoxGeometry(1, 1, 1),
  CYLINDER: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  CONE: new THREE.ConeGeometry(0.5, 1, 4),
};

const MATERIALS = {
  RESIDENTIAL: new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.8 }),
  COMMERCIAL: new THREE.MeshStandardMaterial({ color: '#7ba3c9', roughness: 0.2, metalness: 0.4 }),
  INDUSTRIAL: new THREE.MeshStandardMaterial({ color: '#8b8b8b', roughness: 0.9 }),
  SKYSCRAPER: new THREE.MeshStandardMaterial({ color: '#5a8ab5', roughness: 0.1, metalness: 0.8 }),
};

// Variable temp pour éviter le Garbage Collection
const tempMatrix = new THREE.Matrix4();

interface ProceduralBuildingsProps {
  cities: City[];
  globeRadius: number;
  visible: boolean;
}

export function ProceduralBuildings({ cities, globeRadius, visible }: ProceduralBuildingsProps) {

  // 1. CALCUL DES MATRICES (Exécuté 1 seule fois au chargement)
  const instances = useMemo(() => {
    const data: any = { RESIDENTIAL: [], COMMERCIAL: [], INDUSTRIAL: [], SKYSCRAPER: [] };
    if (!cities) return data;

    cities.forEach((city) => {
      if (!city.lat || !city.lng) return;

      // Conversion Lat/Lng -> Vector3
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lng + 180) * (Math.PI / 180);
      const cityPos = new THREE.Vector3(
        -globeRadius * Math.sin(phi) * Math.cos(theta),
        globeRadius * Math.cos(phi),
        globeRadius * Math.sin(phi) * Math.sin(theta)
      );

      const isCapital = city.is_capital;
      const count = isCapital ? 50 : 15;

      for (let i = 0; i < count; i++) {
        // Logique simplifiée de placement
        const type = isCapital && Math.random() > 0.8 ? 'SKYSCRAPER' : 'RESIDENTIAL';

        // Position aléatoire autour de la ville
        const offset = new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(0.05);
        const pos = cityPos.clone().add(offset).normalize().multiplyScalar(globeRadius);

        tempMatrix.makeTranslation(pos.x, pos.y, pos.z);
        tempMatrix.lookAt(new THREE.Vector3(0,0,0), pos, new THREE.Vector3(0,1,0));
        tempMatrix.scale(new THREE.Vector3(0.02, 0.02, 0.05 + Math.random() * 0.1));

        data[type].push(tempMatrix.clone());
      }
    });
    return data;
  }, [cities, globeRadius]);

  // 2. RENDU
  // Le groupe gère la visibilité. Si visible=false, le GPU ne dessine rien (Coût 0).
  return (
    <group visible={visible}>
      {Object.entries(instances).map(([type, matrices]: [string, any]) => (
        <InstancedMeshWrapper
            key={type}
            type={type}
            matrices={matrices}
        />
      ))}
    </group>
  );
}

const InstancedMeshWrapper = ({ type, matrices }: any) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < matrices.length; i++) meshRef.current.setMatrixAt(i, matrices[i]);
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  // @ts-ignore
  const geo = type === 'SKYSCRAPER' ? GEOMETRIES.BOX : GEOMETRIES.BOX;
  // @ts-ignore
  const mat = MATERIALS[type] || MATERIALS.RESIDENTIAL;

  return <instancedMesh ref={meshRef} args={[geo, mat, matrices.length]} frustumCulled={false} />;
};
