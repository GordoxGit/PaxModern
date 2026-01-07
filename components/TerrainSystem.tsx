import React, { useMemo } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const TerrainSystem = ({
  lodLevel,
  cameraDistance,
  politicalBlend = 0
}: {
  lodLevel: string;
  cameraDistance: number;
  politicalBlend?: number;
}) => {

  const [baseMap, detailMap] = useLoader(THREE.TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/terrain/grasslight-big.jpg'
  ], (loader) => loader.setCrossOrigin('anonymous'));

  useMemo(() => {
    detailMap.wrapS = detailMap.wrapT = THREE.RepeatWrapping;
    detailMap.repeat.set(50, 50);
  }, [detailMap]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uBaseTexture: { value: baseMap },
        uDetailTexture: { value: detailMap },
        uZoomLevel: { value: cameraDistance },
        uPoliticalBlend: { value: politicalBlend },
        uCountryColor: { value: new THREE.Color('#3b82f6') },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uBaseTexture;
        uniform sampler2D uDetailTexture;
        uniform float uZoomLevel;
        uniform float uPoliticalBlend;
        uniform vec3 uCountryColor;

        varying vec2 vUv;
        varying vec3 vNormal;

        void main() {
          vec4 baseColor = texture2D(uBaseTexture, vUv);
          vec4 detailColor = texture2D(uDetailTexture, vUv * 50.0);

          float detailMix = smoothstep(20.0, 5.0, uZoomLevel);

          vec4 terrainColor = mix(baseColor, baseColor * detailColor, detailMix * 0.8);

          vec3 pColor = uCountryColor;
          vec4 finalColor = mix(terrainColor, vec4(pColor, 1.0), uPoliticalBlend * 0.4);

          float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0))) * 0.5 + 0.5;

          gl_FragColor = vec4(finalColor.rgb * light, 1.0);
        }
      `
    });
  }, [baseMap, detailMap]);

  useFrame(() => {
    if (material) {
        material.uniforms.uZoomLevel.value = cameraDistance;
        material.uniforms.uPoliticalBlend.value = politicalBlend;
    }
  });

  return (
    <mesh receiveShadow castShadow material={material}>
      <sphereGeometry args={[5, 128, 128]} />
    </mesh>
  );
};

export default TerrainSystem;
