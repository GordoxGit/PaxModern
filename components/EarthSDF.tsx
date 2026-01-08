import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { useLODStore, LOD_CONFIGS } from '../systems/LODManager';

// Texture paths (keeping for fallback/blending)
const TEXTURE_URLS = {
  dayMap: '/assets/textures/2k_earth_daymap.jpg',
  bumpMap: '/assets/textures/2k_earth_normal_map.jpg',
  specularMap: '/assets/textures/2k_earth_specular_map.jpg',
};

// Simplex noise GLSL code (embedded for shader)
const NOISE_GLSL = `
// Simplex 3D Noise - by Ian McEwan, Ashima Arts
vec3 mod289_3(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289_4(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289_4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289_3(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Fractal Brownian Motion
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 6; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value;
}
`;

// Vertex Shader with procedural displacement
const vertexShader = `
${NOISE_GLSL}

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying float vElevation;

uniform float uTime;
uniform float uZoomLevel;
uniform float uReliefIntensity;
uniform sampler2D uBumpMap;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;

  // Calculate elevation based on position for procedural terrain
  float elevation = 0.0;

  // Only add relief when zoomed in and relief is enabled
  if (uReliefIntensity > 0.0 && uZoomLevel < 12.0) {
    // Multi-octave noise for realistic terrain
    float noise1 = snoise(position * 2.0) * 0.5;
    float noise2 = snoise(position * 4.0) * 0.25;
    float noise3 = snoise(position * 8.0) * 0.125;
    float noise4 = snoise(position * 16.0) * 0.0625;

    // Combine noises for natural look
    float combinedNoise = noise1 + noise2 + noise3 + noise4;

    // Also read from bump map for additional detail
    float bumpHeight = texture2D(uBumpMap, uv).r;

    // Mix procedural and texture-based height
    elevation = mix(combinedNoise * 0.015, bumpHeight * 0.02, 0.5);

    // Scale by relief intensity and zoom level
    float zoomFactor = smoothstep(12.0, 3.0, uZoomLevel);
    elevation *= uReliefIntensity * zoomFactor;
  }

  vElevation = elevation;

  // Displace vertex along normal
  vec3 newPosition = position + normal * elevation;

  vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
  vViewPosition = -mvPosition.xyz;
  vWorldPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;

  gl_Position = projectionMatrix * mvPosition;
}
`;

