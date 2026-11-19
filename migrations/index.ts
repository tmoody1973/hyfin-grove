import * as migration_20261118_193412_initial from './20261118_193412_initial';
import * as migration_20261119_004948_review_queue from './20261119_004948_review_queue';
import * as migration_20261119_021226_seo_and_search from './20261119_021226_seo_and_search';
import * as migration_20261119_041423_cds_sync from './20261119_041423_cds_sync';
import * as migration_20261119_125230_roles from './20261119_125230_roles';

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
    name: '20261119_125230_roles'
  },
];
