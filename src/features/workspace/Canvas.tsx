"use client";
import { useRef, useState } from "react";
import type { Item, WorkspaceDocument } from "./model";
import { AssetIcon } from "./AssetIcon";
import { solarInfluences } from "./influences";
export function Canvas({
  doc,
  selected,
  select,
  move,
  add,
  connect,
  highlighted,
}: {
  doc: WorkspaceDocument;
  selected: string;
  select: (id: string) => void;
  move: (id: string, x: number, y: number) => void;
  add: (asset: string, x: number, y: number) => void;
  connect: boolean;
  highlighted: string[];
}) {
  const area = useRef<HTMLFieldSetElement>(null);
  const drag = useRef<{
    id: string;
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);
  const [preview, setPreview] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [playing, setPlaying] = useState(true);
  const location = (item: Item) => (preview?.id === item.id ? preview : item);
  return (
    <section className="workspace-canvas-section" aria-label="작업 캔버스">
      <div className="workspace-canvas-tools">
        <button type="button" onClick={() => setPlaying(!playing)}>
          {playing ? "영향 애니메이션 일시정지" : "영향 애니메이션 재생"}
        </button>
        <span>평면 배치 · 1칸 = 40 화면 단위</span>
        <label>
          확대{" "}
          <input
            aria-label="캔버스 확대"
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
        </label>
        <button type="button" onClick={() => setZoom(1)}>
          100%
        </button>
      </div>
      <div className="workspace-canvas-scroll">
        <fieldset
          ref={area}
          aria-label="객체 배치 영역"
          className="workspace-canvas"
          style={{
            width: 1600 * zoom,
            height: 1100 * zoom,
            border: 0,
            margin: 0,
            padding: 0,
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const asset = e.dataTransfer.getData("application/ideagrid-asset");
            const rect = area.current?.getBoundingClientRect();
            if (asset && rect)
              add(
                asset,
                (e.clientX - rect.left) / zoom,
                (e.clientY - rect.top) / zoom,
              );
          }}
        >
          <svg
            width={1600 * zoom}
            height={1100 * zoom}
            className="workspace-links"
            aria-label="객체 간 관계"
          >
            <title>객체 관계</title>
            <defs>
              <marker
                id="link-arrow"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L9,3 z" fill="#78a9ff" />
              </marker>
            </defs>
            {solarInfluences(doc)
              .slice(0, 24)
              .map((edge) => {
                const a = doc.items.find((i) => i.id === edge.from),
                  b = doc.items.find((i) => i.id === edge.to);
                if (!a || !b) return null;
                const p = location(a),
                  q = location(b);
                return (
                  <g key={`${edge.from}-${edge.to}`}>
                    <line
                      className="workspace-solar-beam"
                      style={{
                        animationPlayState: playing ? "running" : "paused",
                      }}
                      x1={(p.x + 45) * zoom}
                      y1={(p.y + 30) * zoom}
                      x2={(q.x + 45) * zoom}
                      y2={(q.y + 30) * zoom}
                      stroke="#ffd86a"
                      strokeWidth="4"
                      strokeDasharray="8 12"
                    />
                    <text
                      x={((p.x + q.x) / 2 + 45) * zoom}
                      y={((p.y + q.y) / 2 + 12) * zoom}
                      fill="#ffd86a"
                      fontSize="12"
                    >
                      태양빛 → (개념 표현)
                    </text>
                  </g>
                );
              })}
            {doc.links.map((link) => {
              const a = doc.items.find((i) => i.id === link.from);
              const b = doc.items.find((i) => i.id === link.to);
              if (!a || !b) return null;
              const p = location(a);
              const q = location(b);
              return (
                <g key={link.id}>
                  <line
                    x1={(p.x + 45) * zoom}
                    y1={(p.y + 30) * zoom}
                    x2={(q.x + 45) * zoom}
                    y2={(q.y + 30) * zoom}
                    stroke="#78a9ff"
                    strokeWidth="2"
                    markerEnd="url(#link-arrow)"
                  />
                  <text
                    x={((p.x + q.x) / 2 + 45) * zoom}
                    y={((p.y + q.y) / 2 + 20) * zoom}
                    fill="#a6c8ff"
                    fontSize="12"
                  >
                    {link.type}
                  </text>
                </g>
              );
            })}
          </svg>
          {!doc.items.length && (
            <div className="workspace-empty">
              <h2>여기에 아이디어를 배치하세요</h2>
              <p>왼쪽 자산을 클릭하거나 이 격자에 끌어 놓으세요.</p>
              <p>객체를 움직이고 오른쪽에서 속성을 편집할 수 있습니다.</p>
            </div>
          )}
          {doc.items.map((item) => {
            const p = location(item);
            return (
              <button
                key={item.id}
                type="button"
                className={`workspace-object ${selected === item.id ? "is-selected" : ""} ${highlighted.includes(item.id) ? "is-highlighted" : ""}`}
                style={{
                  left: p.x * zoom,
                  top: p.y * zoom,
                  transform: `rotate(${item.rotation}deg) scale(${item.scale * zoom})`,
                }}
                aria-label={`${item.name} 선택`}
                onClick={() => select(item.id)}
                onKeyDown={(e) => {
                  const offsets: Record<string, [number, number]> = {
                    ArrowLeft: [-20, 0],
                    ArrowRight: [20, 0],
                    ArrowUp: [0, -20],
                    ArrowDown: [0, 20],
                  };
                  const offset = offsets[e.key];
                  if (offset) {
                    e.preventDefault();
                    move(item.id, item.x + offset[0], item.y + offset[1]);
                  }
                }}
                onPointerDown={(e) => {
                  if (connect) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = {
                    id: item.id,
                    x: e.clientX,
                    y: e.clientY,
                    ox: item.x,
                    oy: item.y,
                  };
                }}
                onPointerMove={(e) => {
                  const d = drag.current;
                  if (d?.id === item.id)
                    setPreview({
                      id: item.id,
                      x: d.ox + (e.clientX - d.x) / zoom,
                      y: d.oy + (e.clientY - d.y) / zoom,
                    });
                }}
                onPointerCancel={() => {
                  drag.current = null;
                  setPreview(null);
                }}
                onPointerUp={(e) => {
                  const d = drag.current;
                  if (
                    d?.id === item.id &&
                    (Math.abs(e.clientX - d.x) > 3 ||
                      Math.abs(e.clientY - d.y) > 3)
                  )
                    move(
                      item.id,
                      d.ox + (e.clientX - d.x) / zoom,
                      d.oy + (e.clientY - d.y) / zoom,
                    );
                  drag.current = null;
                  setPreview(null);
                }}
              >
                <span
                  className={`workspace-symbol ${["sun", "moon", "planet", "sphere"].includes(item.asset) ? "round" : ""}`}
                >
                  <AssetIcon asset={item.asset} size={24} />
                </span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </fieldset>
      </div>
    </section>
  );
}
