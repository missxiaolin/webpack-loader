// include: path.resolve(__dirname, 'src'),


const path = require('path');
module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'src'),
                use: [
                    {
                        loader: 'text2-loader',
                        options: {
                            name: '前端',
                        },
                    },
                ],
            },
            {
                test: /\.js$/,
                include: path.resolve(__dirname, 'src'),
                use: [
                    {
                        loader: 'text-loader',
                        options: {
                            name: '前端',
                        },
                    },
                ],
            },
        ],
    },
    resolveLoader: {
        modules: ['node_modules', './src/loader'], // node_modules 找loader,如果找不到就 ./src/loader 找
    },
    devServer: {
        contentBase: './dist',
        overlay: {
            warnings: true,
            errors: true,
        },
        open: true,
    },
}
