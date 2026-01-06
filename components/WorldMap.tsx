import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- TEXTURES STABLES (CORRECTIF CORS/404) ---
const TEXTURES = {
  map: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg',
  bump: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
  specular: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
  cities: 'https://upload.wikimedia.org/wikipedia/commons/b/ba/The_earth_at_night.jpg',
};

// --- COUCHE DÉTAILS (Villes illuminées au Zoom) ---
const DetailLayer = ({ zoomLevel }: { zoomLevel: number }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const citiesMap = useLoader(THREE.TextureLoader, TEXTURES.cities);

  useFrame(() => {
    if (meshRef.current) {
      // Apparition progressive quand on s'approche (Distance < 7)
      const opacity = THREE.MathUtils.clamp(1 - (zoomLevel - 6) / 2, 0, 1);
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
        blending={THREE.AdditiveBlending} // Les lumières s'ajoutent (effet néon)
        color="#ffd700" // Teinte dorée
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
          bumpScale={0.1}
          roughnessMap={specularMap}
          roughness={0.7}
          metalness={0.1}
          emissive="#000510"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Atmosphère */}
      <mesh scale={[1.02, 1.02, 1.02]}>
        <sphereGeometry args={[5, 64, 64]} />
        <meshStandardMaterial color="#4488ff" transparent opacity={0.15} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Couche Villes (Zoom) */}
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

// --- MARQUEUR PAYS ---
const CountryMarker = ({ country, isSelected, onClick, cameraDistance }: any) => {
  const position = useMemo(() => latLngToVector3(country.lat, country.lng, 5.01), [country.lat, country.lng]);
  const color = isSelected ? '#4ade80' : '#3b82f6';

  // Affichage dynamique du texte
  const showText = cameraDistance > 8 || isSelected;

  return (
    <group position={position}>
      <mesh onClick={onClick} onPointerOver={() => document.body.style.cursor = 'pointer'} onPointerOut={() => document.body.style.cursor = 'auto'}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 1.2, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      )}

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
            minDistance={5.2}
            maxDistance={35}
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
