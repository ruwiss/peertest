CREATE TYPE "public"."trade_status" AS ENUM('requested', 'matched', 'cancelled');--> statement-breakpoint
CREATE TABLE "trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"target_app_id" uuid NOT NULL,
	"offered_app_id" uuid NOT NULL,
	"status" "trade_status" DEFAULT 'requested' NOT NULL,
	"commitment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"matched_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_target_app_id_apps_id_fk" FOREIGN KEY ("target_app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_offered_app_id_apps_id_fk" FOREIGN KEY ("offered_app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_commitment_id_commitments_id_fk" FOREIGN KEY ("commitment_id") REFERENCES "public"."commitments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "trades_requested_uniq" ON "trades" USING btree ("requester_id","target_app_id","offered_app_id") WHERE status = 'requested';--> statement-breakpoint
CREATE INDEX "trades_target_idx" ON "trades" USING btree ("target_app_id");--> statement-breakpoint
CREATE INDEX "trades_offered_idx" ON "trades" USING btree ("offered_app_id");--> statement-breakpoint
CREATE INDEX "trades_requester_idx" ON "trades" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "trades_status_idx" ON "trades" USING btree ("status");