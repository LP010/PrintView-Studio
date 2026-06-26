import { DecalGeometry } from 'three-stdlib';
import {
  BufferGeometry,
  Euler,
  Float32BufferAttribute,
  Vector3,
} from 'three';

const PROJECTOR_FORWARD = new Vector3(0, 0, -1);
const DEFAULT_FOLD_FADE_RANGE = 0.48;
const DEFAULT_FOLD_RELAX_STRENGTH = 0.78;
const INVISIBLE_ALPHA_EPSILON = 0.015;
const POSITION_BUCKET_SCALE = 8000;

function smoothstep(edge0, edge1, value) {
  const span = edge1 - edge0;
  if (span <= 0) {
    return value <= edge0 ? 1 : 0;
  }

  const t = Math.min(1, Math.max(0, (value - edge0) / span));
  return t * t * (3 - 2 * t);
}

// Gentler than smoothstep for fold transitions.
function smootherstep(edge0, edge1, value) {
  const t = smoothstep(edge0, edge1, value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function facingAlpha(facing, fadeStart, fadeEnd) {
  return 1 - smootherstep(fadeStart, fadeEnd, facing);
}

function foldStress(alpha) {
  return 1 - alpha;
}

function relaxToward(target, value, amount) {
  return value + (target - value) * amount;
}

function positionKey(x, y, z) {
  return (
    Math.round(x * POSITION_BUCKET_SCALE) +
    ',' +
    Math.round(y * POSITION_BUCKET_SCALE) +
    ',' +
    Math.round(z * POSITION_BUCKET_SCALE)
  );
}

function relaxFoldUvsAtSharedPositions(positions, uvs, foldFades, relaxStrength) {
  const buckets = new Map();

  for (let vi = 0; vi < foldFades.length; vi += 1) {
    const pi = vi * 3;
    const key = positionKey(positions[pi], positions[pi + 1], positions[pi + 2]);
    if (!buckets.has(key)) {
      buckets.set(key, []);
    }
    buckets.get(key).push(vi);
  }

  const nextUvs = uvs.slice();

  buckets.forEach((indices) => {
    if (indices.length < 2) {
      return;
    }

    let avgU = 0;
    let avgV = 0;
    let weightSum = 0;

    indices.forEach((vi) => {
      const stress = foldStress(foldFades[vi]);
      const weight = stress * stress;
      avgU += uvs[vi * 2] * weight;
      avgV += uvs[vi * 2 + 1] * weight;
      weightSum += weight;
    });

    if (weightSum < 0.001) {
      return;
    }

    avgU /= weightSum;
    avgV /= weightSum;

    indices.forEach((vi) => {
      const stress = foldStress(foldFades[vi]);
      const blend = stress * stress * (3 - 2 * stress) * relaxStrength * 0.55;
      nextUvs[vi * 2] = relaxToward(avgU, uvs[vi * 2], blend);
      nextUvs[vi * 2 + 1] = relaxToward(avgV, uvs[vi * 2 + 1], blend);
    });
  });

  return nextUvs;
}

// Fade pattern near fold creases and relax UV stretching for smoother deformation.
function applyFoldFade(geometry, rotation, fadeStart, fadeEnd, relaxStrength) {
  const position = geometry.attributes.position.array;
  const normal = geometry.attributes.normal.array;
  const uv = geometry.attributes.uv.array;

  const projectorForward = PROJECTOR_FORWARD.clone().applyEuler(
    rotation instanceof Euler ? rotation : new Euler(...rotation)
  );

  const nextPosition = [];
  const nextNormal = [];
  const nextUv = [];
  const nextFoldFade = [];

  for (let tri = 0; tri < position.length / 9; tri += 1) {
    const pi = tri * 9;
    const ui = tri * 6;
    const triUv = [];
    const vertexAlpha = [];

    for (let v = 0; v < 3; v += 1) {
      const vi = pi + v * 3;
      const ti = ui + v * 2;
      const facing =
        normal[vi] * projectorForward.x +
        normal[vi + 1] * projectorForward.y +
        normal[vi + 2] * projectorForward.z;

      const alpha = facingAlpha(facing, fadeStart, fadeEnd);
      vertexAlpha.push(alpha);
      triUv.push([uv[ti], uv[ti + 1]]);
    }

    const maxAlpha = Math.max(vertexAlpha[0], vertexAlpha[1], vertexAlpha[2]);
    if (maxAlpha < INVISIBLE_ALPHA_EPSILON) {
      continue;
    }

    const centroidU = (triUv[0][0] + triUv[1][0] + triUv[2][0]) / 3;
    const centroidV = (triUv[0][1] + triUv[1][1] + triUv[2][1]) / 3;

    for (let v = 0; v < 3; v += 1) {
      const vi = pi + v * 3;
      const stress = foldStress(vertexAlpha[v]);
      const localRelax = stress * stress * (3 - 2 * stress) * relaxStrength;
      const relaxedU = relaxToward(centroidU, triUv[v][0], localRelax);
      const relaxedV = relaxToward(centroidV, triUv[v][1], localRelax);

      nextPosition.push(position[vi], position[vi + 1], position[vi + 2]);
      nextNormal.push(normal[vi], normal[vi + 1], normal[vi + 2]);
      nextUv.push(relaxedU, relaxedV);
      nextFoldFade.push(vertexAlpha[v]);
    }
  }

  const smoothedUv = relaxFoldUvsAtSharedPositions(
    nextPosition,
    nextUv,
    nextFoldFade,
    relaxStrength
  );

  const faded = new BufferGeometry();
  faded.setAttribute('position', new Float32BufferAttribute(nextPosition, 3));
  faded.setAttribute('normal', new Float32BufferAttribute(nextNormal, 3));
  faded.setAttribute('uv', new Float32BufferAttribute(smoothedUv, 2));
  faded.setAttribute('foldFade', new Float32BufferAttribute(nextFoldFade, 1));

  geometry.dispose();
  return faded;
}

export function createFrontFacingDecalGeometry(
  mesh,
  position,
  rotation,
  scale,
  backCullThreshold = 0.35,
  foldFadeRange = DEFAULT_FOLD_FADE_RANGE,
  foldRelaxStrength = DEFAULT_FOLD_RELAX_STRENGTH
) {
  if (!mesh.geometry?.attributes?.position) {
    return new BufferGeometry();
  }

  if (!mesh.geometry.attributes.normal) {
    mesh.geometry.computeVertexNormals();
  }

  const pos = position instanceof Vector3 ? position : new Vector3(...position);
  const rot = rotation instanceof Euler ? rotation : new Euler(...rotation);
  const size = scale instanceof Vector3 ? scale : new Vector3(...scale);
  const fadeEnd = backCullThreshold + foldFadeRange;

  try {
    const geometry = new DecalGeometry(mesh, pos, rot, size);
    return applyFoldFade(
      geometry,
      rot,
      backCullThreshold,
      fadeEnd,
      foldRelaxStrength
    );
  } catch (error) {
    console.warn('[decal] Failed to build front-facing decal geometry.', error);
    return new BufferGeometry();
  }
}
