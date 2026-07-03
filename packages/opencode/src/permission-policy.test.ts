import { describe, expect, it } from "vitest";
import { createOpenCodePermissionPolicy, createOpenCodeToolPolicy } from "./permission-policy.ts";

describe("OpenCode permission policy", () => {
  it("denies edits, shell, network, and external directories by default", () => {
    expect(createOpenCodePermissionPolicy({})).toEqual({
      edit: "deny",
      bash: "deny",
      webfetch: "deny",
      doom_loop: "deny",
      external_directory: "deny"
    });
    expect(createOpenCodeToolPolicy({})).toEqual({
      bash: false,
      shell: false,
      write: false,
      edit: false,
      patch: false
    });
  });

  it("allows editing without allowing shell by default", () => {
    expect(createOpenCodePermissionPolicy({ allowEdits: true })).toMatchObject({
      edit: "allow",
      bash: "deny",
      webfetch: "deny",
      external_directory: "deny"
    });
    expect(createOpenCodeToolPolicy({ allowEdits: true })).toEqual({
      bash: false,
      shell: false,
      write: true,
      edit: true,
      patch: true
    });
  });

  it("requires explicit shell/network flags", () => {
    expect(createOpenCodePermissionPolicy({ allowShell: true, allowNetwork: true })).toMatchObject({
      bash: "ask",
      webfetch: "ask"
    });
    expect(createOpenCodeToolPolicy({ allowShell: true })).toMatchObject({
      bash: true,
      shell: true
    });
  });
});
