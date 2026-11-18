import test from 'node:test';
import assert from 'node:assert/strict';
import { ScanStore, newScan, normalizeScan, scanStorageKey, checkedAlbumCount } from '../plugins/AlbumAffinity/src/snapshot.mjs';

const sample = (status = 'ok') => ({
  id: '123', title: 'An album', artist: 'An artist', cover: '', type: 'ALBUM', releaseDate: '2026-01-01',
  liked: [{ id: '1', title: 'First song' }, { id: '2', title: 'Second song' }],
  totalTracks: status === 'ok' ? 10 : null, metadataStatus: status,
});
const storage = () => {
  const map = new Map();
  return {
    getItem: key => map.get(key) ?? null, setItem: (key, val) => map.set(key, val),
    removeItem: key => map.delete(key), map,
  };
};

test('completed scan persists and loads for the same account', () => {
  const mem = storage();
  const store = new ScanStore('100', mem);
  assert.equal(store.write('completed', [sample()], 2, 0), true);
  assert.equal(store.read('completed').albums[0].liked.length, 2);
  assert.equal(new ScanStore('101', mem).read('completed'), null);
});

test('in-progress checkpoint is preserved independently from completed results', () => {
  const mem = storage();
  const store = new ScanStore('100', mem);
  store.write('completed', [sample()], 2, 0);
  store.write('checkpoint', [sample('pending')], 2, 0);
  assert.equal(store.read('completed').albums[0].metadataStatus, 'ok');
  assert.equal(store.read('checkpoint').albums[0].metadataStatus, 'pending');
  store.clearCheckpoint();
  assert.equal(store.read('checkpoint'), null);
  assert.ok(store.read('completed'));
});

test('completed snapshots reject pending work, while checkpoints permit it', () => {
  assert.equal(newScan('100', 'completed', [sample('pending')], 2, 0), null);
  assert.ok(newScan('100', 'checkpoint', [sample('pending')], 2, 0));
});

test('corrupt, unexpected or other-account data is rejected', () => {
  const mem = storage();
  const store = new ScanStore('100', mem);
  mem.setItem(scanStorageKey('100', 'completed'), '{bad');
  assert.equal(store.read('completed'), null);
  const src = newScan('100', 'completed', [sample()], 2, 0);
  assert.equal(normalizeScan(src, '200', 'completed'), null);
  assert.equal(normalizeScan({ ...src, schema: 1 }, '100', 'completed'), null);
});

test('album and loved-track fields are sanitized; repeated track IDs deduplicated', () => {
  const src = newScan('100', 'completed', [{ ...sample(), liked: [
    { id: '1', title: '<img>' }, { id: '1', title: 'Repeat' }, { id: '2', title: 'Second' },
  ] }], 2, 0);
  assert.equal(src.albums[0].liked.length, 2);
  assert.equal(src.albums[0].liked[0].title, '<img>'); // plain text, never HTML injection
  assert.deepEqual(src.albums[0].liked.map(x => x.id), ['1', '2']);
});

test('refuse success when storage is unavailable or quota exceeded', () => {
  const blocked = { getItem: () => null, setItem: () => { throw new Error('Quota'); }, removeItem: () => {} };
  assert.equal(new ScanStore('100', blocked).write('completed', [sample()], 2, 0), false);
});

test('scoring progress counts completed, failed and invalid entries, not pending', () => {
  assert.equal(checkedAlbumCount([sample('ok'), sample('failed'), sample('invalid'), sample('pending')]), 3);
});
