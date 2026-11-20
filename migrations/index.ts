import * as migration_20261118_193412_initial from './20261118_193412_initial';
import * as migration_20261119_004948_review_queue from './20261119_004948_review_queue';
import * as migration_20261119_021226_seo_and_search from './20261119_021226_seo_and_search';
import * as migration_20261119_041423_cds_sync from './20261119_041423_cds_sync';
import * as migration_20261119_125230_roles from './20261119_125230_roles';
import * as migration_20261119_125528_google_sub from './20261119_125528_google_sub';
import * as migration_20261119_154531_front_page from './20261119_154531_front_page';
import * as migration_20261119_164014_station_source from './20261119_164014_station_source';
import * as migration_20261119_171317_cds_image_credits from './20261119_171317_cds_image_credits';
import * as migration_20261119_222030_pages from './20261119_222030_pages';
import * as migration_20261120_134938_events from './20261120_134938_events';
import * as migration_20261120_135659_events_slug_field from './20261120_135659_events_slug_field';
import * as migration_20261120_152903_support_page from './20261120_152903_support_page';
import * as migration_20261120_154302_support_page_required from './20261120_154302_support_page_required';
import * as migration_20261120_172303_form_builder from './20261120_172303_form_builder';
import * as migration_20261120_180018_newsletter_page from './20261120_180018_newsletter_page';
import * as migration_20261120_204503_npr_copies from './20261120_204503_npr_copies';
import * as migration_20261120_212715_search_fields from './20261120_212715_search_fields';
import * as migration_20261120_213000_search_fts from './20261120_213000_search_fts';
import * as migration_20261120_213125_search_queries from './20261120_213125_search_queries';
import * as migration_20261120_222638_ads from './20261120_222638_ads';
import * as migration_20261120_225436_ads_sidebar from './20261120_225436_ads_sidebar';

export const migrations = [
  {
    up: migration_20261118_193412_initial.up,
    down: migration_20261118_193412_initial.down,
    name: '20261118_193412_initial',
  },
  {
    up: migration_20261119_004948_review_queue.up,
    down: migration_20261119_004948_review_queue.down,
    name: '20261119_004948_review_queue',
  },
  {
    up: migration_20261119_021226_seo_and_search.up,
    down: migration_20261119_021226_seo_and_search.down,
    name: '20261119_021226_seo_and_search',
  },
  {
    up: migration_20261119_041423_cds_sync.up,
    down: migration_20261119_041423_cds_sync.down,
    name: '20261119_041423_cds_sync',
  },
  {
    up: migration_20261119_125230_roles.up,
    down: migration_20261119_125230_roles.down,
    name: '20261119_125230_roles',
  },
  {
    up: migration_20261119_125528_google_sub.up,
    down: migration_20261119_125528_google_sub.down,
    name: '20261119_125528_google_sub',
  },
  {
    up: migration_20261119_154531_front_page.up,
    down: migration_20261119_154531_front_page.down,
    name: '20261119_154531_front_page',
  },
  {
    up: migration_20261119_164014_station_source.up,
    down: migration_20261119_164014_station_source.down,
    name: '20261119_164014_station_source',
  },
  {
    up: migration_20261119_171317_cds_image_credits.up,
    down: migration_20261119_171317_cds_image_credits.down,
    name: '20261119_171317_cds_image_credits',
  },
  {
    up: migration_20261119_222030_pages.up,
    down: migration_20261119_222030_pages.down,
    name: '20261119_222030_pages',
  },
  {
    up: migration_20261120_134938_events.up,
    down: migration_20261120_134938_events.down,
    name: '20261120_134938_events',
  },
  {
    up: migration_20261120_135659_events_slug_field.up,
    down: migration_20261120_135659_events_slug_field.down,
    name: '20261120_135659_events_slug_field',
  },
  {
    up: migration_20261120_152903_support_page.up,
    down: migration_20261120_152903_support_page.down,
    name: '20261120_152903_support_page',
  },
  {
    up: migration_20261120_154302_support_page_required.up,
    down: migration_20261120_154302_support_page_required.down,
    name: '20261120_154302_support_page_required',
  },
  {
    up: migration_20261120_172303_form_builder.up,
    down: migration_20261120_172303_form_builder.down,
    name: '20261120_172303_form_builder',
  },
  {
    up: migration_20261120_180018_newsletter_page.up,
    down: migration_20261120_180018_newsletter_page.down,
    name: '20261120_180018_newsletter_page',
  },
  {
    up: migration_20261120_204503_npr_copies.up,
    down: migration_20261120_204503_npr_copies.down,
    name: '20261120_204503_npr_copies',
  },
  {
    up: migration_20261120_212715_search_fields.up,
    down: migration_20261120_212715_search_fields.down,
    name: '20261120_212715_search_fields',
  },
  {
    up: migration_20261120_213000_search_fts.up,
    down: migration_20261120_213000_search_fts.down,
    name: '20261120_213000_search_fts',
  },
  {
    up: migration_20261120_213125_search_queries.up,
    down: migration_20261120_213125_search_queries.down,
    name: '20261120_213125_search_queries',
  },
  {
    up: migration_20261120_222638_ads.up,
    down: migration_20261120_222638_ads.down,
    name: '20261120_222638_ads',
  },
  {
    up: migration_20261120_225436_ads_sidebar.up,
    down: migration_20261120_225436_ads_sidebar.down,
    name: '20261120_225436_ads_sidebar'
  },
];
