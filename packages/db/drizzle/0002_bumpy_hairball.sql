CREATE TABLE "credential_secrets" (
	"ref" text PRIMARY KEY NOT NULL,
	"key_version" integer NOT NULL,
	"iv" text NOT NULL,
	"ciphertext" text NOT NULL,
	"auth_tag" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "connector_installations" ALTER COLUMN "installed_by" DROP NOT NULL;