const modules = [
  "compiler_sfc",
  "runtime_core",
  "compiler_ssr",
  "reactivity",
  "runtime_test",
];

function loadModule(name) {
  return import(
    process.env.BLOG_DIR_VUE + `/${name.replace("_", "-")}.global.js`
  );
}

let loaders = {};
modules.forEach((name) => (loaders[name] = () => loadModule(name)));
const { log } = require(process.env.BLOG_JS + "/utils.js");

const mockId = "xxxxxxxx";

log.f = (...args) => log(filterNullProps(...args));

function filterNullProps(o, specific) {
  let obj = {};
  specific = typeof specific === "string" ? [specific] : specific;
  for (let prop in o) {
    const val = o[prop];
    if (o.hasOwnProperty(prop) && (val || val === 0)) {
      if (specific && specific.indexOf(prop) === -1) {
        continue;
      }
      obj[prop] = val;
    }
  }
  return obj;
}

function toSpan(content, h) {
  if (typeof content === "string") {
    return h("span", content.toString());
  } else {
    return h("span", { key: content }, content.toString());
  }
}

function renderChildren(render, root, h, arr) {
  const _span = (val) => toSpan(val, h);
  render(h("div", arr.map(_span)), root);
  return root.children[0];
}

// 打乱顺序
function shuffle(array) {
  let currentIndex = array.length;
  let temporaryValue;
  let randomIndex;

  while (currentIndex !== 0) {
    // 随机索引
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // 交换元素
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
module.exports = {
  shuffle,
  toSpan,
  log,
  mockId,
  renderChildren,
  ...loaders,
};
