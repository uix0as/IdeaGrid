import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoundationView } from "@/components/foundation/FoundationView";

describe("FoundationView", () => {
  it("제목, 상태, 실제 링크를 렌더링한다", () => {
    render(
      <FoundationView
        eyebrow="Editor"
        title="IdeaGrid"
        description="설명"
        status="연결됨"
        items={[{ title: "Canvas", description: "장면" }]}
        action={{ href: "/settings", label: "설정" }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "IdeaGrid" }),
    ).toBeInTheDocument();
    expect(screen.getByText("연결됨")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /설정/ })).toHaveAttribute(
      "href",
      "/settings",
    );
  });
});
