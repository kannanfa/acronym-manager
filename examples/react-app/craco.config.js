module.exports = {
  webpack: {
    configure: {
      resolve: {
        fallback: {
          path: false,
          fs: false,
          crypto: false,
          stream: false,
          util: false,
          buffer: false,
          assert: false,
          http: false,
          url: false,
          https: false,
          os: false,
          zlib: false,
          net: false,
          tls: false,
          child_process: false,
          events: false
        },
        alias: {
          'node:events': 'events'
        }
      }
    }
  }
}; 