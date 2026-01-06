import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- TEXTURES HD (NASA & Solar System Scope) ---
const TEXTURES = {
  map: 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
  bump: 'https://unpkg.com/three-globe/example/img/earth-topology.png',
  specular: 'https://unpkg.com/three-globe/example/img/earth-water.png',
  // Cette texture simule les villes et frontières la nuit (visible au zoom)
  cities: 'https://unpkg.com/three-globe/example/img/earth-night-lights.png',
};

// --- COUCHE DÉTAILS (Visible uniquement au ZOOM) ---
const DetailLayer = ({ zoomLevel }: { zoomLevel: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const citiesMap = useLoader(THREE.TextureLoader, TEXTURES.cities);

  useFrame(() => {
    if (meshRef.current) {
      // LOGIQUE MAGIQUE : Plus on est près (distance petite), plus c'est visible
      // Distance > 8 : Invisible
      // Distance < 6 : Visible à 100%
      const opacity = THREE.MathUtils.clamp(1 - (zoomLevel - 6) / 2, 0, 0.9);

      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.opacity = opacity;
      material.visible = opacity > 0.01;
    }
  });

  return (
    <mesh ref={meshRef} scale={[1.002, 1.002, 1.002]}>
      <sphereGeometry args={[5, 128, 128]} />
      <meshStandardMaterial
        map={citiesMap}
        transparent={true}
        blending={THREE.AdditiveBlending} // Mode "Lumière"
        color="#ffcc00" // Couleur Or pour les villes/frontières
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

// --- LE GLOBE ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const [colorMap, bumpMap, specularMap] = useLoader(THREE.TextureLoader, [
    TEXTURES.map, TEXTURES.bump, TEXTURES.specular
  ]);

  const [cameraDistance, setCameraDistance] = useState(15);

  useFrame((state) => {
    // Calcul de la distance caméra en temps réel
    const dist = state.camera.position.distanceTo(new THREE.Vector3(0, 0, 0));
    if (Math.abs(dist - cameraDistance) > 0.1) {
      setCameraDistance(dist);
      onZoomChange(dist);
    }
  });

  return (
    <group rotation={[0, 0, 0.2]}>
      {/* Planète Base */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 128, 128]} />
        <meshStandardMaterial
          map={colorMap}
          bumpMap={bumpMap}
          bumpScale={0.15}
          roughnessMap={specularMap}
          roughness={0.7}
          metalness={0.1}
          emissive="#000510"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Atmosphère */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Couche Zoom (Villes & Frontières) */}
      <DetailLayer zoomLevel={cameraDistance} />

      {/* Pays Interactifs */}
      {countries.map((country) => (
        <CountryMarker
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

// --- MARQUEUR PAYS (Intelligent) ---
const CountryMarker = ({ country, isSelected, onClick, cameraDistance }: any) => {
  const position = useMemo(() => latLngToVector3(country.lat, country.lng, 5.01), [country.lat, country.lng]);
  const color = isSelected ? '#4ade80' : '#3b82f6';

  // LOGIQUE D'AFFICHAGE TEXTE
  // Si on est loin (> 7.5), on voit les NOMS.
  // Si on est près (< 7.5), on cache les NOMS pour voir les FRONTIÈRES.
  const showText = cameraDistance > 7.5 || isSelected;

  return (
    <group position={position}>
      {/* Point physique (toujours visible) */}
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {/* Laser de sélection */}
      {isSelected && (
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.2, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}

      {/* Label UI (Disparaît au zoom) */}
      <Html distanceFactor={10} occlude style={{
        transition: 'opacity 0.3s',
        opacity: showText ? 1 : 0,
        pointerEvents: 'none'
      }}>
        <div className={`px-2 py-0.5 rounded backdrop-blur-md border ${
          isSelected
            ? 'bg-green-900/90 border-green-500 text-green-100 scale-110 z-50'
            : 'bg-gray-900/60 border-blue-500/30 text-blue-200'
        }`}>
          <div className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap font-mono">
            {country.flag} {country.name_fr || country.name}
          </div>
        </div>
      </Html>
    </group>
  );
};

// --- SCÈNE GLOBALE ---
export const WorldMap: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#02040a] relative">
      <Canvas
        camera={{ position: [0, 0, 16], fov: 40 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        shadows
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <directionalLight position={[15, 5, 5]} intensity={2.5} color="#fff5e6" />
          <pointLight position={[-10, -5, -5]} intensity={5} color="#0055ff" distance={30} />

          <Stars radius={300} depth={50} count={6000} factor={4} fade />

          <EarthGroup onZoomChange={() => {}} />

          <OrbitControls
            enablePan={false}
            minDistance={5.1} // ZOOM EXTRÊME (On touche presque le sol)
            maxDistance={35}  // DÉZOOM EXTRÊME (Vue système solaire)
            rotateSpeed={0.5}
            zoomSpeed={0.7}
            dampingFactor={0.05}
            enableDamping
          />

          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.4} mipmapBlur intensity={1.5} radius={0.5} />
            <Noise opacity={0.03} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      <Loader
        containerStyles={{ background: '#02040a' }}
        innerStyles={{ background: '#1e293b', width: '200px', height: '2px' }}
        barStyles={{ background: '#3b82f6', height: '2px' }}
        dataStyles={{ display: 'none' }}
        dataInterpolation={() => "CONNEXION SATELLITE..."}
      />
    </div>
  );
};
