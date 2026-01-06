import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- TEXTURES CONFIG ---
const TEXTURES = {
  // Texture de base (Terre sans nuages trop marqués, propre)
  // Source : Three.js GitHub Repo (Ultra stable)
  baseMap: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',

  // Relief (Normal Map) - 2K
  normalMap: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',

  // Reflets (Specular Map) - 2K
  specularMap: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',

  // Couche Politique (Celle-ci marchait, on la garde, mais en version sécurisée)
  politicalLayer: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/World_map_-_low_resolution.svg/1024px-World_map_-_low_resolution.svg.png'
};

// --- COUCHE POLITIQUE (Visible uniquement au ZOOM) ---
const PoliticalLayer = ({ zoomLevel }: { zoomLevel: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const politicalMap = useLoader(THREE.TextureLoader, TEXTURES.politicalLayer);

  useFrame(() => {
    if (meshRef.current) {
      // LOGIQUE : Invisible de loin (> 10), Apparaît progressivement quand on zoom (< 8)
      const opacity = THREE.MathUtils.clamp(1 - (zoomLevel - 6) / 3, 0, 0.9);

      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.visible = opacity > 0.01;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1.002, 1.002, 1.002]}> {/* Juste au dessus de la texture de base */}
      <sphereGeometry args={[5, 128, 128]} />
      <meshStandardMaterial
        map={politicalMap}
        transparent={true}
        blending={THREE.NormalBlending} // Se superpose normalement
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
};

// --- LE GLOBE ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();

  // Chargement des 3 textures critiques
  const [baseMap, normalMap, specularMap] = useLoader(THREE.TextureLoader, [
    TEXTURES.baseMap,
    TEXTURES.normalMap,
    TEXTURES.specularMap
  ]);

  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (Math.abs(dist - cameraDistance) > 0.1) {
      setCameraDistance(dist);
      onZoomChange(dist);
    }
  });

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* 1. PLANÈTE BASE STYLE "WAR ROOM" */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 128, 128]} /> {/* Augmenté à 128 segments pour que les montagnes soient propres */}
        <meshStandardMaterial
          map={baseMap}
          normalMap={normalMap}
          roughnessMap={specularMap}

          // REGLAGES SOMBRES "HOI4" :
          color="#808080"            // On assombrit la texture de base (Gris moyen)
          roughness={0.7}            // Terre assez mate
          metalness={0.1}            // Léger reflet métallique
          normalScale={new THREE.Vector2(1.5, 1.5)} // Relief bien visible
          emissive="#000510"         // Très légère teinte bleu nuit dans le noir complet
        />
      </mesh>

      {/* 2. ATMOSPHÈRE (On la rend plus subtile, moins "Espace", plus "Hologramme") */}
      <mesh scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial
            color="#2a4c80"
            transparent
            opacity={0.05}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* 3. COUCHE POLITIQUE (Reste inchangée mais s'affichera mieux sur le fond sombre) */}
      <PoliticalLayer zoomLevel={cameraDistance} />

      {/* ... Markers ... */}
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
      {/* Pion physique */}
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
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
          <ambientLight intensity={0.2} /> {/* Ambiance très faible pour garder le contraste */}
          <directionalLight
              position={[50, 20, 30]} // Lumière venant de côté/haut
              intensity={2.5}         // Très forte pour créer des ombres nettes sur les montagnes
              color="#ffeedd"         // Lumière légèrement chaude (lampe de bureau)
              castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#002266" /> {/* Contre-jour bleu nuit (Fill light) */}

          <Stars radius={300} depth={50} count={3000} factor={4} fade />

          <EarthGroup onZoomChange={() => {}} />

          <OrbitControls
            enablePan={false}
            minDistance={5.2}
            maxDistance={35}
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            dampingFactor={0.05}
            enableDamping
          />

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
