import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import { useControls } from 'leva';
import { getGarmentModelId } from '../redux/slices/garmentSlice';
import { getIsEditMode, getIsInteracting } from '../redux/slices/editorSlice';
import { STUDIO_CAMERA_RESET, STUDIO_EXPORT } from '../app/studioEvents';
import { exportScenePng } from './exportRender';
import {
  DEFAULT_SHADOW_LAYOUT,
  placeCameraForFrontView,
  shadowLayoutFromFit,
} from './fitCamera';
import { GarmentModel } from './GarmentModel';

function resolveBackgroundColor(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value && 'a' in value) {
    return `rgba(${value.r * 255}, ${value.g * 255}, ${value.b * 255}, ${value.a})`;
  }

  if (value) {
    return `rgb(${value.r * 255}, ${value.g * 255}, ${value.b * 255})`;
  }

  return '#333333';
}

export function ViewerScene() {
  const modelId = useSelector(getGarmentModelId);
  const editMode = useSelector(getIsEditMode);
  const interacting = useSelector(getIsInteracting);

  const { gl, camera, scene, controls } = useThree();
  const shadowGroupRef = useRef();
  const lastFitRef = useRef(null);
  const framedModelRef = useRef(null);

  const [shadowLayout, setShadowLayout] = useState(DEFAULT_SHADOW_LAYOUT);

  const backdrop = useControls(
    'Background Setting',
    {
      color: '#333333',
      Background: true,
      'Export Scale': {
        value: 3,
        min: 2,
        max: 4,
        step: 0.5,
      },
    },
    { collapsed: false }
  );

  const backgroundColor = useMemo(
    () => resolveBackgroundColor(backdrop.color),
    [backdrop.color]
  );

  const runExport = useCallback(async () => {
    exportScenePng({
      gl,
      scene,
      camera,
      contactShadowRef: shadowGroupRef,
      includeBackground: backdrop.Background,
      backgroundColor,
      exportScale: backdrop['Export Scale'],
    });
  }, [backdrop, backgroundColor, camera, gl, scene]);

  useEffect(() => {
    const onExport = async (event) => {
      const callbacks = event.detail || {};

      try {
        callbacks.onStart?.();
        await runExport();
        callbacks.onComplete?.();
      } catch (error) {
        callbacks.onError?.(error);
        console.error('PNG export failed:', error);
      }
    };

    window.addEventListener(STUDIO_EXPORT, onExport);
    return () => window.removeEventListener(STUDIO_EXPORT, onExport);
  }, [runExport]);

  useEffect(() => {
    gl.domElement.style.backgroundColor = backdrop.Background ? backgroundColor : 'transparent';
  }, [backdrop.Background, backgroundColor, gl]);

  useEffect(() => {
    document.body.style.backgroundColor = backgroundColor;
    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [backgroundColor]);

  const handleBoundsReady = useCallback(
    (fit) => {
      lastFitRef.current = fit;
      setShadowLayout(shadowLayoutFromFit(fit));

      if (framedModelRef.current !== modelId) {
        placeCameraForFrontView(camera, controls, fit);
        framedModelRef.current = modelId;
      }
    },
    [camera, controls, modelId]
  );

  useEffect(() => {
    const onReset = () => {
      if (lastFitRef.current) {
        placeCameraForFrontView(camera, controls, lastFitRef.current);
      }
    };

    window.addEventListener(STUDIO_CAMERA_RESET, onReset);
    return () => window.removeEventListener(STUDIO_CAMERA_RESET, onReset);
  }, [camera, controls]);

  useEffect(() => {
    setShadowLayout(DEFAULT_SHADOW_LAYOUT);
  }, [modelId]);

  const shadowKey = `${modelId}-${shadowLayout.y.toFixed(3)}-${shadowLayout.scale.toFixed(3)}`;

  return (
    <>
      <GarmentModel onBoundsReady={handleBoundsReady} />

      <OrbitControls
        makeDefault
        enablePan={!editMode}
        enableZoom
        enabled={!interacting}
        minDistance={0.35}
        maxDistance={4}
        minPolarAngle={Math.PI / 2 - 0.95}
        maxPolarAngle={Math.PI / 2 + 0.95}
        target={[0, 0, 0]}
      />

      <ambientLight intensity={1.5} />
      <spotLight
        position={[1, 4, 2]}
        intensity={2}
        angle={0.15}
        penumbra={1}
        shadow-mapSize={1024}
        castShadow
      />
      <spotLight position={[2, 3, 4]} intensity={1} angle={0.3} penumbra={0.4} />

      <group ref={shadowGroupRef}>
        <ContactShadows
          key={shadowKey}
          position={[0, shadowLayout.y, 0]}
          opacity={0.35}
          scale={shadowLayout.scale}
          blur={1.5}
          far={2.5}
          frames={1}
        />
      </group>

      {backdrop.Background && <color attach="background" args={[backgroundColor]} />}
      <Environment preset="city" />
    </>
  );
}
