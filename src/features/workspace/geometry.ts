import * as THREE from "three";
import { catalog, type Item } from "./model";
export function buildObject(item: Item, highlighted: boolean) {
  const root = new THREE.Group();
  root.userData.id = item.id;
  const category = catalog.find((c) => c[0] === item.asset)?.[2];
  const color = highlighted
    ? 0xf1c21b
    : category === "우주"
      ? 0xffa24b
      : category === "사람"
        ? 0x42be65
        : 0x4589ff;
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.1,
  });
  function mesh(geometry: THREE.BufferGeometry, x = 0, y = 0.6, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    root.add(m);
    return m;
  }
  if (["sphere", "sun", "moon", "planet"].includes(item.asset))
    mesh(new THREE.SphereGeometry(0.7, 24, 16), 0, 0.7);
  else if (
    category === "사람" ||
    ["user", "astronaut", "suit", "robot"].includes(item.asset)
  ) {
    mesh(new THREE.SphereGeometry(0.22, 12, 8), 0, 1.65);
    mesh(new THREE.BoxGeometry(0.6, 0.75, 0.3), 0, 1.05);
    mesh(new THREE.BoxGeometry(0.2, 0.65, 0.25), -0.18, 0.32);
    mesh(new THREE.BoxGeometry(0.2, 0.65, 0.25), 0.18, 0.32);
    mesh(new THREE.BoxGeometry(0.18, 0.7, 0.25), -0.42, 1);
    mesh(new THREE.BoxGeometry(0.18, 0.7, 0.25), 0.42, 1);
  } else if (
    [
      "cylinder",
      "database",
      "heat",
      "cache",
      "storage",
      "backup",
      "tank",
      "pump",
    ].includes(item.asset)
  )
    mesh(new THREE.CylinderGeometry(0.65, 0.65, 1.2, 20));
  else if (["rocket", "cone"].includes(item.asset)) {
    mesh(new THREE.ConeGeometry(0.6, 1, 16), 0, 1.5);
    mesh(new THREE.CylinderGeometry(0.6, 0.6, 1, 16), 0, 0.5);
  } else if (["satellite", "station", "spacecraft"].includes(item.asset)) {
    mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8));
    mesh(new THREE.BoxGeometry(3, 0.08, 0.8));
  } else if (item.asset === "battery") {
    mesh(new THREE.BoxGeometry(1.1, 1.5, 0.65), 0, 0.75);
    mesh(new THREE.BoxGeometry(0.45, 0.15, 0.35), 0, 1.575);
  } else if (item.asset === "solar") {
    mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.8, 8), 0, 0.4);
    mesh(new THREE.BoxGeometry(2, 0.08, 1.3), 0, 0.9).rotation.z = 0.3;
  } else if (item.asset === "wind") {
    mesh(new THREE.CylinderGeometry(0.08, 0.18, 2, 10), 0, 1);
    for (let n = 0; n < 3; n++) {
      const angle = (n * Math.PI * 2) / 3;
      const blade = mesh(
        new THREE.BoxGeometry(0.12, 1.15, 0.08),
        Math.sin(angle) * 0.55,
        2 + Math.cos(angle) * 0.55,
        0.15,
      );
      blade.rotation.z = -angle;
    }
  } else if (item.asset === "vehicle" || item.asset === "conveyor") {
    mesh(new THREE.BoxGeometry(2, 0.65, 1), 0, 0.6);
    for (const x of [-0.65, 0.65])
      for (const z of [-0.55, 0.55])
        mesh(
          new THREE.CylinderGeometry(0.25, 0.25, 0.2, 12),
          x,
          0.25,
          z,
        ).rotation.x = Math.PI / 2;
  } else if (item.asset === "drone") {
    mesh(new THREE.BoxGeometry(0.7, 0.3, 0.7), 0, 0.5);
    mesh(new THREE.BoxGeometry(1.8, 0.08, 0.12), 0, 0.55);
    mesh(new THREE.BoxGeometry(0.12, 0.08, 1.8), 0, 0.55);
    for (const [x, z] of [
      [-0.9, 0],
      [0.9, 0],
      [0, -0.9],
      [0, 0.9],
    ])
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 12), x, 0.65, z);
  } else if (item.asset === "camera") {
    mesh(new THREE.BoxGeometry(1, 0.7, 0.6));
    mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16),
      0,
      0.6,
      0.4,
    ).rotation.x = Math.PI / 2;
  } else if (item.asset === "barrier")
    mesh(new THREE.BoxGeometry(2, 1.6, 0.2), 0, 0.8);
  else if (["zone", "plane", "room"].includes(item.asset))
    mesh(new THREE.BoxGeometry(2, 0.1, 2), 0, 0.05);
  else if (["mobile", "web", "browser", "label"].includes(item.asset))
    mesh(new THREE.BoxGeometry(1.4, 1, 0.15));
  else mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2));
  root.position.set(
    (item.x - 500) / 40,
    item.elevation / 40,
    (item.y - 400) / 40,
  );
  root.rotation.y = (item.rotation * Math.PI) / 180;
  root.scale.setScalar(item.scale);
  return root;
}
export function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];
      materials.forEach((m) => {
        m.dispose();
      });
    }
  });
}
