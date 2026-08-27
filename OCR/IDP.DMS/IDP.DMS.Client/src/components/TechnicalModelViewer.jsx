import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { uiApi } from "../services/uiApi";

const TECHNICAL_EXTENSIONS = new Set(["ifc", "stl", "obj", "step", "stp"]);

export default function TechnicalModelViewer({ documentId, fileName, title }) {
  const canvasHostRef = useRef(null);
  const runtimeRef = useRef(null);
  const objectMapRef = useRef(new Map());
  const [tree, setTree] = useState(null);
  const [selectedKey, setSelectedKey] = useState("");
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({ objects: 0, triangles: 0 });

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !documentId || !fileName) return undefined;
    let cancelled = false;
    setLoading(true);
    setProgress(2);
    setError("");
    setTree(null);
    setSelectedKey("");
    objectMapRef.current = new Map();

    const runtime = createViewerRuntime(host);
    runtimeRef.current = runtime;

    async function load() {
      try {
        const extension = getExtension(fileName);
        if (!TECHNICAL_EXTENSIONS.has(extension)) throw new Error(`Không hỗ trợ định dạng .${extension}.`);
        const blob = await uiApi.gd2.documentPdfBlob(documentId);
        if (cancelled) return;
        setProgress(18);
        const buffer = await blob.arrayBuffer();
        if (cancelled) return;

        const loaded = await loadModel(extension, buffer, percent => {
          if (!cancelled) setProgress(Math.max(20, Math.min(88, percent)));
        });
        if (cancelled) {
          loaded.dispose?.();
          disposeObject(loaded.object);
          return;
        }

        runtime.modelRoot.add(loaded.object);
        normalizeMaterials(loaded.object);
        objectMapRef.current = loaded.objectMap;
        const modelStats = calculateStats(loaded.object);
        if (modelStats.objects === 0) throw new Error("Mô hình không chứa đối tượng hình học có thể hiển thị.");
        runtime.fitToObject(loaded.object);
        runtime.disposeModel = loaded.dispose;
        setTree(loaded.tree);
        setStats(modelStats);
        setProgress(100);
        setLoading(false);
      } catch (loadError) {
        if (!cancelled) {
          setError(normalizeViewerError(loadError));
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      runtime.dispose();
      if (runtimeRef.current === runtime) runtimeRef.current = null;
    };
  }, [documentId, fileName]);

  useEffect(() => {
    const root = runtimeRef.current?.modelRoot;
    if (!root) return;
    root.traverse(object => {
      if (!object.isMesh) return;
      forEachMaterial(object.material, material => {
        if ("wireframe" in material) material.wireframe = wireframe;
      });
    });
  }, [wireframe, loading]);

  useEffect(() => {
    const root = runtimeRef.current?.modelRoot;
    if (!root) return;
    root.traverse(object => {
      if (!object.isMesh) return;
      forEachMaterial(object.material, material => {
        if (material.emissive && material.userData?.baseEmissive) {
          material.emissive.copy(material.userData.baseEmissive);
          material.emissiveIntensity = material.userData.baseEmissiveIntensity ?? 1;
        }
      });
    });
    const targets = objectMapRef.current.get(selectedKey) || [];
    targets.forEach(target => target.traverse(object => {
      if (!object.isMesh) return;
      forEachMaterial(object.material, material => {
        if (material.emissive) {
          material.emissive.set("#f59e0b");
          material.emissiveIntensity = 0.7;
        }
      });
    }));
  }, [selectedKey, loading]);

  function zoom(multiplier) {
    runtimeRef.current?.zoom(multiplier);
  }

  return (
    <div className="technical-viewer">
      <div className="technical-viewer-toolbar">
        <div>
          <strong>{title || "Mô hình kỹ thuật"}</strong>
          <span>{getExtension(fileName).toUpperCase()} · {stats.objects} đối tượng · {stats.triangles.toLocaleString("vi-VN")} tam giác</span>
        </div>
        <div className="technical-viewer-tools">
          <button type="button" onClick={() => zoom(0.78)} title="Phóng to">＋</button>
          <button type="button" onClick={() => zoom(1.28)} title="Thu nhỏ">−</button>
          <button type="button" onClick={() => runtimeRef.current?.resetView()} title="Đưa mô hình vừa khung">Vừa khung</button>
          <button type="button" className={wireframe ? "active" : ""} onClick={() => setWireframe(value => !value)}>Khung dây</button>
        </div>
      </div>
      <div className="technical-viewer-body">
        <aside className="technical-model-tree">
          <div className="technical-tree-title">Cây cấu trúc mô hình</div>
          {tree ? <ModelTreeNode node={tree} level={0} selectedKey={selectedKey} onSelect={setSelectedKey}/> : <div className="technical-tree-empty">Đang đọc cấu trúc...</div>}
        </aside>
        <div className="technical-canvas-wrap">
          <div ref={canvasHostRef} className="technical-canvas-host" />
          {loading && <div className="technical-viewer-overlay"><div className="technical-loader"/><strong>Đang tải mô hình 3D…</strong><span>{Math.round(progress)}%</span></div>}
          {error && <div className="technical-viewer-overlay error"><strong>Không mở được mô hình</strong><span>{error}</span></div>}
          {!loading && !error && <div className="technical-viewer-help">Chuột trái: xoay · Con lăn: zoom · Chuột phải: di chuyển</div>}
        </div>
      </div>
    </div>
  );
}

