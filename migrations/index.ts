import * as migration_20261118_193412_initial from './20261118_193412_initial';

export const migrations = [
  {
    up: migration_20261118_193412_initial.up,
    down: migration_20261118_193412_initial.down,
    name: '20261118_193412_initial'
  },
];
