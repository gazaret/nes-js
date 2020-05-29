const { resolve } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isDevelopment = process.env.NODE_ENV !== 'production';

const mode = isDevelopment ? 'development' : 'production';
const devtool = isDevelopment ? 'cheap-module-eval-source-map' : 'source-map';

const config = {
  mode,
  entry: {
    main: resolve('./src/index.ts'),
  },
  output: {
    path: resolve('./dist'),
    filename: 'index.js',
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
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: 'public/index.html',
    }),
  ],
};

module.exports = config;
