import React, { useMemo, Suspense, useRef, useState, useEffect } from 'react';
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
import { CameraController } from './CameraController';
import { EarthSDF } from './EarthSDF';
import { useLODStore, getLODFromDistance, LOD_CONFIGS } from '../systems/LODManager';

// Globe configuration
const GLOBE_RADIUS = 5;

// --- THE EARTH GROUP ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const [cameraDistance, setCameraDistance] = useState(16);

  // Get LOD state from Zustand store
  const {
    currentLOD,
    features,
    checkAndUpdateLOD,
    isTransitioning,
    transitionProgress,
    updateTransition,
    transitionStartTime,
    transitionDuration,
  } = useLODStore();

  // Update camera distance and LOD on each frame
  useFrame((state) => {
    const dist = state.camera.position.length();

    // Update distance state if significant change
    if (Math.abs(dist - cameraDistance) > 0.02) {
      setCameraDistance(dist);
      onZoomChange(dist);

      // Check for LOD transition
      checkAndUpdateLOD(dist);
    }

    // Update transition progress if transitioning
    if (isTransitioning && transitionStartTime > 0) {
      const elapsed = (performance.now() - transitionStartTime) / 1000;
      const progress = Math.min(elapsed / transitionDuration, 1);
      updateTransition(progress);
    }
  });

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. THE EARTH (SDF Procedural Globe) */}
      <EarthSDF
        lodLevel={currentLOD}
        cameraDistance={cameraDistance}
      />

      {/* 2. ATMOSPHERE (Subtle) */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#4466aa"
          transparent
          opacity={0.12}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* 3. CITIES (Buildings) */}
      {features.showBuildings && (
        <CityMeshes lodLevel={currentLOD} />
      )}

      {/* 4. VEGETATION (Only in CITY_BUILDER mode) */}
      {features.showVegetation && (
        <VegetationSystem lodLevel={currentLOD} />
      )}

      {/* 5. ROADS */}
      {(features.showHighways || features.showNationalRoads ||
        features.showRegionalRoads || features.showLocalRoads) && (
        <RoadNetwork lodLevel={currentLOD} />
      )}

      {/* 6. BORDERS (Vector lines) */}
      {features.showBorders && (
        <VectorBorders radius={GLOBE_RADIUS + 0.01} lodLevel={currentLOD} />
      )}

      {/* 7. STRATEGIC MARKERS (Country labels) */}
      {features.showCities && Array.isArray(countries) && countries.map((country) => (
        <StrategicMarker
          key={country.id}
          country={country}
          isSelected={selectedCountry === country.id}
          cameraDistance={cameraDistance}
          labelScale={features.labelScale}
          showCountryLabels={features.showCountryLabels}
          onClick={(e: any) => {
            e.stopPropagation();
            selectCountry(country.id);
          }}
        />
      ))}
    </group>
  );
};

// --- STRATEGIC MARKER (3D Label + Click target) ---
interface StrategicMarkerProps {
  country: any;
  isSelected: boolean;
  cameraDistance: number;
  labelScale: number;
  showCountryLabels: boolean;
  onClick: (e: any) => void;
}

const StrategicMarker: React.FC<StrategicMarkerProps> = ({
  country,
  isSelected,
  cameraDistance,
  labelScale,
  showCountryLabels,
  onClick,
}) => {
  const position = useMemo(
    () => latLngToVector3(country.lat, country.lng, GLOBE_RADIUS + 0.03),
    [country.lat, country.lng]
  );

  const color = isSelected ? '#ffd700' : '#ffffff';

  // Show text based on LOD and selection
  const showText = showCountryLabels || isSelected || cameraDistance < 8;

  return (
    <group position={position}>
      {/* Invisible click target */}
      <mesh
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = 'pointer')}
        onPointerOut={() => (document.body.style.cursor = 'auto')}
        visible={false}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial
          color={isSelected ? '#4ade80' : '#3b82f6'}
          emissive={isSelected ? '#4ade80' : '#000'}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Laser beam when selected */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.6}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}

      {/* 3D Text Label */}
      <Billboard
        position={[0, 0.25, 0]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {showText && (
          <Text
            fontSize={0.2 * labelScale}
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

// --- MAIN SCENE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#050a14] relative">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 45 }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          alpha: false,
        }}
        dpr={[1, 2]}
        shadows
      >
        <Suspense fallback={null}>
          {/* Lighting */}
          <ambientLight intensity={1.5} color="#b0c4de" />
          <directionalLight
            position={[15, 5, 5]}
            intensity={1.5}
            color="#fff"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <pointLight position={[-20, 0, -20]} intensity={0.5} color="#404040" />

          {/* Starfield */}
          <Stars radius={300} depth={50} count={3000} factor={4} fade />

          {/* Earth and all its components */}
          <EarthGroup onZoomChange={() => {}} />

          {/* Camera Controller with physics and GSAP transitions */}
          <CameraController onZoomChange={() => {}} />

          {/* Post-processing effects */}
          <EffectComposer disableNormalPass>
            <Bloom
              luminanceThreshold={0.5}
              mipmapBlur
              intensity={0.8}
              radius={0.4}
            />
            <Noise opacity={0.008} />
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Loading overlay */}
      <Loader
        containerStyles={{ background: '#050a14' }}
        innerStyles={{ background: '#1e293b', width: '200px', height: '2px' }}
        barStyles={{ background: '#3b82f6', height: '2px' }}
        dataStyles={{ display: 'none' }}
        dataInterpolation={() => 'CONNEXION SATELLITE...'}
      />
    </div>
  );
};
