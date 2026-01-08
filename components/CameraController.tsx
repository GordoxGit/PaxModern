import React, { useRef, useCallback, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { GlobePhysics, DEFAULT_GLOBE_PHYSICS_CONFIG } from '../systems/GlobePhysics';
import { useLODStore, LOD_CONFIGS, getLODFromDistance, LODLevel } from '../systems/LODManager';

// Globe configuration
const GLOBE_RADIUS = 5;
const MIN_ALTITUDE = 0.15;
const TRANSITION_DURATION = 0.5; // seconds

interface CameraControllerProps {
  onZoomChange?: (altitude: number) => void;
}

export const CameraController: React.FC<CameraControllerProps> = ({ onZoomChange }) => {
  const controlsRef = useRef<any>(null);
  const { camera, gl } = useThree();

  // Physics system
  const physicsRef = useRef(new GlobePhysics(DEFAULT_GLOBE_PHYSICS_CONFIG));

  // Mode tracking
  const currentModeRef = useRef<LODLevel>('GLOBE');
  const isTransitioningRef = useRef(false);

  // Surface target for non-globe modes
  const surfaceTargetRef = useRef(new THREE.Vector3(0, 0, GLOBE_RADIUS));

  // GSAP timeline reference for cleanup
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  // LOD store actions
  const { checkAndUpdateLOD, startTransition, endTransition } = useLODStore();

  // Transition between camera modes using GSAP
  const transitionToMode = useCallback((fromMode: LODLevel, toMode: LODLevel) => {
    if (isTransitioningRef.current) return;

    const controls = controlsRef.current;
    if (!controls) return;

    isTransitioningRef.current = true;

    // Kill any existing timeline
    if (timelineRef.current) {
      timelineRef.current.kill();
    }

    const fromConfig = LOD_CONFIGS[fromMode];
    const toConfig = LOD_CONFIGS[toMode];

    // Create GSAP timeline for coordinated animations
    const tl = gsap.timeline({
      onComplete: () => {
        isTransitioningRef.current = false;
        currentModeRef.current = toMode;
        endTransition();
      },
    });

    timelineRef.current = tl;

    // Animate OrbitControls parameters
    tl.to(controls, {
      rotateSpeed: toConfig.rotateSpeed,
      zoomSpeed: toConfig.zoomSpeed,
      panSpeed: toConfig.panSpeed,
      maxPolarAngle: toConfig.maxPolarAngle,
      minPolarAngle: toConfig.minPolarAngle,
      duration: TRANSITION_DURATION,
      ease: 'power2.inOut',
    }, 0);

    // Animate camera FOV
    const perspCamera = camera as THREE.PerspectiveCamera;
    tl.to(perspCamera, {
      fov: toConfig.fov,
      duration: TRANSITION_DURATION,
      ease: 'power2.inOut',
      onUpdate: () => perspCamera.updateProjectionMatrix(),
    }, 0);

    // Handle target transition based on target modes
    if (fromConfig.targetMode !== toConfig.targetMode) {
      const currentTarget = controls.target.clone();
      let newTarget: THREE.Vector3;

      if (toConfig.targetMode === 'center') {
        // Moving to GLOBE mode - center target
        newTarget = new THREE.Vector3(0, 0, 0);
      } else {
        // Moving to surface mode - target on globe surface
        newTarget = camera.position.clone().normalize().multiplyScalar(GLOBE_RADIUS);
        surfaceTargetRef.current.copy(newTarget);
      }

      // Animate target position
      tl.to(controls.target, {
        x: newTarget.x,
        y: newTarget.y,
        z: newTarget.z,
        duration: TRANSITION_DURATION,
        ease: 'power2.inOut',
      }, 0);
    }

    // Update enablePan at midpoint of transition
    tl.call(() => {
      controls.enablePan = toConfig.enablePan;
    }, [], TRANSITION_DURATION / 2);

    // Start LOD transition in store
    startTransition(fromMode, toMode);

  }, [camera, startTransition, endTransition]);

  // Main frame loop
  useFrame(() => {
    const controls = controlsRef.current;
    if (!controls) return;

    const distance = camera.position.length();

    // === 1. COLLISION CHECK (HIGHEST PRIORITY) ===
    const physics = physicsRef.current;
    const minAllowedDistance = physics.getMinAllowedDistance();

    if (distance < minAllowedDistance) {
      // Push camera back to minimum altitude
      camera.position.normalize().multiplyScalar(minAllowedDistance);
      controls.update();
    }

    // === 2. MODE DETECTION & TRANSITION ===
    const newMode = getLODFromDistance(distance);

    if (newMode !== currentModeRef.current && !isTransitioningRef.current) {
      transitionToMode(currentModeRef.current, newMode);
    }

    // === 3. UPDATE SURFACE TARGET (for non-globe modes, only when not transitioning) ===
    const currentConfig = LOD_CONFIGS[currentModeRef.current];

    if (currentConfig.targetMode === 'surface_lock' && !isTransitioningRef.current) {
      // Calculate surface point directly under camera
      const surfacePoint = camera.position.clone().normalize().multiplyScalar(GLOBE_RADIUS);
      surfaceTargetRef.current.copy(surfacePoint);

      // Gently update target to follow surface (very subtle, no jerky movements)
      // This only happens in surface_lock mode and uses a very small factor
      controls.target.lerp(surfacePoint, 0.02);
    }

    // === 4. DYNAMIC minDistance ===
    // Update minDistance based on current mode to prevent zooming too close
    const effectiveMinDistance = currentConfig.targetMode === 'center'
      ? GLOBE_RADIUS + 1
      : minAllowedDistance;

    if (controls.minDistance !== effectiveMinDistance && !isTransitioningRef.current) {
      controls.minDistance = effectiveMinDistance;
    }

    // === 5. UPDATE CONTROLS ===
    controls.update();

    // === 6. NOTIFY PARENT ===
    if (onZoomChange) {
      onZoomChange(distance);
    }

    // === 7. UPDATE LOD STORE ===
    checkAndUpdateLOD(distance);
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
      // Initial values (GLOBE mode)
      rotateSpeed={LOD_CONFIGS.GLOBE.rotateSpeed}
      zoomSpeed={LOD_CONFIGS.GLOBE.zoomSpeed}
      panSpeed={LOD_CONFIGS.GLOBE.panSpeed}
      // Limits
      minDistance={GLOBE_RADIUS + 1}
      maxDistance={80}
      maxPolarAngle={LOD_CONFIGS.GLOBE.maxPolarAngle}
      minPolarAngle={LOD_CONFIGS.GLOBE.minPolarAngle}
      // Behavior
      enableDamping={true}
      dampingFactor={0.05}
      enablePan={false}
      screenSpacePanning={false}
      // Touch settings
      touches={{
        ONE: THREE.TOUCH.ROTATE,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
};
