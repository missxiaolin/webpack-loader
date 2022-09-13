module.exports = function (source) {
    // const loaderUtils = require('loader-utils');
    // 获取到用户给当前 Loader 传入的 options
    // const options = loaderUtils.getOptions(this);
    // console.log('options-->', options);

    // 在这里按照你的需求处理 source
    console.log('text2-loader===', source);
    return source.replace('hello', '欢迎加入');
}
