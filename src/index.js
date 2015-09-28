import { stringify } from 'qs'

const API_URL = 'https://www.reddit.com'
const MATCH_REPLY_URLS = /(?:\[([^\]]+)\]\s*\()?(https?\:\/\/[^\)\s]+)\)?/gi
const REPLACE_CHAR = String.fromCharCode(0)

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
  // Use REPLACE_CHAR to avoid regex problems with escaped ] characters within the title string
  getText(post.data).replace(/\\]/g, REPLACE_CHAR).replace(MATCH_REPLY_URLS, (match, title, url, offset) => {
    if (title) {
      // Bring back the removed ] and then we can safely unescape everything
      title = title.replace(new RegExp(REPLACE_CHAR, 'g'), '\\]').replace(/\\(.)/g, '$1')
    }
    posts.push(postFromComment(post.data, match, title, url, offset))
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
    created: new Date(post.created_utc * 1000),
    author: post.author,
    score: post.score,
    subreddit: post.subreddit,
    // Post-specific fields
    thumbnail: post.thumbnail,
    num_comments: post.num_comments,
    permalink: post.permalink
  }
}

function postFromComment (post, match, title = null, url, offset) {
  // If the post is just text and a link, use the text as the title
  const remaining = getText(post).replace(match, '').trim()
  if (!title && remaining.length < 128 && !remaining.match(MATCH_REPLY_URLS)) {
    title = remaining
  }
  return {
    id: post.id + ':' + offset,
    title,
    url,
    created: new Date(post.created_utc * 1000),
    author: post.author,
    score: post.score,
    subreddit: post.subreddit,
    // Comment-specific fields
    comment_id: post.id
  }
}

function getText (post) {
  return post.body || post.selftext || ''
}
