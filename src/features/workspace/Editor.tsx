"use client";
import { createId } from "./id";
import { AssetIcon } from "./AssetIcon";
import { getProfile } from "./assets";
import { InfluencePanel } from "./InfluencePanel";
import { useEffect, useRef, useState } from "react";
import { Button, Search, TextArea, TextInput } from "@carbon/react";
import {
  analyze,
  analysisKey,
  analysisSchema,
  blank,
  catalog,
  documentSchema,
  download,
  makeItem,
  save,
  sceneFingerprint,
  storageKey,
  type Analysis,
  type Item,
  type WorkspaceDocument,
} from "./model";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import dynamic from "next/dynamic";
const Canvas3D = dynamic(
  () => import("./Canvas3D").then((module) => module.Canvas3D),
  { ssr: false, loading: () => <p>3D 편집기를 불러오는 중…</p> },
);

export function Editor({ projectId }: { projectId: string }) {
  const [doc, setDoc] = useState<WorkspaceDocument>(() => blank(projectId));
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("불러오는 중");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [left, setLeft] = useState(true);
  const [right, setRight] = useState(true);
  const [tab, setTab] = useState<"object" | "analysis">("object");
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [connecting, setConnecting] = useState(false);
  const [source, setSource] = useState("");
  const [relation, setRelation] = useState("연결");
  const [result, setResult] = useState<Analysis | null>(null);
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const past = useRef<WorkspaceDocument[]>([]);
  const future = useRef<WorkspaceDocument[]>([]);
  const [historyTick, setHistoryTick] = useState(0);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey(projectId));
      if (raw) setDoc(documentSchema.parse(JSON.parse(raw)));
      setReady(true);
    } catch {
      setError(
        "저장된 프로젝트가 손상됐거나 읽기 권한이 없습니다. 원본을 덮어쓰지 않도록 편집을 중단했습니다.",
      );
    }
  }, [projectId]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(analysisKey(projectId));
      if (raw) setResult(analysisSchema.parse(JSON.parse(raw)));
    } catch {
      setError(
        "이전 분석을 불러올 수 없습니다. 장면은 유지됩니다. 다시 분석해 주세요.",
      );
    }
  }, [projectId]);
  useEffect(() => {
    if (!ready) return;
    setSaved("저장 중…");
    const timer = setTimeout(() => {
      try {
        save(doc);
        setSaved("이 브라우저에 저장됨");
      } catch {
        setSaved("저장 실패 — JSON으로 내보내세요");
      }
    }, 350);
    const flush = () => {
      try {
        save(doc);
      } catch {
        setSaved("저장 실패 — JSON으로 내보내세요");
      }
    };
    window.addEventListener("pagehide", flush);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("pagehide", flush);
    };
  }, [doc, ready]);
  function commit(next: WorkspaceDocument) {
    if (!documentSchema.safeParse(next).success) {
      setError(
        "저장 가능한 범위를 벗어났습니다. 객체는 최대 500개, 관계는 2,000개입니다. 입력값도 확인해 주세요.",
      );
      return;
    }
    setError("");
    setHighlighted([]);
    past.current = [...past.current.slice(-99), doc];
    future.current = [];
    setDoc(next);
    setHistoryTick((t) => t + 1);
  }
  function runAnalysis() {
    const next = {
      snapshot: sceneFingerprint(doc),
      findings: analyze(doc),
      createdAt: new Date().toISOString(),
    };
    setResult(next);
    setHighlighted([]);
    setTab("analysis");
    setRight(true);
    try {
      save(doc);
      localStorage.setItem(analysisKey(projectId), JSON.stringify(next));
    } catch {
      setError(
        "분석은 완료했지만 저장하지 못했습니다. JSON과 분석 Markdown을 내보내세요.",
      );
    }
  }
  function undo() {
    const previous = past.current.pop();
    if (previous) {
      future.current.push(doc);
      setDoc(previous);
      setHistoryTick((t) => t + 1);
    }
  }
  function redo() {
    const next = future.current.pop();
    if (next) {
      past.current.push(doc);
      setDoc(next);
      setHistoryTick((t) => t + 1);
    }
  }
  function add(
    asset: string,
    x = 120 + (doc.items.length % 6) * 140,
    y = 120 + Math.floor(doc.items.length / 6) * 120,
  ) {
    if (!catalog.some((c) => c[0] === asset)) return;
    const item = makeItem(
      asset,
      Math.max(0, Math.min(1480, Math.round(x / 20) * 20)),
      Math.max(0, Math.min(1000, Math.round(y / 20) * 20)),
    );
    commit({ ...doc, items: [...doc.items, item] });
    setSelected(item.id);
    setTab("object");
  }
  function select(id: string) {
    setSelected(id);
    if (connecting && source && source !== id) {
      commit({
        ...doc,
        links: [
          ...doc.links,
          { id: createId(), from: source, to: id, type: relation },
        ],
      });
      setSource("");
      setConnecting(false);
    } else if (connecting) setSource(id);
  }
  function update(item: Item) {
    commit({
      ...doc,
      items: doc.items.map((i) => (i.id === item.id ? item : i)),
    });
  }
  function move(id: string, x: number, y: number) {
    const item = doc.items.find((i) => i.id === id);
    if (item)
      update({
        ...item,
        x: Math.max(0, Math.min(1480, Math.round(x / 20) * 20)),
        y: Math.max(0, Math.min(1000, Math.round(y / 20) * 20)),
      });
  }
  function remove() {
    commit({
      ...doc,
      items: doc.items.filter((i) => i.id !== selected),
      links: doc.links.filter((l) => l.from !== selected && l.to !== selected),
    });
    setSelected("");
  }
  const item = doc.items.find((i) => i.id === selected);
  function suggest() {
    const found = catalog
      .filter(
        (c) =>
          (c[1].length > 1
            ? doc.idea.includes(c[1])
            : doc.idea.split(/\s+/).includes(c[1])) ||
          doc.idea
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .includes(c[0]),
      )
      .map((c) => c[0]);
    setSuggestions(
      found.length
        ? found
        : doc.mode === "system"
          ? ["user", "web", "api", "database"]
          : ["adult", "zone"],
    );
  }
  function exportProject() {
    download(
      `${doc.name}.json`,
      JSON.stringify(doc, null, 2),
      "application/json",
    );
  }
  const stale = result && result.snapshot !== sceneFingerprint(doc);
  if (!ready)
    return <div role="status">{error || "프로젝트를 불러오는 중입니다…"}</div>;
  return (
    <div className="workspace-editor" data-history={historyTick}>
      <header className="workspace-top">
        <TextInput
          id="workspace-name"
          labelText="프로젝트 이름"
          value={doc.name}
          onChange={(e) => {
            if (e.target.value) commit({ ...doc, name: e.target.value });
          }}
        />
        <span role="status">{saved}</span>
        <Button
          size="sm"
          kind="ghost"
          disabled={!past.current.length}
          onClick={undo}
        >
          실행 취소
        </Button>
        <Button
          size="sm"
          kind="ghost"
          disabled={!future.current.length}
          onClick={redo}
        >
          다시 실행
        </Button>
        <Button size="sm" kind="secondary" onClick={exportProject}>
          JSON 내보내기
        </Button>
        <Button
          size="sm"
          kind="ghost"
          onClick={() => fileInput.current?.click()}
        >
          JSON 가져오기
        </Button>
        <a href={`/projects/${encodeURIComponent(projectId)}/report`}>
          분석 보고서
        </a>
        <input
          ref={fileInput}
          hidden
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              if (file.size > 2_000_000) throw new Error("파일이 너무 큽니다");
              const imported = documentSchema.parse(
                JSON.parse(await file.text()),
              );
              commit({ ...imported, id: projectId });
              setResult(null);
              setError("");
            } catch {
              setError("프로젝트 JSON이 유효하지 않거나 2MB를 초과합니다.");
            }
            e.target.value = "";
          }}
        />
      </header>
      <div className="workspace-brief">
        <TextArea
          id="idea-brief"
          labelText="내 아이디어"
          rows={2}
          value={doc.idea}
          placeholder="어떤 아이디어를 구현해 보고 싶으세요?"
          onChange={(e) => commit({ ...doc, idea: e.target.value })}
        />
        <label>
          모드
          <select
            value={doc.mode}
            onChange={(e) =>
              commit({
                ...doc,
                mode: documentSchema.shape.mode.parse(e.target.value),
              })
            }
          >
            <option value="physical">물리</option>
            <option value="system">시스템</option>
            <option value="hybrid">혼합</option>
          </select>
        </label>
        <Button kind="tertiary" onClick={suggest}>
          장면 제안
        </Button>
        <Button onClick={runAnalysis}>아이디어 분석</Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {suggestions && (
        <div className="workspace-suggestions">
          <p>
            규칙 기반 장면 제안 · AI 미연결 · 추가할 객체:{" "}
            {suggestions
              .map((s) => catalog.find((c) => c[0] === s)?.[1])
              .join(", ")}
          </p>
          <Button
            size="sm"
            onClick={() => {
              const items = suggestions.map((s, i) =>
                makeItem(s, 100 + (i % 6) * 150, 100 + Math.floor(i / 6) * 140),
              );
              commit({ ...doc, items: [...doc.items, ...items] });
              setSuggestions(null);
            }}
          >
            장면에 추가
          </Button>
          <Button size="sm" kind="ghost" onClick={() => setSuggestions(null)}>
            거절
          </Button>
        </div>
      )}
      <div className="workspace-toolbar">
        <Button size="sm" kind="ghost" onClick={() => setLeft(!left)}>
          {left ? "자산 접기" : "자산 열기"}
        </Button>
        <Button
          size="sm"
          kind={connecting ? "primary" : "tertiary"}
          onClick={() => {
            setConnecting(!connecting);
            setSource("");
          }}
        >
          {connecting ? "연결 취소" : "객체 연결"}
        </Button>
        <label>
          관계
          <select
            value={relation}
            onChange={(e) => setRelation(e.target.value)}
          >
            {[
              "연결",
              "의존",
              "전력 공급",
              "보호",
              "데이터 흐름",
              "포함",
              "가열",
              "냉각",
              "통신",
              "이동",
              "차단",
              "지지",
              "사용자 정의",
            ].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <span>
          {connecting
            ? source
              ? "대상 객체를 선택하세요"
              : "출발 객체를 선택하세요"
            : "드래그 이동 · 방향키 이동 · 20단위 스냅"}
        </span>
        <Button size="sm" kind="ghost" onClick={() => setRight(!right)}>
          {right ? "속성 접기" : "속성 열기"}
        </Button>
      </div>
      <div className="workspace-body">
        {left && (
          <aside className="workspace-library">
            <h2>자산 라이브러리</h2>
            <Search
              id="asset-search"
              labelText="자산 검색"
              placeholder="우주, 사람, API…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="workspace-assets">
              {catalog
                .filter((c) =>
                  c.join(" ").toLowerCase().includes(query.toLowerCase()),
                )
                .map((c) => (
                  <button
                    type="button"
                    key={c[0]}
                    draggable
                    onDragStart={(e) =>
                      e.dataTransfer.setData("application/ideagrid-asset", c[0])
                    }
                    onClick={() => add(c[0])}
                  >
                    <AssetIcon asset={c[0]} />
                    {c[1]}
                    <small>{c[2]}</small>
                    <small>
                      {getProfile(c[0]).pairs.length
                        ? "한도 검사 지원"
                        : "역할·입력 범위 확인"}
                    </small>
                  </button>
                ))}
            </div>
            <h3>장면 객체 {doc.items.length}</h3>
            {doc.items.map((i) => (
              <button
                className="workspace-outline"
                type="button"
                key={i.id}
                onClick={() => select(i.id)}
                aria-pressed={selected === i.id}
              >
                {i.name}
              </button>
            ))}
          </aside>
        )}
        <div className="workspace-view">
          <InfluencePanel doc={doc} add={add} />
          <div className="workspace-tabs">
            <Button
              size="sm"
              kind={view === "3d" ? "primary" : "ghost"}
              onClick={() => setView("3d")}
            >
              3D 보기
            </Button>
            <Button
              size="sm"
              kind={view === "2d" ? "primary" : "ghost"}
              onClick={() => setView("2d")}
            >
              평면 보기 / 드래그 배치
            </Button>
          </div>
          {view === "3d" ? (
            <Canvas3D
              doc={doc}
              selected={selected}
              select={select}
              update={update}
              add={add}
              connecting={connecting}
              highlighted={highlighted}
            />
          ) : (
            <Canvas
              doc={doc}
              selected={selected}
              select={select}
              move={move}
              add={add}
              connect={connecting}
              highlighted={highlighted}
            />
          )}
        </div>
        {right && (
          <aside className="workspace-context">
            <div className="workspace-tabs">
              <Button
                kind={tab === "object" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setTab("object")}
              >
                객체
              </Button>
              <Button
                kind={tab === "analysis" ? "primary" : "ghost"}
                size="sm"
                onClick={() => setTab("analysis")}
              >
                분석
              </Button>
            </div>
            {tab === "object" ? (
              <>
                <Inspector
                  key={item?.id}
                  hasSun={doc.items.some((i) => i.asset === "sun")}
                  item={item}
                  update={update}
                  remove={remove}
                  duplicate={() => {
                    if (item) {
                      const clone = {
                        ...item,
                        properties: item.properties.map((p) => ({ ...p })),
                        id: createId(),
                        x: item.x + 40,
                        y: item.y + 40,
                        name: `${item.name} 복사`,
                      };
                      commit({ ...doc, items: [...doc.items, clone] });
                      setSelected(clone.id);
                    }
                  }}
                />
                <h3>관계 {doc.links.length}</h3>
                {doc.links.map((l) => (
                  <div key={l.id}>
                    <p>
                      {doc.items.find((i) => i.id === l.from)?.name} →{" "}
                      {doc.items.find((i) => i.id === l.to)?.name} · {l.type}
                    </p>
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() =>
                        commit({
                          ...doc,
                          links: doc.links.filter((x) => x.id !== l.id),
                        })
                      }
                    >
                      관계 삭제
                    </Button>
                  </div>
                ))}
              </>
            ) : (
              <>
                <h2>규칙 기반 분석</h2>
                <p>
                  AI·외부 검색 미연결. 자산별 처리량·지연·저장·예산·적재·장비
                  온도·유량 한도, 전력 공급 합계·순환 의존을 검사합니다. 빈 값은
                  계산하지 않습니다.
                </p>
                {!result ? (
                  <p>아이디어 분석을 실행하면 결과가 표시됩니다.</p>
                ) : (
                  <>
                    {stale && <p role="status">장면이 변경됨 — 재분석 필요</p>}
                    {!result.findings.length && (
                      <p>
                        현재 규칙에서 발견된 항목이 없습니다. 실현 가능성을
                        보증하지 않습니다.
                      </p>
                    )}
                    {result.findings.map((f) => (
                      <details key={f.id} className="workspace-finding">
                        <summary>
                          {f.type} · {f.title}
                        </summary>
                        <p>{f.detail}</p>
                        <Button
                          kind="ghost"
                          size="sm"
                          disabled={!!stale}
                          onClick={() => {
                            setHighlighted(f.objects);
                            setSelected(f.objects[0] ?? "");
                          }}
                        >
                          관련 객체 강조
                        </Button>
                      </details>
                    ))}
                    <Button
                      kind="tertiary"
                      size="sm"
                      onClick={() =>
                        download(
                          `${doc.name}-분석.md`,
                          `# ${doc.name}\n\n규칙 기반 분석 / AI 미연결\n${stale ? "장면 변경됨: 과거 snapshot 결과\n" : ""}\n${result.findings.map((f) => `## ${f.type}: ${f.title}\n${f.detail}`).join("\n\n")}`,
                          "text/markdown",
                        )
                      }
                    >
                      분석 Markdown 내보내기
                    </Button>
                  </>
                )}
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
