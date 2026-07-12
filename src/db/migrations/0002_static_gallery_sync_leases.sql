CREATE TABLE IF NOT EXISTS "static_gallery_sync_leases" (
	"lease_key" text PRIMARY KEY NOT NULL,
	"lease_token" text NOT NULL,
	"marker_id" uuid NOT NULL,
	"requested_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"previous_run_id" bigint,
	"run_id" bigint
);
