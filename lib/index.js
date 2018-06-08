const WebpackDevServer = require('webpack-dev-server');
const webpackDevServerConfig = require('./setup');
const registerProxy = require('./proxy');
const path = require('path');
const fs = require('fs');

const serverListen = (server, port, host) => new Promise(resolve => server.listen(port, host, resolve))
  .then(e => { if (e) throw new Error(e); });

/**
 * WebpackDevServer Dawn MiddleWare
 * @param {Object} opts cli 传递过来的参数对象 (在 pipe 中的配置)
 * @param {Number} [opts.port=8080] - 端口
 * @param {String} [opts.host='0.0.0.0'] - host
 * @param {String} opts.homepage - 项目线上部署的地址, 访问的 URL
 * @param {Boolean} [opts.addCors=false] - cors header
 * @param {Boolean} [opts.autoOpen=true] - 自动打开
 * @return {AsyncFunction} 中间件函数
 */
module.exports = function (opts) {
  let {
    protocol = 'http',
    host = '0.0.0.0',
    port = 8080,
    homepage = '',
    addCors = false,
    autoOpen = true
  } = opts;
  //外层函数的用于接收「参数对象」
  //必须返回一个中间件处理函数
  return async function (next) {

    // 生成正确的 cdn 地址
    // TODO: 这部分与 ali 前端项目开发流耦合严重, 应考虑拆出去
    const { console, utils, cwd } = this;

    const proxyFilePath = path.resolve(cwd, './server.yml');
    let rules = [];
    
    if (fs.existsSync(proxyFilePath)) {
      const proxyObj = utils.yaml.parse(fs.readFileSync(proxyFilePath, 'utf8'));
      rules = proxyObj.proxy.rules;
    }

    // add your dev api proxy
    const apiProxy = Object.entries(rules).map(([key, target]) => ({
      context: (pathname) => {
        const condition = new RegExp(key).test(pathname);
        // console.log('---local', condition, pathname);
        return condition;
      },
      target,
      secure: false,
      onProxyRes:
        addCors ?
          (proxyRes, req) => {
            const { origin } = req.headers;
            proxyRes.headers['Access-Control-Allow-Origin'] = origin;
            proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
          } :
          undefined
    }));

    this.on('webpack.config', async (webpackConfig, webpack) => {
      // Push plugins for HMR
      // webpackConfig.plugins.push(
      //   new webpack.NamedModulesPlugin(),
      //   new webpack.HotModuleReplacementPlugin()
      // );
      const { publicPath } = webpackConfig.output;

      const compiler = webpack(webpackConfig);
      const proxy = registerProxy(apiProxy, { homepage, protocol, port, publicPath });
      const webpackDevServerOptions = webpackDevServerConfig.call(this, {
        proxy, https: protocol.toUpperCase() === 'HTTPS', publicPath, host
      });

      // WebpackDevServer.addDevServerEntrypoints(webpackConfig, webpackDevServerOptions);

      this.once('webpack.stats', () => {
        console.info('DevServer 已启动...');
        console.log('----------------------------------------------');
        console.info(`\t${protocol}://localhost:${port}`);
        console.log('-----------< or use proxy >-------------------');
        console.info(`\t${homepage}`);
        console.log('----------------------------------------------');

        if (autoOpen) {
          utils.open(homepage || `${protocol}://${host}:${port}`);
        }
      });
      // console.log(JSON.stringify(webpackConfig, null, 2));
      // 等待 webpack html plugin 将 index.html 写入内存
      await utils.sleep(2000);

      const server = new WebpackDevServer(compiler, webpackDevServerOptions);
      try {
        // Launch WebpackDevServer
        await serverListen(server, port, host);
      } catch (error) {
        throw error;
      }

      this.emit('server.start', server);
      console.info('正在启动开发服务....');
    });
    next();
  };
};