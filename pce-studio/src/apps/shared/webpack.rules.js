module.exports = [
  {
    test: /\.(ts|tsx|js|jsx)?$/,
    exclude: /(node_modules|\.webpack|src[\\/]stories)/,
    rules: [
      {
        loader: "ts-loader",
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
  {
    test: /\.(png|jpe?g|gif|mp4|woff2)$/i,
    exclude: /(node_modules|\.webpack)/,
    type: "asset/resource",
    generator: {
      publicPath: "../", // move up from 'main_window'
    },
  },
  {
    test: /\.(asm|inc)$/i,
    exclude: /(node_modules|\.webpack)/,
    type: "asset/source",
  },
  {
    test: /[\\/]appData[\\/]wasm[\\/](.*)[\\/](.*).wasm$/,
    type: "asset/resource",
    generator: {
      filename: "[name].[contenthash][ext]",
      publicPath: "../wasm/",
      outputPath: "wasm",
    },
  },
];
