import { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { addUploadedModel } from '../redux/slices/garmentSlice';
import { setTransform } from '../redux/slices/editorSlice';
import { createUploadedModelRecord, readGlbMeshNames } from './glbUpload';
import { SidebarPanel } from './SidebarPanel';
import { StageViewport } from './StageViewport';

export default function MockupStudio() {
  const dispatch = useDispatch();
  const previewRef = useRef(null);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [designLabel, setDesignLabel] = useState('Sample print');
  const [designError, setDesignError] = useState('');
  const [modelLabel, setModelLabel] = useState('Upload GLB model');
  const [modelError, setModelError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  const handleDesignUpload = ({ name, previewUrl, error }) => {
    if (error) {
      setDesignError(error);
      return;
    }

    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
    }

    previewRef.current = previewUrl;
    setDesignError('');
    setDesignLabel(name);
  };

  const handleModelUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.glb')) {
      setModelError('Please select a .glb model file');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const meshNames = readGlbMeshNames(buffer);

      if (meshNames.length === 0) {
        throw new Error('This GLB has no usable mesh nodes');
      }

      const objectUrl = URL.createObjectURL(file);
      const record = createUploadedModelRecord(file, objectUrl, meshNames);

      dispatch(addUploadedModel(record));
      dispatch(
        setTransform({
          modelId: record.id,
          transform: { ...record.imageTransform },
        })
      );

      setModelLabel(file.name);
      setModelError('');
    } catch (error) {
      setModelError(error.message || 'GLB upload failed');
    }
  };

  return (
    <div className={`wrapper${sidebarCollapsed ? ' wrapper--sidebar-collapsed' : ''}`}>
      <SidebarPanel
        collapsed={sidebarCollapsed}
        onCollapse={() => setSidebarCollapsed(true)}
        designLabel={designLabel}
        designError={designError}
        modelLabel={modelLabel}
        modelError={modelError}
        onDesignUpload={handleDesignUpload}
        onModelUpload={handleModelUpload}
      />

      <StageViewport
        exporting={exporting}
        exportError={exportError}
        onExportStart={() => {
          setExportError('');
          setExporting(true);
        }}
        onExportEnd={() => setExporting(false)}
        onExportFail={(message = 'Download failed. Please try again.') => {
          setExporting(false);
          setExportError(message);
        }}
        sidebarCollapsed={sidebarCollapsed}
        onExpandSidebar={() => setSidebarCollapsed(false)}
      />
    </div>
  );
}
