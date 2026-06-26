import {
  getGarmentModel,
  getTransformControls,
  getTransformFields,
} from '../config/garmentModels';

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function toNorm(value, limits) {
  if (limits.max === limits.min) {
    return 0.5;
  }
  return clamp01((value - limits.min) / (limits.max - limits.min));
}

function fromNorm(norm, limits) {
  return limits.min + clamp01(norm) * (limits.max - limits.min);
}

function clamp(value, limits) {
  return Math.min(limits.max, Math.max(limits.min, value));
}

export function getNormalizedSizeBounds(modelId) {
  const limits = getTransformControls(modelId);
  const defaultScale = getGarmentModel(modelId)?.imageTransform?.scale ?? limits.scale.min;

  return {
    min: defaultScale > 0 ? Math.max(0.08, limits.scale.min / defaultScale) : 0.08,
    max: defaultScale > 0 ? limits.scale.max / defaultScale : 1,
  };
}

export function transformToNormalized(modelId, transform) {
  const limits = getTransformControls(modelId);
  const sizeBounds = getNormalizedSizeBounds(modelId);

  const scaleSpan = limits.scale.max - limits.scale.min;
  const defaultScale = getGarmentModel(modelId)?.imageTransform?.scale ?? limits.scale.min;
  const size = defaultScale > 0 ? transform.scale / defaultScale : 1;

  return {
    u: toNorm(transform.leftRight, limits.leftRight),
    v: 1 - toNorm(transform.upDown, limits.upDown),
    size: Math.max(sizeBounds.min, Math.min(sizeBounds.max, size)),
    rotate: transform.rotate ?? 0,
    frontBack: transform.frontBack,
    decalDepth: transform.decalDepth,
    scaleSpan,
  };
}

export function normalizedToTransform(modelId, normalized) {
  const limits = getTransformControls(modelId);
  const defaults = getGarmentModel(modelId)?.imageTransform ?? {};
  const defaultScale = defaults.scale ?? limits.scale.min;

  const next = {
    leftRight: fromNorm(normalized.u, limits.leftRight),
    upDown: fromNorm(1 - normalized.v, limits.upDown),
    scale: clamp(defaultScale * normalized.size, limits.scale),
    rotate: normalized.rotate,
  };

  if (defaults.frontBack !== undefined) {
    next.frontBack =
      normalized.frontBack !== undefined ? normalized.frontBack : defaults.frontBack;
  }

  if (defaults.decalDepth !== undefined) {
    next.decalDepth =
      normalized.decalDepth !== undefined ? normalized.decalDepth : defaults.decalDepth;
  }

  return next;
}

export function buildDecalPose(modelId, transform, imageWidth, imageHeight) {
  const config = getGarmentModel(modelId);
  const transformFields = getTransformFields(modelId);
  const limits = getTransformControls(modelId);
  const baseRotation = config?.imageTransform?.initialRotation ?? [0, 0, 0];
  const pos = [0, 0, 0];

  transformFields.forEach((field) => {
    pos[field.axis] = transform[field.key];
  });

  return {
    pos,
    rotation: [baseRotation[0], baseRotation[1], transform.rotate ?? 0],
    scale: [
      (imageWidth / 100) * transform.scale,
      (imageHeight / 100) * transform.scale,
      transform.decalDepth ?? config?.imageTransform?.decalDepth,
    ],
    limits,
    transformFields,
  };
}

// When the garment is Y-flipped for a back view, mirror the decal onto the opposite surface.
export function mirrorDecalPoseForModelFlip(pose) {
  const pos = [...pose.pos];
  const rotation = [...pose.rotation];
  const frontBackLimits = pose.limits?.frontBack;

  pos[0] = -pos[0];

  if (frontBackLimits && frontBackLimits.min < 0) {
    pos[2] = -pos[2];
  }

  rotation[1] = (rotation[1] ?? 0) + Math.PI;

  if (rotation.length > 2) {
    rotation[2] = -(rotation[2] ?? 0);
  }

  return { ...pose, pos, rotation };
}

export function clampTransformField(modelId, key, value) {
  const limits = getTransformControls(modelId)[key];
  if (!limits) {
    return value;
  }
  return clamp(value, limits);
}
