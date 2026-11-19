import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "front_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"home_lead_id" integer,
  	"music_lead_id" integer,
  	"culture_lead_id" integer,
  	"milwaukee_lead_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "front_page" ADD CONSTRAINT "front_page_home_lead_id_posts_id_fk" FOREIGN KEY ("home_lead_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "front_page" ADD CONSTRAINT "front_page_music_lead_id_posts_id_fk" FOREIGN KEY ("music_lead_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "front_page" ADD CONSTRAINT "front_page_culture_lead_id_posts_id_fk" FOREIGN KEY ("culture_lead_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "front_page" ADD CONSTRAINT "front_page_milwaukee_lead_id_posts_id_fk" FOREIGN KEY ("milwaukee_lead_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "front_page_home_lead_idx" ON "front_page" USING btree ("home_lead_id");
  CREATE INDEX "front_page_music_lead_idx" ON "front_page" USING btree ("music_lead_id");
  CREATE INDEX "front_page_culture_lead_idx" ON "front_page" USING btree ("culture_lead_id");
  CREATE INDEX "front_page_milwaukee_lead_idx" ON "front_page" USING btree ("milwaukee_lead_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "front_page" CASCADE;`)
}
