import { useDispatch, useSelector } from 'react-redux';
import {
  adjustDecalColorIntensity,
  getDecalColorIntensity,
} from '../redux/slices/editorSlice';
import {
  DECAL_COLOR_INTENSITY_MAX,
  DECAL_COLOR_INTENSITY_MIN,
  DECAL_COLOR_INTENSITY_STEP,
} from '../utils/decalMaterial';

export function DecalBrightnessControl() {
  const dispatch = useDispatch();
  const intensity = useSelector(getDecalColorIntensity);
  const percent = Math.round(intensity * 100);
  const atMin = intensity <= DECAL_COLOR_INTENSITY_MIN + 0.001;
  const atMax = intensity >= DECAL_COLOR_INTENSITY_MAX - 0.001;

  return (
    <div className="brightness-control">
      <div className="brightness-control__header">
        <span className="brightness-control__label">Pattern brightness</span>
        <span className="brightness-control__value">{percent}%</span>
      </div>
      <div className="brightness-control__actions">
        <button
          type="button"
          className="brightness-control__btn"
          onClick={() => dispatch(adjustDecalColorIntensity(-DECAL_COLOR_INTENSITY_STEP))}
          disabled={atMin}
          title="Dim pattern"
          aria-label="Dim pattern"
        >
          −
        </button>
        <button
          type="button"
          className="brightness-control__btn"
          onClick={() => dispatch(adjustDecalColorIntensity(DECAL_COLOR_INTENSITY_STEP))}
          disabled={atMax}
          title="Brighten pattern"
          aria-label="Brighten pattern"
        >
          +
        </button>
      </div>
    </div>
  );
}
