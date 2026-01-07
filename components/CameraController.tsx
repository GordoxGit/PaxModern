import React, { useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// --- CONFIGURATION ---

type CameraMode = 'GLOBE' | 'CONTINENTAL' | 'REGIONAL' | 'CITY_BUILDER';

const CAMERA_MODES = {
  GLOBE: {
    rotateSpeed: 0.8,
    zoomSpeed: 1.2,
    panSpeed: 0,
    enablePan: false,
    maxPolarAngle: Math.PI * 0.85,
    minPolarAngle: Math.PI * 0.15,
    fov: 45,
    minDistance: 1.0 // FIXED: Lowered to allow seamless transition
  },
  CONTINENTAL: {
    rotateSpeed: 0.5,
    zoomSpeed: 1.0,
    panSpeed: 0.3,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.85,
    minPolarAngle: Math.PI * 0.15,
    fov: 50,
    minDistance: 1.0
  },
  REGIONAL: {
    rotateSpeed: 0.3,
    zoomSpeed: 0.8,
    panSpeed: 0.6,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.9,
    minPolarAngle: Math.PI * 0.1,
    fov: 55,
    minDistance: 0.5
  },
  CITY_BUILDER: {
    rotateSpeed: 0.2,
    zoomSpeed: 0.5,
    panSpeed: 1.0,
    enablePan: true,
    maxPolarAngle: Math.PI * 0.97, // Horizon view allowed
    minPolarAngle: 0.1,
    fov: 60,
    minDistance: 0.5
  }
};

interface CameraControllerProps {
  onZoomChange?: (altitude: number) => void;
}

export const CameraController: React.FC<CameraControllerProps> = ({ onZoomChange }) => {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  // State for mode management
  const currentModeRef = useRef<CameraMode>('GLOBE');

  // Transition management
  const transitionRef = useRef({
    active: false,
    startTime: 0,
    duration: 0.8, // seconds
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
  });

  // Calculate current mode based on distance
  const getMode = (distance: number): CameraMode => {
    if (distance > 12) return 'GLOBE';
    if (distance > 6) return 'CONTINENTAL';
    if (distance > 3) return 'REGIONAL';
    return 'CITY_BUILDER';
  };

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    // 1. Calculate real distance
    const distanceToCenter = camera.position.length();

    // Notify parent
    if (onZoomChange) {
      onZoomChange(distanceToCenter);
    }

    const newMode = getMode(distanceToCenter);

    // 2. Handle Mode Transitions
    if (newMode !== currentModeRef.current) {
      // Trigger transition logic
      const prevMode = currentModeRef.current;
      currentModeRef.current = newMode;

      // Handle Target Transition
      // If going from GLOBE (Fixed target) to OTHERS (Pan enabled) -> Move target to surface
      // If going from OTHERS to GLOBE -> Move target back to center

      const isEnteringGlobe = newMode === 'GLOBE';
      const isLeavingGlobe = prevMode === 'GLOBE';

      if (isEnteringGlobe || isLeavingGlobe) {
        transitionRef.current.active = true;
        transitionRef.current.startTime = state.clock.elapsedTime;
        transitionRef.current.startTarget.copy(controls.target);

        if (isEnteringGlobe) {
           transitionRef.current.endTarget.set(0, 0, 0);
        } else {
           // Leaving globe: Set target to the surface point directly under camera (or forward)
           // Project camera vector to surface radius (approx 5)
           const surfacePoint = camera.position.clone().normalize().multiplyScalar(5);
           transitionRef.current.endTarget.copy(surfacePoint);
        }
      }
    }

    // 3. Apply Transitions (Target)
    if (transitionRef.current.active) {
       const elapsed = state.clock.elapsedTime - transitionRef.current.startTime;
       const progress = Math.min(elapsed / transitionRef.current.duration, 1.0);

       // EaseInOutQuad
       const ease = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;

       // Interpolate Target
       controls.target.lerpVectors(
         transitionRef.current.startTarget,
         transitionRef.current.endTarget,
         ease
       );

       // If finished
       if (progress >= 1.0) {
         transitionRef.current.active = false;
         // Ensure exact end value
         controls.target.copy(transitionRef.current.endTarget);
       }
    }

    // 4. Apply Mode Parameters (Smoothly blend FOV)
    const params = CAMERA_MODES[currentModeRef.current];

    // Smoothly interpolate parameters to avoid jumps
    controls.rotateSpeed = THREE.MathUtils.lerp(controls.rotateSpeed, params.rotateSpeed, 0.1);
    controls.zoomSpeed = THREE.MathUtils.lerp(controls.zoomSpeed, params.zoomSpeed, 0.1);
    controls.panSpeed = THREE.MathUtils.lerp(controls.panSpeed, params.panSpeed, 0.1);

    // Set booleans directly
    controls.enablePan = params.enablePan;

    // Angles need smooth lerp too
    controls.maxPolarAngle = THREE.MathUtils.lerp(controls.maxPolarAngle, params.maxPolarAngle, 0.05);
    controls.minPolarAngle = THREE.MathUtils.lerp(controls.minPolarAngle, params.minPolarAngle, 0.05);

    // FOV Animation
    if (camera instanceof THREE.PerspectiveCamera) {
      // Smoothly move FOV to target FOV
      camera.fov = THREE.MathUtils.lerp(camera.fov, params.fov, 0.05);
      camera.updateProjectionMatrix();
    }

    // 5. Dynamic MinDistance
    // FIXED: Use a lower minDistance everywhere to allow seamless zoom.
    // The previous logic clamped it to 12.1 in GLOBE mode which prevented zooming in.
    // Now we just keep it low (0.5 or 1.0) and let the user fly.
    // However, if we want to force "Globe View" to be far, we rely on the visual cues, not a hard clamp that traps them.
    // We can gently nudge it, but 12.1 was too aggressive.

    controls.minDistance = THREE.MathUtils.lerp(controls.minDistance, params.minDistance, 0.1);

    controls.update();
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping={true}
      dampingFactor={0.1}
      maxDistance={80}
      enablePan={false}
      minDistance={1.0} // Start low to avoid initial trap
    />
  );
};
