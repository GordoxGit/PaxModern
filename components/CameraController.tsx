import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Configuration des modes de caméra
const CAMERA_MODES = {
  GLOBE: {
    minAlt: 15,
    maxAlt: Infinity,
    rotateSpeed: 1.0,
    zoomSpeed: 1.5,
    panSpeed: 0,
    maxPolarAngle: Math.PI / 1.5, // ~120 deg
    enablePan: false,
    fov: 45
  },
  REGIONAL: {
    minAlt: 7,
    maxAlt: 15,
    rotateSpeed: 0.6,
    zoomSpeed: 1.2,
    panSpeed: 0.5,
    maxPolarAngle: Math.PI * 0.75, // ~135 deg
    enablePan: true,
    fov: 50 // Transition value
  },
  CITY: {
    minAlt: 0,
    maxAlt: 7,
    rotateSpeed: 0.3,
    zoomSpeed: 0.8,
    panSpeed: 1.0,
    maxPolarAngle: Math.PI * 0.95, // ~170 deg - Horizon visible
    enablePan: true,
    fov: 60
  }
};

interface CameraControllerProps {
  onZoomChange?: (altitude: number) => void;
}

export const CameraController: React.FC<CameraControllerProps> = ({ onZoomChange }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  const vec = new THREE.Vector3();
  const targetVec = new THREE.Vector3();

  useFrame((state) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;

    // 1. Calcul de l'altitude réelle (distance au centre)
    const altitude = camera.position.length();

    // 2. Détermination du mode et des facteurs d'interpolation
    let currentMode = CAMERA_MODES.GLOBE;
    let t = 0; // Facteur d'interpolation pour target (0 = centre, 1 = surface)

    if (altitude > 15) {
      currentMode = CAMERA_MODES.GLOBE;
      t = 0;
    } else if (altitude > 7) {
      currentMode = CAMERA_MODES.REGIONAL;
      // Interpolation entre 15 et 7
      t = 1 - THREE.MathUtils.smoothstep(7, 15, altitude);
    } else {
      currentMode = CAMERA_MODES.CITY;
      t = 1;
    }

    // 3. Gestion de la cible (Target)
    // Technique 1: Target mobile
    // Distance > 15: target = (0,0,0)
    // Distance < 7: target = point surface sous la caméra
    // Entre les deux: interpolation

    const corePoint = new THREE.Vector3(0, 0, 0);
    // Point à la surface juste sous la caméra (rayon 5)
    // On projette la position de la caméra sur la sphère de rayon 5
    const surfacePoint = vec.copy(camera.position).normalize().multiplyScalar(5);

    // Smooth lerp de la target actuelle vers la target désirée pour éviter les sauts
    const idealTarget = targetVec.copy(corePoint).lerp(surfacePoint, t);

    // On applique le changement de target progressivement (damping manuel)
    controls.target.lerp(idealTarget, 0.1);

    // 4. Gestion du minDistance et Zoom
    // Fix critique: permettre de zoomer très près en mode CITY
    // Quand on est loin, on bloque à la surface (5.2)
    // Quand on est près, on permet d'aller au sol (0.5 par rapport à la target qui est sur la surface)
    // Attention: OrbitControls minDistance est relatif à la target

    // Si target est (0,0,0), minDistance doit être ~5.5
    // Si target est surface(5,y,z), minDistance doit être ~0.5

    // Interpolation linéaire inverse de t
    const globeMinDist = 5.5; // Un peu au dessus du sol
    const cityMinDist = 0.5;  // Très près du sol

    controls.minDistance = THREE.MathUtils.lerp(globeMinDist, cityMinDist, t);

    // 5. Ajustement des paramètres dynamiques
    controls.rotateSpeed = THREE.MathUtils.lerp(controls.rotateSpeed, currentMode.rotateSpeed, 0.1);
    controls.zoomSpeed = currentMode.zoomSpeed;
    controls.panSpeed = currentMode.panSpeed;
    controls.enablePan = currentMode.enablePan;

    // Max Polar Angle (Horizon view)
    controls.maxPolarAngle = THREE.MathUtils.lerp(controls.maxPolarAngle, currentMode.maxPolarAngle, 0.05);

    // 6. FOV Dynamique (Technique 3)
    if (state.camera instanceof THREE.PerspectiveCamera) {
       state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, currentMode.fov, 0.05);
       state.camera.updateProjectionMatrix();
    }

    controls.update();

    if (onZoomChange) {
      onZoomChange(altitude);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.12} // Plus réactif comme demandé
      minDistance={1} // Sera écrasé par le useFrame
      maxDistance={50}
      enablePan={false} // Sera écrasé par le useFrame
    />
  );
};
