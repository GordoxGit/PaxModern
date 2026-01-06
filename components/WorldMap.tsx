import React, { useMemo, Suspense } from 'react';
import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- LIENS VERS LES TEXTURES HD (NASA / Solar System Scope) ---
const EARTH_TEXTURES = {
  map: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg', // Texture de base
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png', // Relief (Montagnes)
  specular: 'https://unpkg.com/three-globe/example/img/earth-water.png', // Reflets Océans
  lights: 'https://unpkg.com/three-globe/example/img/earth-night-lights.png' // Lumières de nuit (Optionnel)
};

// --- COMPOSANT : LA TERRE (HOI4 STYLE) ---
const Earth = () => {
  // Chargement des textures
  const [colorMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    EARTH_TEXTURES.map,
    EARTH_TEXTURES.bump,
    EARTH_TEXTURES.specular
  ]);

  return (
    <group rotation={[0, 0, 0.2]}> {/* Inclinaison naturelle */}
      {/* Globe Principal */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 128, 128]} /> {/* Haute résolution géométrique */}
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.15} // Hauteur des montagnes (Effet HOI4)
          roughnessMap={specularMap}
          roughness={0.8}
          metalness={0.2}
          emissive="#112244" // Légère lueur bleue interne
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Atmosphère (Glow externe) */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#4488ff"
          transparent
          opacity={0.15}
          side={THREE.BackSide} // Affiche l'intérieur de la sphère pour l'effet halo
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};

// --- COMPOSANT : MARQUEURS PAYS ---
const CountryMarker = ({ country, isSelected, onClick }: any) => {
  const position = useMemo(() => {
    return latLngToVector3(country.lat, country.lng, 5.02);
  }, [country.lat, country.lng]);

  const color = isSelected ? '#4ade80' : '#3b82f6';

  return (
    <group position={position}>
      {/* Point sur la carte */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Pylône Lumineux */}
      {isSelected && (
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.01, 0.04, 1.2, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}

      {/* Label UI */}
      <Html distanceFactor={12} occlude>
        <div className={`pointer-events-none px-3 py-1 rounded-sm border backdrop-blur-md transition-all duration-300 font-mono ${
          isSelected
            ? 'bg-green-900/90 border-green-500 text-green-100 scale-110 z-50 shadow-[0_0_15px_rgba(74,222,128,0.5)]'
            : 'bg-black/60 border-blue-500/30 text-gray-300 hover:text-white hover:bg-black/80'
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-widest flex flex-col items-center">
            {country.flag} {country.name_fr || country.name}
          </div>
        </div>
      </Html>
    </group>
  );
};

// --- SCÈNE PRINCIPALE ---
export const WorldMap: React.FC = () => {
  const { countries, selectCountry, selectedCountry } = useGameStore();

  return (
    <div className="w-full h-full bg-[#050a14] relative">
      <Canvas
        camera={{ position: [0, 0, 14], fov: 40 }} // Caméra reculée pour vue stratégique
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]} // Optimisation performance
        shadows
      >
        {/* Suspense gère le chargement des textures (écran blanc évité) */}
        <Suspense fallback={null}>

          {/* ÉCLAIRAGE STRATÉGIQUE */}
          <ambientLight intensity={0.4} color="#ccccff" /> {/* Lumière bleue froide */}
          <directionalLight
            position={[15, 10, 5]}
            intensity={2.5}
            color="#fff5e6" // Soleil chaud
            castShadow
          />
          <pointLight position={[-10, -10, -5]} intensity={1} color="#0044ff" /> {/* Contre-jour bleu */}

          <Stars radius={200} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />

          <Earth />

          {countries.map((country) => (
            <CountryMarker
              key={country.id}
              country={country}
              isSelected={selectedCountry === country.id}
              onClick={(e: any) => {
                e.stopPropagation();
                selectCountry(country.id);
              }}
            />
          ))}

          <OrbitControls
            enablePan={false}
            minDistance={6.5}
            maxDistance={25}
            rotateSpeed={0.6}
            zoomSpeed={0.8}
            dampingFactor={0.05} // Mouvement fluide "Lourd"
            enableDamping={true}
          />

          {/* POST-PROCESSING (L'effet "Next-Gen") */}
          <EffectComposer disableNormalPass>
            {/* Bloom modéré pour faire briller les UI et l'atmosphère */}
            <Bloom luminanceThreshold={0.6} mipmapBlur intensity={1.2} radius={0.5} />
            {/* Grain léger pour aspect "Image Satellite en direct" */}
            <Noise opacity={0.08} />
            {/* Vignette pour focus central */}
            <Vignette eskil={false} offset={0.1} darkness={1.0} />
          </EffectComposer>

        </Suspense>
      </Canvas>

      {/* Loader UI (s'affiche pendant le téléchargement des textures) */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="text-blue-500/50 text-xs font-mono animate-pulse tracking-[0.5em]">
          INITIALISATION SATELLITE...
        </div>
      </div>
    </div>
  );
};
