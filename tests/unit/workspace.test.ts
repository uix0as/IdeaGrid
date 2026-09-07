import { afterEach, describe, expect, it, vi } from "vitest";
import {
  analyze,
  blank,
  documentSchema,
  makeItem,
  sceneFingerprint,
  save,
  storageKey,
  analysisSchema,
} from "@/features/workspace/model";
describe("실제 작업 공간 분석", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("필드 순서가 달라도 저장 복원 후 같은 분석 snapshot으로 판정한다", () => {
    const doc = blank("canonical");
    doc.items.push(makeItem("web", 80, 60));
    const snapshot = sceneFingerprint(doc);
    const memory = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => memory.set(key, value),
      getItem: (key: string) => memory.get(key) ?? null,
    });
    save(doc);
    const restored = documentSchema.parse(
      JSON.parse(localStorage.getItem(storageKey(doc.id)) ?? "null"),
    );
    expect(sceneFingerprint(restored)).toBe(snapshot);
    const report = analysisSchema.parse({
      snapshot,
      findings: analyze(doc),
      createdAt: new Date().toISOString(),
    });
    const restoredItem = restored.items[0];
    if (!restoredItem) throw new Error("테스트 객체 없음");
    restoredItem.x += 20;
    expect(sceneFingerprint(restored)).not.toBe(report.snapshot);
  });
  it("잘못된 수치와 음수를 계산하지 않는다", () => {
    const doc = blank("invalid");
    const api = makeItem("api", 0, 0);
    doc.items.push(api);
    const [demand, capacity] = api.properties;
    if (!demand || !capacity) throw new Error("테스트 속성 없음");
    demand.value = "Infinity";
    capacity.value = "100";
    expect(analyze(doc).some((f) => f.id.endsWith("-invalid-rate"))).toBe(true);
    expect(analyze(doc).some((f) => f.id.endsWith("-capacity"))).toBe(false);
    demand.value = "-5";
    expect(analyze(doc).some((f) => f.id.endsWith("-invalid-rate"))).toBe(true);
  });
  it("사용자의 입력 변경에 따라 처리량 위험이 생기고 사라진다", () => {
    const doc = blank("test");
    const api = makeItem("api", 100, 100);
    doc.items.push(api);
    const capacity = {
      id: "capacity",
      name: "처리량",
      value: "100",
      unit: "req/s",
      source: "측정",
    };
    api.properties = [
      {
        id: "demand",
        name: "요청량",
        value: "120",
        unit: "req/s",
        source: "측정",
      },
      capacity,
    ];
    expect(analyze(doc).some((f) => f.id.endsWith("-capacity"))).toBe(true);
    capacity.value = "200";
    expect(analyze(doc).some((f) => f.id.endsWith("-capacity"))).toBe(false);
    capacity.value = "";
    expect(analyze(doc).some((f) => f.id.endsWith("-capacity"))).toBe(false);
    expect(analyze(doc).some((f) => f.id.endsWith("-missing"))).toBe(true);
  });
  it("저장 JSON은 복원되고 끊어진 관계는 거부된다", () => {
    const doc = blank("test");
    const sun = makeItem("sun", 120, 240);
    doc.items.push(sun);
    expect(documentSchema.parse(JSON.parse(JSON.stringify(doc)))).toEqual(doc);
    doc.links.push({ id: "broken", from: sun.id, to: "absent", type: "연결" });
    expect(documentSchema.safeParse(doc).success).toBe(false);
  });
});