function ModelTreeNode({ node, level, selectedKey, onSelect }) {
  const [open, setOpen] = useState(level < 2);
  const children = node.children || [];
  return <div className="technical-tree-node">
    <button
      type="button"
      className={selectedKey === node.key ? "selected" : ""}
      style={{ paddingLeft: `${8 + level * 13}px` }}
      onClick={() => { if (children.length) setOpen(value => !value); onSelect(node.key); }}
      title={`${node.type || "Object"} · ${node.label}`}
    >
      <span className="technical-tree-chevron">{children.length ? (open ? "▾" : "▸") : "•"}</span>
      <span>{node.label}</span>
      {node.type && <small>{node.type}</small>}
    </button>
    {open && children.map(child => <ModelTreeNode key={child.key} node={child} level={level + 1} selectedKey={selectedKey} onSelect={onSelect}/>)}
  </div>;
}

function createViewerRuntime(host) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#0b1220");
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 10000000);
  camera.position.set(8, 6, 8);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  host.replaceChildren(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.screenSpacePanning = true;
  const modelRoot = new THREE.Group();
  scene.add(modelRoot);
  scene.add(new THREE.HemisphereLight(0xdbeafe, 0x334155, 2.4));
  const directional = new THREE.DirectionalLight(0xffffff, 2.8);
  directional.position.set(10, 16, 12);
  scene.add(directional);
  const axes = new THREE.AxesHelper(1.5);
  scene.add(axes);
  const grid = new THREE.GridHelper(10, 20, 0x475569, 0x1e293b);
  scene.add(grid);

  let homeView = null;
  let disposed = false;
  let animationFrame = 0;
  let disposeModel = null;

  function resize() {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(1, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  function animate() {
    if (disposed) return;
    controls.update();
    renderer.render(scene, camera);
    animationFrame = requestAnimationFrame(animate);
  }
  animate();

  function fitToObject(object) {
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const radius = Math.max(sphere.radius, 0.1);
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2));
    const direction = new THREE.Vector3(1, 0.72, 1).normalize();
    camera.near = Math.max(radius / 10000, 0.001);
    camera.far = Math.max(radius * 100, 1000);
    camera.position.copy(sphere.center).add(direction.multiplyScalar(distance * 1.18));
    controls.target.copy(sphere.center);
    controls.minDistance = radius * 0.02;
    controls.maxDistance = radius * 30;
    controls.update();
    grid.position.y = box.min.y;
    grid.scale.setScalar(Math.max(0.1, radius / 5));
    homeView = { position: camera.position.clone(), target: controls.target.clone() };
  }

  function resetView() {
    if (!homeView) return;
    camera.position.copy(homeView.position);
    controls.target.copy(homeView.target);
    controls.update();
  }

  function zoom(multiplier) {
    const offset = camera.position.clone().sub(controls.target).multiplyScalar(multiplier);
    camera.position.copy(controls.target).add(offset);
    controls.update();
  }

  function dispose() {
    disposed = true;
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    controls.dispose();
    disposeModel?.();
    disposeObject(modelRoot);
    renderer.dispose();
    renderer.domElement.remove();
  }

  return {
    modelRoot,
    fitToObject,
    resetView,
    zoom,
    dispose,
    get disposeModel() { return disposeModel; },
    set disposeModel(value) { disposeModel = value; }
  };
}

async function loadModel(extension, buffer, onProgress) {
  if (extension === "stl") return loadStl(buffer);
  if (extension === "obj") return loadObj(buffer);
  if (extension === "ifc") return loadIfc(buffer, onProgress);
  if (extension === "step" || extension === "stp") return loadStep(buffer, onProgress);
  throw new Error(`Định dạng .${extension} chưa được hỗ trợ.`);
}

