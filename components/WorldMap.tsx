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
import { useLODStore, useLODFeatures } from '../systems/LODManager';

// --- LE GLOBE ---
const EarthGroup = () => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const { currentLOD } = useLODStore();
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

  useFrame((state) => {
    const dist = state.camera.position.length();
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
      <EarthSDF
        radius={5}
        segments={features.terrainSegments}
        countries={countries}
      />

      {/* 2. ATMOSPHÈRE (Légère) */}
      <mesh scale={[1.02, 1.02, 1.02]}>
         <sphereGeometry args={[5, 64, 64]} />
         <meshStandardMaterial color="#4466aa" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      {/* 3. VILLES EN 3D (Procedural) */}
      {features.showBuildings && (
        <ProceduralBuildings
            cities={allCities}
            globeRadius={5}
        />
      )}

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
        gl={{ antialias: true, powerPreference: "high-performance" }}
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

          <EarthGroup />

          <CameraController />

          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.0} radius={0.5} />
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
