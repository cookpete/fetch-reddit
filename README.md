fetch-reddit
============

A react component for playing media from YouTube, SoundCloud or Vimeo.

### Usage

```bash
npm install fetch-reddit --save
```

```js
import { getPosts } from 'fetch-reddit'

function processPosts (posts) {
  // Do something with the extracted posts
}

getPosts('/r/chillmusic').then(data => {
  // Array of extracted posts
  processPosts(data.posts)

  // Easy pagination
  data.loadMore().then(processPosts)
})
```

### Linting

This project uses [standard](https://github.com/feross/standard) code style.

```bash
npm run lint
```

### Testing

This project uses [mocha](https://github.com/mochajs/mocha) with [chai](https://github.com/chaijs/chai) assertions for unit testing.

```bash
npm run test
```

### Thanks

* Big thanks to [koistya](https://github.com/koistya) for [babel-starter-kit](https://github.com/kriasoft/babel-starter-kit), which this repo is roughly based on.
