import { createContext, useContext, useLayoutEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Box3, Vector3 } from 'three';

const VIEW_TARGET_SIZE = 1.45;
const VIEW_MARGIN = 1.28;
const bounds = new Box3();
const center = new Vector3();
const dimensions = new Vector3();

const FitRevisionContext = createContext(0);

export function useFitRevision() {
  return useContext(FitRevisionContext);
}

export function FitToView({ modelKey, onBoundsReady, children }) {
  const { camera, size, invalidate } = useThree();
  const scalerRef = useRef(null);
  const centeringRef = useRef(null);
  const contentRef = useRef(null);
  const [revision, setRevision] = useState(0);

  useLayoutEffect(() => {
    const scaler = scalerRef.current;
    const centering = centeringRef.current;
    const content = contentRef.current;

    if (!scaler || !centering || !content) {
      return;
    }

    bounds.setFromObject(content);
    bounds.getCenter(center);
    bounds.getSize(dimensions);

    centering.position.set(-center.x, -center.y, -center.z);

    const longest = Math.max(dimensions.x, dimensions.y, dimensions.z);
    const uniformScale = longest > 0 ? VIEW_TARGET_SIZE / longest : 1;
    scaler.scale.setScalar(uniformScale);

    if (onBoundsReady) {
      scaler.updateWorldMatrix(true, true);
      bounds.setFromObject(scaler);
      bounds.getCenter(center);
      bounds.getSize(dimensions);

      const side = Math.max(dimensions.x, dimensions.y, dimensions.z);
      const heightDistance = side / (2 * Math.tan((Math.PI * camera.fov) / 360));
      const widthDistance = heightDistance / (size.width / size.height);

      onBoundsReady({
        center: center.clone(),
        size: dimensions.clone(),
        distance: VIEW_MARGIN * Math.max(heightDistance, widthDistance),
      });
    }

    setRevision((value) => value + 1);
    invalidate();
  }, [camera.fov, invalidate, modelKey, onBoundsReady, size.height, size.width]);

  return (
    <FitRevisionContext.Provider value={revision}>
      <group ref={scalerRef}>
        <group ref={centeringRef}>
          <group ref={contentRef}>{children}</group>
        </group>
      </group>
    </FitRevisionContext.Provider>
  );
}
