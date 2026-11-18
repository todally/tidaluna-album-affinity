import test from 'node:test';
import assert from 'node:assert/strict';
import {
  unwrapFavoriteTrack, groupFavorites, applyAlbumMetadata, affinityPercent, category,
  isNearlyComplete, rankAlbums, extractAlbumTracks, compareTrackList,
} from '../plugins/AlbumAffinity/src/analysis.mjs';
const track = (id, albumId, title = `Track ${id}`, artist = 'Artist') => ({item:{ id, title, album: {id: albumId, title: `Album ${albumId}`, artist: {name: artist}}}});
test('unwrap a wrapped TIDAL favorites entry', () => {
  assert.deepEqual(unwrapFavoriteTrack(track(20, 7)), {id:'20', title:'Track 20', albumId:'7', albumTitle:'Album 7',artist:'Artist',cover:'',albumType:'',releaseDate:'',duration:undefined});
});
test('group and de-duplicate favorites by exact album and track IDs', () => {
  const result = groupFavorites([track(1, 5),track(2,5),track(1,5),track(3,6),{},track(4,5)]);
  assert.equal(result.favoriteCount, 4);
  assert.equal(result.ungrouped, 1);
  assert.equal(result.groups.length, 2);
  assert.deepEqual(result.groups[0].liked.map(t=>t.id), ['1','2','4']);
});
test('album ratio, category, and no false high scores', () => {
  const result = groupFavorites(Array.from({length:9},(_,i)=>track(i+1,5)));
  const scored = applyAlbumMetadata(result.groups[0], {numberOfTracks: 10, type:'ALBUM'});
  assert.equal(affinityPercent(scored), 90);
  assert.equal(category(scored), 'strong');
  assert.equal(isNearlyComplete(scored), true);
  const small = applyAlbumMetadata(groupFavorites([track(10,6),track(11,6)]).groups[0],{numberOfTracks:2, type:'SINGLE'});
  assert.equal(category(small), 'likely'); // 100% but fewer than five loved tracks
  assert.deepEqual(rankAlbums([small,scored]).map(a=>a.id),['5']);
});
test('missing or inconsistent track counts are unavailable, not guessed', () => {
  const base = groupFavorites([track(1,2),track(2,2)]).groups[0];
  for (const value of [null, 0, -1, 1, 'not-a-number', 1.5]) {
    assert.equal(affinityPercent(applyAlbumMetadata(base,{numberOfTracks:value})),null);
  }
});
test('sort by affinity rather than raw song count, with deterministic ties', () => {
  const a = applyAlbumMetadata(groupFavorites(Array.from({length:9},(_,i)=>track(i+1,1))).groups[0],{numberOfTracks:10});
  const b = applyAlbumMetadata(groupFavorites(Array.from({length:10},(_,i)=>track(i+100,2))).groups[0],{numberOfTracks:20});
  assert.deepEqual(rankAlbums([b,a],{minTracks:1}).map(x=>x.id),['1','2']);
  assert.deepEqual(rankAlbums([b,a],{minTracks:1,sort:'loved'}).map(x=>x.id),['2','1']);
  assert.deepEqual(rankAlbums([b,a],{minTracks:1,minPercent:80}).map(x=>x.id),['1']);
});
test('full track breakdown matches exact ids and does not confuse unliked with disliked', () => {
  const scored = applyAlbumMetadata(groupFavorites([track(1,12)]).groups[0],{numberOfTracks:2});
  const list = extractAlbumTracks({items:[{id:1,title:'A'},{id:2,title:'B'}]});
  assert.deepEqual(compareTrackList(scored,list).map(t=>t.loved),[true,false]);
});
