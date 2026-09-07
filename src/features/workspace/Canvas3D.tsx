"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { buildObject, disposeObject } from "./geometry";
import {
  createInfluenceVisuals,
  updateInfluenceVisuals,
} from "./InfluenceVisuals";
import { solarInfluences } from "./influences";
import type { Item, WorkspaceDocument } from "./model";
type Props = {
  doc: WorkspaceDocument;
  selected: string;
  select: (id: string) => void;
  update: (item: Item) => void;
  add: (asset: string, x: number, y: number) => void;
  connecting: boolean;
  highlighted: string[];
};
type Engine = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  orbit: OrbitControls;
  transform: TransformControls;
  objects: THREE.Group;
  links: THREE.Group;
  effects: THREE.Group;
};
export function Canvas3D(props: Props) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const latest = useRef(props);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState(true);
  const playback = useRef(true);
  useEffect(() => {
    playback.current = playing;
  }, [playing]);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (preference.matches) setPlaying(false);
    const change = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener("change", change);
    return () => preference.removeEventListener("change", change);
  }, []);
  const [mode, setMode] = useState<"translate" | "rotate" | "scale">(
    "translate",
  );
  useEffect(() => {
    latest.current = props;
  });
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
      });
    } catch {
      setError(
        "이 환경에서는 WebGL을 사용할 수 없습니다. 평면 보기에서 편집하세요.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    node.append(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121619);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 500);
    camera.position.set(18, 22, 25);
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0, 0);
    orbit.update();
    const transform = new TransformControls(camera, renderer.domElement);
    scene.add(transform.getHelper());
    transform.setTranslationSnap(0.5);
    const objects = new THREE.Group();
    const links = new THREE.Group();
    const effects = new THREE.Group();
    scene.add(objects, links, effects);
    scene.add(
      new THREE.GridHelper(100, 100, 0x525252, 0x273036),
      new THREE.HemisphereLight(0xffffff, 0x444444, 2),
    );
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(10, 20, 10);
    scene.add(light);
    engine.current = {
      scene,
      camera,
      renderer,
      orbit,
      transform,
      objects,
      links,
      effects,
    };
    transform.addEventListener("dragging-changed", (event) => {
      orbit.enabled = !event.value;
    });
    transform.addEventListener("mouseUp", () => {
      const object = transform.object;
      const item = latest.current.doc.items.find(
        (i) => i.id === object?.userData.id,
      );
      if (object && item)
        latest.current.update({
          ...item,
          x: object.position.x * 40 + 500,
          y: object.position.z * 40 + 400,
          elevation: object.position.y * 40,
          rotation: (object.rotation.y * 180) / Math.PI,
          scale: Math.max(
            0.2,
            Math.min(
              4,
              Math.max(object.scale.x, object.scale.y, object.scale.z),
            ),
          ),
        });
    });
    const ray = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let down = { x: 0, y: 0 };
    const pointerDown = (event: PointerEvent) => {
      down = { x: event.clientX, y: event.clientY };
    };
    const pick = (event: PointerEvent) => {
      if (
        Math.hypot(event.clientX - down.x, event.clientY - down.y) > 4 ||
        transform.axis
      )
        return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(objects.children, true)[0];
      let object = hit?.object;
      while (object && !object.userData.id) object = object.parent ?? undefined;
      if (object) latest.current.select(String(object.userData.id));
    };
    renderer.domElement.addEventListener("pointerdown", pointerDown);
    renderer.domElement.addEventListener("pointerup", pick);
    const dragOver = (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    };
    const drop = (event: DragEvent) => {
      event.preventDefault();
      const asset = event.dataTransfer?.getData("application/ideagrid-asset");
      if (!asset) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const point = ray.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3(),
      );
      if (point)
        latest.current.add(asset, point.x * 40 + 500, point.z * 40 + 400);
    };
    renderer.domElement.addEventListener("dragover", dragOver);
    renderer.domElement.addEventListener("drop", drop);
    const lost = (event: Event) => {
      event.preventDefault();
      setError(
        "3D 컨텍스트가 중단됐습니다. 평면 보기로 전환한 뒤 3D를 다시 열어 복구하세요.",
      );
    };
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const resize = new ResizeObserver(() => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    });
    resize.observe(node);
    let previous = performance.now(),
      elapsed = 0;
    renderer.setAnimationLoop(() => {
      const now = performance.now(),
        dt = Math.min((now - previous) / 1000, 0.1);
      previous = now;
      if (!document.hidden) {
        if (playback.current) elapsed += dt;
        updateInfluenceVisuals(effects, objects, elapsed);
        renderer.render(scene, camera);
      }
    });
    return () => {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      renderer.domElement.removeEventListener("pointerdown", pointerDown);
      renderer.domElement.removeEventListener("pointerup", pick);
      renderer.domElement.removeEventListener("dragover", dragOver);
      renderer.domElement.removeEventListener("drop", drop);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      transform.dispose();
      orbit.dispose();
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.transform.detach();
    disposeObject(e.objects);
    e.objects.clear();
    disposeObject(e.links);
    e.links.clear();
    props.doc.items.forEach((item) => {
      e.objects.add(
        buildObject(
          item,
          item.id === props.selected || props.highlighted.includes(item.id),
        ),
      );
    });
    disposeObject(e.effects);
    e.effects.clear();
    const nextEffects = createInfluenceVisuals(props.doc);
    for (const effect of [...nextEffects.children]) e.effects.add(effect);
    props.doc.links.forEach((link) => {
      const a = e.objects.children.find((o) => o.userData.id === link.from);
      const b = e.objects.children.find((o) => o.userData.id === link.to);
      if (!a || !b) return;
      const start = a.position.clone().add(new THREE.Vector3(0, 0.6, 0));
      const end = b.position.clone().add(new THREE.Vector3(0, 0.6, 0));
      const delta = end.clone().sub(start);
      if (delta.length() > 0)
        e.links.add(
          new THREE.ArrowHelper(
            delta.clone().normalize(),
            start,
            delta.length(),
            0x78a9ff,
            0.4,
            0.2,
          ),
        );
    });
    const selected = e.objects.children.find(
      (o) => o.userData.id === props.selected,
    );
    if (selected && !props.connecting) e.transform.attach(selected);
    e.transform.setMode(mode);
    e.transform.showX = mode !== "rotate";
    e.transform.showY = true;
    e.transform.showZ = mode !== "rotate";
  }, [props.doc, props.selected, props.highlighted, props.connecting, mode]);
  function preset(position: [number, number, number]) {
    const e = engine.current;
    if (e) {
      e.camera.position.set(...position);
      e.orbit.target.set(0, 0, 0);
      e.orbit.update();
    }
  }
  return (
    <section className="workspace-3d" aria-label="3D 편집 캔버스">
      <div className="workspace-canvas-tools">
        <button
          type="button"
          aria-pressed={playing}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? "영향 애니메이션 일시정지" : "영향 애니메이션 재생"}
        </button>
        <label>
          변환
          <select
            value={mode}
            onChange={(event) => {
              const value = event.target.value;
              if (
                value === "translate" ||
                value === "rotate" ||
                value === "scale"
              )
                setMode(value);
            }}
          >
            <option value="translate">이동</option>
            <option value="rotate">회전</option>
            <option value="scale">크기</option>
          </select>
        </label>
        <button type="button" onClick={() => preset([18, 22, 25])}>
          등각
        </button>
        <button type="button" onClick={() => preset([0, 35, 0.01])}>
          위
        </button>
        <button type="button" onClick={() => preset([0, 4, 35])}>
          정면
        </button>
        <button type="button" onClick={() => preset([35, 4, 0])}>
          오른쪽
        </button>
        <button
          type="button"
          onClick={() => {
            const e = engine.current;
            const object = e?.objects.children.find(
              (o) => o.userData.id === props.selected,
            );
            if (e && object) {
              e.orbit.target.copy(object.position);
              e.camera.position
                .copy(object.position)
                .add(new THREE.Vector3(5, 5, 5));
              e.orbit.update();
            }
          }}
        >
          선택 보기
        </button>
        <button
          type="button"
          onClick={() => {
            const e = engine.current;
            if (e) {
              e.renderer.render(e.scene, e.camera);
              const a = document.createElement("a");
              a.href = e.renderer.domElement.toDataURL("image/png");
              a.download = "ideagrid-scene.png";
              a.click();
            }
          }}
        >
          PNG 저장
        </button>
      </div>
      <p className="workspace-3d-help">
        드래그: 카메라 회전 · 휠: 확대 · 우클릭 드래그: 이동 · 객체 선택 후
        축으로 편집
      </p>
      {!!solarInfluences(props.doc).length && (
        <p className="workspace-3d-help">
          노란 광선·입자: 태양빛의 전달 방향 · 주황 고리: 영향 대상 (안전/위험
          등급 아님). 24개 관계까지 시각화합니다.
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <div className="workspace-3d-host" ref={host} />
    </section>
  );
}
