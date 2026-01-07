import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { VectorBorders } from './VectorBorders';
import { CityMeshes } from './CityMeshes';
import { useLOD } from '../hooks/useLOD';
import TerrainSystem from './TerrainSystem';
import { RoadNetwork } from './RoadNetwork';
import { PoliticalOverlay } from './PoliticalOverlay';

// --- CONFIGURATION DE LA SENSIBILITÉ ---
const CAMERA_SETTINGS = {
  minDist: 5.2,   // Zoom max (très près)
  maxDist: 35,    // Zoom min (très loin)
  minSpeed: 0.05, // Vitesse très lente (Précision chirurgicale)
  maxSpeed: 0.5   // Vitesse rapide (Vue satellite)
};

// Composant Helper pour gérer la caméra (à mettre DANS le Canvas)
const CameraController = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const controlsRef = useRef<any>(null);

  useFrame((state) => {
    if (controlsRef.current) {
      // 1. Récupérer la distance actuelle Caméra <-> Cible (0,0,0)
      const distance = state.camera.position.distanceTo(controlsRef.current.target);

      // 2. Calculer le facteur de progression (0 = très près, 1 = très loin)
      // On clamp entre 0 et 1 pour éviter les bugs si on dépasse les limites
      const t = THREE.MathUtils.clamp(
        (distance - CAMERA_SETTINGS.minDist) / (CAMERA_SETTINGS.maxDist - CAMERA_SETTINGS.minDist),
        0,
        1
      );

      // 3. Interpolation de la vitesse (Lerp)
      // Si t=0 (près) -> minSpeed | Si t=1 (loin) -> maxSpeed
      const dynamicSpeed = THREE.MathUtils.lerp(
        CAMERA_SETTINGS.minSpeed,
        CAMERA_SETTINGS.maxSpeed,
        t // On peut ajouter une courbe ici, ex: t * t pour une transition non-linéaire
      );

      // 4. Appliquer la nouvelle vitesse
      controlsRef.current.rotateSpeed = dynamicSpeed;

      // 5. Callback pour le LOD (votre logique existante pour les labels/frontières)
      onZoomChange(distance);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={CAMERA_SETTINGS.minDist}
      maxDistance={CAMERA_SETTINGS.maxDist}
      // rotateSpeed initial (sera écrasé par le useFrame instantanément)
      rotateSpeed={0.5}
      zoomSpeed={0.7}
      dampingFactor={0.05}
      enableDamping
    />
  );
};

// --- LE GLOBE ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();

  const { currentLOD, features, updateLOD } = useLOD(15);
  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (Math.abs(dist - cameraDistance) > 0.1) {
      setCameraDistance(dist);
      updateLOD(dist);
      onZoomChange(dist);
    }
  });

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. LA TERRE (Terrain System avec Shader LOD) */}
      <TerrainSystem
        lodLevel={currentLOD}
        cameraDistance={cameraDistance}
        politicalBlend={features.showPoliticalOverlay ? 1.0 : 0.0}
      />

      {/* 2. ATMOSPHÈRE (Légère) */}
      <mesh scale={[1.02, 1.02, 1.02]}>
         <sphereGeometry args={[5, 64, 64]} />
         <meshStandardMaterial color="#4466aa" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 3. VILLES EN 3D (Adaptées au LOD) */}
      {features.showBuildings && <CityMeshes lodLevel={currentLOD} />}

      {/* 4. INFRASTRUCTURE */}
      {features.showRoads && <RoadNetwork lodLevel={currentLOD} />}

      {/* 5. OVERLAY POLITIQUE */}
      {features.showPoliticalOverlay && <PoliticalOverlay lodLevel={currentLOD} />}

      {/* 6. FRONTIÈRES (VectorBorders) */}
      {/* Vérifie que tu n'as pas laissé de grille ici. Juste les lignes. */}
      <VectorBorders radius={5} />

      {/* MARQUEURS STRATÉGIQUES */}
      {Array.isArray(countries) && countries.map((country) => (
        <StrategicMarker
          key={country.id}
          country={country}
          isSelected={selectedCountry === country.id}
          cameraDistance={cameraDistance}
          onClick={(e: any) => {
            e.stopPropagation();
            selectCountry(country.id);
          }}
        />
      ))}
    </group>
  );
};

// --- MARQUEUR STRATÉGIQUE (Pion + Texte 3D) ---
const StrategicMarker = ({ country, isSelected, onClick, cameraDistance }: any) => {
  const position = useMemo(() => latLngToVector3(country.lat, country.lng, 5.03), [country.lat, country.lng]);
  const color = isSelected ? '#ffd700' : '#ffffff';

  // Afficher les noms plus tôt (dès 8 unités de distance)
  const showText = cameraDistance > 8 || isSelected;

  return (
    <group position={position}>
      {/* Pion physique - Rendu invisible mais cliquable pour garder l'interaction */}
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'} visible={false}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial color={isSelected ? "#4ade80" : "#3b82f6"} emissive={isSelected ? "#4ade80" : "#000"} emissiveIntensity={0.5} />
      </mesh>

      {/* Laser vertical si sélectionné */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {/* TEXTE 3D (Billboard pour faire face à la caméra) */}
      <Billboard
        position={[0, 0.25, 0]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {showText && (
          <Text
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {country.name_fr?.toUpperCase() || country.name.toUpperCase()}
          </Text>
        )}
      </Billboard>
    </group>
  );
};

// --- SCÈNE PRINCIPALE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#050a14] relative">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 45 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={1.5} color="#b0c4de" />
          <directionalLight
              position={[15, 5, 5]}
              intensity={1.5}
              color="#fff"
              castShadow
          />
          <pointLight position={[-20, 0, -20]} intensity={0.5} color="#404040" />

          <Stars radius={300} depth={50} count={3000} factor={4} fade />

          <EarthGroup onZoomChange={() => {}} />

          <CameraController onZoomChange={(d) => {}} />

          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.0} radius={0.5} />
            <Noise opacity={0.02} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <Loader
        containerStyles={{ background: '#050a14' }}
        innerStyles={{ background: '#1e293b', width: '200px', height: '2px' }}
        barStyles={{ background: '#3b82f6', height: '2px' }}
        dataStyles={{ display: 'none' }}
        dataInterpolation={() => "CONNEXION SATELLITE..."}
      />
    </div>
  );
};
