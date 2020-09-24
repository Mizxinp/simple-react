module.exports = {
    entry: {
        main: './main.js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'], // presets: 相当于babel中config的快捷方式
                        plugins: [['@babel/plugin-transform-react-jsx', { pragma: 'createElement' }]], // 支持jsx
                    },
                },
            },
        ],
    },
    mode: "development",
    optimization: {
        minimize: false,
    }
}