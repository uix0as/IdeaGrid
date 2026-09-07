"use client";
import { useEffect, useState } from "react";
import { Button, TextInput, Tile } from "@carbon/react";
import { blank, documentSchema, save, type WorkspaceDocument } from "./model";
import { createId } from "./id";
export function Dashboard() {
  const [projects, setProjects] = useState<WorkspaceDocument[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const docs: WorkspaceDocument[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("ideagrid:project:")) {
          const parsed = documentSchema.safeParse(
            JSON.parse(localStorage.getItem(key) ?? "null"),
          );
          if (parsed.success) docs.push(parsed.data);
        }
      }
      setProjects(docs);
    } catch {
      setError(
        "저장된 프로젝트를 읽지 못했습니다. 브라우저 저장소 접근을 확인하세요.",
      );
    }
  }, []);
  function create() {
    try {
      setError("");
      const doc = blank(createId());
      doc.name = name.trim() || "새 아이디어";
      save(doc);
      setProjects((previous) => [...previous, doc]);
      window.location.assign(`/projects/${doc.id}`);
    } catch {
      setError(
        "프로젝트 생성 또는 저장에 실패했습니다. 브라우저 저장 권한과 저장 공간을 확인하세요.",
      );
    }
  }
  return (
    <div className="foundation-page">
      <p className="foundation-page__eyebrow">IDEAGRID / WORKSPACE</p>
      <h1>아이디어 작업 공간</h1>
      <p className="foundation-page__description">
        객체를 배치하고 관계와 수치를 편집해 아이디어를 검토하세요. 프로젝트는
        현재 브라우저에 저장됩니다.
      </p>
      <div className="workspace-create">
        <TextInput
          id="project-name"
          labelText="프로젝트 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Button onClick={create}>새 프로젝트 만들기</Button>
      </div>
      {error && <p role="alert">{error}</p>}
      <h2>내 프로젝트</h2>
      {!projects.length && <p>첫 프로젝트를 만들어 편집을 시작하세요.</p>}
      <div className="workspace-projects">
        {projects.map((p) => (
          <Tile key={p.id}>
            <h3>{p.name}</h3>
            <p>
              객체 {p.items.length} · 관계 {p.links.length}
            </p>
            <Button kind="ghost" href={`/projects/${p.id}`}>
              편집하기
            </Button>
          </Tile>
        ))}
      </div>
    </div>
  );
}
