import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getModelMeshes, getMeshPickerId } from '../config/garmentModels';
import {
  getEnabledMeshIds,
  getGarmentModelId,
  toggleMeshDecal,
} from '../redux/slices/garmentSlice';

export function PrintableSurfacePicker() {
  const dispatch = useDispatch();
  const modelId = useSelector(getGarmentModelId);
  const enabledMeshIds = useSelector(getEnabledMeshIds);
  const meshes = getModelMeshes(modelId).filter((mesh) => !mesh.previewOnly);
  const [expanded, setExpanded] = useState(false);

  if (meshes.length === 0) {
    return null;
  }

  return (
    <div className={`printable-panel ${expanded ? 'is-expanded' : 'is-collapsed'}`}>
      <button
        type="button"
        className="printable-panel-header"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
      >
        <div className="printable-panel-title">
          <h2>Surfaces</h2>
          <span className="printable-panel-count">{enabledMeshIds.length}/{meshes.length}</span>
        </div>
        <div className="printable-panel-meta">
          <span>Multi-select</span>
          <span className="printable-panel-chevron" aria-hidden="true" />
        </div>
      </button>
      {expanded && (
        <div className="printable-options">
          {meshes.map((mesh) => {
            const meshId = getMeshPickerId(mesh);

            return (
            <label key={meshId} className="printable-option">
              <input
                type="checkbox"
                checked={enabledMeshIds.includes(meshId)}
                onChange={() =>
                  dispatch(
                    toggleMeshDecal({
                      modelId,
                      meshId,
                    })
                  )
                }
              />
              <span>{mesh.node}{mesh.material ? ` · ${mesh.material}` : ''}</span>
            </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
