import { z } from "zod";
import { createId } from "./id";
import { catalog, getProfile } from "./assets";
import { evaluateCapabilities } from "./rules";
import { solarFindings, solarInfluences } from "./influences";
export { catalog } from "./assets";

const propertySchema = z.object({
  key: z.string().optional(),
  id: z.string(),
  name: z.string(),
  value: z.string(),
  unit: z.string(),
  source: z.string(),
});
const itemSchema = z.object({
  id: z.string(),
  asset: z.string(),
  name: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  elevation: z.number().finite().default(0),
  rotation: z.number().finite(),
  scale: z.number().min(0.2).max(4),
  properties: z.array(propertySchema),
});
export const documentSchema = z
  .object({
    version: z.literal(1),
    id: z.string(),
    name: z.string().min(1),
    idea: z.string(),
    mode: z.enum(["physical", "system", "hybrid"]),
    items: z.array(itemSchema).max(500),
    links: z
      .array(
        z.object({
          id: z.string(),
          from: z.string(),
          to: z.string(),
          type: z.string(),
        }),
      )
      .max(2000),
  })
  .superRefine((doc, ctx) => {
    const ids = new Set(doc.items.map((i) => i.id));
    if (
      ids.size !== doc.items.length ||
      new Set(doc.links.map((l) => l.id)).size !== doc.links.length ||
      doc.items.some(
        (i) =>
          new Set(i.properties.map((p) => p.id)).size !== i.properties.length,
      ) ||
      doc.links.some((l) => !ids.has(l.from) || !ids.has(l.to))
    )
      ctx.addIssue({
        code: "custom",
        message: "중복 객체 또는 끊어진 관계가 있습니다.",
      });
  });
export type WorkspaceDocument = z.infer<typeof documentSchema>;
export function sceneFingerprint(doc: WorkspaceDocument) {
  return JSON.stringify(documentSchema.parse(doc));
}
export type Item = WorkspaceDocument["items"][number];
const findingSchema = z.object({
  id: z.string(),
  type: z.enum(["가정", "위험", "한계점"]),
  title: z.string(),
  detail: z.string(),
  objects: z.array(z.string()),
});
export type Finding = z.infer<typeof findingSchema>;
export const analysisSchema = z.object({
  snapshot: z.string(),
  findings: z.array(findingSchema),
  createdAt: z.string(),
});
export type Analysis = z.infer<typeof analysisSchema>;
export const analysisKey = (id: string) => `ideagrid:analysis:${id}`;
export function blank(id: string): WorkspaceDocument {
  return {
    version: 1,
    id,
    name: "새 아이디어",
    idea: "",
    mode: "hybrid",
    items: [],
    links: [],
  };
}
export function makeItem(asset: string, x: number, y: number): Item {
  const entry = catalog.find((c) => c[0] === asset);
  const fields = getProfile(asset).fields;
  return {
    id: createId(),
    asset,
    name: entry?.[1] ?? asset,
    x,
    y,
    elevation: 0,
    rotation: 0,
    scale: 1,
    properties: fields.map(({ key, name, unit }) => ({
      key,
      id: createId(),
      name: name ?? "값",
      unit: unit ?? "",
      value: "",
      source: "",
    })),
  };
}
export function analyze(doc: WorkspaceDocument): Finding[] {
  const results: Finding[] = [];
  const automatic = new Set(
    solarInfluences(doc).flatMap((e) => [e.from, e.to]),
  );
  if (!doc.idea.trim())
    results.push({
      id: "idea",
      type: "가정",
      title: "아이디어 설명이 없습니다",
      detail: "해결할 문제, 대상 사용자, 성공 기준을 입력하세요.",
      objects: [],
    });
  if (!doc.items.length)
    results.push({
      id: "empty",
      type: "한계점",
      title: "분석할 객체가 없습니다",
      detail: "왼쪽 자산에서 객체를 추가하세요.",
      objects: [],
    });
  for (const item of doc.items) {
    const missing = item.properties.filter(
      (p) =>
        !p.value.trim() &&
        !getProfile(item.asset).fields.find((f) => f.key === p.key)?.optional,
    );
    if (missing.length)
      results.push({
        id: `${item.id}-missing`,
        type: "가정",
        title: `${item.name}: 입력값 누락`,
        detail: `미확인 값: ${missing.map((p) => `${p.name} (${p.unit})`).join(", ")}. 빈 값은 0으로 계산하지 않습니다.`,
        objects: [item.id],
      });
    if (item.properties.some((p) => p.value.trim() && !p.source.trim()))
      results.push({
        id: `${item.id}-source`,
        type: "가정",
        title: `${item.name}: 출처 확인 필요`,
        detail:
          "입력한 수치에 출처 또는 측정 방법을 기록하세요. 현재 수치는 사용자 입력이며 검증된 근거가 아닙니다.",
        objects: [item.id],
      });
    if (
      doc.items.length > 1 &&
      !automatic.has(item.id) &&
      !doc.links.some((l) => l.from === item.id || l.to === item.id)
    )
      results.push({
        id: `${item.id}-isolated`,
        type: "한계점",
        title: `${item.name}: 관계가 없습니다`,
        detail:
          "다른 객체와의 의존·보호·데이터 흐름 관계를 연결하세요. 연결되지 않은 객체 간 영향은 판단하지 않습니다.",
        objects: [item.id],
      });
  }
  return [...results, ...evaluateCapabilities(doc), ...solarFindings(doc)];
}
export const storageKey = (id: string) => `ideagrid:project:${id}`;
export function save(doc: WorkspaceDocument) {
  localStorage.setItem(
    storageKey(doc.id),
    JSON.stringify(documentSchema.parse(doc)),
  );
}
export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
