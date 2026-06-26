import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Decal, useGLTF, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useSelector } from 'react-redux';
import { Euler, Vector3 } from 'three';
import { getImageSelector } from '../redux/slices/imageUploadSlice';
import {
  getEnabledMeshIds,
  getGarmentModelId,
  getModelFlipped,
} from '../redux/slices/garmentSlice';
import {
  getDecalColorIntensity,
  getIsInteracting,
  getModelTransform,
} from '../redux/slices/editorSlice';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import {
  applyDecalColorIntensity,
  configureDecalTexture,
  createBasicDecalMaterial,
  createFoldFadeDecalMaterial,
} from '../utils/decalMaterial';
import { createFrontFacingDecalGeometry } from '../utils/frontDecalGeometry';
import { buildDecalPose, mirrorDecalPoseForModelFlip } from '../utils/transformMapping';
import {
  GARMENT_MODELS,
  getGarmentModel,
  getMeshPickerId,
  validateGarmentConfig,
} from '../config/garmentModels';
import { FitToView, useFitRevision } from './FitToView';
import { useLoadedModel } from './useLoadedModel';

const POSE_DEBOUNCE_MS = 60;
const GEOMETRY_RETRY_CAP = 90;
const FLIP_Y = [0, Math.PI, 0];
const UPRIGHT = [0, 0, 0];

function parentGroupProps(parentConfig) {
  const scale = parentConfig.scale;
  return {
    position: parentConfig.position,
    rotation: parentConfig.rotation,
    scale: scale.length === 3 ? scale : [scale, scale, scale],
  };
}

function partitionMeshes(meshList, activeIds) {
  const outer = meshList.filter((entry) => entry.parent === 'outer');
  const inner = meshList.filter((entry) => entry.parent === 'inner');
  const active = new Set(activeIds);

  const isActive = (entry) => active.has(getMeshPickerId(entry));
  const isPreview = (entry) => entry.previewOnly || !isActive(entry);

  return {
    preview: {
      outer: outer.filter(isPreview),
      inner: inner.filter(isPreview),
    },
    print: {
      outer: outer.filter(isActive),
      inner: inner.filter(isActive),
    },
  };
}

function StaticMesh({ geometry, material, hostForPrint }) {
  return (
    <mesh
      castShadow
      receiveShadow
      geometry={geometry}
      material={material}
      renderOrder={hostForPrint ? 2 : 0}
    />
  );
}

function ModelPreview({ modelConfig, nodes, materials, activeMeshIds }) {
  const layers = useMemo(
    () => partitionMeshes(modelConfig.meshes, activeMeshIds),
    [activeMeshIds, modelConfig.meshes]
  );

  const outerProps = useMemo(
    () => parentGroupProps(modelConfig.parents.outer),
    [modelConfig.parents.outer]
  );
  const innerProps = useMemo(
    () => parentGroupProps(modelConfig.parents.inner),
    [modelConfig.parents.inner]
  );

  const draw = (entry) => {
    const node = nodes[entry.node];
    if (!node) {
      return null;
    }

    return (
      <StaticMesh
        key={entry.pickerId || entry.node}
        geometry={node.geometry}
        material={materials[entry.material] || node.material}
        hostForPrint={entry.decalHost}
      />
    );
  };

  return (
    <>
      <group {...outerProps}>{layers.preview.outer.map(draw)}</group>
      <group {...innerProps}>{layers.preview.inner.map(draw)}</group>
    </>
  );
}

function WrappedPrintGeometry({
  hostRef,
  pose,
  shadedMaterial,
  facingCutoff,
  foldRange,
  foldRelax,
  textureKey,
  fitRevision,
}) {
  const meshRef = useRef();
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const host = hostRef.current;
    const mesh = meshRef.current;
    if (!host || !mesh) {
      return undefined;
    }

    let frame = 0;
    let cancelled = false;
    let built = null;
    let tries = 0;

    const rebuild = () => {
      if (cancelled) {
        return true;
      }

      const world = host.matrixWorld.clone();
      host.matrixWorld.identity();

      const geometry = createFrontFacingDecalGeometry(
        host,
        new Vector3(...pose.pos),
        new Euler(...pose.rotation),
        new Vector3(...pose.scale),
        facingCutoff,
        foldRange,
        foldRelax
      );

      host.matrixWorld.copy(world);

      const count = geometry.attributes.position?.count ?? 0;
      if (count === 0) {
        geometry.dispose();
        return false;
      }

      if (mesh.geometry) {
        mesh.geometry.dispose();
      }

      mesh.geometry = geometry;
      built = geometry;
      invalidate();
      return true;
    };

    const attempt = () => {
      if (rebuild()) {
        return;
      }

      tries += 1;
      if (tries < GEOMETRY_RETRY_CAP) {
        frame = window.requestAnimationFrame(attempt);
      }
    };

    attempt();

    return () => {
      cancelled = true;
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
      if (built) {
        built.dispose();
      }
    };
  }, [
    facingCutoff,
    fitRevision,
    foldRange,
    foldRelax,
    hostRef,
    invalidate,
    pose,
    textureKey,
  ]);

  return <mesh ref={meshRef} renderOrder={3} material={shadedMaterial} />;
}

