import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const apps = pgTable("apps", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  url: text("url").notNull(),
  tags: text("tags").array().notNull(),
  thumbnailMode: text("thumbnail_mode").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  subject: text("subject"),
  grade: text("grade"),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
