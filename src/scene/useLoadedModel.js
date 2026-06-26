import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';

function indexSceneMeshes(root) {
  const nodes = {};
  const materials = {};
  let anonymousIndex = 0;

  root.traverse((child) => {
    if (!child.isMesh) {
      return;
    }

    const key = child.name || `mesh_${++anonymousIndex}`;
    if (!child.geometry.attributes.normal) {
      child.geometry.computeVertexNormals();
    }

    nodes[key] = child;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (mat?.name) {
        materials[mat.name] = mat;
      }
    });
  });

  return { nodes, materials };
}

export function useLoadedModel(url) {
  const gltf = useGLTF(url);

  return useMemo(() => {
    const graph = indexSceneMeshes(gltf.scene);
    return {
      scene: gltf.scene,
      nodes: graph.nodes,
      materials: graph.materials,
    };
  }, [gltf.scene]);
}
