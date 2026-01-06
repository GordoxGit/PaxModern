import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- TEXTURE POLITIQUE STYLE HOI4 ---
// Utilisation d'une carte politique haute résolution au lieu d'une photo satellite
const TEXTURES = {
  // Carte politique plate (Couleurs distinctes par pays)
  // NOTE: URL originale indisponible, passage en mode "Papier Vierge" (Plan B)
  political: null,
  // Texture de "bruit" papier pour donner un aspect carte ancienne/tactique (Optionnel, on utilise un normal map générique)
  paperNormal: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
};

// --- LE GLOBE POLITIQUE ---
const PoliticalGlobe = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();

  // Chargement des textures (Uniquement Normal Map pour le relief papier)
  const normalMap = useLoader(THREE.TextureLoader, TEXTURES.paperNormal);

  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (Math.abs(dist - cameraDistance) > 0.5) {
      setCameraDistance(dist);
      onZoomChange(dist);
    }
  });

  return (
    <group rotation={[0, -Math.PI / 2, 0]}> {/* Rotation pour aligner le méridien */}

      {/* 1. LA PLANÈTE (Style Carte Papier/Politique) */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 128, 128]} />
        <meshStandardMaterial
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.2, 0.2)} // Juste un peu de relief papier
          roughness={0.9} // Très mat (aspect papier)
          metalness={0.0} // Pas de métal
          color="#d4d4d4" // Gris/Beige Papier (Fallback car texture politique indisponible)
        />
      </mesh>

      {/* 2. FRONTIÈRES ACCENTUÉES (Wireframe subtil) */}
      <mesh scale={[1.001, 1.001, 1.001]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshBasicMaterial
          color="#000000"
          wireframe
          transparent
          opacity={0.05} // Grille de latitude/longitude très fine style carte d'état major
        />
      </mesh>

      {/* 3. MARQUEURS STRATÉGIQUES */}
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

// --- MARQUEUR HOI4 STYLE ---
const StrategicMarker = ({ country, isSelected, onClick, cameraDistance }: any) => {
  // Correction de la rotation de texture (-90 deg longitude)
  const position = useMemo(() => latLngToVector3(country.lat, country.lng - 90, 5.05), [country.lat, country.lng]);

  // Couleurs style HOI4 (Pastel/Mat)
  const color = isSelected ? '#ffcc00' : '#ffffff';

  // Afficher les noms plus tôt
  const showText = cameraDistance > 6 || isSelected;

  return (
    <group position={position}>
      {/* Base du marqueur (Disque plat style pion de jeu de plateau) */}
      <mesh
        onClick={onClick}
        onPointerOver={() => document.body.style.cursor = 'pointer'}
        onPointerOut={() => document.body.style.cursor = 'auto'}
        rotation={[Math.PI / 2, 0, 0]} // A plat sur la surface
      >
        <cylinderGeometry args={[0.08, 0.08, 0.02, 32]} />
        <meshStandardMaterial color={isSelected ? "#444444" : "#222222"} />
      </mesh>

      {/* Centre coloré */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
         <cylinderGeometry args={[0.05, 0.05, 0.04, 32]} />
         <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>

      {/* Drapeau / Nom Flottant */}
      <Billboard
        position={[0, 0.6, 0]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        {showText && (
          <group>
            {/* Fond du texte */}
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[1.5, 0.4]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.6} />
            </mesh>
            <Text
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              // font prop removed to use default font (original URL 404)
            >
              {country.name_fr?.toUpperCase() || country.name.toUpperCase()}
            </Text>
          </group>
        )}
      </Billboard>
    </group>
  );
};

// --- SCÈNE PRINCIPALE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#1a1a1a] relative"> {/* Fond Gris Foncé "War Room" */}
      <Canvas
        camera={{ position: [0, 0, 16], fov: 40 }}
        gl={{ antialias: true }}
        dpr={[1, 1.5]}
        shadows
      >
        <Suspense fallback={null}>

          {/* Éclairage "Salle de guerre" (Plat et lumineux) */}
          <ambientLight intensity={1.5} />
          <directionalLight position={[5, 10, 7]} intensity={1.0} castShadow />

          {/* Pas d'étoiles, juste le vide sombre */}

          <PoliticalGlobe onZoomChange={() => {}} />

          <OrbitControls
            enablePan={false}
            minDistance={5.5}
            maxDistance={35}
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            dampingFactor={0.1}
            enableDamping
          />

          <EffectComposer disableNormalPass>
            {/* Grain léger pour l'effet papier/carte ancienne */}
            <Noise opacity={0.05} />
            {/* Vignette pour focus le centre de la table */}
            <Vignette eskil={false} offset={0.3} darkness={0.6} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <Loader
        containerStyles={{ background: '#1a1a1a' }}
        innerStyles={{ background: '#333', width: '200px', height: '4px' }}
        barStyles={{ background: '#fbbf24', height: '4px' }} // Jaune tactique
        dataStyles={{ display: 'none' }}
        dataInterpolation={() => "DÉPLOIEMENT CARTE STRATÉGIQUE..."}
      />
    </div>
  );
};
