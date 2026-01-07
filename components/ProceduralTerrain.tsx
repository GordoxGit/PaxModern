import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// GLSL Noise functions (Simplex 3D)
const noiseCommon = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    //   x0 = x0 - 0.0 + 0.0 * C.xxx;
    //   x1 = x0 - i1  + 1.0 * C.xxx;
    //   x2 = x0 - i2  + 2.0 * C.xxx;
    //   x3 = x0 - 1.0 + 3.0 * C.xxx;
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
    vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a square, mapped onto an octahedron.
    // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
    float n_ = 0.142857142857; // 1.0/7.0
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);

    //Normalise gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 105.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                  dot(p2,x2), dot(p3,x3) ) );
  }

  // FBM (Fractal Brownian Motion) for detailing
  float fbm(vec3 x, int octaves) {
    float v = 0.0;
    float a = 0.5;
    vec3 shift = vec3(100.0);
    for (int i = 0; i < octaves; ++i) {
      v += a * snoise(x);
      x = x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
`;

const vertexShader = `
  uniform float uTime;
  uniform float uZoomLevel;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vElevation;
  varying vec3 vPosition;

  ${noiseCommon}

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;

    // Base radius
    float radius = 5.0;

    // Calculate noise for terrain height
    // Detail increases as we zoom in (uZoomLevel gets smaller)
    float scale = 2.0;
    float noiseVal = 0.0;

    // Low frequency noise (continents/mountains)
    noiseVal += snoise(position * scale) * 0.1;

    // Higher frequency for details
    noiseVal += snoise(position * scale * 4.0) * 0.05;

    // Apply elevation only on "land" (positive noise) to simulate oceans
    // Simple ocean threshold
    float elevation = max(0.0, noiseVal);

    vElevation = elevation;

    // Displace vertex along normal
    // Factor determines mountain height
    float heightFactor = 0.25; // Reduced from 0.5 to prevent buildings from being buried
    vec3 newPosition = position + normal * (elevation * heightFactor);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform float uZoomLevel;
  uniform float uPoliticalBlend;
  uniform vec3 uCountryColor;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying float vElevation;
  varying vec3 vPosition;

  ${noiseCommon}

  void main() {
    // Basic colors
    vec3 oceanColor = vec3(0.0, 0.2, 0.5);
    vec3 deepOceanColor = vec3(0.0, 0.05, 0.2);
    vec3 grassColor = vec3(0.1, 0.5, 0.1);
    vec3 sandColor = vec3(0.76, 0.7, 0.5);
    vec3 mountainColor = vec3(0.5, 0.5, 0.5);
    vec3 snowColor = vec3(1.0, 1.0, 1.0);

    // Procedural texture generation based on position/noise
    float noiseDetail = fbm(vPosition * 10.0, 4);

    // Mix ocean colors
    vec3 finalColor = mix(deepOceanColor, oceanColor, smoothstep(-0.1, 0.0, vElevation));

    // Land coloring based on elevation
    if (vElevation > 0.0) {
       if (vElevation < 0.02) {
          finalColor = sandColor; // Beach
       } else if (vElevation < 0.25) {
          finalColor = mix(grassColor, grassColor * 0.8, noiseDetail); // Grass with variation
       } else if (vElevation < 0.45) {
          finalColor = mix(mountainColor, mountainColor * 0.9, noiseDetail); // Mountain
       } else {
          finalColor = snowColor; // Snow cap
       }
    }

    // Political Overlay blending
    // If uPoliticalBlend is 1, we show country colors
    vec3 pColor = uCountryColor;
    finalColor = mix(finalColor, pColor, uPoliticalBlend * 0.6); // 60% opacity for political map

    // Simple lighting (lambert-ish)
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);
    vec3 ambient = vec3(0.3);

    vec3 lighting = ambient + diff;

    gl_FragColor = vec4(finalColor * lighting, 1.0);
  }
`;

export const ProceduralTerrain: React.FC<{
  lodLevel: string;
  cameraDistance: number;
  politicalBlend?: number;
}> = ({ lodLevel, cameraDistance, politicalBlend = 0 }) => {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Dynamic tessellation based on LOD
  const segments = useMemo(() => {
    switch (lodLevel) {
      case 'GLOBE': return 128;
      case 'REGIONAL': return 256;
      case 'CITY_BUILDER': return 512;
      default: return 128;
    }
  }, [lodLevel]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uZoomLevel.value = cameraDistance;
      materialRef.current.uniforms.uPoliticalBlend.value = politicalBlend;
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uZoomLevel: { value: cameraDistance },
        uPoliticalBlend: { value: politicalBlend },
        uCountryColor: { value: new THREE.Color('#3b82f6') }, // Default blue, should be dynamic per country if possible
        uTime: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      // wireframe: lodLevel === 'CITY_BUILDER' // Debug: see mesh density
    });
  }, []);

  return (
    <mesh receiveShadow castShadow material={material}>
      <sphereGeometry args={[5, segments, segments]} />
    </mesh>
  );
};
