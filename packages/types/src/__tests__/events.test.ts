import { describe, expect, it } from "vitest";
import { RunEvent } from "../events";

describe("RunEvent", () => {
  describe("enum values match API spec (PascalCase)", () => {
    it("should have correct agent run events", () => {
      expect(RunEvent.RunStarted).toBe("RunStarted");
      expect(RunEvent.RunContent).toBe("RunContent");
      expect(RunEvent.RunCompleted).toBe("RunCompleted");
      expect(RunEvent.RunError).toBe("RunError");
      expect(RunEvent.RunOutput).toBe("RunOutput");
      expect(RunEvent.RunCancelled).toBe("RunCancelled");
      expect(RunEvent.RunPaused).toBe("RunPaused");
      expect(RunEvent.RunContinued).toBe("RunContinued");
    });

    it("should have correct memory events", () => {
      expect(RunEvent.UpdatingMemory).toBe("UpdatingMemory");
      expect(RunEvent.MemoryUpdateStarted).toBe("MemoryUpdateStarted");
      expect(RunEvent.MemoryUpdateCompleted).toBe("MemoryUpdateCompleted");
    });

    it("should have correct tool call events", () => {
      expect(RunEvent.ToolCallStarted).toBe("ToolCallStarted");
      expect(RunEvent.ToolCallCompleted).toBe("ToolCallCompleted");
    });

    it("should have correct reasoning events", () => {
      expect(RunEvent.ReasoningStarted).toBe("ReasoningStarted");
      expect(RunEvent.ReasoningStep).toBe("ReasoningStep");
      expect(RunEvent.ReasoningCompleted).toBe("ReasoningCompleted");
    });

    it("should have correct team run events", () => {
      expect(RunEvent.TeamRunStarted).toBe("TeamRunStarted");
      expect(RunEvent.TeamRunContent).toBe("TeamRunContent");
      expect(RunEvent.TeamRunCompleted).toBe("TeamRunCompleted");
      expect(RunEvent.TeamRunError).toBe("TeamRunError");
      expect(RunEvent.TeamRunCancelled).toBe("TeamRunCancelled");
    });

    it("should have correct team tool call events", () => {
      expect(RunEvent.TeamToolCallStarted).toBe("TeamToolCallStarted");
      expect(RunEvent.TeamToolCallCompleted).toBe("TeamToolCallCompleted");
    });

    it("should have correct team reasoning events", () => {
      expect(RunEvent.TeamReasoningStarted).toBe("TeamReasoningStarted");
      expect(RunEvent.TeamReasoningStep).toBe("TeamReasoningStep");
      expect(RunEvent.TeamReasoningCompleted).toBe("TeamReasoningCompleted");
    });

    it("should have correct team memory events", () => {
      expect(RunEvent.TeamMemoryUpdateStarted).toBe("TeamMemoryUpdateStarted");
      expect(RunEvent.TeamMemoryUpdateCompleted).toBe(
        "TeamMemoryUpdateCompleted"
      );
    });
  });

  it("should have expected number of event types", () => {
    const eventCount = Object.keys(RunEvent).length;
    expect(eventCount).toBe(34);
  });
});
