import { useDispatch, useSelector } from 'react-redux';
import { Leva } from 'leva';
import { ModeToolbar } from '../components/ModeToolbar';
import { GarmentModelPicker } from '../components/GarmentModelPicker';
import { DecalBrightnessControl } from '../components/DecalBrightnessControl';
import { PrintableSurfacePicker } from '../components/PrintableSurfacePicker';
import { PrintAreaEditor } from '../components/PrintAreaEditor';
import { getImageSelector, setImage } from '../redux/slices/imageUploadSlice';
import { getIsEditMode } from '../redux/slices/editorSlice';
import { levaPanelTheme } from './levaPanelTheme';

const SUPPORTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml'];

export function SidebarPanel({
  collapsed,
  onCollapse,
  designLabel,
  designError,
  modelLabel,
  modelError,
  onDesignUpload,
  onModelUpload,
}) {
  const dispatch = useDispatch();
  const editMode = useSelector(getIsEditMode);
  const design = useSelector(getImageSelector);

  const handleDesignChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      onDesignUpload({ error: 'Please select a PNG, JPG, or SVG image' });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const probe = new Image();

    probe.onload = () => {
      onDesignUpload({
        name: file.name,
        previewUrl,
        width: probe.width,
        height: probe.height,
      });

      dispatch(
        setImage({
          image: previewUrl,
          preview: true,
          width: probe.width,
          height: probe.height,
        })
      );
    };

    probe.src = previewUrl;
  };

  const handleModelChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    onModelUpload(file);
    event.target.value = '';
  };

  if (collapsed) {
    return null;
  }

  return (
    <aside className="sidebar">
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onCollapse}
        aria-label="Collapse sidebar"
        title="Collapse sidebar"
      >
        <span className="sidebar-toggle-chevron" aria-hidden="true" />
      </button>

      <div className="sidebar-content">
        <div className="sidebar-top">
          <div className="sidebar-header">
            <p className="eyebrow">PrintView</p>
            <h1>Studio</h1>
            <p className="sidebar-tagline">3D print preview</p>
          </div>
          <ModeToolbar />
        </div>

        <section className="sidebar-section sidebar-section--assets">
          <h2 className="sidebar-section__title">Assets</h2>
          <div className="sidebar-assets">
            <div className="sidebar-assets__block">
              <span className="sidebar-assets__label">Model</span>
              <GarmentModelPicker />
              <label htmlFor="model-upload" className="sidebar-assets__link">
                <input
                  type="file"
                  accept=".glb,model/gltf-binary"
                  onChange={handleModelChange}
                  className="input"
                  id="model-upload"
                />
                Upload GLB
              </label>
              {(modelLabel !== 'Upload GLB model' || modelError) && (
                <p className={`sidebar-assets__meta${modelError ? ' sidebar-assets__meta--error' : ''}`}>
                  {modelError || modelLabel}
                </p>
              )}
            </div>

            <div className="sidebar-assets__divider" aria-hidden="true" />

            <div className="sidebar-assets__block">
              <span className="sidebar-assets__label">Design</span>
              <label htmlFor="file-upload" className="custum-file-upload custum-file-upload--compact">
                <div className="upload-preview" aria-hidden="true">
                  {design.image ? (
                    <img src={design.image} alt="" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="" xmlns="http://www.w3.org/2000/svg">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10 1C9.73478 1 9.48043 1.10536 9.29289 1.29289L3.29289 7.29289C3.10536 7.48043 3 7.73478 3 8V20C3 21.6569 4.34315 23 6 23H7C7.55228 23 8 22.5523 8 22C8 21.4477 7.55228 21 7 21H6C5.44772 21 5 20.5523 5 20V9H10C10.5523 9 11 8.55228 11 8V3H18C18.5523 3 19 3.44772 19 4V9C19 9.55228 19.4477 10 20 10C20.5523 10 21 9.55228 21 9V4C21 2.34315 19.6569 1 18 1H10ZM9 7H6.41421L9 4.41421V7ZM14 15.5C14 14.1193 15.1193 13 16.5 13C17.8807 13 19 14.1193 19 15.5V16V17H20C21.1046 17 22 17.8954 22 19C22 20.1046 21.1046 21 20 21H13C11.8954 21 11 20.1046 11 19C11 17.8954 11.8954 17 13 17H14V16V15.5ZM16.5 11C14.142 11 12.2076 12.8136 12.0156 15.122C10.2825 15.5606 9 17.1305 9 19C9 21.2091 10.7909 23 13 23H20C22.2091 23 24 21.2091 24 19C24 17.1305 22.7175 15.5606 20.9844 15.122C20.7924 12.8136 18.858 11 16.5 11Z"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml"
                  onChange={handleDesignChange}
                  className="input"
                  id="file-upload"
                />
                <div className="text">
                  <span>{designLabel}</span>
                  <small>{designError || 'PNG / JPG / SVG'}</small>
                </div>
              </label>
              <DecalBrightnessControl />
            </div>
          </div>
        </section>

        {editMode ? (
          <section className="sidebar-section sidebar-section--grow">
            <h2 className="sidebar-section__title">Print area</h2>
            <div className="sidebar-section__body">
              <PrintableSurfacePicker />
              <PrintAreaEditor />
            </div>
          </section>
        ) : (
          <section className="sidebar-section sidebar-section--grow">
            <h2 className="sidebar-section__title">Scene</h2>
            <div className="sidebar-section__body settings-panel settings-panel--embedded">
              <Leva
                fill
                flat
                collapsed={false}
                oneLineLabels
                hideCopyButton
                titleBar={{
                  title: 'Background',
                  filter: false,
                  drag: false,
                }}
                theme={levaPanelTheme}
              />
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}
