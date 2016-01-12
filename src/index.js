import 'isomorphic-fetch'
import { stringify } from 'query-string'

const REDDIT_URL = 'https://www.reddit.com'
const MATCH_REPLY_URLS = /(?:\[([^\]]+)\]\s*\()?(https?\:\/\/[^\)\s]+)\)?/gi
const REPLACE_CHAR = String.fromCharCode(0)
const INFER_TITLE_MAX_LENGTH = 128 // Max length of remaining text to use as a title for a link
const MATCH_YOUTUBE_URL = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/

const KIND_COMMENT = 't1'
const KIND_POST = 't3'
const KIND_LISTING = 'Listing'

function get (path, query) {
  path = path[0] === '/' ? path : '/' + path
  return fetch(REDDIT_URL + path + '.json?' + stringify(query))
    .then(response => response.json())
}

export function getPosts (path, query = {}) {
  return get(path, query)
    .then(data => ({
      posts: extractPosts(data, path),
      loadMore: getLoadMoreFn(data, { path, query })
    }))
}

export function extractPosts (data, path) {
  if (data instanceof Array) {
    return data.reduce((posts, post) => posts.concat(extractPosts(post, path)), [])
  }
  if (data.json) {
    return extractPosts(data.json.data.things, path)
  }
  if (data.kind === KIND_LISTING) {
    return extractPosts(data.data.children, path)
  }
  if (data.kind === KIND_POST && !data.data.is_self) {
    return postFromPost(data.data)
  }
  if (data.kind === KIND_COMMENT || data.data.is_self) {
    return extractFromComment(data, path)
  }
  return []
}

function extractFromComment (post, path) {
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
    posts.push(postFromComment(post.data, match, title, url, offset, path))
  })
  if (post.data.replies) {
    post.data.replies.data.children.forEach(reply => {
      if (reply.kind === KIND_COMMENT) {
        posts = posts.concat(extractFromComment(reply, path))
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
    thumbnail: getThumbnail(post),
    permalink: getPermalink(post),
    // Post-specific fields
    num_comments: post.num_comments
  }
}

function postFromComment (post, match, title = null, url, offset, path) {
  // If the post is just a small amount of text and a link, use the text as the title
  const remaining = getText(post).replace(match, '').trim()
  if (!title && remaining.length < INFER_TITLE_MAX_LENGTH && !remaining.match(MATCH_REPLY_URLS)) {
    title = remaining
  }
  return {
    id: post.id + ':' + offset,
    title: removeMarkdown(title),
    url,
    created: new Date(post.created_utc * 1000),
    author: post.author,
    score: post.score,
    subreddit: post.subreddit,
    thumbnail: getThumbnail(post, url),
    permalink: getPermalink(post, path),
    // Comment-specific fields
    comment_id: post.id
  }
}

function getText (post) {
  return post.body || post.selftext || ''
}

function getPermalink (post, path = '') {
  if (post.permalink) {
    return REDDIT_URL + post.permalink
  }
  const slash = path.slice(-1) === '/' ? '' : '/'
  return REDDIT_URL + path + slash + post.id
}

function getThumbnail (post, url = post.url) {
  if (post.thumbnail) {
    return post.thumbnail
  }
  const matchYouTube = url.match(MATCH_YOUTUBE_URL)
  if (matchYouTube) {
    const id = matchYouTube[1]
    return `http://img.youtube.com/vi/${id}/default.jpg`
  }
  return null
}

// Remove markdown bold/italics
// From https://github.com/stiang/remove-markdown
function removeMarkdown (string) {
  if (!string) return string
  return string.replace(/([\*_]{1,3})(\S.*?\S)\1/g, '$2')
}
