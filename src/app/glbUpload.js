import { DEFAULT_DECAL_SCALE } from '../config/garmentModels';

const UPLOAD_TRANSFORM_LIMITS = {
  leftRight: { min: -0.5, max: 0.5, step: 0.002 },
  upDown: { min: -0.5, max: 0.5, step: 0.002 },
  frontBack: { min: -0.5, max: 0.5, step: 0.002 },
  decalDepth: { min: 0.04, max: 0.65, step: 0.005 },
  scale: { min: 0.005, max: 0.35, step: 0.001 },
  rotate: { min: 0, max: Math.PI * 2, step: 0.01 },
};

const UPLOAD_TRANSFORM_FIELDS = [
  { key: 'leftRight', label: 'Left / Right', axis: 0 },
  { key: 'upDown', label: 'Up / Down', axis: 1 },
  { key: 'frontBack', label: 'Surface offset', axis: 2 },
];

export function readGlbMeshNames(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const header = String.fromCharCode(...new Uint8Array(arrayBuffer, 0, 4));

  if (header !== 'glTF') {
    throw new Error('Please select a binary .glb file');
  }

  let offset = 12;

  while (offset + 8 <= arrayBuffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = String.fromCharCode(...new Uint8Array(arrayBuffer, offset + 4, 4));
    const chunkStart = offset + 8;

    if (chunkType === 'JSON') {
      const jsonText = new TextDecoder().decode(
        new Uint8Array(arrayBuffer, chunkStart, chunkLength)
      );
      const gltf = JSON.parse(jsonText);
      let unnamed = 0;

      return (gltf.nodes || [])
        .filter((node) => node.mesh !== undefined)
        .map((node) => node.name || `mesh_${++unnamed}`);
    }

    offset = chunkStart + chunkLength;
  }

  throw new Error('Could not read GLB model structure');
}

export function createUploadedModelRecord(file, objectUrl, meshNames) {
  const id = `uploaded-${Date.now()}`;
  const label = file.name.replace(/\.glb$/i, '') || 'Uploaded GLB';

  const previewMeshes = meshNames.map((node) => ({
    node,
    parent: 'inner',
    previewOnly: true,
  }));

  const printMeshes = meshNames.map((node, index) => ({
    node,
    pickerId: `${node}_uploaded_decal`,
    parent: 'inner',
    decalHost: true,
    enabledByDefault: index === 0,
  }));

  return {
    id,
    label,
    path: objectUrl,
    parents: {
      inner: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
      outer: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
    },
    meshes: [...previewMeshes, ...printMeshes],
    imageTransform: {
      rotate: 0,
      leftRight: 0,
      upDown: 0,
      frontBack: 0.12,
      scale: DEFAULT_DECAL_SCALE,
      decalDepth: 0.44,
      initialRotation: [0, 0, 0],
    },
    transformControls: UPLOAD_TRANSFORM_LIMITS,
    transformFields: UPLOAD_TRANSFORM_FIELDS,
    decalFrontOnly: true,
    decalBackCullThreshold: 0.1,
    decalFoldFadeRange: 0.5,
    decalFoldRelaxStrength: 0.8,
  };
}
