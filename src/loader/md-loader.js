const { getOptions } = require("loader-utils");
const MarkdownIt = require("markdown-it");
const beautify = require("./md");

module.exports = function (source) {
  const options = getOptions(this) || {};
  const md = new MarkdownIt({
    html: true,
    ...options,
  });
  // 这里解析的结果是一个 HTML 字符串。如果直接返回，也会面临Webpack无法解析模块的问题。
  // 正确的做法是把这个HTML字符串拼接成一段JS代码。通过module.exports导出这个HTML字符串，
  let html = beautify(md.render(source));
  // 这样外界在导入模块的时候就可以接收到这个HTML字符串。
  console.log(
    "🚀 ~ file: md-trans-loader.js ~ line 16 ~ html",
    JSON.stringify(html)
  );
  html = `module.exports = ${JSON.stringify(html)}`;
  this.callback(null, html);
};
