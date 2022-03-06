const VueLoaderPlugin = require("vue-loader/lib/plugin");
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin');
const RemovePlugin = require('remove-files-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = (env, argv) => ({
    mode: argv.mode === 'production' ? 'production' : 'development',

    // This is necessary because Figma's 'eval' works differently than normal eval
    devtool: argv.mode === 'production' ? false : 'inline-source-map',

    entry: {
        ui: './src/ui.js', // The entry point for your UI code
        code: './src/code.ts', // The entry point for your plugin code
    },

    module: {
        rules: [
            // Converts Vue code to JavaScript
            { test: /\.vue$/, loader: "vue-loader", exclude: /node_modules/ },

            // Converts TypeScript code to JavaScript
            { test: /\.tsx?$/, use: 'ts-loader', exclude: /node_modules/ },

            // Enables including CSS by doing "import './file.css'" in your TypeScript code
            { test: /\.css$/, use: ['style-loader', { loader: 'css-loader' }] },

            // Allows you to use "<%= require('./file.svg') %>" in your HTML code to get a data URI
            { test: /\.(png|jpg|gif|webp|svg)$/, loader: 'url-loader' },
        ],
    },

    // Webpack tries these extensions for you if you omit the extension like "import './file'"
    resolve: {
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
        alias: {
            vue$: "vue/dist/vue.esm.js"
        }
    },

    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'), // Compile into a folder called "dist"
    },

    // Tells Webpack to generate "ui.html" and to inline "ui.ts" into it
    plugins: [
        new VueLoaderPlugin(),
        new RemovePlugin({
            after: { include: ['dist/ui.js'] }
        }),
        new HtmlWebpackPlugin({
            template: './src/ui.html',
            filename: 'ui.html',
            inlineSource: '.(js|css|scss)$',
            chunks: ['ui'],
        }),
        new HtmlWebpackInlineSourcePlugin()
    ],
})