import { LinearFilter, LinearMipmapLinearFilter, MeshLambertMaterial } from 'three';

const FOLD_FADE_SHADER_KEY = 'foldFadeDecal';

// Lambert responds to scene lights; tint nudges print below full-white overlay.
export const DEFAULT_DECAL_COLOR_INTENSITY = 0.2;
export const DECAL_COLOR_INTENSITY_MIN = 0.2;
export const DECAL_COLOR_INTENSITY_MAX = 1;
export const DECAL_COLOR_INTENSITY_STEP = 0.04;

export function applyDecalColorIntensity(material, intensity) {
  if (!material) {
    return;
  }

  material.color.setScalar(intensity);
  material.needsUpdate = true;
}

function createDecalLambertMaterial(intensity = DEFAULT_DECAL_COLOR_INTENSITY) {
  const material = new MeshLambertMaterial({
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
  });

  applyDecalColorIntensity(material, intensity);
  return material;
}

export function createBasicDecalMaterial() {
  return createDecalLambertMaterial();
}

export function createFoldFadeDecalMaterial() {
  const material = createDecalLambertMaterial();

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float foldFade;\nvarying float vFoldFade;'
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvFoldFade = foldFade;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vFoldFade;'
      )
      .replace(
        '#include <dithering_fragment>',
        'gl_FragColor.a *= vFoldFade;\n#include <dithering_fragment>'
      );
  };

  material.customProgramCacheKey = () => FOLD_FADE_SHADER_KEY;

  return material;
}

export function configureDecalTexture(texture, gl) {
  if (!texture) {
    return;
  }

  const maxAnisotropy = gl?.capabilities?.getMaxAnisotropy?.() ?? 1;
  texture.anisotropy = Math.min(16, maxAnisotropy);
  texture.minFilter = LinearMipmapLinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}
