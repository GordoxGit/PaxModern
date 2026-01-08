
1. *Modify `systems/LODManager.ts`*
   - Add the `getLODFromDistance` function at the end of the file with the hysteresis logic provided in the ticket.

2. *Modify `components/ProceduralBuildings.tsx`*
   - Replace the entire content with the provided optimized code using `InstancedMesh` and logic for visibility control.

3. *Modify `components/WorldMap.tsx`*
   - Import `getLODFromDistance` and `useLODStore` from `../systems/LODManager`.
   - Update the `useFrame` logic to use `getLODFromDistance`.
   - Update `EarthSDF` to have fixed `segments={128}`.
   - Update `ProceduralBuildings` usage to pass `visible={features.showBuildings}` instead of conditional rendering, and ensure `globeRadius` is passed correctly.

4. *Complete pre commit steps*
   - Complete pre commit steps to make sure proper testing, verifications, reviews and reflections are done.

5. *Submit the change.*
