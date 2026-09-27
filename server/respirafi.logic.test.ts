import { describe, expect, it } from "vitest";
import { elapsedSeconds, idleTelemetry, nutrition, plan, recovery, score } from "./routers";

describe("RespiraFi intensity engine", () => {
  it("starts from safe idle telemetry", () => {
    expect(idleTelemetry).toMatchObject({ bpm: 70, speed: 0, movement: 0, duration: 0, status: "NORMAL" });
    expect(score(idleTelemetry).status).toBe("NORMAL");
  });

  it("weights signals into normal, moderate, and high bands", () => {
    expect(score({ bpm: 60, speed: 0, movement: 0 }).status).toBe("NORMAL");
    expect(score({ bpm: 130, speed: 7, movement: 1.2 }).status).toBe("MODERATE");
    expect(score({ bpm: 185, speed: 14, movement: 3 }).status).toBe("HIGH");
  });
  it("clamps out-of-range normalized values safely", () => {
    const result = score({ bpm: 240, speed: 40, movement: 10 });
    expect(result.intensity).toBe(100);
    expect(result.status).toBe("HIGH");
  });
});

describe("RespiraFi workout clock", () => {
  it("excludes accumulated paused seconds from elapsed duration", () => {
    const now = Date.parse("2026-09-25T10:00:20.000Z");
    expect(elapsedSeconds({ workoutStartedAt: "2026-09-25T10:00:00.000Z", pausedSeconds: 5, workoutState: "ACTIVE" }, now)).toBe(15);
  });

  it("freezes at pausedAt while a workout is paused", () => {
    const now = Date.parse("2026-09-25T10:00:40.000Z");
    expect(elapsedSeconds({ workoutStartedAt: "2026-09-25T10:00:00.000Z", pausedAt: "2026-09-25T10:00:12.000Z", pausedSeconds: 2, workoutState: "PAUSED" }, now)).toBe(10);
  });
});

describe("RespiraFi coaching personalization", () => {
  it("regenerates materially different plans for current goals", () => {
    const history = { alerts: 0, highSessions: 0 };
    const endurance = plan({ goal: "Endurance", availableTime: 30, workoutPreference: "Cardio" }, history);
    const muscle = plan({ goal: "Muscle Building", availableTime: 30, workoutPreference: "Strength" }, history);
    const general = plan({ goal: "General Fitness", availableTime: 30, workoutPreference: "Balanced" }, history);
    expect(endurance.objective).toContain("cardiovascular endurance");
    expect(muscle.objective).toContain("resistance training");
    expect(general.objective).toContain("balanced conditioning");
    expect(new Set([endurance.mainWorkout, muscle.mainWorkout, general.mainWorkout]).size).toBe(3);
  });

  it("changes the workout plan for muscle building and conservative history", () => {
    const muscle = plan({ goal: "Muscle Building", availableTime: 35, workoutPreference: "Strength" }, { alerts: 0, highSessions: 0 });
    const cautious = plan({ goal: "General Fitness", availableTime: 30, workoutPreference: "Cardio" }, { alerts: 2, highSessions: 2 });
    expect(muscle.title).toContain("Muscle Building");
    expect(muscle.mainWorkout).toContain("squat");
    expect(cautious.title).toBe("Steady Progress Reset");
  });
  it("uses diet and goal in nutrition guidance", () => {
    const guidance = nutrition({ weight: 75, goal: "Muscle Building", activityLevel: "Moderate", dietaryPreference: "Vegetarian" });
    expect(guidance.protein).toContain("120 g");
    expect(guidance.protein).toContain("vegetarian");
  });
  it("becomes recovery-first after repeated alerts", () => {
    const guidance = recovery({ alerts: 3, highSessions: 1 }, "NORMAL");
    expect(guidance.title).toBe("Recovery-first reset");
    expect(guidance.rest).toContain("24–48");
  });
});
