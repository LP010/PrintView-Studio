import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { useDispatch, useSelector } from 'react-redux';
import { ViewerScene } from '../scene/ViewerScene';
import { getModelFlipped, toggleModelFlip } from '../redux/slices/garmentSlice';
import { requestCameraReset, requestStudioExport } from './studioEvents';

export function StageViewport({
  exporting,
  exportError,
  onExportStart,
  onExportEnd,
  onExportFail,
  sidebarCollapsed,
  onExpandSidebar,
}) {
  const dispatch = useDispatch();
  const flipped = useSelector(getModelFlipped);

  const handleExport = () => {
    const started = requestStudioExport({
      onStart: onExportStart,
      onComplete: onExportEnd,
      onError: onExportFail,
    });

    if (!started) {
      onExportFail('Scene is still loading. Please try again.');
    }
  };

  return (
    <main className="stage">
      <div className="stage-topbar">
        <button
          type="button"
          className={`stage-action${flipped ? ' stage-action--active' : ''}`}
          onClick={() => dispatch(toggleModelFlip())}
          title="Flip to back view and move pattern to the other side (resets when you switch models)"
        >
          Flip
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={requestCameraReset}
          title="Reset to front view of current model"
        >
          Reset
        </button>
        <button
          type="button"
          className="stage-action"
          onClick={handleExport}
          disabled={exporting}
          title={exportError || 'Download high-res PNG; transparent when background is off'}
        >
          <span aria-hidden="true">↓</span>
          {exporting ? '…' : 'Download'}
        </button>
      </div>

      {sidebarCollapsed && (
        <button
          type="button"
          className="sidebar-expand"
          onClick={onExpandSidebar}
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <span className="sidebar-toggle-chevron sidebar-toggle-chevron--expand" aria-hidden="true" />
        </button>
      )}

      <Canvas
        id="canvas"
        shadows
        camera={{
          fov: 42,
          position: [0, 0.06, 1.85],
          near: 0.1,
          far: 2000,
        }}
      >
        <Suspense fallback={null}>
          <ViewerScene />
        </Suspense>
      </Canvas>

      <Loader />
    </main>
  );
}
