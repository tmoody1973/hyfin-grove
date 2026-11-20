import { MigrateDownArgs, MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * Ranked site search in Postgres (plan 12, decision 019). Hand-written: Payload can't express these, and its schema
 * snapshots don't know the generated `fts` column, so later migrate:create runs never touch it.
 * - unaccent + a "hyfin" text-search configuration: English stemming with accents folded ("Beyonce" finds "Beyoncé").
 * - fts: title weighted A, summary B, body C, kept current by Postgres on every write.
 * - pg_trgm on accent-folded, lowercased titles: typo matching ("kendirck").
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  CREATE EXTENSION IF NOT EXISTS unaccent;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  CREATE OR REPLACE FUNCTION public.hyfin_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    AS $fn$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $fn$;
  DO $cfg$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'hyfin') THEN
      CREATE TEXT SEARCH CONFIGURATION public.hyfin (COPY = english);
      ALTER TEXT SEARCH CONFIGURATION public.hyfin ALTER MAPPING FOR hword, hword_part, word WITH public.unaccent, english_stem;
    END IF;
  END $cfg$;
  ALTER TABLE "search" ADD COLUMN "fts" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('public.hyfin'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('public.hyfin'::regconfig, coalesce("excerpt", '')), 'B') ||
    setweight(to_tsvector('public.hyfin'::regconfig, coalesce("body", '')), 'C')
  ) STORED;
  CREATE INDEX "search_fts_idx" ON "search" USING gin ("fts");
  CREATE INDEX "search_title_trgm_idx" ON "search" USING gin (public.hyfin_unaccent(lower("title")) gin_trgm_ops);`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "search_title_trgm_idx";
  DROP INDEX IF EXISTS "search_fts_idx";
  ALTER TABLE "search" DROP COLUMN IF EXISTS "fts";
  DROP TEXT SEARCH CONFIGURATION IF EXISTS public.hyfin;
  DROP FUNCTION IF EXISTS public.hyfin_unaccent(text);`)
}
