import * as migration_20261118_193412_initial from './20261118_193412_initial';
import * as migration_20261119_004948_review_queue from './20261119_004948_review_queue';
import * as migration_20261119_021226_seo_and_search from './20261119_021226_seo_and_search';

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
    name: '20261119_021226_seo_and_search'
  },
];
