import { afterEach, expect, it, vi } from "vitest";

vi.mock("node:os", () => {
  const networkInterfaces = () => ({
    loopback: [{ family: "IPv4", address: "127.0.0.1" }],
    lan: [{ family: "IPv4", address: "192.0.2.10" }],
  });
  return { networkInterfaces, default: { networkInterfaces } };
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("allows current machine addresses without requiring environment configuration", async () => {
  vi.stubEnv("IDEAGRID_DEV_ORIGINS", "");
  const { default: config } = await import("../../next.config");
  expect(config.allowedDevOrigins).toContain("192.0.2.10");
  expect(config.allowedDevOrigins).toContain("127.0.0.1");
  expect(config.allowedDevOrigins).not.toContain("*");
});

it("preserves explicitly configured hosts alongside local addresses", async () => {
  vi.stubEnv("IDEAGRID_DEV_ORIGINS", " workspace.example.test, ,192.0.2.10");
  const { default: config } = await import("../../next.config");
  expect(config.allowedDevOrigins).toEqual([
    "127.0.0.1",
    "192.0.2.10",
    "workspace.example.test",
  ]);
});
