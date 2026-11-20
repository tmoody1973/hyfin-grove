import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_events_type" AS ENUM('concert', 'hyfin-event', 'community', 'workshop', 'party', 'broadcast');
  CREATE TYPE "public"."enum_events_source" AS ENUM('staff', 'rm-playlist');
  CREATE TYPE "public"."enum_events_event_status" AS ENUM('scheduled', 'cancelled', 'postponed');
  CREATE TYPE "public"."enum_events_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__events_v_version_type" AS ENUM('concert', 'hyfin-event', 'community', 'workshop', 'party', 'broadcast');
  CREATE TYPE "public"."enum__events_v_version_source" AS ENUM('staff', 'rm-playlist');
  CREATE TYPE "public"."enum__events_v_version_event_status" AS ENUM('scheduled', 'cancelled', 'postponed');
  CREATE TYPE "public"."enum__events_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"type" "enum_events_type" DEFAULT 'hyfin-event',
  	"source" "enum_events_source" DEFAULT 'staff',
  	"external_id" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone,
  	"date_only" boolean DEFAULT false,
  	"event_status" "enum_events_event_status" DEFAULT 'scheduled',
  	"featured" boolean DEFAULT false,
  	"hidden" boolean DEFAULT false,
  	"venue" varchar,
  	"address" varchar,
  	"city" varchar,
  	"metro" varchar,
  	"ticket_url" varchar,
  	"price_text" varchar,
  	"image_id" integer,
  	"image_url" varchar,
  	"artist" varchar,
  	"play_count" numeric,
  	"description" jsonb,
  	"recap" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_events_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "events_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "events_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"posts_id" integer
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_type" "enum__events_v_version_type" DEFAULT 'hyfin-event',
  	"version_source" "enum__events_v_version_source" DEFAULT 'staff',
  	"version_external_id" varchar,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_date_only" boolean DEFAULT false,
  	"version_event_status" "enum__events_v_version_event_status" DEFAULT 'scheduled',
  	"version_featured" boolean DEFAULT false,
  	"version_hidden" boolean DEFAULT false,
  	"version_venue" varchar,
  	"version_address" varchar,
  	"version_city" varchar,
  	"version_metro" varchar,
  	"version_ticket_url" varchar,
  	"version_price_text" varchar,
  	"version_image_id" integer,
  	"version_image_url" varchar,
  	"version_artist" varchar,
  	"version_play_count" numeric,
  	"version_description" jsonb,
  	"version_recap" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__events_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_events_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_events_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer,
  	"posts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "events_id" integer;
  ALTER TABLE "events" ADD CONSTRAINT "events_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events_texts" ADD CONSTRAINT "events_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "events_rels" ADD CONSTRAINT "events_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v_texts" ADD CONSTRAINT "_events_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_events_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_events_v_rels" ADD CONSTRAINT "_events_v_rels_posts_fk" FOREIGN KEY ("posts_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE UNIQUE INDEX "events_external_id_idx" ON "events" USING btree ("external_id");
  CREATE INDEX "events_image_idx" ON "events" USING btree ("image_id");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events__status_idx" ON "events" USING btree ("_status");
  CREATE INDEX "events_texts_order_parent" ON "events_texts" USING btree ("order","parent_id");
  CREATE INDEX "events_rels_order_idx" ON "events_rels" USING btree ("order");
  CREATE INDEX "events_rels_parent_idx" ON "events_rels" USING btree ("parent_id");
  CREATE INDEX "events_rels_path_idx" ON "events_rels" USING btree ("path");
  CREATE INDEX "events_rels_media_id_idx" ON "events_rels" USING btree ("media_id");
  CREATE INDEX "events_rels_posts_id_idx" ON "events_rels" USING btree ("posts_id");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_external_id_idx" ON "_events_v" USING btree ("version_external_id");
  CREATE INDEX "_events_v_version_version_image_idx" ON "_events_v" USING btree ("version_image_id");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version__status_idx" ON "_events_v" USING btree ("version__status");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "_events_v_latest_idx" ON "_events_v" USING btree ("latest");
  CREATE INDEX "_events_v_texts_order_parent" ON "_events_v_texts" USING btree ("order","parent_id");
  CREATE INDEX "_events_v_rels_order_idx" ON "_events_v_rels" USING btree ("order");
  CREATE INDEX "_events_v_rels_parent_idx" ON "_events_v_rels" USING btree ("parent_id");
  CREATE INDEX "_events_v_rels_path_idx" ON "_events_v_rels" USING btree ("path");
  CREATE INDEX "_events_v_rels_media_id_idx" ON "_events_v_rels" USING btree ("media_id");
  CREATE INDEX "_events_v_rels_posts_id_idx" ON "_events_v_rels" USING btree ("posts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "events_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_events_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "events" CASCADE;
  DROP TABLE "events_texts" CASCADE;
  DROP TABLE "events_rels" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "_events_v_texts" CASCADE;
  DROP TABLE "_events_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_events_fk";
  
  DROP INDEX "payload_locked_documents_rels_events_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "events_id";
  DROP TYPE "public"."enum_events_type";
  DROP TYPE "public"."enum_events_source";
  DROP TYPE "public"."enum_events_event_status";
  DROP TYPE "public"."enum_events_status";
  DROP TYPE "public"."enum__events_v_version_type";
  DROP TYPE "public"."enum__events_v_version_source";
  DROP TYPE "public"."enum__events_v_version_event_status";
  DROP TYPE "public"."enum__events_v_version_status";`)
}
