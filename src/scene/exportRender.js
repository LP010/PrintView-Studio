function findOpaqueBounds(imageData, width, height) {
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = imageData[(y * width + x) * 4 + 3];
      if (alpha > 8) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  return { minX, minY, maxX, maxY, hasContent: minX <= maxX && minY <= maxY };
}

function triggerPngDownload(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl.replace('image/png', 'image/octet-stream');
  link.click();
}

export function exportScenePng({
  gl,
  scene,
  camera,
  contactShadowRef,
  includeBackground,
  backgroundColor,
  exportScale = 3,
}) {
  const sourceCanvas = gl.domElement;
  const saved = {
    background: scene.background,
    clearAlpha: gl.getClearAlpha(),
    shadowVisible: contactShadowRef?.current?.visible,
    pixelRatio: gl.getPixelRatio(),
  };

  const displayWidth = sourceCanvas.clientWidth || Math.round(sourceCanvas.width / saved.pixelRatio);
  const displayHeight = sourceCanvas.clientHeight || Math.round(sourceCanvas.height / saved.pixelRatio);
  const scale = Math.max(2, Math.min(4, Number(exportScale) || 3));

  try {
    gl.setPixelRatio(saved.pixelRatio * scale);
    gl.setSize(displayWidth, displayHeight, false);

    const padding = Math.round(Math.min(sourceCanvas.width, sourceCanvas.height) * 0.04);
    const boundsCanvas = document.createElement('canvas');
    boundsCanvas.width = sourceCanvas.width;
    boundsCanvas.height = sourceCanvas.height;
    const boundsCtx = boundsCanvas.getContext('2d');

    scene.background = null;
    gl.setClearAlpha(0);

    if (contactShadowRef?.current) {
      contactShadowRef.current.visible = false;
    }

    gl.clear(true, true, true);
    gl.render(scene, camera);
    boundsCtx.drawImage(sourceCanvas, 0, 0);

    if (contactShadowRef?.current) {
      contactShadowRef.current.visible = saved.shadowVisible;
    }

    gl.clear(true, true, true);
    gl.render(scene, camera);

    const snapshotCanvas = document.createElement('canvas');
    snapshotCanvas.width = sourceCanvas.width;
    snapshotCanvas.height = sourceCanvas.height;
    const snapshotCtx = snapshotCanvas.getContext('2d');
    snapshotCtx.drawImage(sourceCanvas, 0, 0);

    const { data, width, height } = boundsCtx.getImageData(0, 0, boundsCanvas.width, boundsCanvas.height);
    const bounds = findOpaqueBounds(data, width, height);

    const cropX = bounds.hasContent ? Math.max(0, bounds.minX - padding) : 0;
    const cropY = bounds.hasContent ? Math.max(0, bounds.minY - padding) : 0;
    const cropWidth = bounds.hasContent
      ? Math.min(width - cropX, bounds.maxX - bounds.minX + padding * 2)
      : width;
    const cropHeight = bounds.hasContent
      ? Math.min(height - cropY, bounds.maxY - bounds.minY + padding * 2)
      : height;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = cropWidth;
    exportCanvas.height = cropHeight;
    const exportCtx = exportCanvas.getContext('2d');
    exportCtx.clearRect(0, 0, cropWidth, cropHeight);

    if (includeBackground) {
      exportCtx.fillStyle = backgroundColor;
      exportCtx.fillRect(0, 0, cropWidth, cropHeight);
    }

    exportCtx.drawImage(
      snapshotCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    triggerPngDownload(
      exportCanvas.toDataURL('image/png'),
      includeBackground ? 'printview.png' : 'printview-transparent.png'
    );
  } finally {
    scene.background = saved.background;
    gl.setClearAlpha(saved.clearAlpha);
    gl.setPixelRatio(saved.pixelRatio);
    gl.setSize(displayWidth, displayHeight, false);

    if (contactShadowRef?.current && saved.shadowVisible !== undefined) {
      contactShadowRef.current.visible = saved.shadowVisible;
    }

    gl.render(scene, camera);
  }
}
