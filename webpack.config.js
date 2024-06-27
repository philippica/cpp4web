const path = require('path');
const TerserPlugin = require("terser-webpack-plugin");

const compress = [
  '(^parse)',
  '(^jump)',
  'thenParse',
  'attempt',
  "setError",
  "getAST",
  "setAST",
  "currentToken",
  "getStructOrUnion",
  "currentLine",
  "choose",
  "ast",
  "variables",
  "sequence",
  "(^check)",
  "index",
  "structOrUnion",
  "blockComment",
  "excute"
].reduce((a,b) => a + "|" + b);

module.exports = {
  entry: path.resolve(__dirname, './src/index'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    //filename: 'index-[chunkhash:8].js',
    filename: 'index.js',
    library: 'Cpp4Web',
    libraryTarget: 'umd',
    globalObject: 'this',
    hashFunction: "sha256"
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {properties: {regex: compress}}
          //mangle: {properties: true}
        },
      }),
    ],
  },

  module: {
    rules: [
      {
        test: /\.css$/,
        use: 'css-loader'
      }
    ],
  },
  resolve: {
    alias: {
      'runtime': path.resolve(__dirname, `src/Fundamental/RuntimeType.${process.env.NODE_ENV}.js`)
    }
  }
};