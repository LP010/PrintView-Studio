const IDENTITY_PARENT = {
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: [1, 1, 1],
};

const DEFAULT_TRANSFORM_CONTROLS = {
  leftRight: { min: -0.4, max: 0.4, step: 0.002 },
  upDown: { min: -0.35, max: 0.35, step: 0.002 },
  frontBack: { min: -0.05, max: 0.22, step: 0.002 },
  decalDepth: { min: 0.04, max: 0.6, step: 0.005 },
  scale: { min: 0.005, max: 0.35, step: 0.001 },
  rotate: { min: 0, max: Math.PI * 2, step: 0.01 },
};

// T-shirt: Y = vertical, Z = surface depth (front side only).
const SCAN_TRANSFORM_CONTROLS = {
  leftRight: { min: -0.4, max: 0.4, step: 0.002 },
  upDown: { min: -0.35, max: 0.35, step: 0.002 },
  frontBack: { min: -0.05, max: 0.22, step: 0.002 },
  decalDepth: { min: 0.04, max: 0.6, step: 0.005 },
  scale: { min: 0.005, max: 0.35, step: 0.001 },
  rotate: { min: 0, max: Math.PI * 2, step: 0.01 },
};

const MUG_TRANSFORM_CONTROLS = {
  leftRight: { min: -0.45, max: 0.45, step: 0.002 },
  upDown: { min: -0.32, max: 0.32, step: 0.002 },
  frontBack: { min: 0.12, max: 0.45, step: 0.002 },
  decalDepth: { min: 0.04, max: 0.5, step: 0.005 },
  scale: { min: 0.005, max: 0.25, step: 0.001 },
  rotate: { min: 0, max: Math.PI * 2, step: 0.01 },
};

const PROJECTION_DEPTH_LABEL = 'Projection depth';

export const DEFAULT_DECAL_SCALE = 0.022;

const SCAN_TRANSFORM_FIELDS = [
  { key: 'leftRight', label: 'Left / Right', axis: 0 },
  { key: 'upDown', label: 'Up / Down', axis: 1 },
  { key: 'frontBack', label: 'Surface offset', axis: 2 },
];

const DEFAULT_TRANSFORM_FIELDS = SCAN_TRANSFORM_FIELDS;

// Each GLB needs manual config: node names, parent transforms, and default decal pose.
// When adding a model, verify mesh nodes in a viewer and avoid overlapping body/printable geometry.
export const GARMENT_MODELS = {
  tshirt: {
    id: 'tshirt',
    label: 'T-Shirt',
    path: '/models/tshirt.glb',
    parents: {
      inner: IDENTITY_PARENT,
      outer: IDENTITY_PARENT,
    },
    meshes: [
      { node: 'geometry_0', parent: 'inner', previewOnly: true },
      {
        node: 'geometry_0',
        pickerId: 'geometry_0_decal',
        parent: 'inner',
        decalHost: true,
        enabledByDefault: true,
      },
    ],
    imageTransform: {
      rotate: 0,
      leftRight: 0,
      upDown: 0.08,
      frontBack: 0.12,
      scale: DEFAULT_DECAL_SCALE,
      decalDepth: 0.44,
      initialRotation: [0, 0, 0],
    },
    transformControls: SCAN_TRANSFORM_CONTROLS,
    transformFields: SCAN_TRANSFORM_FIELDS,
    decalFrontOnly: true,
    decalBackCullThreshold: 0.1,
    decalFoldFadeRange: 0.52,
    decalFoldRelaxStrength: 0.82,
  },
  mug: {
    id: 'mug',
    label: 'Mug',
    path: '/models/mug.glb',
    parents: {
      inner: IDENTITY_PARENT,
      outer: IDENTITY_PARENT,
    },
    meshes: [
      { node: 'geometry_0', parent: 'inner', previewOnly: true },
      {
        node: 'geometry_0',
        pickerId: 'geometry_0_mug_decal',
        parent: 'inner',
        decalHost: true,
        enabledByDefault: true,
      },
    ],
    imageTransform: {
      rotate: 0,
      leftRight: 0,
      upDown: 0.02,
      frontBack: 0.34,
      scale: DEFAULT_DECAL_SCALE,
      decalDepth: 0.42,
      initialRotation: [0, 0, 0],
    },
    transformControls: MUG_TRANSFORM_CONTROLS,
    transformFields: SCAN_TRANSFORM_FIELDS,
    decalFrontOnly: true,
    decalBackCullThreshold: 0.08,
    decalFoldFadeRange: 0.48,
    decalFoldRelaxStrength: 0.78,
  },
};

const CUSTOM_GARMENT_MODELS = {};

export function registerCustomGarmentModel(config) {
  CUSTOM_GARMENT_MODELS[config.id] = config;
}

export function getGarmentModel(modelId) {
  return CUSTOM_GARMENT_MODELS[modelId] || GARMENT_MODELS[modelId];
}

export function getAllGarmentModels() {
  return {
    ...GARMENT_MODELS,
    ...CUSTOM_GARMENT_MODELS,
  };
}

export const DEFAULT_GARMENT_ID = 'tshirt';

export function getGarmentOptions() {
  return Object.fromEntries(
    Object.values(getAllGarmentModels()).map((model) => [model.label, model.id])
  );
}

export const GARMENT_OPTIONS = getGarmentOptions();

export function getModelMeshes(modelId) {
  return getGarmentModel(modelId)?.meshes || [];
}

export function getMeshPickerId(mesh) {
  return mesh.pickerId || mesh.node;
}

export function getTransformControls(modelId) {
  return getGarmentModel(modelId)?.transformControls || DEFAULT_TRANSFORM_CONTROLS;
}

export function getTransformFields(modelId) {
  return getGarmentModel(modelId)?.transformFields || DEFAULT_TRANSFORM_FIELDS;
}

export function getProjectionDepthLabel() {
  return PROJECTION_DEPTH_LABEL;
}

export function isDefaultPrintableMesh(mesh) {
  return mesh.decalHost === true;
}

export function validateGarmentConfig(config, nodes) {
  const missing = config.meshes
    .filter((mesh) => !nodes[mesh.node])
    .map((mesh) => mesh.node);

  if (missing.length > 0) {
    console.warn(
      `[garment] "${config.id}" references missing nodes: ${missing.join(', ')}`
    );
  }

  return missing.length === 0;
}
