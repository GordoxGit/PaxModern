import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';

// Textures loaded from local assets (downloaded from Solar System Scope)
const TEXTURE_URLS = {
  dayMap: '/assets/textures/2k_earth_daymap.jpg',
  bumpMap: '/assets/textures/2k_earth_normal_map.jpg',
  specularMap: '/assets/textures/2k_earth_specular_map.jpg',
  clouds: '/assets/textures/2k_earth_clouds.jpg'
};

const EarthShader = {
  uniforms: {
    uDayMap: { value: null },
    uBumpMap: { value: null },
    uSpecularMap: { value: null },
    uZoomLevel: { value: 15.0 },
    uPoliticalBlend: { value: 0.0 },
    uCountryColors: { value: null },
    uTime: { value: 0.0 },
    uSunDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() }
  },

  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    uniform sampler2D uBumpMap;
    uniform float uZoomLevel;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;

      // Displacement for relief
      // Reduced displacement strength to prevent burying cities
      float displacementStrength = (1.0 - smoothstep(3.0, 12.0, uZoomLevel)) * 0.02;

      // Read height from bump map (using red channel)
      float height = texture2D(uBumpMap, uv).r;
      float displacement = height * displacementStrength;

      vec3 newPosition = position + normal * displacement;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D uDayMap;
    uniform sampler2D uSpecularMap;
    uniform float uZoomLevel;
    uniform float uPoliticalBlend;
    uniform vec3 uSunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 vViewPosition;

    void main() {
      // Base Satellite Texture
      vec4 satellite = texture2D(uDayMap, vUv);
      vec4 specData = texture2D(uSpecularMap, vUv);

      // Political Overlay (mockup)
      float politicalFactor = (1.0 - smoothstep(8.0, 15.0, uZoomLevel)) * uPoliticalBlend;

      // Simple Lighting
      vec3 normal = normalize(vNormal);
      vec3 lightDir = normalize(uSunDirection);

      float diff = max(dot(normal, lightDir), 0.1);

      // Specular
      vec3 viewDir = normalize(vViewPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float NdotH = max(dot(normal, halfDir), 0.0);
      float specular = pow(NdotH, 32.0) * specData.r * 0.25;

      vec3 finalColor = satellite.rgb * diff + vec3(specular);

      // Blend Political
      vec3 politicalColor = vec3(0.0, 0.2, 0.8);
      finalColor = mix(finalColor, finalColor * 0.5 + politicalColor * 0.5, politicalFactor * 0.3);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

interface EarthTerrainProps {
  lodLevel: string;
  cameraDistance: number;
}

export const EarthTerrain: React.FC<EarthTerrainProps> = ({ lodLevel, cameraDistance }) => {
  // Load Textures
  const [dayMap, bumpMap, specMap] = useLoader(TextureLoader, [
    TEXTURE_URLS.dayMap,
    TEXTURE_URLS.bumpMap,
    TEXTURE_URLS.specularMap
  ]);

  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const segments = useMemo(() => {
    switch (lodLevel) {
      case 'GLOBE': return 64;
      case 'CONTINENTAL': return 128;
      case 'REGIONAL': return 256;
      case 'CITY': return 512;
      default: return 64;
    }
  }, [lodLevel]);

  useFrame((state) => {
    if (materialRef.current) {
       materialRef.current.uniforms.uZoomLevel.value = cameraDistance;
       materialRef.current.uniforms.uPoliticalBlend.value = lodLevel === 'GLOBE' ? 0.0 : 1.0;
       materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.clone(EarthShader.uniforms),
      vertexShader: EarthShader.vertexShader,
      fragmentShader: EarthShader.fragmentShader
    });

    mat.uniforms.uDayMap.value = dayMap;
    mat.uniforms.uBumpMap.value = bumpMap;
    mat.uniforms.uSpecularMap.value = specMap;

    return mat;
  }, [dayMap, bumpMap, specMap]);

  return (
    <mesh receiveShadow castShadow material={material} rotation={[0, 0, 0]}>
      <sphereGeometry args={[5, segments, segments]} />
    </mesh>
  );
};
