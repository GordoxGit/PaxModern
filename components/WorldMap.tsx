import React, { useMemo, Suspense, useRef, useState } from 'react';
import { Canvas, useLoader, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Html, Loader, Billboard, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useGameStore } from '../stores/gameStore';
import { latLngToVector3 } from '../utils/geo';

// --- LE GLOBE ---
const EarthGroup = ({ onZoomChange }: { onZoomChange: (d: number) => void }) => {
  const { countries, selectCountry, selectedCountry } = useGameStore();
  const gl = useThree((state) => state.gl);

  const [baseMap, normalMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg'
  ], (loader) => loader.setCrossOrigin('anonymous'));

  // OPTIMISATION NETTETÉ (ANISOTROPY)
  useMemo(() => {
    const maxAnisotropy = gl.capabilities.getMaxAnisotropy();
    baseMap.anisotropy = maxAnisotropy;
    normalMap.anisotropy = maxAnisotropy;

    baseMap.minFilter = THREE.LinearMipMapLinearFilter;
    normalMap.minFilter = THREE.LinearMipMapLinearFilter;
  }, [baseMap, normalMap, gl]);

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
      {/* 1. LA TERRE (MATTE, PAS DE FLASHS) */}
      <mesh receiveShadow castShadow>
        <sphereGeometry args={[5, 128, 128]} />
        <meshStandardMaterial
          map={baseMap}
          normalMap={normalMap}
          // PAS DE SPECULAR MAP -> Bye bye les flashs
          color="#cccccc"            // Gris clair pour éclaircir la base
          roughness={0.9}            // 0.9 = Aspect "Papier/Carte", très mat, pas de reflet d'eau
          metalness={0.0}            // 0 = Pas de métal, évite les reflets bizarres
          normalScale={new THREE.Vector2(3, 3)} // Relief très fort pour voir les montagnes
        />
      </mesh>

      {/* 2. GRID / FRONTIÈRES TACTIQUES (Wireframe Fallback) */}
      <mesh scale={[1.001, 1.001, 1.001]}>
         <sphereGeometry args={[5, 48, 48]} />
         <meshBasicMaterial
            color="#ffffff"
            wireframe={true}
            transparent={true}
            opacity={cameraDistance < 8 ? 0.08 : 0} // Subtle grid when close
         />
      </mesh>

      {/* MARQUEURS STRATÉGIQUES */}
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
          <ambientLight intensity={1.5} color="#b0c4de" />
          <directionalLight
              position={[15, 5, 5]}
              intensity={1.5}
              color="#fff"
              castShadow
          />
          <pointLight position={[-20, 0, -20]} intensity={0.5} color="#404040" />

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
