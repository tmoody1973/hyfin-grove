import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_support_page_plans_tier" AS ENUM('member', 'hyfin100');
  CREATE TABLE "support_page_share_perks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_member_perks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_hyfin100_perks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_plans" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tier" "enum_support_page_plans_tier" NOT NULL,
  	"price" varchar,
  	"donate_label" varchar,
  	"form_id" numeric NOT NULL,
  	"fallback_url" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_gear_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_who_paragraphs" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "support_page_pillars_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"body" varchar
  );
  
  CREATE TABLE "support_page_impact_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" varchar,
  	"label" varchar,
  	"note" varchar
  );
  
  CREATE TABLE "support_page_social_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"network" varchar,
  	"handle" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "support_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"hero_eyebrow" varchar,
  	"hero_headline" varchar,
  	"hero_dek" varchar,
  	"share_title" varchar,
  	"share_sub" varchar,
  	"share_button_label" varchar,
  	"member_title" varchar,
  	"member_sub" varchar,
  	"member_plan_name" varchar,
  	"hyfin100_title" varchar,
  	"hyfin100_sub" varchar,
  	"hyfin100_plan_name" varchar,
  	"gear_eyebrow" varchar,
  	"gear_headline" varchar,
  	"gear_body" varchar,
  	"gear_image_id" integer,
  	"gear_button_label" varchar,
  	"who_eyebrow" varchar,
  	"who_headline" varchar,
  	"pillars_headline" varchar,
  	"impact_show" boolean DEFAULT false,
  	"impact_headline" varchar,
  	"social_eyebrow" varchar,
  	"social_headline" varchar,
  	"social_body" varchar,
  	"closing_headline" varchar,
  	"closing_body" varchar,
  	"closing_button_label" varchar,
  	"closing_tagline" varchar,
  	"closing_legal_line" varchar,
  	"thanks_fulfillment_line" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "support_page_share_perks" ADD CONSTRAINT "support_page_share_perks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_member_perks" ADD CONSTRAINT "support_page_member_perks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_hyfin100_perks" ADD CONSTRAINT "support_page_hyfin100_perks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_plans" ADD CONSTRAINT "support_page_plans_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_gear_facts" ADD CONSTRAINT "support_page_gear_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_who_paragraphs" ADD CONSTRAINT "support_page_who_paragraphs_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_pillars_items" ADD CONSTRAINT "support_page_pillars_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_impact_stats" ADD CONSTRAINT "support_page_impact_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page_social_links" ADD CONSTRAINT "support_page_social_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."support_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "support_page" ADD CONSTRAINT "support_page_gear_image_id_media_id_fk" FOREIGN KEY ("gear_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "support_page_share_perks_order_idx" ON "support_page_share_perks" USING btree ("_order");
  CREATE INDEX "support_page_share_perks_parent_id_idx" ON "support_page_share_perks" USING btree ("_parent_id");
  CREATE INDEX "support_page_member_perks_order_idx" ON "support_page_member_perks" USING btree ("_order");
  CREATE INDEX "support_page_member_perks_parent_id_idx" ON "support_page_member_perks" USING btree ("_parent_id");
  CREATE INDEX "support_page_hyfin100_perks_order_idx" ON "support_page_hyfin100_perks" USING btree ("_order");
  CREATE INDEX "support_page_hyfin100_perks_parent_id_idx" ON "support_page_hyfin100_perks" USING btree ("_parent_id");
  CREATE INDEX "support_page_plans_order_idx" ON "support_page_plans" USING btree ("_order");
  CREATE INDEX "support_page_plans_parent_id_idx" ON "support_page_plans" USING btree ("_parent_id");
  CREATE INDEX "support_page_gear_facts_order_idx" ON "support_page_gear_facts" USING btree ("_order");
  CREATE INDEX "support_page_gear_facts_parent_id_idx" ON "support_page_gear_facts" USING btree ("_parent_id");
  CREATE INDEX "support_page_who_paragraphs_order_idx" ON "support_page_who_paragraphs" USING btree ("_order");
  CREATE INDEX "support_page_who_paragraphs_parent_id_idx" ON "support_page_who_paragraphs" USING btree ("_parent_id");
  CREATE INDEX "support_page_pillars_items_order_idx" ON "support_page_pillars_items" USING btree ("_order");
  CREATE INDEX "support_page_pillars_items_parent_id_idx" ON "support_page_pillars_items" USING btree ("_parent_id");
  CREATE INDEX "support_page_impact_stats_order_idx" ON "support_page_impact_stats" USING btree ("_order");
  CREATE INDEX "support_page_impact_stats_parent_id_idx" ON "support_page_impact_stats" USING btree ("_parent_id");
  CREATE INDEX "support_page_social_links_order_idx" ON "support_page_social_links" USING btree ("_order");
  CREATE INDEX "support_page_social_links_parent_id_idx" ON "support_page_social_links" USING btree ("_parent_id");
  CREATE INDEX "support_page_gear_gear_image_idx" ON "support_page" USING btree ("gear_image_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "support_page_share_perks" CASCADE;
  DROP TABLE "support_page_member_perks" CASCADE;
  DROP TABLE "support_page_hyfin100_perks" CASCADE;
  DROP TABLE "support_page_plans" CASCADE;
  DROP TABLE "support_page_gear_facts" CASCADE;
  DROP TABLE "support_page_who_paragraphs" CASCADE;
  DROP TABLE "support_page_pillars_items" CASCADE;
  DROP TABLE "support_page_impact_stats" CASCADE;
  DROP TABLE "support_page_social_links" CASCADE;
  DROP TABLE "support_page" CASCADE;
  DROP TYPE "public"."enum_support_page_plans_tier";`)
}
