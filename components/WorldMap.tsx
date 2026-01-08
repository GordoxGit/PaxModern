import React, { useMemo, Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Stars, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';
import { VectorBordersLine } from './VectorBordersLine';
import { ProceduralBuildings } from './ProceduralBuildings';
import { ProceduralRoads } from './ProceduralRoads';
import { VegetationSystem } from './VegetationSystem';
import { CameraController } from './CameraController';
import { EarthSDF } from './EarthSDF';
import { useLODStore, useLODFeatures, getLODFromDistance } from '../systems/LODManager';

// --- LE GLOBE ---
const EarthGroup = () => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const { currentLOD, setLOD } = useLODStore();
  const features = useLODFeatures();

  const geoJsonData = useLoader(THREE.FileLoader, '/assets/countries.geo.json', (loader) => {
    loader.setResponseType('json');
  });
  // Note: JSON.parse is removed because loader setResponseType('json') returns object
  const geoJson = useMemo(() => geoJsonData, [geoJsonData]);

  // Extraction de toutes les villes pour le rendu
  const allCities = useMemo(() => {
      const cities: any[] = [];
      countries.forEach(c => {
          if (c.cities) cities.push(...c.cities);
      });
      return cities;
  }, [countries]);

  const [cameraDistance, setCameraDistance] = useState(15);

  // Update camera distance and LOD on each frame
  useFrame((state) => {
    const dist = state.camera.position.length();

    // UTILISATION DE LA NOUVELLE LOGIQUE STABLE
    const newLOD = getLODFromDistance(dist, currentLOD);

    // On ne met à jour que si ça a VRAIMENT changé (évite le spam console/render)
    if (newLOD !== currentLOD) {
      setLOD(newLOD);
    }

    if (Math.abs(dist - cameraDistance) > 0.05) {
      setCameraDistance(dist);
    }
  });

  // Adaptation du LOD string pour VegetationSystem qui attend "CITY"
  // Notre LODManager utilise "CITY_BUILDER"
  const vegetationLOD = currentLOD === 'CITY_BUILDER' ? 'CITY' : currentLOD;

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. LA TERRE (SDF System) */}
      {/* FIX TEXTURE : Segments fixes à 128 pour éviter la reconstruction */}
      <EarthSDF
        radius={5}
        segments={128}
        countries={countries}
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

      {/* 3. VILLES EN 3D (Procedural) - OPTIMISÉ */}
      {/* FIX PERF : On ne démonte jamais le composant, on change juste 'visible' */}
      <ProceduralBuildings
          cities={allCities}
          globeRadius={5.03}
          visible={features.showBuildings}
      />

      {/* 4. VÉGÉTATION */}
      {features.showVegetation && <VegetationSystem lodLevel={vegetationLOD} />}

      {/* 5. INFRASTRUCTURE (Procedural) */}
      {(features.showHighways || features.showNationalRoads) && (
        <ProceduralRoads
            cities={allCities}
            globeRadius={5}
        />
      )}

      {/* 7. FRONTIÈRES VECTORIELLES */}
      {features.showBorders && geoJson && (
        <VectorBordersLine
           geoJson={geoJson}
           radius={5}
           currentLOD={currentLOD}
        />
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
        gl={{ antialias: true, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
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

          <EarthGroup />

          <CameraController />

          {/* Post-processing effects */}
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.0} radius={0.5} />
            <Noise opacity={0.01} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
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
