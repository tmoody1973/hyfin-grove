import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ads_slots_placement" AS ENUM('playlist-banner');
  CREATE TABLE "ads_slots" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"placement" "enum_ads_slots_placement" DEFAULT 'playlist-banner' NOT NULL,
  	"ad_unit" varchar NOT NULL,
  	"desktop_size" varchar DEFAULT '728x90' NOT NULL,
  	"mobile_size" varchar DEFAULT '300x50' NOT NULL,
  	"label" varchar,
  	"starts_at" timestamp(3) with time zone,
  	"ends_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "ads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"enabled" boolean DEFAULT false,
  	"network_code" varchar DEFAULT '118058336',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "ads_slots" ADD CONSTRAINT "ads_slots_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ads_slots_order_idx" ON "ads_slots" USING btree ("_order");
  CREATE INDEX "ads_slots_parent_id_idx" ON "ads_slots" USING btree ("_parent_id");`)
  // The first ad spot, switched off until Ad Manager has HYFIN's unit and a campaign (issue #22).
  await payload.updateGlobal({
    slug: "ads",
    req,
    data: { enabled: false, networkCode: "118058336", slots: [{ name: "Playlist banner", enabled: false, placement: "playlist-banner", adUnit: "HYFIN-Playlist-Banner", desktopSize: "728x90", mobileSize: "300x50" }] },
  })
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ads_slots" CASCADE;
  DROP TABLE "ads" CASCADE;
  DROP TYPE "public"."enum_ads_slots_placement";`)
}
