import React, { useMemo, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader } from '@react-three/drei'; // Ajout de Loader
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// Textures HD
const EARTH_TEXTURES = {
  map: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  specular: 'https://unpkg.com/three-globe/example/img/earth-water.png',
};

// --- LE GROUPE TERRE + MARQUEURS ---
// On met tout ensemble pour que les points suivent la rotation de la terre
const EarthGroup = () => {
  const { countries, selectCountry, selectedCountry } = useGameStore();

  // Chargement des textures
  const [colorMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    EARTH_TEXTURES.map,
    EARTH_TEXTURES.bump,
    EARTH_TEXTURES.specular
  ]);

  return (
    // C'EST ICI QUE TOUT SE JOUE : On applique la rotation au GROUPE PARENT
    <group rotation={[0, 0, 0.2]}>

      {/* 1. LA PLANÈTE */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.15}
          roughnessMap={specularMap} // L'océan brille, pas la terre
          roughness={0.5}
          metalness={0.1}
          emissive="#001133"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* 2. ATMOSPHÈRE */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#4488ff"
          transparent
          opacity={0.1}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. LES PAYS (Enfants du groupe, donc ils tournent avec la terre !) */}
      {countries.map((country) => (
        <CountryMarker
          key={country.id}
          country={country}
          isSelected={selectedCountry === country.id}
          onClick={(e: any) => {
            e.stopPropagation(); // Empêche de cliquer à travers la planète
            selectCountry(country.id);
          }}
        />
      ))}
    </group>
  );
};

// --- COMPOSANT MARQUEUR ---
const CountryMarker = ({ country, isSelected, onClick }: any) => {
  const position = useMemo(() => {
    // Calcul de la position (Rayon de 5 pour la terre + 0.01 pour être juste au dessus)
    return latLngToVector3(country.lat, country.lng, 5.01);
  }, [country.lat, country.lng]);

  const color = isSelected ? '#4ade80' : '#3b82f6';

  return (
    <group position={position}>
      {/* Le point cliquable */}
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Le laser vertical */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}

      {/* Le Label HTML */}
      <Html distanceFactor={10} occlude>
        <div className={`pointer-events-none px-2 py-0.5 rounded border backdrop-blur-md transition-all font-mono select-none ${
          isSelected
            ? 'bg-green-900/80 border-green-500 text-green-100 scale-110 z-50'
            : 'bg-black/50 border-blue-500/20 text-gray-400 text-[8px]'
        }`}>
          <span className="whitespace-nowrap font-bold uppercase tracking-widest">
            {country.name_fr || country.name}
          </span>
        </div>
      </Html>
    </group>
  );
};

// --- SCÈNE PRINCIPALE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#050a14] relative">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 45 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 2]}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.2} color="#ffffff" />
          <directionalLight position={[15, 10, 5]} intensity={2} color="#fff0dd" />
          <pointLight position={[-10, -5, -5]} intensity={5} color="#0044ff" distance={20} />

          <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade />

          <EarthGroup />

          <OrbitControls
            enablePan={false}
            minDistance={6}
            maxDistance={25}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            dampingFactor={0.1}
            enableDamping
          />

          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.5} mipmapBlur intensity={1.5} radius={0.4} />
            <Noise opacity={0.05} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* LE VRAI LOADER QUI DISPARAIT TOUT SEUL */}
      <Loader
        containerStyles={{ background: '#050a14' }}
        innerStyles={{ background: '#1e293b', width: '200px', height: '10px' }}
        barStyles={{ background: '#3b82f6', height: '10px' }}
        dataStyles={{ display: 'none' }} // Cache le pourcentage moche
        dataInterpolation={() => "INITIALISATION DU SYSTÈME SATELLITE..."}
      />
    </div>
  );
};
