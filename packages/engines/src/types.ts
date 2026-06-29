export type ExecutionEngine =
  | {
      id: string;
      type: "single_model";
      model: string;
    }
  | {
      id: string;
      type: "router";
      routes: Record<string, ModelRoute>;
    }
  | {
      id: string;
      type: "workflow";
      workflowPath: string;
    };

export type ModelRoute = {
  model: string;
  reason?: string;
  fallback?: string[];
};
