const { resolve } = require('path');

const isDevelopment = process.env.NODE_ENV !== 'production';

const mode = isDevelopment ? 'development' : 'production';
const devtool = isDevelopment ? 'cheap-module-eval-source-map' : 'source-map';

const config = {
  mode,
  entry: {
    main: resolve('./src/index.ts'),
  },
  devtool,
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: [/node_modules/],
      },
      {
        test: /\.js$/,
        loader: 'source-map-loader',
        enforce: 'pre',
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
};

module.exports = config;
