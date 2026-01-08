import * as THREE from 'three';

export interface GlobePhysicsConfig {
  globeRadius: number;
  minAltitude: number; // Minimum distance above the surface
  collisionResponse: 'clamp' | 'bounce' | 'slide';
}

/**
 * GlobePhysics - Prevents camera from traversing the globe surface
 * Uses spherical collision detection with configurable minimum altitude
 */
export class GlobePhysics {
  private config: GlobePhysicsConfig;
  private globeCenter: THREE.Vector3;

  constructor(config: GlobePhysicsConfig) {
    this.config = config;
    this.globeCenter = new THREE.Vector3(0, 0, 0);
  }

  /**
   * Get minimum allowed distance from globe center
   */
  getMinAllowedDistance(): number {
    return this.config.globeRadius + this.config.minAltitude;
  }

  /**
   * Check if position is inside the collision boundary
   */
  isInsideCollisionBoundary(position: THREE.Vector3): boolean {
    return position.length() < this.getMinAllowedDistance();
  }

  /**
   * Enforce collision - clamps camera position to stay outside the globe
   * @returns true if collision was detected and corrected
   */
  enforceCollision(camera: THREE.Camera, controls?: any): boolean {
    const cameraPos = camera.position;
    const distanceFromCenter = cameraPos.length();
    const minAllowedDistance = this.getMinAllowedDistance();

    // Check for collision
    if (distanceFromCenter < minAllowedDistance) {
      // Push camera back to surface + minimum altitude
      const direction = cameraPos.clone().normalize();
      const newPosition = direction.multiplyScalar(minAllowedDistance);

      camera.position.copy(newPosition);

      // Update OrbitControls if provided
      if (controls) {
        controls.minDistance = Math.max(controls.minDistance, minAllowedDistance);
        controls.update();
      }

      return true;
    }

    return false;
  }

  /**
   * Calculate altitude above the globe surface
   */
  getAltitude(position: THREE.Vector3): number {
    return position.length() - this.config.globeRadius;
  }

  /**
   * Get the surface point directly below a position
   */
  getSurfacePoint(position: THREE.Vector3): THREE.Vector3 {
    return position.clone().normalize().multiplyScalar(this.config.globeRadius);
  }

  /**
   * Get the surface normal at a given position (always pointing outward from center)
   */
  getSurfaceNormal(position: THREE.Vector3): THREE.Vector3 {
    return position.clone().normalize();
  }

  /**
   * Raycast from a point in a direction to find intersection with globe surface
   * Uses ray-sphere intersection formula
   */
  raycastToSurface(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Vector3 | null {
    const d = direction.clone().normalize();
    const o = origin.clone();
    const r = this.config.globeRadius;

    // Ray-sphere intersection: |o + td|^2 = r^2
    // t^2(d.d) + 2t(o.d) + (o.o - r^2) = 0
    const a = d.dot(d);
    const b = 2 * o.dot(d);
    const c = o.dot(o) - r * r;

    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return null;

    // Find the nearest positive intersection
    const sqrtDisc = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDisc) / (2 * a);
    const t2 = (-b + sqrtDisc) / (2 * a);

    const t = t1 > 0 ? t1 : (t2 > 0 ? t2 : null);

    if (t === null) return null;

    return o.add(d.multiplyScalar(t));
  }

  /**
   * Get lat/lon coordinates from a 3D position
   */
  positionToLatLon(position: THREE.Vector3): { lat: number; lon: number } {
    const normalized = position.clone().normalize();

    // Convert from cartesian to spherical
    const lat = 90 - Math.acos(normalized.y) * (180 / Math.PI);
    const lon = Math.atan2(normalized.z, -normalized.x) * (180 / Math.PI) - 180;

    return { lat, lon: lon > 180 ? lon - 360 : (lon < -180 ? lon + 360 : lon) };
  }

  /**
   * Calculate great circle distance between two points on the surface
   */
  greatCircleDistance(pos1: THREE.Vector3, pos2: THREE.Vector3): number {
    const n1 = pos1.clone().normalize();
    const n2 = pos2.clone().normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, n1.dot(n2))));
    return angle * this.config.globeRadius;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<GlobePhysicsConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): GlobePhysicsConfig {
    return { ...this.config };
  }
}

// Default configuration
export const DEFAULT_GLOBE_PHYSICS_CONFIG: GlobePhysicsConfig = {
  globeRadius: 5,
  minAltitude: 0.15, // Stay at least 0.15 units above surface
  collisionResponse: 'clamp'
};

// Singleton instance for global access
let globePhysicsInstance: GlobePhysics | null = null;

/**
 * Get or create the global GlobePhysics instance
 */
export function getGlobePhysics(config?: GlobePhysicsConfig): GlobePhysics {
  if (!globePhysicsInstance) {
    globePhysicsInstance = new GlobePhysics(config || DEFAULT_GLOBE_PHYSICS_CONFIG);
  }
  return globePhysicsInstance;
}

/**
 * Reset the global GlobePhysics instance (useful for testing)
 */
export function resetGlobePhysics(): void {
  globePhysicsInstance = null;
}
