const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserJSPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");

const isDev = process.env.NODE_ENV !== "production";

module.exports = {
  entry: {
    main: "./src/index.tsx",
  },
  output: {
    filename: "static/js/polaris-console.js",
    path: path.resolve(__dirname, "../dist"),
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              publicPath: "../",
            },
          },
          "css-loader",
        ],
      },
      {
        test: /\.(ttf)/,
        loader: "url-loader",
        options: {
          limit: 1024 * 4,
          name: "./fonts/[name].[hash:8].[ext]",
        },
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: ["babel-loader", "ts-loader"],
      },
      {
        test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
        loader: "url-loader",
        options: {
          limit: 10000,
          name: "./images/[name].[hash:8].[ext]",
        },
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@src": path.resolve(__dirname, "../src"),
    },
  },
  optimization: {
    minimizer: [
      new TerserJSPlugin({
        terserOptions: { output: { comments: false } },
      }),
      new CssMinimizerPlugin(),
    ],
  },
  plugins: [
    new MonacoWebpackPlugin({
      // 所需语言支持
      languages: ["json", "yaml", "html", "xml", "ini"],
      // targetName 业务名
      filename: "polaris-[name].[contenthash:10].js",
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "./src/assets/index.html",
      minify: !isDev,
      publicPath: "/",
    }),
    new MiniCssExtractPlugin({
      filename: "./static/css/polaris-console.css",
    }),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
      "process.env.BUILD_TYPE": JSON.stringify(process.env.BUILD_TYPE),
    }),
  ],
};
