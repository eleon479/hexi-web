const path = require('path');

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, './src/client.ts'),
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'script.js',
    path: path.resolve(__dirname, 'public', 'static', 'bundle'),
  },

  // dev options
  watch: true,
  devServer: {
    port: 3000,
  },
};
