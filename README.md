# webpack-loader

loader实际上是一个有权调用Loader API的函数模块儿。并且这个函数中的this被webpack填充，lader API可以简单理解为:这个函数中可以用this调用的那些函数方法。

## 同步loader 和 异步loader

如果是单个处理结果，可以在 同步模式 中直接返回。如果有多个处理结果，则必须调用 this.callback()。在 异步模式 中，必须调用 this.async() 来告知 loader runner 等待异步结果，它会返回 this.callback() 回调函数。随后 loader 必须返回 undefined 并且调用该回调函数。

- 同步loader

~~~
// 同步loader
module.exports = function(content,map,meta) {
    return actions(content);
}
~~~

~~~
// 同步loader  有多个处理结果
module.exports = function(content,map,meta) {
    this.callback(null,actions(content),map,meta);
    return; // 当调用 callback() 函数时，总是返回 undefined
}
~~~

- 异步loader

~~~
// 异步loader
module.exports = function(content,map,meta) {
    let callback = this.async();
    asyncAction(content,(err,res) => {
        if(err) return callback(err);
        callback(null,res,map,meta);
    });
}
~~~

~~~
// 异步loader  有多个处理结果
module.exports = function(content,map,meta) {
    let callback = this.async();
    asyncAction(content,(err,res,sourceMap,meta) => {
        if(err) return callback(err);
        callback(null,res,sourceMap,meta);
    });
}
~~~

### loader 的执行顺序

loader 总是 从右到左被调用。有些情况下，loader 只关心 request 后面的 元数据(metadata)，并且忽略前一个 loader 的结果。在实际（从右到左）执行 loader 之前，会先 从左到右 调用 loader 上的 pitch 方法。

对于如下配置:

~~~
module.exports = {
  //...
  module: {
    rules: [
      {
        //...
        use: ['a-loader', 'b-loader', 'c-loader'],
      },
    ],
  },
};
~~~

有如下步骤:

~~~
|- a-loader `pitch`
  |- b-loader `pitch`
    |- c-loader `pitch`
      |- requested module is picked up as a dependency
    |- c-loader normal execution
  |- b-loader normal execution
|- a-loader normal execution

~~~

那么，为什么 loader 可以利用 "pitching" 阶段呢？

首先，传递给 pitch 方法的 data，在执行阶段也会暴露在 this.data 之下，并且可以用于在循环时，捕获并共享前面的信息。

~~~
module.exports = function (content) {
  return someSyncOperation(content, this.data.value);
};

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
  data.value = 42;
};
~~~

其次，如果某个 loader 在 pitch 方法中给出一个结果，那么这个过程会回过身来，并跳过剩下的 loader。在我们上面的例子中，如果 b-loader 的 pitch 方法返回了一些东西：

~~~
module.exports = function (content) {
  return someSyncOperation(content);
};

module.exports.pitch = function (remainingRequest, precedingRequest, data) {
  if (someCondition()) {
    return (
      'module.exports = require(' +
      JSON.stringify('-!' + remainingRequest) +
      ');'
    );
  }
};
~~~

上面的步骤将被缩短为：

~~~
|- a-loader `pitch`
  |- b-loader `pitch` returns a module
|- a-loader normal execution
~~~

### Loader Context 上下文

loader context 表示在 loader 内使用 this 可以访问的一些方法或属性。

- this.addContextDependency。

添加目录作为lader结果的依赖。例如，在文件/a/b/index.js中：

~~~
require('./loader1');
~~~

该loader会将/a/b/index.js这个目录作为loader结果的依赖。

- this.addDependency

~~~
addDependency(file: string)
dependency(file: string) // 缩写
~~~

加入一个文件作为产生 loader 结果的依赖，使它们的任何变化可以被监听到。例如，sass-loader, less-loader 就使用了这个技巧，当它发现无论何时导入的 css 文件发生变化时就会重新编译。

- this.async

告诉 loader-runner 这个 loader 将会异步地回调。返回 this.callback。

- this.cacheable

设置缓存标识。例如iveiw-loader中就用了这个方法:

~~~
module.exports = function (source) {
    const options = loaderUtils.getOptions(this);
    this.cacheable();

    let newSource = source;
    newSource = replaceTag(newSource, tag);

    if ('prefix' in options && options.prefix) {
        newSource = replaceTag(newSource, prefixTag);
    }

    return newSource;
};
~~~

默认情况下，loader 的处理结果会被标记为可缓存。调用这个方法然后传入 false，可以关闭 loader 处理结果的缓存能力。

一个可缓存的 loader 在输入和相关依赖没有变化时，必须返回相同的结果。这意味着 loader 除了 this.addDependency 里指定的以外，不应该有其它任何外部依赖。

- this.callback

