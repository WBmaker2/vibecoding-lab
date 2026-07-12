import { bigint, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  githubUrl: text("github_url"),
  tags: text("tags").array().notNull(),
  thumbnailMode: text("thumbnail_mode").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subject: text("subject"),
  grade: text("grade"),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const staticGallerySyncLeases = pgTable("static_gallery_sync_leases", {
  leaseKey: text("lease_key").primaryKey(),
  leaseToken: text("lease_token").notNull(),
  markerId: uuid("marker_id").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  previousRunId: bigint("previous_run_id", { mode: "number" }),
  runId: bigint("run_id", { mode: "number" })
});
