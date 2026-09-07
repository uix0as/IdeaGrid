import * as THREE from "three";
import { solarExposure, solarInfluences, solarReference } from "./influences";
import type { WorkspaceDocument } from "./model";

export function createInfluenceVisuals(doc: WorkspaceDocument) {
  const group = new THREE.Group();
  // Cap only the visual layer. Analysis still evaluates every target.
  for (const edge of solarInfluences(doc).slice(0, 24)) {
    const target = doc.items.find((i) => i.id === edge.to);
    const value = target ? solarExposure(target).value : undefined;
    const strength =
      value === undefined
        ? 0.5
        : Math.max(
            0.08,
            Math.min(1, Math.sqrt(value / solarReference.irradiance)),
          );
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(),
      ]),
      new THREE.LineBasicMaterial({
        color: 0xffd86a,
        transparent: true,
        opacity: strength * 0.7,
      }),
    );
    line.userData = { ...edge, kind: "beam" };
    group.add(line);
    for (let n = 0; n < 4; n++) {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        new THREE.MeshBasicMaterial({
          color: 0xffd86a,
          transparent: true,
          opacity: strength,
        }),
      );
      dot.userData = { ...edge, kind: "photon", phase: n / 4 };
      group.add(dot);
    }
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.9, 24),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: strength * 0.6,
      }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.userData = { ...edge, kind: "halo" };
    group.add(halo);
  }
  return group;
}
export function updateInfluenceVisuals(
  group: THREE.Group,
  objects: THREE.Group,
  elapsed: number,
) {
  const lookup = new Map(objects.children.map((o) => [o.userData.id, o]));
  for (const visual of group.children) {
    const from = lookup.get(visual.userData.from),
      to = lookup.get(visual.userData.to);
    if (!from || !to) continue;
    const a = from.position.clone().add(new THREE.Vector3(0, 0.8, 0)),
      b = to.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    if (visual instanceof THREE.Line) {
      const attribute = visual.geometry.getAttribute("position");
      attribute.setXYZ(0, a.x, a.y, a.z);
      attribute.setXYZ(1, b.x, b.y, b.z);
      attribute.needsUpdate = true;
      visual.geometry.computeBoundingSphere();
    } else if (visual.userData.kind === "photon")
      visual.position.lerpVectors(
        a,
        b,
        (elapsed * 0.35 + visual.userData.phase) % 1,
      );
    else {
      visual.position.copy(to.position).add(new THREE.Vector3(0, 0.05, 0));
      visual.scale.setScalar(1 + Math.sin(elapsed * 2) * 0.08);
    }
  }
}
