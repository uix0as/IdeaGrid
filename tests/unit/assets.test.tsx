import { renderToStaticMarkup } from "react-dom/server";
import { Box3, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { AssetIcon } from "@/features/workspace/AssetIcon";
import { assetDefinitions, getProfile } from "@/features/workspace/assets";
import { buildObject, disposeObject } from "@/features/workspace/geometry";
import {
  analyze,
  blank,
  documentSchema,
  makeItem,
  type Item,
} from "@/features/workspace/model";

function set(item: Item, key: string, value: string, unit?: string) {
  const p = item.properties.find((p) => p.key === key);
  if (!p) throw new Error(`속성 없음: ${item.asset}/${key}`);
  p.value = value;
  p.source = "테스트 입력";
  if (unit) p.unit = unit;
}
describe("모든 자산의 아이콘·모델·속성·직렬화", () => {
  it("64종의 식별자가 중복되지 않는다", () => {
    expect(assetDefinitions).toHaveLength(64);
    expect(new Set(assetDefinitions.map((a) => a[0])).size).toBe(64);
  });
  it.each(assetDefinitions)(
    "%s: 아이콘/3D/속성이 유효하고 초기 수치를 지어내지 않는다",
    (id) => {
      const item = makeItem(id, 400, 400);
      const doc = blank("asset-test");
      doc.items.push(item);
      expect(renderToStaticMarkup(<AssetIcon asset={id} />)).toContain("<svg");
      const object = buildObject(item, false);
      const size = new Box3().setFromObject(object).getSize(new Vector3());
      expect(size.toArray().every((v) => Number.isFinite(v) && v > 0)).toBe(
        true,
      );
      disposeObject(object);
      expect(item.properties.map((p) => p.key)).toEqual(
        getProfile(id).fields.map((f) => f.key),
      );
      expect(
        item.properties.every((p) => p.value === "" && p.source === ""),
      ).toBe(true);
      expect(documentSchema.parse(JSON.parse(JSON.stringify(doc)))).toEqual(
        doc,
      );
      expect(analyze(doc).some((f) => f.type === "위험")).toBe(false);
    },
  );
});
describe("모든 한도 규칙이 사용자 변경에 반응한다", () => {
  for (const [asset] of assetDefinitions)
    for (const pair of getProfile(asset).pairs) {
      it(`${asset}/${pair.id}: 한도 경계, 초과, 수정, unknown`, () => {
        const item = makeItem(asset, 0, 0);
        const doc = blank("rules");
        doc.items.push(item);
        set(item, pair.actual, "100");
        set(item, pair.limit, "100");
        const risk = () =>
          analyze(doc).find((f) => f.id === `${item.id}-${pair.id}`);
        expect(risk()).toBeUndefined();
        set(item, pair.actual, "120");
        expect(risk()?.objects).toEqual([item.id]);
        set(item, pair.limit, "200");
        expect(risk()).toBeUndefined();
        set(item, pair.limit, "");
        expect(risk()).toBeUndefined();
      });
    }
  it("단위 변환과 속성 이름 변경이 반영된다", () => {
    const api = makeItem("api", 0, 0);
    const doc = blank("units");
    doc.items.push(api);
    set(api, "demand", "120", "req/min");
    set(api, "capacity", "1");
    const prop = api.properties.find((p) => p.key === "demand");
    if (!prop) throw new Error("missing");
    prop.name = "내 요청량";
    expect(
      analyze(doc).find((f) => f.id === `${api.id}-capacity`)?.detail,
    ).toContain("×");
    set(api, "capacity", "2");
    expect(analyze(doc).some((f) => f.id === `${api.id}-capacity`)).toBe(false);
    set(api, "latency", "1", "s");
    set(api, "latencyBudget", "900");
    expect(analyze(doc).some((f) => f.id === `${api.id}-latency`)).toBe(true);
  });
  it.each(["-1", "Infinity", "NaN", "0x10", "문자"])(
    "잘못된 입력 %s는 한도 비교에서 제외한다",
    (input) => {
      const db = makeItem("database", 0, 0);
      const doc = blank("invalid");
      doc.items.push(db);
      set(db, "usedStorage", input);
      set(db, "storageCapacity", "1");
      expect(
        analyze(doc).some((f) => f.id.endsWith("invalid-usedStorage")),
      ).toBe(true);
      expect(analyze(doc).some((f) => f.id === `${db.id}-storage`)).toBe(false);
    },
  );
  it("지원하지 않는 단위와 삭제된 필수 속성을 알린다", () => {
    const db = makeItem("database", 0, 0);
    const doc = blank("missing");
    doc.items.push(db);
    set(db, "usedStorage", "120", "kg");
    set(db, "storageCapacity", "100");
    expect(analyze(doc).some((f) => f.id.endsWith("invalid-usedStorage"))).toBe(
      true,
    );
    db.properties = db.properties.filter((p) => p.key !== "storageCapacity");
    expect(analyze(doc).some((f) => f.id.endsWith("-required"))).toBe(true);
  });
  it("전력 관계의 소비 합산·수정·누락·다중 공급을 구분한다", () => {
    const battery = makeItem("battery", 0, 0),
      motor = makeItem("motor", 10, 10),
      lamp = makeItem("light", 20, 20);
    const doc = blank("power");
    doc.items.push(battery, motor, lamp);
    set(battery, "outputPower", "0.1", "kW");
    set(motor, "power", "80");
    set(lamp, "power", "40");
    doc.links.push(
      { id: "p1", from: battery.id, to: motor.id, type: "전력 공급" },
      { id: "p2", from: battery.id, to: lamp.id, type: "전력 공급" },
    );
    expect(
      analyze(doc).find((f) => f.id === `${battery.id}-power`)?.detail,
    ).toContain("120 W");
    set(battery, "outputPower", "0.2", "kW");
    expect(analyze(doc).some((f) => f.id === `${battery.id}-power`)).toBe(
      false,
    );
    set(lamp, "power", "");
    expect(analyze(doc).some((f) => f.id.endsWith("-power-missing"))).toBe(
      true,
    );
    const solar = makeItem("solar", 30, 30);
    doc.items.push(solar);
    doc.links.push({
      id: "p3",
      from: solar.id,
      to: motor.id,
      type: "전력 공급",
    });
    expect(analyze(doc).some((f) => f.detail.includes("공급 분담"))).toBe(true);
  });
  it("순환 의존을 찾고 관계 삭제 후 해소한다", () => {
    const a = makeItem("api", 0, 0),
      b = makeItem("server", 10, 10);
    const doc = blank("cycle");
    doc.items.push(a, b);
    doc.links.push(
      { id: "a", from: a.id, to: b.id, type: "의존" },
      { id: "b", from: b.id, to: a.id, type: "의존" },
    );
    expect(analyze(doc).some((f) => f.id.startsWith("cycle-"))).toBe(true);
    doc.links.pop();
    expect(analyze(doc).some((f) => f.id.startsWith("cycle-"))).toBe(false);
  });
  it("모든 결과는 같은 입력에서 결정적이고 실제 장면 객체만 참조한다", () => {
    const doc = blank("all");
    doc.items = assetDefinitions.map(([id], i) => makeItem(id, i * 10, 0));
    const findings = analyze(doc);
    expect(analyze(doc)).toEqual(findings);
    expect(new Set(findings.map((f) => f.id)).size).toBe(findings.length);
    expect(
      findings
        .flatMap((f) => f.objects)
        .every((id) => doc.items.some((i) => i.id === id)),
    ).toBe(true);
  });
});