function PrintOnMesh({
  geometry,
  material,
  useHost,
  pose,
  shadedMaterial,
  flatMaterial,
  frontFacingOnly,
  facingCutoff,
  foldRange,
  foldRelax,
  textureKey,
}) {
  const hostRef = useRef();
  const fitRevision = useFitRevision();
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    if (!useHost || frontFacingOnly) {
      return undefined;
    }

    hostRef.current?.updateWorldMatrix(true, true);
    invalidate();
    return undefined;
  }, [frontFacingOnly, invalidate, pose, useHost]);

  return (
    <mesh
      ref={hostRef}
      castShadow
      receiveShadow
      geometry={geometry}
      material={useHost ? undefined : material}
      renderOrder={useHost ? 2 : 0}
    >
      {useHost && <meshBasicMaterial transparent opacity={0} depthWrite={false} />}
      {frontFacingOnly ? (
        <WrappedPrintGeometry
          hostRef={hostRef}
          pose={pose}
          shadedMaterial={shadedMaterial}
          facingCutoff={facingCutoff}
          foldRange={foldRange}
          foldRelax={foldRelax}
          textureKey={textureKey}
          fitRevision={fitRevision}
        />
      ) : (
        <Decal position={pose.pos} rotation={pose.rotation} scale={pose.scale}>
          <primitive object={flatMaterial} attach="material" />
        </Decal>
      )}
    </mesh>
  );
}

function ModelPrintLayer({ modelConfig, modelId, nodes, materials, activeMeshIds, flipped }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useFitRevision();

  const { height, width, image, preview } = useSelector(getImageSelector);
  const transform = useSelector(getModelTransform(modelId));
  const dragging = useSelector(getIsInteracting);
  const colorMix = useSelector(getDecalColorIntensity);
  const texture = useTexture(image);

  const layers = useMemo(
    () => partitionMeshes(modelConfig.meshes, activeMeshIds),
    [activeMeshIds, modelConfig.meshes]
  );

  const pose = useMemo(
    () => buildDecalPose(modelId, transform, width, height),
    [height, modelId, transform, width]
  );

  const debounce = activeMeshIds.length > 1 ? POSE_DEBOUNCE_MS : 0;
  const smoothedPose = useDebouncedValue(
    pose,
    dragging ? 0 : debounce,
    activeMeshIds.join(',')
  );
  const activePose = debounce > 0 && !dragging ? smoothedPose : pose;
  const viewPose = useMemo(
    () => (flipped ? mirrorDecalPoseForModelFlip(activePose) : activePose),
    [activePose, flipped]
  );

  const printPose = useMemo(
    () => ({
      pos: viewPose.pos,
      rotation: viewPose.rotation,
      scale: viewPose.scale,
    }),
    [viewPose]
  );

  const shadedMaterial = useMemo(() => createFoldFadeDecalMaterial(), []);
  const flatMaterial = useMemo(() => createBasicDecalMaterial(), []);

  configureDecalTexture(texture, gl);
  shadedMaterial.map = texture;
  flatMaterial.map = texture;
  shadedMaterial.needsUpdate = true;
  flatMaterial.needsUpdate = true;

  useLayoutEffect(() => {
    applyDecalColorIntensity(shadedMaterial, colorMix);
    applyDecalColorIntensity(flatMaterial, colorMix);
    invalidate();
  }, [colorMix, flatMaterial, invalidate, shadedMaterial, texture]);

  if (!image || !preview || (layers.print.outer.length === 0 && layers.print.inner.length === 0)) {
    return null;
  }

  const outerProps = parentGroupProps(modelConfig.parents.outer);
  const innerProps = parentGroupProps(modelConfig.parents.inner);

  const draw = (entry) => {
    const node = nodes[entry.node];
    if (!node) {
      return null;
    }

    return (
      <PrintOnMesh
        key={getMeshPickerId(entry)}
        geometry={node.geometry}
        material={materials[entry.material] || node.material}
        useHost={Boolean(entry.decalHost)}
        pose={printPose}
        shadedMaterial={shadedMaterial}
        flatMaterial={flatMaterial}
        frontFacingOnly={modelConfig.decalFrontOnly}
        facingCutoff={modelConfig.decalBackCullThreshold}
        foldRange={modelConfig.decalFoldFadeRange}
        foldRelax={modelConfig.decalFoldRelaxStrength}
        textureKey={texture.uuid}
      />
    );
  };

  return (
    <>
      <group {...outerProps}>{layers.print.outer.map(draw)}</group>
      <group {...innerProps}>{layers.print.inner.map(draw)}</group>
    </>
  );
}

function ModelContent({ modelId, activeMeshIds, flipped, onBoundsReady, rootProps }) {
  const modelConfig = getGarmentModel(modelId);
  const { nodes, materials } = useLoadedModel(modelConfig.path);

  useEffect(() => {
    validateGarmentConfig(modelConfig, nodes);
  }, [modelConfig, nodes]);

  return (
    <group castShadow receiveShadow {...rootProps} dispose={null}>
      <group rotation={flipped ? FLIP_Y : UPRIGHT}>
        <FitToView modelKey={modelId} onBoundsReady={onBoundsReady}>
          <ModelPreview
            modelConfig={modelConfig}
            nodes={nodes}
            materials={materials}
            activeMeshIds={activeMeshIds}
          />
          <ModelPrintLayer
            modelConfig={modelConfig}
            modelId={modelId}
            nodes={nodes}
            materials={materials}
            activeMeshIds={activeMeshIds}
            flipped={flipped}
          />
        </FitToView>
      </group>
    </group>
  );
}

export function GarmentModel({ onBoundsReady, ...props }) {
  const activeMeshIds = useSelector(getEnabledMeshIds);
  const modelId = useSelector(getGarmentModelId);
  const flipped = useSelector(getModelFlipped);

  return (
    <ModelContent
      key={modelId}
      modelId={modelId}
      activeMeshIds={activeMeshIds}
      flipped={flipped}
      onBoundsReady={onBoundsReady}
      rootProps={props}
    />
  );
}

Object.values(GARMENT_MODELS).forEach((entry) => {
  useGLTF.preload(entry.path);
});