function loadStl(buffer) {
  const geometry = new STLLoader().parse(buffer);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.08, roughness: 0.62 }));
  mesh.name = "STL Mesh";
  const objectMap = new Map([[`obj:${mesh.uuid}`, [mesh]]]);
  return { object: mesh, objectMap, tree: { key: `obj:${mesh.uuid}`, label: "Mô hình STL", type: "Mesh", children: [] } };
}

function loadObj(buffer) {
  const text = new TextDecoder().decode(buffer);
  const object = new OBJLoader().parse(text);
  object.name ||= "OBJ Model";
  const objectMap = new Map();
  const tree = buildObjectTree(object, objectMap);
  return { object, objectMap, tree };
}

async function loadIfc(buffer, onProgress) {
  onProgress?.(25);
  const [{ IfcAPI }, wasmModule] = await Promise.all([
    import("web-ifc"),
    import("web-ifc/web-ifc.wasm?url")
  ]);
  const wasmUrl = wasmModule.default;
  const api = new IfcAPI();
  await api.Init(path => path.endsWith(".wasm") ? wasmUrl : path, true);
  const modelId = api.OpenModel(new Uint8Array(buffer), { COORDINATE_TO_ORIGIN: true });
  const group = new THREE.Group();
  group.name = "IFC Model";
  const objectMap = new Map();
  let processed = 0;
  api.StreamAllMeshes(modelId, (flatMesh, index, total) => {
    for (let geometryIndex = 0; geometryIndex < flatMesh.geometries.size(); geometryIndex++) {
      const placed = flatMesh.geometries.get(geometryIndex);
      const source = api.GetGeometry(modelId, placed.geometryExpressID);
      try {
        const vertices = api.GetVertexArray(source.GetVertexData(), source.GetVertexDataSize());
        const indices = api.GetIndexArray(source.GetIndexData(), source.GetIndexDataSize());
        const positions = new Float32Array(vertices.length / 2);
        const normals = new Float32Array(vertices.length / 2);
        for (let sourceIndex = 0, targetIndex = 0; sourceIndex < vertices.length; sourceIndex += 6, targetIndex += 3) {
          positions[targetIndex] = vertices[sourceIndex];
          positions[targetIndex + 1] = vertices[sourceIndex + 1];
          positions[targetIndex + 2] = vertices[sourceIndex + 2];
          normals[targetIndex] = vertices[sourceIndex + 3];
          normals[targetIndex + 1] = vertices[sourceIndex + 4];
          normals[targetIndex + 2] = vertices[sourceIndex + 5];
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
        geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(indices), 1));
        const color = placed.color || { x: 0.55, y: 0.68, z: 0.82, w: 1 };
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(color.x, color.y, color.z),
          opacity: color.w ?? 1,
          transparent: (color.w ?? 1) < 0.99,
          side: THREE.DoubleSide,
          roughness: 0.72,
          metalness: 0.02
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.applyMatrix4(new THREE.Matrix4().fromArray(placed.flatTransformation));
        mesh.userData.expressID = flatMesh.expressID;
        mesh.userData.treeKey = `ifc:${flatMesh.expressID}`;
        group.add(mesh);
        addObjectMap(objectMap, mesh.userData.treeKey, mesh);
      } finally {
        source.delete();
      }
    }
    processed += 1;
    onProgress?.(30 + 48 * processed / Math.max(total || index + 1, 1));
  });
  const spatial = await api.properties.getSpatialStructure(modelId, true);
  const tree = normalizeIfcTree(spatial);
  api.CloseModel(modelId);
  api.Dispose();
  onProgress?.(88);
  return { object: group, objectMap, tree };
}

