"use client";
import { useEffect, useState } from "react";
import {
  analysisKey,
  analysisSchema,
  documentSchema,
  download,
  storageKey,
  type Analysis,
  type WorkspaceDocument,
} from "./model";

export function Report({ projectId }: { projectId: string }) {
  const [result, setResult] = useState<Analysis | null>(null);
  const [snapshot, setSnapshot] = useState<WorkspaceDocument | null>(null);
  const [stale, setStale] = useState(false);
  const [message, setMessage] = useState("보고서를 불러오는 중…");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(analysisKey(projectId));
      if (!raw) {
        setMessage(
          "아직 분석하지 않았습니다. 편집기에서 아이디어 분석을 실행하세요.",
        );
        return;
      }
      const report = analysisSchema.parse(JSON.parse(raw));
      const scene = documentSchema.parse(JSON.parse(report.snapshot));
      setResult(report);
      setSnapshot(scene);
      const current = localStorage.getItem(storageKey(projectId));
      setStale(
        !current ||
          JSON.stringify(documentSchema.parse(JSON.parse(current))) !==
            report.snapshot,
      );
    } catch {
      setMessage(
        "저장된 보고서를 읽을 수 없습니다. 편집기에서 다시 분석하세요.",
      );
    }
  }, [projectId]);
  return (
    <article className="workspace-report">
      <a href={`/projects/${encodeURIComponent(projectId)}`}>
        편집기로 돌아가기
      </a>
      <h1>{snapshot?.name ?? "아이디어"} 분석 보고서</h1>
      <p>
        규칙 기반 로컬 분석 · AI·외부 검색 미연결 · 실현 가능성을 보증하지
        않습니다.
      </p>
      {!result || !snapshot ? (
        <p role="status">{message}</p>
      ) : (
        <>
          <p>분석 시각: {new Date(result.createdAt).toLocaleString("ko-KR")}</p>
          {stale && (
            <p role="status">
              현재 장면과 다른 과거 분석입니다. 아래 내용은 분석 당시 장면
              기준입니다.
            </p>
          )}
          <h2>분석 당시 아이디어</h2>
          <p>{snapshot.idea || "설명 없음"}</p>
          <p>
            객체 {snapshot.items.length}개 · 관계 {snapshot.links.length}개
          </p>
          <button type="button" onClick={() => window.print()}>
            인쇄 / PDF 저장
          </button>
          <button
            type="button"
            onClick={() =>
              download(
                `${snapshot.name}-분석.md`,
                `# ${snapshot.name}\n\n${result.createdAt}\n규칙 기반 분석 / AI 미연결\n\n${snapshot.idea}\n\n${result.findings.map((f) => `## ${f.type}: ${f.title}\n${f.detail}`).join("\n\n")}`,
                "text/markdown",
              )
            }
          >
            Markdown 내보내기
          </button>
          <h2>분석 결과</h2>
          {!result.findings.length && (
            <p>현재 규칙에서 발견된 항목이 없습니다.</p>
          )}
          {result.findings.map((f) => (
            <section key={f.id}>
              <h3>
                {f.type} · {f.title}
              </h3>
              <p>{f.detail}</p>
              <p>
                관련 객체:{" "}
                {f.objects
                  .map(
                    (id) => snapshot.items.find((i) => i.id === id)?.name ?? id,
                  )
                  .join(", ") || "장면 전체"}
              </p>
            </section>
          ))}
          <h2>분석 당시 객체와 입력값</h2>
          {snapshot.items.map((item) => (
            <section key={item.id}>
              <h3>{item.name}</h3>
              <ul>
                {item.properties.map((p) => (
                  <li key={p.id}>
                    {p.name}: {p.value || "미확인"} {p.unit} · 출처:{" "}
                    {p.source || "미확인"}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </article>
  );
}
