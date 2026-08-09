CREATE TABLE IF NOT EXISTS "app_catalog_state" (
	"state_key" text PRIMARY KEY NOT NULL,
	"revision" bigint DEFAULT 0 NOT NULL
);

INSERT INTO "app_catalog_state" ("state_key", "revision")
VALUES ('apps', 0)
ON CONFLICT ("state_key") DO NOTHING;
