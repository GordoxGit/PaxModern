// GlobePhysics.ts - Empêcher la caméra de traverser le globe
import * as THREE from 'three';
import { useRef } from 'react';

export interface GlobePhysicsConfig {
  globeRadius: number;
  minAltitude: number; // Distance minimum au-dessus de la surface
  collisionResponse: 'clamp' | 'bounce' | 'slide';
}

export class GlobePhysics {
  public config: GlobePhysicsConfig;
  private globeCenter: THREE.Vector3;

  constructor(config: GlobePhysicsConfig) {
    this.config = config;
    this.globeCenter = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Vérifie et corrige la position de la caméra
   * @returns true si collision détectée et corrigée
   */
  enforceCollision(camera: THREE.Camera, controls: any): boolean {
    const cameraPos = camera.position.clone();
    const distanceFromCenter = cameraPos.length();
    const minAllowedDistance = this.config.globeRadius + this.config.minAltitude;

    // Collision détectée ?
    if (distanceFromCenter < minAllowedDistance) {
      // Repousser la caméra à la surface + altitude minimum
      const direction = cameraPos.normalize();
      const newPosition = direction.multiplyScalar(minAllowedDistance);

      camera.position.copy(newPosition);

      // Mettre à jour OrbitControls
      if (controls) {
        controls.minDistance = minAllowedDistance;
        controls.update();
      }

      return true;
    }

    return false;
  }

  /**
   * Calcule l'altitude au-dessus de la surface du globe
   */
  getAltitude(position: THREE.Vector3): number {
    return position.length() - this.config.globeRadius;
  }

  /**
   * Obtient le point de surface le plus proche
   */
  getSurfacePoint(position: THREE.Vector3): THREE.Vector3 {
    return position.clone().normalize().multiplyScalar(this.config.globeRadius);
  }

  /**
   * Calcule la normale à la surface au point donné
   */
  getSurfaceNormal(position: THREE.Vector3): THREE.Vector3 {
    return position.clone().normalize();
  }

  /**
   * Raycasting vers la surface du globe
   */
  raycastToSurface(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Vector3 | null {
    // Intersection rayon-sphère
    const a = direction.dot(direction);
    const b = 2 * origin.dot(direction);
    const c = origin.dot(origin) - this.config.globeRadius * this.config.globeRadius;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    const t = (-b - Math.sqrt(discriminant)) / (2 * a);

    if (t < 0) return null;

    return origin.clone().add(direction.clone().multiplyScalar(t));
  }
}

// Hook React pour utiliser la physique
export function useGlobePhysics(config: GlobePhysicsConfig) {
  const physicsRef = useRef(new GlobePhysics(config));

  return physicsRef.current;
}
