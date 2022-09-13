module.exports = function (source) {
  const loaderUtils = require("loader-utils");
  // 获取到用户给当前 Loader 传入的 options
  const options = loaderUtils.getOptions(this);
  console.log("options-->", options);
  console.log("text-loader===", source);
  // 在这里按照你的需求处理 source
  return source.replace("前端", "前端训练营！！！");
};