可以同步或者异步调用的并返回多个结果的函数。预期的参数是：

~~~
this.callback(
  err: Error | null, // 必填 Error 或 null
  content: string | Buffer,  
  sourceMap?: SourceMap, // 选填
  meta?: any // 选填
);
~~~

- this.context

模块所在的目录 可以用作解析其他模块成员的上下文。

其实就是文件所在目录。

- this.data

在 pitch 阶段和 normal 阶段之间共享的 data 对象。

- this.emitError

emit 一个错误，可以在输出中显示。

~~~
emitError(err)
~~~

显示:

~~~
ERROR in ./src/lib.js (./src/loader.js!./src/lib.js)
Module Error (from ./src/loader.js):
Here is an Error!
@ ./src/index.js 1:0-25
~~~

与抛出错误中断运行不同，它不会中断当前模块的编译过程。

- this.emitWarning

用法同this.emitError

- this.emitFile

webpack 特有的产生文件的方法。

~~~
emitFile(name: string, content: Buffer|string, sourceMap: {...})
~~~

- this.getOptions

提取给定的 loader 选项，接受一个可选的 JSON schema 作为参数。

从 webpack 5 开始，this.getOptions 可以获取到 loader 上下文对象。它用来替代来自 loader-utils 中的 getOptions 方法。

- this.getResolve

创建一个类似于 this.resolve 的解析函数。
在 webpack resolve 选项 下的任意配置项都是可能的。他们会被合并进 resolve 配置项中。请注意，"..." 可以在数组中使用，用于拓展 resolve 配置项的值。例如：{ extensions: [".sass", "..."] }。
options.dependencyType 是一个额外的配置。它允许我们指定依赖类型，用于从 resolve 配置项中解析 byDependency。
解析操作的所有依赖项都会自动作为依赖项添加到当前模块中。

- this.hot

loaders 的 HMR（热模块替换）相关信息。

~~~
module.exports = function (source) {
  console.log(this.hot); // 当配置为true 或者 --hot 标识true时 
  return source;
};
~~~

- this.loaderIndex

当前 loader 在 loader 数组中的索引。

- this.loadModule

~~~
loadModule(request: string, callback: function(err, source, sourceMap, module))
~~~

解析给定的 request 到模块，应用所有配置的 loader，并且在回调函数中传入生成的 source、sourceMap 和模块实例（通常是 NormalModule 的一个实例）。如果你需要获取其他模块的源代码来生成结果的话，你可以使用这个函数。
this.loadModule 在 loader 上下文中默认使用 CommonJS 来解析规则。用一个合适的 dependencyType 使用 this.getResolve。例如，在使用不同的语义之前使用 'esm'、'commonjs' 或者一个自定义的。

- this.loaders

所有 loader 组成的数组。它在 pitch 阶段的时候是可以写入的。

~~~
loaders = [{request: string, path: string, query: string, module: function}]
~~~

- this.mode

当 webpack 运行时读取 mode 的值

可能的值为：production, development, none

- this.query

如果这个 loader 配置了 options 对象的话，this 就指向这个对象。

如果 loader 中没有 options，而是以 query 字符串作为参数调用时，this.query 就是一个以 ? 开头的字符串。

- this.request

被解析出来的 request 字符串。

这个应该是有个getter方法返回一个字符串。

- this.resolve

~~~
resolve(context: string, request: string, callback: function(err, result: string))
~~~

像 require 表达式一样解析一个 request。


context 必须是一个目录的绝对路径。此目录用作解析的起始位置。


request 是要被解析的 request。通常情况下，像 ./relative 的相对请求或者像 module/path 的模块请求会被使用，但是像 /some/path 也有可能被当做 request。


callback 是一个给出解析路径的 Node.js 风格的回调函数。


解析操作的所有依赖项都会自动作为依赖项添加到当前模块中。

- this.resource

request 中的资源部分，包括 query 参数。

- this.resourcePath

资源文件路径。

- this.resourceQuery

资源的query参数。

- this.sourceMap

是否生成一个sourceMap。

因为生成 source map 可能会非常耗时，你应该确认 source map 确实需要。

- this.target

ompilation 的目标。从配置选项中传递。

示例：web, node。

- this.version

loader API 版本号

- this.webpack

如果是由 webpack 编译的，这个布尔值会被设置为 true。
oader 最初被设计为可以同时当 Babel transform 用。如果你编写了一个 loader 可以同时兼容二者，那么可以使用这个属性了解是否存在可用的 loaderContext 和 webpack 特性。

### Webpack 特有属性

其实从名字就可以看出来，因为加了下划线说明它们是私有属性。

- this._compilation

用于访问 webpack 的当前 Compilation 对象。

- this._compiler

用于访问 webpack 的当前 Compiler 对象。



