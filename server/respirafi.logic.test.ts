import { describe, expect, it } from "vitest";
import { nutrition, plan, recovery, score } from "./routers";

describe("RespiraFi intensity engine", () => {
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

describe("RespiraFi coaching personalization", () => {
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
