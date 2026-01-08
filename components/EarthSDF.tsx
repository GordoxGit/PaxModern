// EarthSDF.tsx - Globe avec rendu SDF procédural
import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { Country } from '../types';

// Simplex Noise GLSL embedded
const noiseGLSL = `
// Simplex 3D Noise
// by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){
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

  //  x0 = x0 - 0.0 + 0.0 * C
  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

// Permutations
  i = mod(i, 289.0 );
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

// Gradients
  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);  //  mod(p,N*N)

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
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                dot(p2,x2), dot(p3,x3) ) );
}
`;

// Shader Vertex
const vertexShader = `
  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vElevation;

  uniform float uTime;
  uniform float uZoomLevel;

  // Simplex noise pour relief procédural
  ${noiseGLSL}

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    // Élévation procédurale basée sur position (montagnes, océans)
    float elevation = 0.0;

    // Seulement ajouter du relief quand zoomé
    if (uZoomLevel < 10.0) {
      // Bruit multi-octaves pour terrain réaliste
      float noise1 = snoise(position * 2.0) * 0.5;
      float noise2 = snoise(position * 4.0) * 0.25;
      float noise3 = snoise(position * 8.0) * 0.125;
      elevation = (noise1 + noise2 + noise3) * 0.02;

      // Plus de relief quand plus zoomé
      elevation *= smoothstep(10.0, 3.0, uZoomLevel);
    }

    vElevation = elevation;
    vPosition = position;

    // Déplacer le vertex selon l'élévation
    vec3 newPosition = position + normal * elevation;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Shader Fragment - Rendu SDF
const fragmentShader = `
  precision highp float;

  varying vec2 vUv;
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vElevation;

  uniform float uTime;
  uniform float uZoomLevel;
  uniform vec3 uSunDirection;
  uniform float uPoliticalBlend;

  // Données des pays (passées via texture ou uniforms)
  uniform sampler2D uCountryData; // Texture encodant les IDs pays
  uniform sampler2D uCountryColors; // Palette de couleurs pays

  // === FONCTIONS SDF ===

  // Distance à un segment de ligne (pour frontières)
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  // Frontière nette à n'importe quel zoom grâce à fwidth()
  float borderSDF(float dist, float thickness) {
    float edge = fwidth(dist) * 1.5; // Anti-aliasing automatique
    return smoothstep(thickness + edge, thickness - edge, dist);
  }

  // === COULEURS TERRAIN PROCÉDURALES ===

  vec3 getTerrainColor(vec3 pos, float elevation) {
    // Latitude pour biomes
    float latitude = abs(pos.y);

    // Couleurs de base
    vec3 ocean = vec3(0.0, 0.2, 0.4);
    vec3 coast = vec3(0.76, 0.70, 0.50); // Sable
    vec3 lowland = vec3(0.13, 0.55, 0.13); // Vert plaine
    vec3 highland = vec3(0.36, 0.25, 0.20); // Marron montagne
    vec3 snow = vec3(0.95, 0.95, 0.98);
    vec3 desert = vec3(0.82, 0.71, 0.55);

    vec3 color;

    // Océan (élévation négative)
    if (elevation < -0.001) {
      float depth = smoothstep(0.0, -0.02, elevation);
      color = mix(vec3(0.1, 0.3, 0.5), ocean, depth);
    }
    // Terre
    else {
      // Biome basé sur latitude
      float desertFactor = smoothstep(0.15, 0.35, latitude) * (1.0 - smoothstep(0.35, 0.5, latitude));

      // Élévation
      float elevNorm = smoothstep(0.0, 0.02, elevation);

      // Mix des couleurs
      color = mix(lowland, highland, elevNorm);
      color = mix(color, desert, desertFactor * 0.7);

      // Neige aux pôles et sommets
      float snowFactor = smoothstep(0.7, 0.9, latitude) + smoothstep(0.015, 0.02, elevation);
      color = mix(color, snow, clamp(snowFactor, 0.0, 1.0));
    }

    return color;
  }

  // === ÉCLAIRAGE ===

  vec3 calculateLighting(vec3 baseColor, vec3 normal, vec3 sunDir) {
    float ambient = 0.3;
    float diffuse = max(dot(normal, sunDir), 0.0) * 0.7;

    // Fresnel pour effet atmosphérique
    vec3 viewDir = normalize(-vPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.0);
    vec3 atmosphere = vec3(0.4, 0.6, 1.0) * fresnel * 0.3;

    return baseColor * (ambient + diffuse) + atmosphere;
  }

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 sunDir = normalize(uSunDirection);

    // Couleur terrain procédurale
    vec3 terrainColor = getTerrainColor(vPosition, vElevation);

    // Récupérer ID pays depuis texture de données
    vec4 countryData = texture2D(uCountryData, vUv);
    float countryId = countryData.r * 255.0;

    // Couleur politique du pays
    vec2 paletteUV = vec2(countryId / 256.0, 0.5);
    vec3 politicalColor = texture2D(uCountryColors, paletteUV).rgb;

    // Blend terrain/politique selon zoom
    float politicalFactor = uPoliticalBlend * smoothstep(15.0, 8.0, uZoomLevel);
    vec3 baseColor = mix(terrainColor, politicalColor, politicalFactor * 0.6);

    // Distance aux frontières (encodée dans alpha de countryData)
    // NOTE: Si SDF non disponible, alpha = 1.0 donc pas de bordure shader
    float borderDist = countryData.a;

    // Frontières SDF - épaisseur adaptative au zoom
    float borderThickness = 0.002 * uZoomLevel;
    float border = borderSDF(borderDist, borderThickness);

    // Couleur frontière (vert Pax Modern)
    vec3 borderColor = vec3(0.29, 0.87, 0.5); // #4ade80

    // Appliquer frontière
    baseColor = mix(baseColor, borderColor, border * smoothstep(3.0, 8.0, uZoomLevel));

    // Éclairage final
    vec3 finalColor = calculateLighting(baseColor, normal, sunDir);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

