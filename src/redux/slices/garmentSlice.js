import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  DEFAULT_GARMENT_ID,
  GARMENT_MODELS,
  getModelMeshes,
  getMeshPickerId,
  isDefaultPrintableMesh,
  registerCustomGarmentModel,
} from '../../config/garmentModels';

function buildInitialEnabledMeshes() {
  const enabledMeshes = {};

  Object.values(GARMENT_MODELS).forEach((model) => {
    enabledMeshes[model.id] = getModelMeshes(model.id)
      .filter((mesh) => isDefaultPrintableMesh(mesh) || mesh.enabledByDefault)
      .map((mesh) => getMeshPickerId(mesh));
  });

  return enabledMeshes;
}

const garmentSlice = createSlice({
  name: 'garment',
  initialState: {
    modelId: DEFAULT_GARMENT_ID,
    enabledMeshes: buildInitialEnabledMeshes(),
    uploadedModels: {},
    modelFlipped: false,
  },
  reducers: {
    setModelId: (state, action) => {
      state.modelId = action.payload;
      state.modelFlipped = false;
    },
    toggleModelFlip: (state) => {
      state.modelFlipped = !state.modelFlipped;
    },
    addUploadedModel: (state, action) => {
      const config = action.payload;
      registerCustomGarmentModel(config);
      state.uploadedModels[config.id] = {
        id: config.id,
        label: config.label,
      };
      state.enabledMeshes[config.id] = config.meshes
        .filter((mesh) => isDefaultPrintableMesh(mesh) || mesh.enabledByDefault)
        .map((mesh) => getMeshPickerId(mesh));
      state.modelId = config.id;
      state.modelFlipped = false;
    },
    toggleMeshDecal: (state, action) => {
      const { modelId, meshId } = action.payload;
      const current = state.enabledMeshes[modelId] || [];
      const exists = current.includes(meshId);

      state.enabledMeshes[modelId] = exists
        ? current.filter((id) => id !== meshId)
        : [...current, meshId];
    },
  },
});

export const getGarmentModelId = (state) => state.garment.modelId;

export const getModelFlipped = (state) => state.garment.modelFlipped;

export const getUploadedModels = (state) => state.garment.uploadedModels;

export const getEnabledMeshIds = createSelector(
  (state) => state.garment.modelId,
  (state) => state.garment.enabledMeshes,
  (modelId, enabledMeshes) => enabledMeshes[modelId] || []
);

export const {
  addUploadedModel,
  setModelId,
  toggleMeshDecal,
  toggleModelFlip,
} = garmentSlice.actions;

export default garmentSlice.reducer;
