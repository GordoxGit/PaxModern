import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame, extend } from '@react-three/fiber';
import { OrbitControls, Stars, Loader, Text, Billboard } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- NOUVELLE TEXTURE : UNIQUEMENT LES FRONTIÈRES ---
// C'est un masque noir et blanc haute définition des frontières mondiales.
const TEXTURES = {
  // Fallback to a working texture since the original 8k mask is 404
  bordersMask: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
};

// --- LE GLOBE STRATÉGIQUE ---
const StrategicGlobe = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  // On charge uniquement le masque de frontières
  const bordersMap = useLoader(THREE.TextureLoader, TEXTURES.bordersMask);

  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (Math.abs(dist - cameraDistance) > 0.5) {
      setCameraDistance(dist);
      onZoomChange(dist);
    }
  });

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. LA BASE OCÉAN (Sphère sombre unie) */}
      <mesh>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
          color="#0a1a3a" // Bleu marine très foncé
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      {/* 2. LA COUCHE FRONTIÈRES LUMINEUSES */}
      <mesh scale={[1.005, 1.005, 1.005]}>
        <sphereGeometry args={[5, 128, 128]} />
        <meshBasicMaterial
          map={bordersMap}
          transparent={true}
          opacity={0.8} // On voit les lignes
          color="#4db2ff" // Couleur Néon Bleu pour les frontières
          blending={THREE.AdditiveBlending} // Ça brille
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 3. ATMOSPHÈRE TACTIQUE */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial color="#4db2ff" transparent opacity={0.1} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* 4. MARQUEURS & NOMS 3D */}
      {countries.map((country) => (
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

// --- MARQUEUR STRATÉGIQUE AVEC TEXTE 3D ---
const StrategicMarker = ({ country, isSelected, onClick, cameraDistance }: any) => {
  const position = useMemo(() => latLngToVector3(country.lat, country.lng, 5.02), [country.lat, country.lng]);
  const color = isSelected ? '#4ade80' : '#3b82f6';

  // LOGIQUE INVERSÉE : On affiche les noms quand on est LOIN (> 8)
  // On les cache quand on est très PRÈS (< 8) pour voir le sol
  const showLabel = cameraDistance > 8 || isSelected;

  return (
    <group position={position}>
      {/* Point physique */}
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Laser de sélection */}
      {isSelected && (
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.5, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}

      {/* NOUVEAU : LABEL 3D FLOTTANT (Billboard pour faire face à la caméra) */}
      <Billboard
        position={[0, 0.4, 0]} // Un peu au dessus du point
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {showLabel && (
          <Text
            fontSize={0.3} // Taille du texte
            color={isSelected ? "#4ade80" : "white"}
            anchorX="center"
            anchorY="middle"
            // font prop removed due to 404 on provided URL. Using default font.
            outlineWidth={0.02}
            outlineColor="#000000"
            fillOpacity={cameraDistance < 10 ? (cameraDistance - 8) / 2 : 1} // Fade in/out progressif
          >
            {country.name_fr || country.name}
          </Text>
        )}
      </Billboard>
    </group>
  );
};

// --- SCÈNE GLOBALE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#02040a] relative">
      <Canvas
        camera={{ position: [0, 0, 20], fov: 45 }} // Caméra plus loin au départ
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} color="#4db2ff" /> {/* Lumière d'ambiance bleue */}
          <directionalLight position={[10, 10, 5]} intensity={1.5} color="#ffffff" />

          <Stars radius={300} depth={50} count={5000} factor={4} fade />

          <StrategicGlobe onZoomChange={() => {}} />

          <OrbitControls
            enablePan={false}
            minDistance={5.5}
            maxDistance={40}
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            dampingFactor={0.05}
            enableDamping
          />

          <EffectComposer disableNormalPass>
            {/* Bloom puissant pour faire briller les frontières et le texte */}
            <Bloom luminanceThreshold={0.1} mipmapBlur intensity={2.0} radius={0.7} />
            <Noise opacity={0.04} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <Loader
        containerStyles={{ background: '#02040a' }}
        innerStyles={{ background: '#1e293b', width: '200px', height: '2px' }}
        barStyles={{ background: '#4db2ff', height: '2px' }}
        dataStyles={{ display: 'none' }}
        dataInterpolation={() => "CHARGEMENT CARTE STRATÉGIQUE..."}
      />
    </div>
  );
};
