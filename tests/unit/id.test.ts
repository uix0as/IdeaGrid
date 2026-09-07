import { afterEach, describe, expect, it, vi } from "vitest";
import { createId } from "@/features/workspace/id";
import { makeItem } from "@/features/workspace/model";

afterEach(() => vi.unstubAllGlobals());
describe("HTTP 네트워크 주소의 ID 생성", () => {
  it("randomUUID가 없어도 UUID와 객체/속성을 생성한다", () => {
    const getRandomValues = globalThis.crypto.getRandomValues.bind(
      globalThis.crypto,
    );
    vi.stubGlobal("crypto", { getRandomValues });
    const first = createId();
    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(createId()).not.toBe(first);
    const item = makeItem("api", 0, 0);
    expect(item.properties).toHaveLength(4);
    expect(new Set([item.id, ...item.properties.map((p) => p.id)]).size).toBe(
      5,
    );
  });
});
