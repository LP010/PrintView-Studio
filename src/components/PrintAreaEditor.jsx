import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGarmentModelId } from '../redux/slices/garmentSlice';
import {
  getIsEditMode,
  getModelTransform,
  resetTransform,
  setInteracting,
  setTransform,
} from '../redux/slices/editorSlice';
import { getImageSelector } from '../redux/slices/imageUploadSlice';
import {
  getNormalizedSizeBounds,
  normalizedToTransform,
  transformToNormalized,
} from '../utils/transformMapping';
import { getGarmentModel, getProjectionDepthLabel } from '../config/garmentModels';

const ZONE_WIDTH = 380;
const ZONE_HEIGHT = 475;
const ZONE_RATIO = ZONE_HEIGHT / ZONE_WIDTH;
const MAX_ZONE_HEIGHT = 280;
const DESIGN_FILL_SCALE = 0.48;
const HANDLE = 10;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export function PrintAreaEditor() {
  const dispatch = useDispatch();
  const modelId = useSelector(getGarmentModelId);
  const isEditMode = useSelector(getIsEditMode);
  const transform = useSelector(getModelTransform(modelId));
  const { image, width, height } = useSelector(getImageSelector);
  const dragRef = useRef(null);
  const containerRef = useRef(null);
  const zoneRef = useRef(null);
  const [zoneWidth, setZoneWidth] = useState(ZONE_WIDTH);
  const [zoneHeight, setZoneHeight] = useState(Math.round(ZONE_WIDTH * ZONE_RATIO));
  const model = getGarmentModel(modelId);
  const depthLabel = getProjectionDepthLabel();
  const sizeBounds = getNormalizedSizeBounds(modelId);

  const normalized = transformToNormalized(modelId, transform);
  const aspect = width / height;
  const designWidth = zoneWidth * normalized.size * DESIGN_FILL_SCALE;
  const designHeight = designWidth / aspect;

  useLayoutEffect(() => {
    if (!containerRef.current) {
      return undefined;
    }

    const updateSize = () => {
      const containerWidth = containerRef.current?.clientWidth || ZONE_WIDTH;
      let width = Math.min(ZONE_WIDTH, containerWidth);
      let height = Math.round(width * ZONE_RATIO);

      if (height > MAX_ZONE_HEIGHT) {
        height = MAX_ZONE_HEIGHT;
        width = Math.round(height / ZONE_RATIO);
      }

      setZoneWidth(width);
      setZoneHeight(height);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  const commitNormalized = useCallback(
    (next) => {
      dispatch(
        setTransform({
          modelId,
          transform: normalizedToTransform(modelId, {
            ...next,
            frontBack: transform.frontBack,
            decalDepth: transform.decalDepth,
          }),
        })
      );
    },
    [dispatch, modelId, transform.decalDepth, transform.frontBack]
  );

  const startDrag = (event, mode) => {
    event.preventDefault();
    event.stopPropagation();

    dragRef.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startNorm: { ...normalized },
      zoneWidth,
      zoneHeight,
    };

    dispatch(setInteracting(true));

    const onMove = (moveEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      const dx = moveEvent.clientX - drag.startX;
      const dy = moveEvent.clientY - drag.startY;

      if (drag.mode === 'move') {
        commitNormalized({
          ...drag.startNorm,
          u: clamp01(drag.startNorm.u + dx / drag.zoneWidth),
          v: clamp01(drag.startNorm.v + dy / drag.zoneHeight),
        });
        return;
      }

      if (drag.mode === 'rotate') {
        const rect = zoneRef.current.getBoundingClientRect();
        const cx = rect.left + drag.startNorm.u * rect.width;
        const cy = rect.top + drag.startNorm.v * rect.height;
        const startAngle = Math.atan2(drag.startY - cy, drag.startX - cx);
        const nextAngle = Math.atan2(moveEvent.clientY - cy, moveEvent.clientX - cx);
        commitNormalized({
          ...drag.startNorm,
          rotate: drag.startNorm.rotate + (nextAngle - startAngle),
        });
        return;
      }

      if (drag.mode === 'scale') {
        const rect = zoneRef.current.getBoundingClientRect();
        const cx = rect.left + drag.startNorm.u * rect.width;
        const cy = rect.top + drag.startNorm.v * rect.height;
        const startDist = Math.hypot(drag.startX - cx, drag.startY - cy);
        const nextDist = Math.hypot(moveEvent.clientX - cx, moveEvent.clientY - cy);
        if (startDist < 6) {
          return;
        }
        commitNormalized({
          ...drag.startNorm,
          size: Math.max(
            sizeBounds.min,
            Math.min(sizeBounds.max, drag.startNorm.size * (nextDist / startDist))
          ),
        });
      }
    };

    const onUp = () => {
      dragRef.current = null;
      dispatch(setInteracting(false));
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  if (!isEditMode || !image) {
    return null;
  }

  const corners = [
    { id: 'nw', left: -HANDLE / 2, top: -HANDLE / 2, cursor: 'nwse-resize' },
    { id: 'ne', right: -HANDLE / 2, top: -HANDLE / 2, cursor: 'nesw-resize' },
    { id: 'sw', left: -HANDLE / 2, bottom: -HANDLE / 2, cursor: 'nesw-resize' },
    { id: 'se', right: -HANDLE / 2, bottom: -HANDLE / 2, cursor: 'nwse-resize' },
  ];

  return (
    <section className="print-area-editor">
        <div className="print-area-editor__header">
        <div>
          <p className="print-area-editor__lead">Drag to move, corners to scale, top handle to rotate</p>
        </div>
        <button
          type="button"
          className="print-area-editor__reset"
          onClick={() => dispatch(resetTransform(modelId))}
        >
          Reset
        </button>
      </div>

      <div ref={containerRef} className="print-area-editor__canvas-wrap">
        <div
          ref={zoneRef}
          className="print-area-zone"
          style={{ width: zoneWidth, height: zoneHeight }}
        >
        <div
          className="print-area-design"
          style={{
            width: designWidth,
            height: designHeight,
            left: normalized.u * zoneWidth,
            top: normalized.v * zoneHeight,
            transform: `translate(-50%, -50%) rotate(${normalized.rotate}rad)`,
          }}
          onPointerDown={(event) => startDrag(event, 'move')}
        >
          <img src={image} alt="" draggable={false} />
          {corners.map((corner) => (
            <button
              key={corner.id}
              type="button"
              className="print-area-handle print-area-handle--corner"
              style={{
                left: corner.left,
                right: corner.right,
                top: corner.top,
                bottom: corner.bottom,
                cursor: corner.cursor,
              }}
              onPointerDown={(event) => startDrag(event, 'scale')}
            />
          ))}
          <button
            type="button"
            className="print-area-handle print-area-handle--rotate"
            onPointerDown={(event) => startDrag(event, 'rotate')}
          />
        </div>
        </div>
      </div>

      <details className="print-area-advanced">
        <summary>Advanced</summary>
        <div className="print-area-advanced__grid">
          {model?.transformControls?.frontBack && (
            <label>
              <span>Surface offset</span>
              <input
                type="range"
                min={model.transformControls.frontBack.min}
                max={model.transformControls.frontBack.max}
                step={model.transformControls.frontBack.step}
                value={transform.frontBack}
                onChange={(e) =>
                  dispatch(
                    setTransform({
                      modelId,
                      transform: {
                        ...transform,
                        frontBack: Number(e.target.value),
                      },
                    })
                  )
                }
              />
            </label>
          )}
          {model?.transformControls?.decalDepth && (
            <label>
              <span>{depthLabel}</span>
              <input
                type="range"
                min={model.transformControls.decalDepth.min}
                max={model.transformControls.decalDepth.max}
                step={model.transformControls.decalDepth.step}
                value={transform.decalDepth}
                onChange={(e) =>
                  dispatch(
                    setTransform({
                      modelId,
                      transform: {
                        ...transform,
                        decalDepth: Number(e.target.value),
                      },
                    })
                  )
                }
              />
            </label>
          )}
        </div>
      </details>
    </section>
  );
}
