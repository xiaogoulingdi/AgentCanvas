import type { AgentEvent } from "./events.ts";

export interface EventLog {
  append(event: AgentEvent): Promise<void>;
  list(sessionId: string): Promise<AgentEvent[]>;
}

export class MemoryEventLog implements EventLog {
  private readonly events: AgentEvent[] = [];

  async append(event: AgentEvent): Promise<void> {
    this.events.push(event);
  }

  async list(sessionId: string): Promise<AgentEvent[]> {
    return this.events.filter((event) => event.sessionId === sessionId);
  }
}
