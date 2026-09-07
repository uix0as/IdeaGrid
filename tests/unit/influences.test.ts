import { describe, expect, it } from "vitest";
import {
  createInfluenceVisuals,
  updateInfluenceVisuals,
} from "@/features/workspace/InfluenceVisuals";
import { Group } from "three";
import { buildObject, disposeObject } from "@/features/workspace/geometry";
import {
  recommendAssets,
  solarExposure,
  solarInfluences,
  solarReference,
} from "@/features/workspace/influences";
import { analyze, blank, makeItem } from "@/features/workspace/model";

describe("출처 기반 태양 영향과 자동 추천", () => {
  it("1 AU 기준값과 2 AU의 1/4 비율, 범위·단위·unknown을 구분한다", () => {
    const person = makeItem("adult", 0, 0);
    const distance = person.properties.find((p) => p.key === "sunDistance");
    if (!distance) throw new Error("missing field");
    expect(solarExposure(person).value).toBeUndefined();
    distance.value = "1";
    expect(solarExposure(person).value).toBe(solarReference.irradiance);
    distance.value = "2";
    expect(solarExposure(person).value).toBeCloseTo(340.4);
    distance.unit = "m";
    expect(solarExposure(person).value).toBeUndefined();
    distance.unit = "AU";
    for (const value of [
      "0",
      "-1",
      "0.001",
      "Infinity",
      "abc",
      "1001",
      "0x10",
    ]) {
      distance.value = value;
      expect(solarExposure(person).value).toBeUndefined();
    }
  });
  it("태양과 사람의 존재만으로 시각적 영향·추천을 제공하지만 장면을 변경하지 않는다", () => {
    const doc = blank("solar");
    const sun = makeItem("sun", 100, 100),
      person = makeItem("adult", 250, 100);
    doc.items.push(sun, person);
    const before = JSON.stringify(doc);
    expect(solarInfluences(doc)).toEqual([{ from: sun.id, to: person.id }]);
    expect(recommendAssets(doc).map((r) => r.asset)).toContain("barrier");
    expect(analyze(doc).find((f) => f.id === `${person.id}-solar`)?.type).toBe(
      "가정",
    );
    expect(JSON.stringify(doc)).toBe(before);
    doc.items.push(makeItem("barrier", 200, 100));
    expect(recommendAssets(doc).map((r) => r.asset)).not.toContain("barrier");
    expect(
      analyze(doc).find((f) => f.id === `${person.id}-solar`)?.detail,
    ).toContain("안전 여부는 계산하지 않습니다");
  });
  it("애니메이션 위치는 시간·객체 이동에 반응하며 멈춘 시간에서는 동일하다", () => {
    const doc = blank("visual");
    doc.items.push(makeItem("sun", 100, 100), makeItem("adult", 250, 100));
    const objects = new Group();
    doc.items.forEach((i) => {
      objects.add(buildObject(i, false));
    });
    const effects = createInfluenceVisuals(doc);
    updateInfluenceVisuals(effects, objects, 0);
    const photon = effects.children.find((o) => o.userData.kind === "photon");
    if (!photon) throw new Error("no photon");
    const first = photon.position.clone();
    updateInfluenceVisuals(effects, objects, 1);
    expect(photon.position.equals(first)).toBe(false);
    const second = photon.position.clone();
    updateInfluenceVisuals(effects, objects, 1);
    expect(photon.position.equals(second)).toBe(true);
    const target = objects.children[1];
    if (!target) throw new Error("no target");
    target.position.x += 5;
    updateInfluenceVisuals(effects, objects, 1);
    expect(photon.position.equals(second)).toBe(false);
    disposeObject(effects);
    disposeObject(objects);
  });
});
