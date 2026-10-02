import test from 'node:test'
import assert from 'node:assert/strict'

import { buildApiUrl, extractSearchList, normalizeTrack } from './musicClient.js'
import {
  addTrackToLocalPlaylist,
  isTrackInLocalPlaylist,
  nextTrack,
  playTrack,
  playerState,
  removeTrackFromLocalPlaylist,
} from './playerState.js'

test('buildApiUrl should append query params in a stable order', () => {
  const url = buildApiUrl('/search', { keywords: '周杰伦', type: 1, limit: 5 })
  assert.equal(url, 'http://localhost:3000/search?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1&limit=5')
})

test('normalizeTrack should flatten common Netease fields', () => {
  const track = normalizeTrack({
    id: 123,
    name: '夜曲',
    artists: [{ name: '周杰伦' }],
    album: { name: '十一月的萧邦' },
    duration: 240000,
  })

  assert.equal(track.id, 123)
  assert.equal(track.title, '夜曲')
  assert.equal(track.artist, '周杰伦')
  assert.equal(track.album, '十一月的萧邦')
  assert.equal(track.duration, 240000)
})

test('extractSearchList should read the wrapped Netease search response', () => {
  const songs = [{ id: 481873974, name: 'NEVER' }]
  const response = { result: { songs }, code: 200 }

  assert.deepEqual(extractSearchList(response, 'songs'), songs)
  assert.deepEqual(extractSearchList(response, 'albums'), [])
})

test('playTrack and nextTrack should keep the selected track in the queue', () => {
  const queue = [
    { id: 'test-a', title: 'A' },
    { id: 'test-b', title: 'B' },
  ]

  playTrack(queue[0], queue)
  assert.equal(playerState.currentTrack.id, 'test-a')
  nextTrack()
  assert.equal(playerState.currentTrack.id, 'test-b')
})

test('local favorites should add once and support removal', () => {
  const track = { id: 'test-favorite', title: 'Favorite' }

  addTrackToLocalPlaylist(track)
  addTrackToLocalPlaylist(track)
  assert.equal(isTrackInLocalPlaylist(track.id), true)

  removeTrackFromLocalPlaylist(track.id, 'local-favorite')
  assert.equal(isTrackInLocalPlaylist(track.id), false)
})
