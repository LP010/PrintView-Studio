export const STUDIO_EXPORT = 'studio:export';
export const STUDIO_CAMERA_RESET = 'studio:camera-reset';

export function requestStudioExport(callbacks = {}) {
  let started = false;

  window.dispatchEvent(
    new CustomEvent(STUDIO_EXPORT, {
      detail: {
        onStart: () => {
          started = true;
          callbacks.onStart?.();
        },
        onComplete: callbacks.onComplete,
        onError: callbacks.onError,
      },
    })
  );

  return started;
}

export function requestCameraReset() {
  window.dispatchEvent(new CustomEvent(STUDIO_CAMERA_RESET));
}
