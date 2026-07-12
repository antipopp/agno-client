import { describe, expect, it } from "vitest";
import { RunEvent } from "../index";

describe("@antipopp/agno-react public API", () => {
  it("should expose RunEvent as a runtime enum value", () => {
    expect(RunEvent.RunStarted).toBe("RunStarted");
  });
});
