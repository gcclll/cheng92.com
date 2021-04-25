const colors = {
  bright: "\x1B[1m", // 亮色
  grey: "\x1B[2m", // 灰色
  gray: "\x1B[2m", // 灰色
  italic: "\x1B[3m", // 斜体
  underline: "\x1B[4m", // 下划线
  reverse: "\x1B[7m", // 反向
  hidden: "\x1B[8m", // 隐藏
  black: "\x1B[30m", // 黑色
  red: "\x1B[31m", // 红色
  green: "\x1B[32m", // 绿色
  yellow: "\x1B[33m", // 黄色
  blue: "\x1B[34m", // 蓝色
  magenta: "\x1B[35m", // 品红
  cyan: "\x1B[36m", // 青色
  white: "\x1B[37m", // 白色
  blackBG: "\x1B[40m", // 背景色为黑色
  redBG: "\x1B[41m", // 背景色为红色
  greenBG: "\x1B[42m", // 背景色为绿色
  yellowBG: "\x1B[43m", // 背景色为黄色
  blueBG: "\x1B[44m", // 背景色为蓝色
  magentaBG: "\x1B[45m", // 背景色为品红
  cyanBG: "\x1B[46m", // 背景色为青色
  whiteBG: "\x1B[47m", // 背景色为白色
};

let i = 0,
  j = 0;
const l1 = (x, style) => (
  (j = 0),
  console.groupEnd(),
  console.group(
    `%c >>> ${++i} ${x}`,
    `background: #222; color: #bada55;${style}`
  )
);
const l2 = (x) =>
  console.log(`%c > ${i}.${j++} ${x}`, "background: #222; color: #bada55");
const log = (args) =>
  console.log.apply(console, Array.isArray(args) ? args : [args]);
const colorNames = Object.keys(colors);
log.bg = {};
function register() {
  for (let i = 0; i < colorNames.length; i++) {
    const color = colorNames[i];
    if (/BG$/.test(color)) {
      const bgColor = color.replace(/BG$/, "");
      log.bg[bgColor] = (x, fontColor) =>
        log([`%c ${x}`, `color: ${fontColor};background:${bgColor}`]);
    } else {
      log[color] = (x) => log([`%c ${x}`, `color: ${color}`]);
    }
  }
}

log.props = (obj, props, now = true) => {
  let o = {};
  for (let prop in obj) {
    if (props.includes(prop)) o[prop] = obj[prop];
  }
  now && log(o);
  return o;
};

log.async = async (...args) => {
  await log(...args);
};

log.br = log.newline = (...args) => {
  log(["\n", ...args].filter(Boolean));
};
log.catch = (fn) => {
  try {
    fn();
  } catch (e) {
    log(e.message);
  }
};

register();

try {
  module.exports = { log };
} catch (e) {
  console.warn(e.message, "no module.");
}

function insertCssLink(url) {
  var head = document.head;
  var link = document.createElement("link");
  link.href = url;
  link.rel = "stylesheet";
  head.appendChild(link);
}

function insertPreCode(selector) {
  const script = document.querySelector(`script.${selector}`);
  const div = document.querySelector(`div.${selector}`);
  const ref = div || script;
  if (ref) {
    let pre = document.querySelector(`pre.${selector}`);
    if (!pre) {
      pre = document.createElement("pre");
      pre.className = [selector, "chroma"].join(" ");
    }
    pre.innerHTML =
      `<code class="language-javascript" data-lang="javascript">` +
      `// 测试代码\n` +
      script.innerHTML +
      `</code>`;
    const parent = script.parentNode;
    if (parent) {
      parent.insertBefore(pre, ref);
    }
  }
}

function insertScript(url, options = {}) {
  var script = document.createElement("script");
  script.type = "text/javascript";
  const { defer, load = noop, error = noop } = options;
  defer && (script.defer = true);
  script.onload = load;
  script.onerror = error;
  document.body.appendChild(script);
  script.src = url;
  return script;
}

function insertIndexToFrame(js, path) {
  insertFrame("index.html", js, path);
}

function insertFrame(pageName, js, path = "") {
  var ref = document.currentScript;
  var ifr = document.createElement("iframe");
  ifr.frameBorder = "none";
  ifr.width = "100%";
  ref.parentNode.insertBefore(ifr, ref);
  ifr.name = Math.random().toString(36).substring(2);
  window.myifr = ifr;

  ifr.onload = function () {
    if (js) {
      const doc = ifr.contentDocument;
      const script = document.createElement("script");
      doc.body.appendChild(script);
      script.src = path + js;
    }
  };

  ifr.src = path + (pageName || "");
}

function noop() {}

function runAsync(fn, timeout) {
  setTimeout(fn, timeout || 2000);
}

function g_append(el, content) {
  if (typeof el === "string") {
    el =
      el[0] === "." ? document.querySelector(el) : document.getElementById(el);
  }

  if (content === true) {
    el.innerHTML = "";
  } else {
    content = typeof content === "object" ? JSON.stringify(content) : content;
    el.innerHTML = el.innerHTML + "<p>" + content + "</p>";
  }
}

var g_log = g_append;

var i1 = 0;
var logp = (wrapper, el, title, ps = [], parent) => {
  el && wrapper.appendChild(el);
  const p = document.createElement("p");
  p.style.cssText = "color:blue;border-bottom:1px solid green;";
  const ap = el && title;
  const pss = Array.isArray(ps) ? ps.join("\n") : ps;
  if (parent) {
    parent.innerHTML = pss;
    return parent;
  }
  p.innerText =
    (title ? `>>> ${i1++}. ${title}\n` : "") +
    pss +
    "\n" +
    (el ? el.className + " " + el.outerHTML + "\n" : "");
  wrapper.appendChild(p);
  return p;
};

function domDiff(
  c1,
  c2,
  { v, a, ...option } = { v: "visual", a: "annotated" }
) {
  console.log(jsondiffpatch);
  // jsondiffpatch = jsondiffpatch.create({
  //   ...option,
  // });
  var delta = jsondiffpatch.diff(c1, c2);
  document.getElementById(v).innerHTML = jsondiffpatch.formatters.html.format(
    delta,
    c1
  );
  document.getElementById(
    a
  ).innerHTML = jsondiffpatch.formatters.annotated.format(delta, c1);
}