// Fragment Shader with SDF-style procedural rendering
const fragmentShader = `
${NOISE_GLSL}

precision highp float;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldPosition;
varying vec3 vViewPosition;
varying float vElevation;

uniform float uTime;
uniform float uZoomLevel;
uniform float uPoliticalBlend;
uniform float uReliefIntensity;
uniform vec3 uSunDirection;
uniform sampler2D uDayMap;
uniform sampler2D uSpecularMap;

// === PROCEDURAL TERRAIN COLORS ===
vec3 getOceanColor(float depth) {
  vec3 shallowOcean = vec3(0.15, 0.45, 0.65);
  vec3 deepOcean = vec3(0.02, 0.12, 0.25);
  return mix(shallowOcean, deepOcean, smoothstep(0.0, -0.02, depth));
}

vec3 getTerrainColor(vec3 pos, float elevation, float latitude) {
  // Base colors for biomes
  vec3 desert = vec3(0.82, 0.71, 0.55);
  vec3 savanna = vec3(0.76, 0.70, 0.40);
  vec3 grassland = vec3(0.28, 0.55, 0.22);
  vec3 forest = vec3(0.13, 0.38, 0.15);
  vec3 taiga = vec3(0.18, 0.32, 0.22);
  vec3 tundra = vec3(0.55, 0.55, 0.50);
  vec3 snow = vec3(0.95, 0.96, 0.98);
  vec3 highland = vec3(0.45, 0.35, 0.28);
  vec3 mountain = vec3(0.55, 0.50, 0.45);

  // Absolute latitude for biome determination
  float absLat = abs(latitude);

  // Add some noise variation for natural look
  float biomeNoise = snoise(pos * 5.0) * 0.15;

  // Determine base biome from latitude
  vec3 biomeColor;

  if (absLat > 0.85) {
    // Polar - snow and ice
    biomeColor = snow;
  } else if (absLat > 0.7) {
    // Tundra
    float snowMix = smoothstep(0.7, 0.85, absLat);
    biomeColor = mix(tundra, snow, snowMix + biomeNoise);
  } else if (absLat > 0.55) {
    // Taiga/Boreal
    biomeColor = mix(taiga, tundra, smoothstep(0.55, 0.7, absLat));
  } else if (absLat > 0.35) {
    // Temperate - forests and grasslands
    float forestMix = snoise(pos * 3.0) * 0.5 + 0.5;
    biomeColor = mix(grassland, forest, forestMix);
  } else if (absLat > 0.15) {
    // Subtropical - savanna and desert transition
    float desertMix = smoothstep(0.15, 0.35, absLat);
    vec3 subtropicalBase = mix(desert, savanna, snoise(pos * 4.0) * 0.5 + 0.5);
    biomeColor = mix(subtropicalBase, grassland, desertMix);
  } else {
    // Tropical - mix of rainforest and desert
    float rainforestMix = snoise(pos * 2.5) * 0.5 + 0.5;
    biomeColor = mix(desert, forest, rainforestMix);
  }

  // Apply elevation-based modifications
  float elevNorm = smoothstep(0.0, 0.02, elevation);

  // Mountains get rocky/snowy at higher elevations
  if (elevNorm > 0.3) {
    float mountainMix = smoothstep(0.3, 0.7, elevNorm);
    biomeColor = mix(biomeColor, mountain, mountainMix * 0.7);

    // Snow caps on high mountains
    float snowLine = 0.6 - absLat * 0.3; // Snow line lower at higher latitudes
    if (elevNorm > snowLine) {
      float snowMix = smoothstep(snowLine, snowLine + 0.2, elevNorm);
      biomeColor = mix(biomeColor, snow, snowMix);
    }
  }

  // Highland coloring for mid-elevations
  if (elevNorm > 0.15 && elevNorm < 0.5) {
    float highlandMix = smoothstep(0.15, 0.3, elevNorm) * (1.0 - smoothstep(0.3, 0.5, elevNorm));
    biomeColor = mix(biomeColor, highland, highlandMix * 0.4);
  }

  return biomeColor;
}

// === SDF BORDER RENDERING ===
// This provides sharp edges at any zoom level
float sdfBorder(float dist, float thickness) {
  float edge = fwidth(dist) * 1.5;
  return smoothstep(thickness + edge, thickness - edge, dist);
}

// === LIGHTING ===
vec3 calculateLighting(vec3 baseColor, vec3 normal, vec3 viewDir, float specularStrength) {
  vec3 sunDir = normalize(uSunDirection);

  // Ambient
  float ambient = 0.35;

  // Diffuse
  float diffuse = max(dot(normal, sunDir), 0.0) * 0.65;

  // Specular (Blinn-Phong)
  vec3 halfDir = normalize(sunDir + viewDir);
  float NdotH = max(dot(normal, halfDir), 0.0);
  float specular = pow(NdotH, 64.0) * specularStrength * 0.4;

  // Fresnel rim effect for atmosphere
  float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
  vec3 atmosphere = vec3(0.4, 0.6, 1.0) * fresnel * 0.25;

  return baseColor * (ambient + diffuse) + vec3(specular) + atmosphere;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);

  // Sample satellite texture
  vec4 satellite = texture2D(uDayMap, vUv);
  vec4 specData = texture2D(uSpecularMap, vUv);

  // Determine if ocean or land based on specular map
  float isOcean = specData.r;

  // Calculate latitude from position
  float latitude = vPosition.y / length(vPosition);

  // === GENERATE BASE COLOR ===
  vec3 baseColor;

  if (isOcean > 0.5) {
    // Ocean
    baseColor = getOceanColor(vElevation);
  } else {
    // Land - blend procedural with satellite based on zoom
    vec3 proceduralColor = getTerrainColor(vPosition, vElevation, latitude);

    // At far zoom, use more satellite. At close zoom, use more procedural
    float proceduralMix = smoothstep(15.0, 5.0, uZoomLevel);
    baseColor = mix(satellite.rgb, proceduralColor, proceduralMix * 0.6);
  }

  // === POLITICAL OVERLAY ===
  // Apply subtle political tinting based on blend factor
  if (uPoliticalBlend > 0.0 && uZoomLevel < 15.0) {
    // Generate a pseudo-political color based on position
    float politicalHash = snoise(vPosition * 0.5);
    vec3 politicalTint = vec3(
      0.4 + 0.3 * sin(politicalHash * 6.28),
      0.4 + 0.3 * sin(politicalHash * 6.28 + 2.09),
      0.4 + 0.3 * sin(politicalHash * 6.28 + 4.18)
    );

    float politicalFactor = uPoliticalBlend * smoothstep(15.0, 8.0, uZoomLevel) * 0.3;
    baseColor = mix(baseColor, baseColor * 0.7 + politicalTint * 0.3, politicalFactor);
  }

  // === LIGHTING ===
  float specularStrength = isOcean > 0.5 ? specData.r : 0.1;
  vec3 litColor = calculateLighting(baseColor, normal, viewDir, specularStrength);

  // === OUTPUT ===
  gl_FragColor = vec4(litColor, 1.0);
}
`;

interface EarthSDFProps {
  lodLevel: string;
  cameraDistance: number;
}

export const EarthSDF: React.FC<EarthSDFProps> = ({ lodLevel, cameraDistance }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Get LOD features from store
  const features = useLODStore((state) => state.features);

  // Load textures
  const [dayMap, bumpMap, specMap] = useLoader(TextureLoader, [
    TEXTURE_URLS.dayMap,
    TEXTURE_URLS.bumpMap,
    TEXTURE_URLS.specularMap,
  ]);

  // Configure textures for better quality
  useMemo(() => {
    [dayMap, bumpMap, specMap].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 16;
    });
  }, [dayMap, bumpMap, specMap]);

  // Calculate sphere segments based on LOD
  const segments = useMemo(() => {
    return features.terrainSegments;
  }, [features.terrainSegments]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uDayMap: { value: dayMap },
        uBumpMap: { value: bumpMap },
        uSpecularMap: { value: specMap },
        uTime: { value: 0 },
        uZoomLevel: { value: 15 },
        uPoliticalBlend: { value: 0 },
        uReliefIntensity: { value: 0 },
        uSunDirection: { value: new THREE.Vector3(1, 0.5, 1).normalize() },
      },
      vertexShader,
      fragmentShader,
      side: THREE.FrontSide,
    });
  }, [dayMap, bumpMap, specMap]);

  // Update uniforms each frame
  useFrame((state) => {
    if (materialRef.current) {
      const mat = materialRef.current;
      mat.uniforms.uTime.value = state.clock.elapsedTime;
      mat.uniforms.uZoomLevel.value = cameraDistance;
      mat.uniforms.uPoliticalBlend.value = features.politicalOpacity;
      mat.uniforms.uReliefIntensity.value = features.reliefIntensity;
    }
  });

  // Store material reference
  useMemo(() => {
    if (material && materialRef.current !== material) {
      materialRef.current = material;
    }
  }, [material]);

  return (
    <mesh material={material} receiveShadow castShadow>
      <sphereGeometry args={[5, segments, segments]} />
    </mesh>
  );
};
