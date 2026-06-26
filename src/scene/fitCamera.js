export function placeCameraForFrontView(camera, controls, fit) {
  const { center, distance, size } = fit;
  const eyeY = center.y + size.y * 0.03;

  camera.position.set(center.x, eyeY, center.z + distance);
  camera.lookAt(center);

  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

export function shadowLayoutFromFit(fit) {
  const { center, size } = fit;

  return {
    y: center.y - size.y * 0.5 - 0.04,
    scale: Math.max(size.x, size.z) * 1.15,
  };
}

export const DEFAULT_SHADOW_LAYOUT = { y: -0.75, scale: 1.5 };
