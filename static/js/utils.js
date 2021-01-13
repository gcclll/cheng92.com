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

log.newline = (...args) => {
  log("\n");
  log(...args);
};

register();

try {
  module.exports = { log };
} catch (e) {
  console.warn(e.message, "no module.");
}
