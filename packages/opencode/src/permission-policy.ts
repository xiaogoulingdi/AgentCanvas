export type OpenCodePermissionPolicy = {
  edit: "ask" | "allow" | "deny";
  bash: "ask" | "allow" | "deny" | Record<string, "ask" | "allow" | "deny">;
  webfetch: "ask" | "allow" | "deny";
  doom_loop: "ask" | "allow" | "deny";
  external_directory: "ask" | "allow" | "deny";
};

export type OpenCodeToolPolicy = {
  bash: boolean;
  shell: boolean;
  write: boolean;
  edit: boolean;
  patch: boolean;
};

export function createOpenCodePermissionPolicy(input: { allowEdits?: boolean; allowShell?: boolean; allowNetwork?: boolean }): OpenCodePermissionPolicy {
  return {
    edit: input.allowEdits ? "allow" : "deny",
    bash: input.allowShell ? "ask" : "deny",
    webfetch: input.allowNetwork ? "ask" : "deny",
    doom_loop: "deny",
    external_directory: "deny"
  };
}

export function createOpenCodeToolPolicy(input: { allowEdits?: boolean; allowShell?: boolean }): OpenCodeToolPolicy {
  return {
    bash: input.allowShell ?? false,
    shell: input.allowShell ?? false,
    write: input.allowEdits ?? false,
    edit: input.allowEdits ?? false,
    patch: input.allowEdits ?? false
  };
}
