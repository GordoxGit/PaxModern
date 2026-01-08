// CameraController.tsx - REFONTE COMPLÈTE
import { useRef, useState, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useGlobePhysics } from '../systems/GlobePhysics';
import { useLODStore, LODLevel } from '../systems/LODManager';

// === CONFIGURATION DES MODES ===
const CAMERA_MODES = {
  GLOBE: {
    name: 'GLOBE',
    minDistance: 12,
    maxDistance: 50,
    targetMode: 'center', // Target fixe au centre
    rotateSpeed: 0.8,
    zoomSpeed: 1.2,
    panSpeed: 0,
    maxPolarAngle: Math.PI * 0.85, // 153° - pas de vue horizon
    fov: 45,
  },
  CONTINENTAL: {
    name: 'CONTINENTAL',
    minDistance: 6,
    maxDistance: 12,
    targetMode: 'surface_follow', // Target suit la surface
    rotateSpeed: 0.5,
    zoomSpeed: 1.0,
    panSpeed: 0.3,
    maxPolarAngle: Math.PI * 0.85,
    fov: 50,
  },
  REGIONAL: {
    name: 'REGIONAL',
    minDistance: 3,
    maxDistance: 6,
    targetMode: 'surface_lock', // Target verrouillé sur surface
    rotateSpeed: 0.3,
    zoomSpeed: 0.8,
    panSpeed: 0.6,
    maxPolarAngle: Math.PI * 0.9, // 162° - légère vue horizon
    fov: 55,
  },
  CITY_BUILDER: {
    name: 'CITY_BUILDER',
    minDistance: 0.5,
    maxDistance: 3,
    targetMode: 'surface_lock',
    rotateSpeed: 0.2,
    zoomSpeed: 0.5,
    panSpeed: 1.0,
    maxPolarAngle: Math.PI * 0.97, // 175° - vue horizon complète
    fov: 60,
  },
} as const;

type CameraMode = keyof typeof CAMERA_MODES;

const GLOBE_RADIUS = 5;
const MIN_ALTITUDE = 0.1;
const TRANSITION_DURATION = 0.5; // secondes

interface CameraControllerProps {
  onZoomChange?: (d: number) => void;
}

export function CameraController({ onZoomChange }: CameraControllerProps) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<any>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const [currentMode, setCurrentMode] = useState<CameraMode>('GLOBE');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const lastModeRef = useRef<CameraMode>('GLOBE');

  // Store LOD
  const setLOD = useLODStore((state) => state.setLOD);

  // Surface point pour target
  const surfaceTargetRef = useRef(new THREE.Vector3(0, 0, GLOBE_RADIUS));

  // Physique du globe
  const physics = useGlobePhysics({
    globeRadius: GLOBE_RADIUS,
    minAltitude: MIN_ALTITUDE, // 0.1 unité au-dessus de la surface minimum
    collisionResponse: 'clamp'
  });

  // === DÉTECTION DU MODE SELON DISTANCE ===
  const getModeFromDistance = useCallback((distance: number): CameraMode => {
    if (distance > 12) return 'GLOBE';
    if (distance > 6) return 'CONTINENTAL';
    if (distance > 3) return 'REGIONAL';
    return 'CITY_BUILDER';
  }, []);

  // === TRANSITION ENTRE MODES (GSAP) ===
  const transitionToMode = useCallback((fromMode: CameraMode, toMode: CameraMode) => {
    if (isTransitioning) return;

    const controls = controlsRef.current;
    if (!controls) return;

    setIsTransitioning(true);

    const fromConfig = CAMERA_MODES[fromMode];
    const toConfig = CAMERA_MODES[toMode];

    // Animer les paramètres de OrbitControls
    gsap.to(controls, {
      rotateSpeed: toConfig.rotateSpeed,
      zoomSpeed: toConfig.zoomSpeed,
      panSpeed: toConfig.panSpeed,
      maxPolarAngle: toConfig.maxPolarAngle,
      duration: TRANSITION_DURATION,
      ease: 'power2.inOut',
    });

    // Animer le FOV
    gsap.to(camera, {
      fov: toConfig.fov,
      duration: TRANSITION_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => camera.updateProjectionMatrix(),
    });

    // Transition du target si nécessaire
    if (fromConfig.targetMode !== toConfig.targetMode) {
      const currentTarget = controls.target.clone();
      let newTarget: THREE.Vector3;

      if (toConfig.targetMode === 'center') {
        newTarget = new THREE.Vector3(0, 0, 0);
      } else {
        // Calculer le point de surface sous la caméra
        newTarget = camera.position.clone().normalize().multiplyScalar(GLOBE_RADIUS);
      }

      gsap.to(controls.target, {
        x: newTarget.x,
        y: newTarget.y,
        z: newTarget.z,
        duration: TRANSITION_DURATION,
        ease: 'power2.inOut',
        onComplete: () => {
          setIsTransitioning(false);
          setCurrentMode(toMode);
          setLOD(toMode);
        },
      });
    } else {
      setTimeout(() => {
        setIsTransitioning(false);
        setCurrentMode(toMode);
        setLOD(toMode);
      }, TRANSITION_DURATION * 1000);
    }
  }, [isTransitioning, camera, setLOD]);

  // === MAIN LOOP ===
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const distance = camera.position.length();
    if (onZoomChange) onZoomChange(distance);

    // === 1. COLLISION PHYSIQUE (PRIORITÉ ABSOLUE) ===
    physics.enforceCollision(camera, controls);

    // === 2. DÉTECTION CHANGEMENT DE MODE ===
    const newMode = getModeFromDistance(distance);

    if (newMode !== lastModeRef.current && !isTransitioning) {
      console.log(`Mode transition: ${lastModeRef.current} → ${newMode}`);
      transitionToMode(lastModeRef.current, newMode);
      lastModeRef.current = newMode;
    }

    // === 3. MISE À JOUR TARGET SURFACE (seulement si mode surface) ===
    const config = CAMERA_MODES[currentMode];
    if (config.targetMode === 'surface_lock' && !isTransitioning) {
      // Calculer le point de surface le plus proche de la direction de la caméra
      const surfacePoint = camera.position.clone().normalize().multiplyScalar(GLOBE_RADIUS);
      surfaceTargetRef.current.copy(surfacePoint);

      // NE PAS modifier controls.target ici en continu !
      // Le target est mis à jour UNIQUEMENT lors des transitions
    }

    // === 4. MISE À JOUR minDistance SELON MODE ===
    controls.minDistance = config.targetMode === 'center'
      ? GLOBE_RADIUS + 1
      : GLOBE_RADIUS + MIN_ALTITUDE;
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      args={[camera, gl.domElement]}

      // Valeurs initiales (mode GLOBE)
      rotateSpeed={CAMERA_MODES.GLOBE.rotateSpeed}
      zoomSpeed={CAMERA_MODES.GLOBE.zoomSpeed}
      panSpeed={CAMERA_MODES.GLOBE.panSpeed}

      // Limites
      minDistance={GLOBE_RADIUS + 1}
      maxDistance={50}
      maxPolarAngle={CAMERA_MODES.GLOBE.maxPolarAngle}

      // Comportement
      enableDamping={true}
      dampingFactor={0.05}
      enablePan={true}
      screenSpacePanning={false}
    />
  );
}
