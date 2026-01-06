import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, TiltShift2, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- COMPOSANT : LA TERRE (Base) ---
const Earth = () => {
  return (
    <mesh receiveShadow castShadow>
      <sphereGeometry args={[5, 64, 64]} />
      {/* Matériau style "Hologramme Sombre" pour Pax Modern */}
      <meshStandardMaterial
        color="#1a2b4b"
        emissive="#0a101a"
        roughness={0.7}
        metalness={0.5}
        wireframe={false} // Mettre true pour un look encore plus cyber
      />
    </mesh>
  );
};

// --- COMPOSANT : ATMOSPHÈRE (Glow) ---
const Atmosphere = () => {
  return (
    <mesh scale={[1.1, 1.1, 1.1]}>
      <sphereGeometry args={[5, 64, 64]} />
      <meshBasicMaterial
        color="#4db2ff"
        transparent
        opacity={0.1}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// --- COMPOSANT : MARQUEURS PAYS ---
const CountryMarker = ({ country, isSelected, onClick }: any) => {
  // Conversion Lat/Lng -> 3D
  const position = useMemo(() => {
    return latLngToVector3(country.lat, country.lng, 5.05); // Rayon 5 + un peu de marge
  }, [country.lat, country.lng]);

  const color = isSelected ? '#4ade80' : '#3b82f6'; // Vert si sélectionné, Bleu sinon

  return (
    <group position={position}>
      {/* Le Point lumineux */}
      <mesh onClick={onClick}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Le Rayon vertical (Pillar of light) */}
      {isSelected && (
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} />
        </mesh>
      )}

      {/* Étiquette HTML flottante (Drei) */}
      <Html distanceFactor={15} occlude>
        <div className={`pointer-events-none px-2 py-1 rounded border backdrop-blur-md transition-all ${
          isSelected
            ? 'bg-green-900/80 border-green-500 text-green-100 scale-110 z-50'
            : 'bg-blue-900/50 border-blue-500/30 text-blue-200 opacity-70'
        }`}>
          <div className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
            {country.name_fr || country.name}
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
        camera={{ position: [0, 0, 12], fov: 45 }}
        gl={{ antialias: false }} // Désactivé car géré par Postprocessing
        dpr={[1, 2]} // Performance pour écrans haute densité
        shadows
      >
        {/* 1. ÉCLAIRAGE */}
        <ambientLight intensity={0.5} color="#4db2ff" />
        <pointLight position={[10, 10, 10]} intensity={2} color="#ffecd1" />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

        {/* 2. LE MONDE */}
        <group rotation={[0, 0, 0.2]}> {/* Tilt léger de la terre */}
           <Earth />
           <Atmosphere />

           {/* 3. LES PAYS (Instanciés virtuellement ici, optimisation plus tard) */}
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
        </group>

        {/* 4. CONTRÔLES CAMÉRA */}
        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={20}
          rotateSpeed={0.5}
          zoomSpeed={0.8}
          autoRotate={!selectedCountry} // Tourne tout seul si rien n'est sélectionné
          autoRotateSpeed={0.5}
        />

        {/* 5. POST-PROCESSING (Le "Eye Candy") */}
        <EffectComposer disableNormalPass>
          {/* Bloom : Fait briller les néons et les marqueurs */}
          <Bloom luminanceThreshold={0.2} mipmapBlur intensity={1.5} radius={0.6} />

          {/* Noise : Grain de film pour l'aspect réaliste/sale */}
          <Noise opacity={0.05} />

          {/* Vignette : Assombrit les bords pour focus cinéma */}
          <Vignette eskil={false} offset={0.1} darkness={1.1} />

          {/* TiltShift : Effet "Maquette" (Focus au centre, flou en haut/bas) */}
          <TiltShift2 blur={0.15} />
        </EffectComposer>

      </Canvas>

      {/* Overlay UI Grid (Décoratif) */}
      <div className="absolute inset-0 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
    </div>
  );
};
