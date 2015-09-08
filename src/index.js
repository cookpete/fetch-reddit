import { stringify } from 'qs'

const API_URL = 'https://www.reddit.com'
const MATCH_REPLY_URLS = /(?:\[([^\]]+)\]\s*\()?(https?\:\/\/[^\)\s]+)\)?/gi

const KIND_COMMENT = 't1'
const KIND_POST = 't3'
const KIND_LISTING = 'Listing'

function get (path, query) {
  path = path[0] === '/' ? path : '/' + path
  return fetch(API_URL + path + '.json?' + stringify(query))
    .then(response => response.json())
}

export function getPosts (path, query = {}) {
  return get(path, query)
    .then(data => ({
      posts: extractPosts(data),
      loadMore: getLoadMoreFn(data, { path, query })
    }))
}

export function extractPosts (data) {
  let posts = []
  if (data instanceof Array) {
    data.forEach(post => posts = posts.concat(extractPosts(post)))
  } else if (data.json) {
    data.json.data.things.forEach(post => posts = posts.concat(extractPosts(post)))
  } else if (data.kind === KIND_LISTING) {
    data.data.children.forEach(post => posts = posts.concat(extractPosts(post)))
  } else if (data.kind === KIND_POST && !data.data.is_self) {
    posts.push(postFromPost(data.data))
  } else if (data.kind === KIND_COMMENT || data.data.is_self) {
    posts = posts.concat(extractFromComment(data))
  }
  return posts
}

function extractFromComment (post) {
  let posts = []
  if (post.kind === 'more') {
    return posts
  }
  getText(post.data).replace(MATCH_REPLY_URLS, (match, title, url) => {
    posts.push(postFromComment(post.data, match, title, url))
  })
  if (post.data.replies) {
    post.data.replies.data.children.forEach(reply => {
      if (reply.kind === KIND_COMMENT) {
        posts = posts.concat(extractFromComment(reply))
      }
    })
  }
  return posts
}

function getLoadMoreFn (data, options) {
  if (data instanceof Array) {
    return getLoadMoreFn(data.pop(), options)
  }
  if (options.parent) {
    return () => getChildren(options.parent, options.children)
  }
  if (data.kind === 'more') {
    return () => getChildren(data.data.parent_id, data.data.children)
  }
  if (data.data.after) {
    options.query.after = data.data.after
    return () => getPosts(options.path, options.query)
  }
  if (data.data.children) {
    return getLoadMoreFn(data.data.children.pop(), options)
  }
}

function getChildren (parent, children) {
  let requestChildren = children.splice(0, 500) // TODO: const
  let query = {
    api_type: 'json',
    link_id: parent,
    children: requestChildren.join(',')
  }
  return get('/api/morechildren', query)
    .then(data => ({
      posts: extractPosts(data),
      loadMore: getLoadMoreFn(null, { parent, children })
    }))
}

function postFromPost (post) {
  return {
    id: post.id,
    title: post.title,
    url: post.url,
    thumbnail: post.thumbnail,
    created: new Date(post.created_utc * 1000),
    author: post.author,
    score: post.score
  }
}

function postFromComment (post, match, title, url) {
  // If the post is just text then a link, use the text as the title
  let remaining = getText(post).replace(match, '')
  if (!title && remaining.length < 128 && !MATCH_REPLY_URLS.test(remaining)) {
    title = remaining.trim()
  }
  return {
    id: url,
    title,
    url,
    created: new Date(post.created_utc * 1000),
    author: post.author,
    score: post.score
  }
}

function getText (post) {
  return post.body || post.selftext || ''
}
