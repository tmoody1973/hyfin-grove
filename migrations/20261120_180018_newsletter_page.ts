import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_newsletter_page_reasons_channel" AS ENUM('red', 'green', 'blue', 'white');
  CREATE TABLE "newsletter_page_reasons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"channel" "enum_newsletter_page_reasons_channel" DEFAULT 'white' NOT NULL,
  	"title" varchar NOT NULL,
  	"body" varchar NOT NULL
  );
  
  CREATE TABLE "newsletter_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"eyebrow" varchar,
  	"headline" varchar,
  	"dek" varchar,
  	"trust" varchar,
  	"privacy_url" varchar,
  	"latest_issue_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "newsletter_page_reasons" ADD CONSTRAINT "newsletter_page_reasons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."newsletter_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "newsletter_page_reasons_order_idx" ON "newsletter_page_reasons" USING btree ("_order");
  CREATE INDEX "newsletter_page_reasons_parent_id_idx" ON "newsletter_page_reasons" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "newsletter_page_reasons" CASCADE;
  DROP TABLE "newsletter_page" CASCADE;
  DROP TYPE "public"."enum_newsletter_page_reasons_channel";`)
}