async function loadStep(buffer, onProgress) {
  onProgress?.(24);
  const [occtModule, wasmModule] = await Promise.all([
    import("occt-import-js"),
    import("occt-import-js/dist/occt-import-js.wasm?url")
  ]);
  const factory = occtModule.default || occtModule;
  const occt = await factory({ locateFile: () => wasmModule.default });
  onProgress?.(52);
  const result = occt.ReadStepFile(new Uint8Array(buffer), null);
  if (!result?.success) throw new Error("OpenCascade không thể chuyển đổi tệp STEP này.");
  const group = new THREE.Group();
  group.name = result.root?.name || "STEP Model";
  const objectMap = new Map();
  const meshObjects = [];
  result.meshes.forEach((source, index) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(source.attributes.position.array, 3));
    if (source.attributes.normal?.array) geometry.setAttribute("normal", new THREE.Float32BufferAttribute(source.attributes.normal.array, 3));
    else geometry.computeVertexNormals();
    geometry.setIndex(source.index.array);
    const color = source.color || [0.48, 0.68, 0.86];
    const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(color[0], color[1], color[2]), roughness: 0.62, metalness: 0.08 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = source.name || `Chi tiết ${index + 1}`;
    mesh.userData.treeKey = `step-mesh:${index}`;
    group.add(mesh);
    meshObjects[index] = mesh;
    addObjectMap(objectMap, mesh.userData.treeKey, mesh);
  });
  onProgress?.(86);
  return { object: group, objectMap, tree: normalizeStepTree(result.root, result.meshes, meshObjects, objectMap) };
}

function normalizeIfcTree(node) {
  if (!node) return { key: "ifc:root", label: "Mô hình IFC", type: "IFC", children: [] };
  const key = `ifc:${node.expressID}`;
  return {
    key,
    label: readIfcValue(node.Name) || readIfcValue(node.LongName) || `${node.type || "IFC Object"} #${node.expressID}`,
    type: node.type || "IFC",
    children: (node.children || []).map(normalizeIfcTree)
  };
}

function normalizeStepTree(node, meshes, meshObjects, objectMap, path = "root") {
  if (!node) return { key: "step:root", label: "Mô hình STEP", type: "Assembly", children: [] };
  const key = `step:${path}`;
  const directMeshes = (node.meshes || []).map(index => ({
    key: `step-mesh:${index}`,
    label: meshes[index]?.name || `Chi tiết ${index + 1}`,
    type: "Mesh",
    children: []
  }));
  const children = (node.children || []).map((child, index) => normalizeStepTree(child, meshes, meshObjects, objectMap, `${path}.${index}`));
  const descendants = [...directMeshes, ...children];
  const mappedObjects = collectStepObjects(node, meshObjects);
  if (mappedObjects.length) objectMap.set(key, mappedObjects);
  return { key, label: node.name || (path === "root" ? "Mô hình STEP" : "Cụm chi tiết"), type: path === "root" ? "Assembly" : "Part", children: descendants };
}

function collectStepObjects(node, meshObjects) {
  return [
    ...(node.meshes || []).map(index => meshObjects[index]).filter(Boolean),
    ...(node.children || []).flatMap(child => collectStepObjects(child, meshObjects))
  ];
}

function buildObjectTree(object, objectMap) {
  const key = `obj:${object.uuid}`;
  object.userData.treeKey = key;
  objectMap.set(key, [object]);
  return {
    key,
    label: object.name || (object.isMesh ? "Mesh" : "Nhóm đối tượng"),
    type: object.type,
    children: object.children.map(child => buildObjectTree(child, objectMap))
  };
}

function normalizeMaterials(root) {
  root.traverse(object => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(material => material.clone())
      : (object.material?.clone?.() || new THREE.MeshStandardMaterial({ color: 0x60a5fa }));
    forEachMaterial(object.material, material => {
      if (!material.emissive) return;
      material.userData.baseEmissive = material.emissive.clone();
      material.userData.baseEmissiveIntensity = material.emissiveIntensity;
    });
  });
}

function calculateStats(root) {
  let objects = 0;
  let triangles = 0;
  root.traverse(object => {
    if (!object.isMesh || !object.geometry) return;
    objects += 1;
    triangles += object.geometry.index
      ? object.geometry.index.count / 3
      : (object.geometry.attributes.position?.count || 0) / 3;
  });
  return { objects, triangles: Math.round(triangles) };
}

function disposeObject(root) {
  root.traverse(object => {
    object.geometry?.dispose?.();
    forEachMaterial(object.material, material => material.dispose?.());
  });
}

function forEachMaterial(material, callback) {
  if (Array.isArray(material)) material.forEach(callback);
  else if (material) callback(material);
}

function addObjectMap(map, key, object) {
  const current = map.get(key) || [];
  current.push(object);
  map.set(key, current);
}

function readIfcValue(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value.value != null) return String(value.value);
  return "";
}

function getExtension(fileName) {
  return String(fileName || "").split(".").pop()?.toLowerCase() || "";
}

function normalizeViewerError(error) {
  const message = error instanceof Error ? error.message : String(error || "Lỗi không xác định");
  if (/WebGL/i.test(message)) return "Trình duyệt hoặc thiết bị chưa hỗ trợ WebGL.";
  return message;
}
