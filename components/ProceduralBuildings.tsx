import { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { City } from '../types';

// ==================================================================================
// 1. RESSOURCES STATIQUES (Créées 1 seule fois pour tout le jeu -> Gain Perf x1000)
// ==================================================================================

// Géométries partagées (Low Poly style mais propres)
const GEOMETRIES = {
  BOX: new THREE.BoxGeometry(1, 1, 1),
  CYLINDER: new THREE.CylinderGeometry(0.5, 0.5, 1, 8),
  CONE: new THREE.ConeGeometry(0.5, 1, 4),
};

// Matériaux partagés (On ne crée pas 10 000 matériaux, on en utilise 7 en mémoire)
const MATERIALS = {
  RESIDENTIAL_SMALL: new THREE.MeshStandardMaterial({ color: '#d4a574', roughness: 0.8 }),
  RESIDENTIAL_MEDIUM: new THREE.MeshStandardMaterial({ color: '#c9b896', roughness: 0.7 }),
  RESIDENTIAL_TALL: new THREE.MeshStandardMaterial({ color: '#b8a888', roughness: 0.6 }),
  COMMERCIAL: new THREE.MeshStandardMaterial({ color: '#7ba3c9', roughness: 0.2, metalness: 0.4 }),
  INDUSTRIAL: new THREE.MeshStandardMaterial({ color: '#8b8b8b', roughness: 0.9 }),
  SKYSCRAPER: new THREE.MeshStandardMaterial({ color: '#5a8ab5', roughness: 0.1, metalness: 0.8, emissive: '#0f172a', emissiveIntensity: 0.3 }),
  LANDMARK: new THREE.MeshStandardMaterial({ color: '#c9a227', roughness: 0.3, metalness: 1.0 }),
};

// Configuration des types de bâtiments
const BUILDING_TYPES = {
  RESIDENTIAL_SMALL: { geo: 'BOX', mat: 'RESIDENTIAL_SMALL', size: [0.03, 0.05, 0.03], height: [0.02, 0.05], freq: 0.4 },
  RESIDENTIAL_MEDIUM: { geo: 'BOX', mat: 'RESIDENTIAL_MEDIUM', size: [0.04, 0.08, 0.04], height: [0.05, 0.12], freq: 0.25 },
  RESIDENTIAL_TALL: { geo: 'BOX', mat: 'RESIDENTIAL_TALL', size: [0.03, 0.15, 0.03], height: [0.12, 0.25], freq: 0.1 },
  COMMERCIAL: { geo: 'BOX', mat: 'COMMERCIAL', size: [0.06, 0.1, 0.06], height: [0.08, 0.2], freq: 0.15 },
  INDUSTRIAL: { geo: 'CYLINDER', mat: 'INDUSTRIAL', size: [0.08, 0.04, 0.08], height: [0.03, 0.08], freq: 0.05 },
  SKYSCRAPER: { geo: 'BOX', mat: 'SKYSCRAPER', size: [0.04, 0.3, 0.04], height: [0.25, 0.5], freq: 0.04 },
  LANDMARK: { geo: 'CONE', mat: 'LANDMARK', size: [0.05, 0.15, 0.05], height: [0.1, 0.2], freq: 0.01 },
};

// Variables temporaires pour les calculs (évite le Garbage Collection)
const tempMatrix = new THREE.Matrix4();
const tempPos = new THREE.Vector3();
const tempUp = new THREE.Vector3();
const tempQuat = new THREE.Quaternion();
const tempScale = new THREE.Vector3();

interface ProceduralBuildingsProps {
  cities: City[];
  globeRadius: number;
  visible: boolean; // NOUVEAU: On contrôle juste la visibilité
}

export function ProceduralBuildings({ cities, globeRadius, visible }: ProceduralBuildingsProps) {

  // Calcul des matrices UNE SEULE FOIS au chargement des villes (Memoization)
  const instances = useMemo(() => {
    const data: Record<string, THREE.Matrix4[]> = {};
    Object.keys(BUILDING_TYPES).forEach(k => data[k] = []);

    cities.forEach((city) => {
      // Sécurité anti-crash si données manquantes
      if (typeof city.lat !== 'number' || typeof city.lng !== 'number') return;

      // Position Ville sur la sphère
      const phi = (90 - city.lat) * (Math.PI / 180);
      const theta = (city.lng + 180) * (Math.PI / 180);
      const cityPos = new THREE.Vector3(
        -globeRadius * Math.sin(phi) * Math.cos(theta),
        globeRadius * Math.cos(phi),
        globeRadius * Math.sin(phi) * Math.sin(theta)
      );

      const isCapital = city.is_capital;
      // On génère un nombre fixe de bâtiments par type de ville
      const buildingCount = isCapital ? 80 : 25;

      for (let i = 0; i < buildingCount; i++) {
        // 1. Choix du type de bâtiment (Probabilités)
        let typeKey = 'RESIDENTIAL_SMALL';
        const rand = Math.random();
        let cumulative = 0;
        for (const [key, conf] of Object.entries(BUILDING_TYPES)) {
          // @ts-ignore
          cumulative += conf.freq;
          if (rand <= cumulative) { typeKey = key; break; }
        }
        // Bonus gratte-ciel pour les capitales
        if (isCapital && Math.random() < 0.2) typeKey = 'SKYSCRAPER';

        const config = BUILDING_TYPES[typeKey as keyof typeof BUILDING_TYPES];

        // 2. Positionnement en anneaux autour de la ville
        const angle = Math.random() * Math.PI * 2;
        // Rayon de la ville (plus grand pour capitale)
        const radius = Math.random() * 0.025 * (isCapital ? 1.8 : 1);

        // Mathématique vectorielle pour trouver le point sur la surface courbe
        tempUp.copy(cityPos).normalize(); // Vecteur "Haut" local (Normale)
        // Création d'un vecteur perpendiculaire pour le plan tangent
        const tangent = new THREE.Vector3(0,1,0).cross(tempUp).normalize();
        if (tangent.lengthSq() < 0.001) tangent.set(1,0,0).cross(tempUp).normalize(); // Cas pôles

        const bitangent = new THREE.Vector3().crossVectors(tempUp, tangent);

        // Décalage par rapport au centre de la ville
        tempPos.copy(cityPos)
          .addScaledVector(tangent, Math.cos(angle) * radius * globeRadius)
          .addScaledVector(bitangent, Math.sin(angle) * radius * globeRadius)
          .normalize().multiplyScalar(globeRadius); // On reprojette sur la surface parfaite

        // 3. Construction de la Matrice de Transformation
        tempMatrix.identity();
        tempMatrix.setPosition(tempPos);

        // Rotation (Les bâtiments pointent vers le ciel, alignés avec la normale)
        tempQuat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tempPos.clone().normalize());
        tempMatrix.makeRotationFromQuaternion(tempQuat);
        tempMatrix.setPosition(tempPos); // Réappliquer pos après rotation

        // Scale (Hauteur aléatoire)
        const h = config.height[0] + Math.random() * (config.height[1] - config.height[0]);
        tempScale.set(config.size[0], h, config.size[2]);
        tempMatrix.scale(tempScale);

        data[typeKey].push(tempMatrix.clone());
      }
    });

    return data;
  }, [cities, globeRadius]); // Ne se recalcule JAMAIS sauf si la liste des villes change

  return (
    <group visible={visible}>
      {Object.entries(instances).map(([type, matrices]) => {
        if (matrices.length === 0) return null;
        const config = BUILDING_TYPES[type as keyof typeof BUILDING_TYPES];

        return (
          <InstancedBuildingMesh
            key={type}
            geometry={GEOMETRIES[config.geo as keyof typeof GEOMETRIES]}
            material={MATERIALS[config.mat as keyof typeof MATERIALS]}
            matrices={matrices}
          />
        );
      })}
    </group>
  );
}

// Sous-composant optimisé pour gérer l'upload GPU
const InstancedBuildingMesh = ({ geometry, material, matrices }: any) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useEffect(() => {
    if (!meshRef.current) return;

    // Remplissage du buffer GPU (Ultra rapide)
    for (let i = 0; i < matrices.length; i++) {
      meshRef.current.setMatrixAt(i, matrices[i]);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [matrices]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, matrices.length]}
      frustumCulled={false} // Important : évite le flickering quand on tourne la caméra vite
    />
  );
};