interface EarthSDFProps {
  radius?: number;
  segments?: number;
  countries: Country[];
}

export function EarthSDF({ radius = 5, segments = 256, countries }: EarthSDFProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Charger GeoJSON pour la génération de texture
  const geoJsonData = useLoader(THREE.FileLoader, '/assets/countries.geo.json', (loader) => {
    loader.setResponseType('json');
  });

  const [textures, setTextures] = useState<{data: THREE.Texture, colors: THREE.Texture} | null>(null);

  useEffect(() => {
    if (geoJsonData && countries.length > 0) {
        // geoJsonData is already an object because of setResponseType('json')
        const { countryDataTexture, countryColorsTexture } = generateCountryTextures(countries, geoJsonData);
        setTextures({ data: countryDataTexture, colors: countryColorsTexture });
    }
  }, [countries, geoJsonData]);

  // Uniforms
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uZoomLevel: { value: 20 },
    uSunDirection: { value: new THREE.Vector3(1, 0.5, 0.5).normalize() },
    uPoliticalBlend: { value: 0.5 },
    uCountryData: { value: new THREE.Texture() },
    uCountryColors: { value: new THREE.Texture() },
  }), []);

  useEffect(() => {
    if (textures && materialRef.current) {
        materialRef.current.uniforms.uCountryData.value = textures.data;
        materialRef.current.uniforms.uCountryColors.value = textures.colors;
        materialRef.current.needsUpdate = true;
    }
  }, [textures]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;

      // Distance caméra pour LOD
      const distance = state.camera.position.length();
      materialRef.current.uniforms.uZoomLevel.value = distance;
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[radius, segments, segments]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Générer textures depuis GeoJSON avec Canvas 2D (Optimisé)
function generateCountryTextures(countries: Country[], geoJson: any) {
  const width = 4096; // Haute résolution
  const height = 2048;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error("Could not get 2D context");

  // Fond: Océan (ID 255)
  ctx.fillStyle = 'rgb(255, 0, 0)';
  ctx.fillRect(0, 0, width, height);

  // Map country name/id to index
  const countryMap = new Map();
  countries.forEach((c, i) => {
      // Use name or ID to match GeoJSON features
      countryMap.set(c.id, i);
      // Also map names just in case
      countryMap.set(c.name, i);
      if(c.name_fr) countryMap.set(c.name_fr, i);
  });

  // Dessiner les pays
  geoJson.features.forEach((feature: any) => {
      const countryName = feature.properties.name || feature.properties.ADMIN || feature.id;
      // Simple matching - in real app might need better ID matching
      // We try to find a matching country in our game state
      let countryIndex = -1;

      // Try to find by ID/Name logic
      // This part depends on how GeoJSON properties match Country IDs
      // For now, we assume simple matching or fallback

      // FIXME: Matching logic needs to be robust.
      // Assuming feature.id matches country.id or feature.properties.name matches country.name
      const match = countries.find(c => c.name === countryName || c.id === feature.id);
      if (match) {
          countryIndex = countries.indexOf(match);
      }

      if (countryIndex !== -1) {
          ctx.fillStyle = `rgb(${countryIndex % 256}, 0, 0)`;

          const drawPoly = (rings: any[]) => {
              ctx.beginPath();
              rings.forEach((ring: any[], rIndex: number) => {
                  ring.forEach((coord: number[], cIndex: number) => {
                      // Convert Geo coords to Pixel coords
                      // Lon: -180 to 180 -> 0 to width
                      // Lat: -90 to 90 -> height to 0 (y inverted)
                      const x = ((coord[0] + 180) / 360) * width;
                      const y = ((90 - coord[1]) / 180) * height; // Inverted Y for Canvas

                      if (cIndex === 0) ctx.moveTo(x, y);
                      else ctx.lineTo(x, y);
                  });
                  if (rIndex === 0) ctx.closePath(); // Outer ring
              });
              ctx.fill();
          };

          if (feature.geometry.type === 'Polygon') {
              drawPoly(feature.geometry.coordinates);
          } else if (feature.geometry.type === 'MultiPolygon') {
              feature.geometry.coordinates.forEach((poly: any) => drawPoly(poly));
          }
      }
  });

  const countryDataTexture = new THREE.CanvasTexture(canvas);
  countryDataTexture.minFilter = THREE.LinearFilter;
  countryDataTexture.magFilter = THREE.LinearFilter;
  countryDataTexture.needsUpdate = true;

  // Texture palette de couleurs (256 couleurs)
  const paletteData = new Uint8Array(256 * 4);
  // Initialiser avec transparence/noir
  for(let i=0; i<256*4; i++) paletteData[i] = 0;

  countries.forEach((country, i) => {
    // Default color if not specified
    const colorHex = (country as any).color || '#ffffff';
    const color = hexToRgb(colorHex);
    const idx = (i % 256) * 4;
    paletteData[idx] = color.r;
    paletteData[idx + 1] = color.g;
    paletteData[idx + 2] = color.b;
    paletteData[idx + 3] = 255;
  });

  const countryColorsTexture = new THREE.DataTexture(paletteData, 256, 1);
  countryColorsTexture.needsUpdate = true;

  return { countryDataTexture, countryColorsTexture };
}
