import { describe, it } from 'mocha'
import { assert } from 'chai'

import { extractPosts } from '../src/index'

import subreddit from './data/chillmusic'
import multi from './data/chilled'
import user from './data/evilnight'
import comments from './data/whats_an_instrumental_song_that_everyone_knows'
import morechildren from './data/morechildren'
import inferTitle from './data/reply-infer-title'

describe('extractPosts', () => {

  it('subreddit', () => {
    let links = extractPosts(subreddit)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 25)
    links.forEach(assert.isObject)
  })

  it('multi', () => {
    let links = extractPosts(multi)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 25)
    links.forEach(assert.isObject)
  })

  it('user', () => {
    let links = extractPosts(user)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 13)
    links.forEach(assert.isObject)
  })

  it('comments', () => {
    let links = extractPosts(comments)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 154)
    links.forEach(assert.isObject)
  })

  it('morechildren', () => {
    let links = extractPosts(morechildren)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 1)
    links.forEach(assert.isObject)
  })

  it('infers a title from text outside URL', () => {
    let links = extractPosts(inferTitle)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 1)
    links.forEach(assert.isObject)
    assert.equal(links[0].title, 'Sabre Dance')
    assert.equal(links[0].url, 'http://www.youtube.com/watch?v=gqg3l3r_DRI')
  })

})
