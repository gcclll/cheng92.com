/**
 * 基于 node 环境测试的模板和数据
 * @fileOverview
 * @name node.env.test.js
 * @author Zhicheng Lee <gccll.love@gmail.com>
 * @license MIT
 */

///////////////////////////////////////////////////////////////////////////////
//                                 In Browser                                //
///////////////////////////////////////////////////////////////////////////////

compile.options = {};
l1(`index.spec.ts>compile`);
c(
  `<div v-text="text"></div>
<div v-html="html"></div>
<div v-cloak>test</div>
<div style="color:red">red</div>
<div :style="{color: 'green'}"></div>`,
  "should contain standard transforms"
);
[
  "结果说明：\n",
  "1. v-text 对应属性 textContent",
  "2. v-html 对应属性 innerHTML",
  "3. v-cloak 不需要参数，含义：该组件没有被完全编译好之前，先隐藏",
  "4. style 静态属性，在 compiler-dom 阶段被转成对象形式",
  "5. 含 :style 动态属性，不提升",
].forEach(log.magenta);
l1(`parse.spec.ts>DOM parser`);
c(
  "<textarea>some<div>text</div>and<!--comment--></textarea>",
  "textarea handles comments/elements as just text",
  (ast) => ast.children
);
c("<textarea>&amp;</textarea>", "textarea handles character references");
c("<textarea><div>{{ foo }}</textarea>", "textarea support interpolation");
c(
  "<style>some<div>text</div>and<!--comment--></style>",
  "style handles comments/elements as just a text"
);
c("<svg><![CDATA[some text]]></svg>", "CDATA");
c(
  `<pre>  \na   <div>foo \n bar</div>   \n   c</pre>`,
  "<pre> tag should preserve raw whitespace"
);

l1(`ignoreSideEffectTags.spec.ts > compiler: ignore side effect tags`);
c("<script>console.log(1)</script>", "should ignore script");
c(`<style>h1 { color: red }<\/style>`, "should ignore style");

l1(`transformStyle.spec.ts > compiler: style transform`);
c(
  `<div style="color: red"/>`,
  "should transform into directive node，被解析成指令 :style"
);

l1(`vHtml.spec.ts > compiler: v-html transform`);
c(`<div v-html="test"/>`, "should convert v-html to innerHTML");
c(
  `<div v-html="test">hello</div>`,
  "should raise error and ignore children when v-html is present"
);
log.red("v-html 下面不能有任何孩子节点");
c(`<div v-html></div>`, "should raise error if has no expression");
log.red("v-html 必须要提供表达式");

l1(`vModel.spec.ts > compiler: transform v-model`);
log.blue("compiler-dom 阶段会过滤掉 modelValue: value 属性");
c('<input v-model="model" />', "simple expression");
c(
  '<input type="text" v-model="model" />',
  "simple expression for input (text)"
);
c(
  '<input type="radio" v-model="model" />',
  "simple expression for input (radio)"
);
c(
  '<input type="checkbox" v-model="model" />',
  "simple expression for input (checkbox)"
);
c(
  '<input :type="foo" v-model="model" />',
  "simple expression for input (dynamic type)"
);
c('<input v-bind="obj" v-model="model" />', "input w/ dynamic v-bind");
c('<select v-model="model" />', "simple expression for select");
c('<textarea v-model="model" />', "simple expression for textarea");
l1(`vModel.spec.ts > errors`);
log.red("---> 错误用法，错误信息情况对应的警告");
c('<input v-model:value="model" />', "error > plain elements with argument");
c('<span v-model="model" />', "error > invalid element");
compile.options.isCustomElement = (tag) => tag.startsWith("my-");
c(
  '<my-input v-model="model" />',
  "error > should allow usage on custom element"
);
c(
  `<input type="file" v-model="test"/>`,
  "error > should raise error if used file input element"
);
log.red("不允许应用在 文件类型的 Input");
l1(`vModel.spec.ts > modifiers`);
c('<input  v-model.number="model" />', ".number");
c('<input  v-model.trim="model" />', ".trim");
c('<input  v-model.lazy="model" />', ".lazy");

///////////////////////////////////////////////////////////////////////////////
//                                  Node env                                 //
///////////////////////////////////////////////////////////////////////////////

var result = [];

// compiler test

l1(
  `以下均为 node 环境, 非浏览器环境测试结果`,
  "color:white;background:red;font-size:18px;"
);
result.forEach((res) => {
  let { title, template, code, path, head } = res;

  if (Array.isArray(res)) {
    [path, title, template, code, head] = res;
  }

  head && l1(head);
  l2(title);
  log.grey(path);
  log.grey(template);
  log.black(code);
});
