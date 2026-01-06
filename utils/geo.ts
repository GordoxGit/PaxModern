import * as THREE from 'three';

export const latLngToVector3 = (lat: number, lng: number, radius: number): THREE.Vector3 => {
  // Conversion Lat/Lng vers Coordonnées Sphériques
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180); // +180 pour aligner avec la texture NASA

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));

  return new THREE.Vector3(x, y, z);
};
