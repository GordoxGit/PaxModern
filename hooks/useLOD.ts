import { useState, useCallback, useRef } from 'react';
import { getLODLevel, LODLevel, getLODFeatures, LODFeatures } from '../systems/LODManager';

export const useLOD = (initialDistance: number = 15) => {
  const [currentLOD, setCurrentLOD] = useState<LODLevel>(getLODLevel(initialDistance));
  const [features, setFeatures] = useState<LODFeatures>(getLODFeatures(getLODLevel(initialDistance)));

  const lastLODRef = useRef<LODLevel>(getLODLevel(initialDistance));

  const updateLOD = useCallback((distance: number) => {
    const newLOD = getLODLevel(distance);
    if (newLOD !== lastLODRef.current) {
      lastLODRef.current = newLOD;
      setCurrentLOD(newLOD);
      setFeatures(getLODFeatures(newLOD));
    }
  }, []);

  return { currentLOD, features, updateLOD };
};
