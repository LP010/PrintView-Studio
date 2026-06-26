import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getGarmentOptions } from '../config/garmentModels';
import {
  getGarmentModelId,
  getUploadedModels,
  setModelId,
} from '../redux/slices/garmentSlice';

export function GarmentModelPicker() {
  const dispatch = useDispatch();
  const modelId = useSelector(getGarmentModelId);
  const uploadedModels = useSelector(getUploadedModels);
  const garmentOptions = useMemo(() => getGarmentOptions(), [uploadedModels]);

  return (
    <label className="garment-model-picker">
      <select
        value={modelId}
        onChange={(event) => dispatch(setModelId(event.target.value))}
        aria-label="Garment model"
      >
        {Object.entries(garmentOptions).map(([label, id]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
