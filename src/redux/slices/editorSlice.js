import { createSlice, createSelector } from '@reduxjs/toolkit';
import { GARMENT_MODELS, getGarmentModel } from '../../config/garmentModels';
import {
  DECAL_COLOR_INTENSITY_MAX,
  DECAL_COLOR_INTENSITY_MIN,
  DECAL_COLOR_INTENSITY_STEP,
  DEFAULT_DECAL_COLOR_INTENSITY,
} from '../../utils/decalMaterial';

function buildInitialTransforms() {
  const transforms = {};

  Object.values(GARMENT_MODELS).forEach((model) => {
    transforms[model.id] = { ...model.imageTransform };
  });

  return transforms;
}

const editorSlice = createSlice({
  name: 'editor',
  initialState: {
    viewportMode: 'preview',
    isInteracting: false,
    transforms: buildInitialTransforms(),
    decalColorIntensity: DEFAULT_DECAL_COLOR_INTENSITY,
  },
  reducers: {
    setViewportMode: (state, action) => {
      state.viewportMode = action.payload;
      if (action.payload === 'preview') {
        state.isInteracting = false;
      }
    },
    setInteracting: (state, action) => {
      state.isInteracting = action.payload;
    },
    updateTransform: (state, action) => {
      const { modelId, patch } = action.payload;
      state.transforms[modelId] = {
        ...state.transforms[modelId],
        ...patch,
      };
    },
    setTransform: (state, action) => {
      const { modelId, transform } = action.payload;
      state.transforms[modelId] = transform;
    },
    resetTransform: (state, action) => {
      const modelId = action.payload;
      state.transforms[modelId] = { ...getGarmentModel(modelId).imageTransform };
    },
    adjustDecalColorIntensity: (state, action) => {
      const delta = Number.isFinite(action.payload)
        ? action.payload
        : DECAL_COLOR_INTENSITY_STEP;
      state.decalColorIntensity = Math.min(
        DECAL_COLOR_INTENSITY_MAX,
        Math.max(DECAL_COLOR_INTENSITY_MIN, state.decalColorIntensity + delta)
      );
    },
    setDecalColorIntensity: (state, action) => {
      state.decalColorIntensity = Math.min(
        DECAL_COLOR_INTENSITY_MAX,
        Math.max(DECAL_COLOR_INTENSITY_MIN, action.payload)
      );
    },
  },
});

export const getViewportMode = (state) => state.editor.viewportMode;
export const getIsInteracting = (state) => state.editor.isInteracting;
export const getIsEditMode = createSelector(
  getViewportMode,
  (mode) => mode === 'edit'
);
export const getDecalColorIntensity = (state) => state.editor.decalColorIntensity;

const transformSelectors = {};

export function getModelTransform(modelId) {
  if (!transformSelectors[modelId]) {
    transformSelectors[modelId] = createSelector(
      (state) => state.editor.transforms,
      (transforms) => transforms[modelId] || getGarmentModel(modelId)?.imageTransform
    );
  }
  return transformSelectors[modelId];
}

export const {
  setViewportMode,
  setInteracting,
  updateTransform,
  setTransform,
  resetTransform,
  adjustDecalColorIntensity,
  setDecalColorIntensity,
} = editorSlice.actions;

export default editorSlice.reducer;
