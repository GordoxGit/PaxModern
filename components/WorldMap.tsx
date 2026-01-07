import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { VectorBorders } from './VectorBorders';
import { CityMeshes } from './CityMeshes';
import { VegetationSystem } from './VegetationSystem';
import { RoadNetwork } from './RoadNetwork';
import { PoliticalOverlay } from './PoliticalOverlay';
import { CameraController } from './CameraController';
import { EarthTerrain } from './EarthTerrain';
import { LODTransitionManager } from '../systems/LODTransitionManager';
import { TERRAIN_LOD_CONFIG } from '../systems/TerrainLODManager';

// --- LE GLOBE ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const lodManager = useRef(new LODTransitionManager());
  const [currentLOD, setCurrentLOD] = useState<string>('GLOBE');
  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    // Note: using position.length() because CameraController logic relies on distance to center (0,0,0)
    const dist = state.camera.position.length();

    // Update distance state if significant change to avoid re-renders
    if (Math.abs(dist - cameraDistance) > 0.05) {
      setCameraDistance(dist);

      // Check for LOD transition
      if (lodManager.current.checkTransition(dist)) {
         // Update React state
         setCurrentLOD(lodManager.current.getCurrentLOD());
      }

      onZoomChange(dist);
    }
  });

  const features = useMemo(() => {
     return TERRAIN_LOD_CONFIG[currentLOD]?.features || TERRAIN_LOD_CONFIG['GLOBE'].features;
  }, [currentLOD]);

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. LA TERRE (Nouveau Terrain System) */}
      <EarthTerrain
        lodLevel={currentLOD}
        cameraDistance={cameraDistance}
      />

      {/* 2. ATMOSPHÈRE (Légère) */}
      <mesh scale={[1.02, 1.02, 1.02]}>
         <sphereGeometry args={[5, 64, 64]} />
         <meshStandardMaterial color="#4466aa" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 3. VILLES EN 3D (Adaptées au LOD) */}
      {features.showBuildings && <CityMeshes lodLevel={currentLOD} />}

      {/* 4. VÉGÉTATION (Seulement en CITY_MODE) */}
      {features.showVegetation && <VegetationSystem lodLevel={currentLOD} />}

      {/* 5. INFRASTRUCTURE */}
      {features.showRoads && <RoadNetwork lodLevel={currentLOD} />}

      {/* 6. OVERLAY POLITIQUE */}
      {features.showPoliticalOverlay && <PoliticalOverlay lodLevel={currentLOD} />}

      {/* 7. FRONTIÈRES (VectorBorders) */}
      <VectorBorders radius={5.01} lodLevel={currentLOD} />

      {/* MARQUEURS STRATÉGIQUES */}
      {features.showCities && Array.isArray(countries) && countries.map((country) => (
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
            {/* Moins de noise pour voir les détails en zoom */}
            <Noise opacity={0.01} />
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
