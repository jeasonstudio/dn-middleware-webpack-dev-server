const path = require('path');

module.exports = function ({ proxy, publicPath, https, host, allowedHost }) {
  const self = this;
  return {
    disableHostCheck: true,
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    clientLogLevel: 'none',
    contentBase: path.resolve(this.cwd, 'build'),
    // By default files from `contentBase` will not trigger a page reload.
    watchContentBase: true,
    // Enable hot reloading server.
    // Note that only changes to CSS are currently hot reloaded.
    // JS changes will refresh the browser.
    hot: true,
    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath,
    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.hooks[...].tap` calls above.
    quiet: true,
    watchOptions: { ignored: /node_modules/ },
    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    https,
    host,
    overlay: false,
    historyApiFallback: { disableDotRule: true },
    public: allowedHost,
    proxy,
    before(app) {
      if (self.emit) self.emit('webpack-dev-server.before', app);
    }
  };
};