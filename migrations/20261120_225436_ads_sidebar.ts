import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_ads_slots_placement" ADD VALUE 'playlist-sidebar';
  ALTER TABLE "ads_slots" ALTER COLUMN "mobile_size" DROP NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ads_slots" ALTER COLUMN "placement" SET DATA TYPE text;
  ALTER TABLE "ads_slots" ALTER COLUMN "placement" SET DEFAULT 'playlist-banner'::text;
  DROP TYPE "public"."enum_ads_slots_placement";
  CREATE TYPE "public"."enum_ads_slots_placement" AS ENUM('playlist-banner');
  ALTER TABLE "ads_slots" ALTER COLUMN "placement" SET DEFAULT 'playlist-banner'::"public"."enum_ads_slots_placement";
  ALTER TABLE "ads_slots" ALTER COLUMN "placement" SET DATA TYPE "public"."enum_ads_slots_placement" USING "placement"::"public"."enum_ads_slots_placement";
  ALTER TABLE "ads_slots" ALTER COLUMN "mobile_size" SET NOT NULL;`)
}
