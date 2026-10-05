import { double, index, int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: varchar("role", { length: 16 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  age: int("age").notNull(),
  height: int("height").notNull(),
  weight: int("weight").notNull(),
  gender: varchar("gender", { length: 80 }).notNull(),
  fitnessLevel: varchar("fitnessLevel", { length: 40 }).notNull(),
  activityLevel: varchar("activityLevel", { length: 40 }).notNull(),
  goal: varchar("goal", { length: 80 }).notNull(),
  dietaryPreference: varchar("dietaryPreference", { length: 100 }).notNull(),
  workoutPreference: varchar("workoutPreference", { length: 100 }).notNull(),
  availableTime: int("availableTime").notNull(),
  onboardingState: varchar("onboardingState", { length: 32 }).notNull().default("NEW_USER"),
  onboardingStep: int("onboardingStep").notNull().default(1),
  onboardingCompleted: int("onboardingCompleted").notNull().default(0),
  onboardingCompletedAt: timestamp("onboardingCompletedAt"),
  secondaryGoals: text("secondaryGoals"),
  trainingFrequency: varchar("trainingFrequency", { length: 60 }),
  preferredWorkoutDuration: varchar("preferredWorkoutDuration", { length: 40 }),
  trainingEnvironment: varchar("trainingEnvironment", { length: 40 }),
  availableEquipment: varchar("availableEquipment", { length: 120 }),
  coachFocus: varchar("coachFocus", { length: 160 }),
  exercisePreferences: text("exercisePreferences"),
  timezone: varchar("timezone", { length: 80 }),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userIdUnique: uniqueIndex("profiles_user_id_unique").on(table.userId) }));

export const telemetry = mysqlTable("telemetry", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 80 }).notNull(),
  recordedAt: timestamp("recordedAt").defaultNow().notNull(),
  bpm: int("bpm").notNull(),
  speed: double("speed").notNull(),
  movement: double("movement").notNull(),
  duration: int("duration").notNull(),
  intensity: int("intensity").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  fatigue: varchar("fatigue", { length: 20 }).notNull().default("LOW"),
  bpmTrend: varchar("bpmTrend", { length: 20 }).notNull().default("FLAT"),
  mlConfidence: double("mlConfidence").notNull().default(0),
  modelVersion: varchar("modelVersion", { length: 60 }).notNull().default("respirafi-signal-model-v1"),
  exercise: varchar("exercise", { length: 100 }).notNull().default("General session"),
}, (table) => ({ userRecordedAt: index("telemetry_user_recorded_at_idx").on(table.userId, table.recordedAt) }));

export const alerts = mysqlTable("alerts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  deviceId: varchar("deviceId", { length: 80 }).notNull(),
  bpm: int("bpm").notNull(),
  speed: double("speed").notNull(),
  movement: double("movement").notNull(),
  duration: int("duration").notNull(),
  intensity: int("intensity").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  message: text("message").notNull(),
}, (table) => ({ userCreatedAt: index("alerts_user_created_at_idx").on(table.userId, table.createdAt) }));

export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt").notNull(),
  duration: int("duration").notNull(),
  averageBpm: int("averageBpm").notNull(),
  peakBpm: int("peakBpm").notNull(),
  averageSpeed: double("averageSpeed").notNull(),
  averageMovement: double("averageMovement").notNull(),
  averageIntensity: int("averageIntensity").notNull(),
  peakIntensity: int("peakIntensity").notNull(),
  alertCount: int("alertCount").notNull(),
  status: varchar("status", { length: 20 }).notNull(),
}, (table) => ({ userEndedAt: index("workouts_user_ended_at_idx").on(table.userId, table.endedAt) }));

export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userCreatedAt: index("conversations_user_created_at_idx").on(table.userId, table.createdAt) }));

export const weeklyPlans = mysqlTable("weeklyPlans", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  weekStartDate: timestamp("weekStartDate").notNull(),
  targetDate: timestamp("targetDate").notNull(),
  workoutType: varchar("workoutType", { length: 40 }).notNull(),
  title: varchar("title", { length: 160 }).notNull(),
  muscleGroups: text("muscleGroups").notNull(),
  exercises: text("exercises").notNull(),
  duration: int("duration").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("PLANNED"),
  completionPercent: int("completionPercent"),
  completedAt: timestamp("completedAt"),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userTargetUnique: uniqueIndex("weekly_plans_user_target_unique").on(table.userId, table.targetDate), userWeekDate: index("weekly_plans_user_week_date_idx").on(table.userId, table.weekStartDate, table.targetDate) }));

export const simulator = mysqlTable("simulator", {
  id: int("id").primaryKey(),
  userId: int("userId").notNull().references(() => users.id),
  deviceId: varchar("deviceId", { length: 80 }).notNull(),
  connected: int("connected").notNull(),
  running: int("running").notNull(),
  mode: varchar("mode", { length: 30 }).notNull(),
  intensityTarget: int("intensityTarget").notNull(),
  duration: int("duration").notNull(),
  workoutState: varchar("workoutState", { length: 30 }).notNull(),
  workoutStartedAt: varchar("workoutStartedAt", { length: 40 }).notNull(),
  pausedAt: varchar("pausedAt", { length: 40 }).notNull().default(""),
  pausedSeconds: int("pausedSeconds").notNull().default(0),
  led: int("led").notNull(),
  buzzer: int("buzzer").notNull(),
  lastTelemetryId: int("lastTelemetryId"),
}, (table) => ({ userIdIndex: index("simulator_user_id_idx").on(table.userId) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Profile = typeof profiles.$inferSelect;
export type Telemetry = typeof telemetry.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WeeklyPlan = typeof weeklyPlans.$inferSelect;
