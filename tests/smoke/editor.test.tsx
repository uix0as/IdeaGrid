import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Editor } from "@/features/workspace/Editor";
import { documentSchema, storageKey } from "@/features/workspace/model";

// WebGL itself is checked in a real browser; this test covers editor state/UI.
vi.mock("next/dynamic", () => ({
  default: () => () => <div>3D test surface</div>,
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("편집기 핵심 회귀", () => {
  it("빈 장면에서 객체 추가·속성 수정·분석·삭제·undo·저장 복원을 수행한다", async () => {
    const memory = new Map<string, string>();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => memory.set(key, value),
      getItem: (key: string) => memory.get(key) ?? null,
    });
    render(<Editor projectId="ui-test" />);
    fireEvent.click(
      await screen.findByRole("button", { name: /API\s*시스템/ }),
    );
    expect(screen.getByLabelText("객체 이름")).toHaveValue("API");
    fireEvent.click(screen.getByText("배치 세부값"));
    fireEvent.change(screen.getByLabelText("X 위치"), {
      target: { value: "400" },
    });
    fireEvent.change(screen.getByLabelText("요청량", { exact: true }), {
      target: { value: "120" },
    });
    fireEvent.change(screen.getByLabelText("처리량", { exact: true }), {
      target: { value: "100" },
    });
    expect(
      screen.queryByText("위험 · API: 처리량 초과"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "아이디어 분석" }));
    expect(screen.getByText("위험 · API: 처리량 초과")).toBeInTheDocument();
    expect(
      screen.queryByText("장면이 변경됨 — 재분석 필요"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "객체" }));
    fireEvent.click(screen.getByRole("button", { name: "객체 삭제" }));
    expect(screen.getByText("장면 객체 0")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "실행 취소" }));
    expect(screen.getByText("장면 객체 1")).toBeInTheDocument();
    await waitFor(() => {
      const restored = documentSchema.parse(
        JSON.parse(memory.get(storageKey("ui-test")) ?? "null"),
      );
      expect(restored.items).toHaveLength(1);
      expect(restored.items[0]?.x).toBe(400);
    });
    cleanup();
    render(<Editor projectId="ui-test" />);
    fireEvent.click(await screen.findByRole("button", { name: "API" }));
    expect(screen.getByLabelText("X 위치")).toHaveValue(400);
    fireEvent.click(screen.getByRole("button", { name: "분석" }));
    expect(screen.getByText("위험 · API: 처리량 초과")).toBeInTheDocument();
  });
});
