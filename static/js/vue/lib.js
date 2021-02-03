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
module.exports = {
  log,
  mockId,
  ...loaders,
};

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
