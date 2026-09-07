import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Inspector } from "@/features/workspace/Inspector";
import { analyze, blank, makeItem } from "@/features/workspace/model";
afterEach(cleanup);
describe("핵심 속성과 내장 분석 분리", () => {
  it("세부값을 숨겨도 분석에 사용하고 사용자가 펼쳐 확인할 수 있다", () => {
    const item = makeItem("api", 0, 0);
    const latency = item.properties.find((p) => p.key === "latency"),
      budget = item.properties.find((p) => p.key === "latencyBudget");
    if (!latency || !budget) throw new Error("missing");
    latency.value = "150";
    budget.value = "100";
    render(
      <Inspector
        item={item}
        update={vi.fn()}
        remove={vi.fn()}
        duplicate={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("요청량")).toBeInTheDocument();
    expect(screen.queryByLabelText("응답 시간")).not.toBeInTheDocument();
    const doc = blank("hidden");
    doc.items.push(item);
    expect(analyze(doc).some((f) => f.id.endsWith("-latency"))).toBe(true);
    fireEvent.click(
      screen.getByRole("button", { name: "세부 속성·출처 보기" }),
    );
    expect(screen.getByLabelText("응답 시간")).toHaveValue("150");
  });
  it("태양이 있을 때 사람의 실제 거리만 핵심 조건으로 노출한다", () => {
    render(
      <Inspector
        item={makeItem("adult", 0, 0)}
        hasSun
        update={vi.fn()}
        remove={vi.fn()}
        duplicate={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("실제 태양 중심 거리")).toBeInTheDocument();
    expect(screen.queryByLabelText("신장")).not.toBeInTheDocument();
  });
});
