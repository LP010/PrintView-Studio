import { useDispatch, useSelector } from 'react-redux';
import {
  getIsEditMode,
  setViewportMode,
} from '../redux/slices/editorSlice';

export function ModeToolbar() {
  const dispatch = useDispatch();
  const isEdit = useSelector(getIsEditMode);

  const setMode = (nextMode) => {
    dispatch(setViewportMode(nextMode));
  };

  return (
    <div className="mode-toolbar" role="tablist" aria-label="Viewport mode">
      <button
        type="button"
        role="tab"
        aria-selected={!isEdit}
        className={`mode-toolbar__btn${!isEdit ? ' is-active' : ''}`}
        onClick={() => setMode('preview')}
      >
        View
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={isEdit}
        className={`mode-toolbar__btn${isEdit ? ' is-active' : ''}`}
        onClick={() => setMode('edit')}
      >
        Edit
      </button>
    </div>
  );
}
