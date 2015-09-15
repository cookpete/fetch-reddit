import { describe, it } from 'mocha'
import { assert } from 'chai'

import { extractPosts } from '../src/index'

import subreddit from './data/chillmusic'
import multi from './data/chilled'
import user from './data/evilnight'
import comments from './data/whats_an_instrumental_song_that_everyone_knows'
import morechildren from './data/morechildren'
import inferTitle from './data/reply-infer-title'
import selfPost from './data/what_are_your_favorite_i_hate_you_songs'
import twoLinks from './data/two-links'

describe('extractPosts', () => {
  it('subreddit', () => {
    let links = extractPosts(subreddit)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 28)
    links.forEach(verifyPost)
  })

  it('multi', () => {
    let links = extractPosts(multi)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 28)
    links.forEach(verifyPost)
  })

  it('user', () => {
    let links = extractPosts(user)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 13)
    links.forEach(verifyPost)
  })

  it('comments', () => {
    let links = extractPosts(comments)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 153)
    links.forEach(verifyPost)
  })

  it('morechildren', () => {
    let links = extractPosts(morechildren)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 1)
    links.forEach(verifyPost)
  })

  it('infers a title from text outside URL', () => {
    let links = extractPosts(inferTitle)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 1)
    links.forEach(verifyPost)
    assert.propertyVal(links[0], 'title', 'Sabre Dance')
    assert.propertyVal(links[0], 'url', 'http://www.youtube.com/watch?v=gqg3l3r_DRI')
  })

  it('extracts links from self posts', () => {
    let links = extractPosts(selfPost)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 90)
    links.forEach(verifyPost)
    assert.propertyVal(links[0], 'title', 'Everything About You')
    assert.propertyVal(links[0], 'url', 'https://www.youtube.com/watch?v=byEGjLU2egA')
  })

  it('null titles with several links in a comment', () => {
    let links = extractPosts(twoLinks)
    assert.typeOf(links, 'array')
    assert.lengthOf(links, 2)
    links.forEach(verifyPost)
    assert.propertyVal(links[0], 'title', null)
    assert.propertyVal(links[1], 'title', null)
  })
})

function verifyPost (post) {
  assert.isObject(post)
  assert.property(post, 'id')
  assert.property(post, 'title')
  assert.property(post, 'url')
  assert.property(post, 'created')
  assert.property(post, 'author')
}
