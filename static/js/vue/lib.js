const {
  compileScript,
  parse,
  compileStyle,
  generate,
  baseParse,
  transform,
  transformSrcset,
  createSrcsetTransformWithOptions,
  transformElement,
  transformBind,
  normalizeOptions,
} = require(process.env.VNEXT_PKG_SFC + "/dist/compiler-sfc.cjs.js");
const { compile: compileSSR } = require(process.env.VNEXT_PKG_SFC +
  "/../compiler-ssr/dist/compiler-ssr.cjs.js");

const rc = require(process.env.VNEXT_PKG_SFC +
  "/../runtime-core/dist/runtime-core.cjs.js");

const { log } = require(process.env.BLOG_JS + "/utils.js");

const mockId = "xxxxxxxx";

function getCompiledSSRString(src) {
  // Wrap src template in a root div so that it doesn't get injected
  // fallthrough attr. This results in less noise in generated snapshots
  // but also means this util can only be used for non-root cases.
  const { code, ...more } = compileSSR(`<div>${src}</div>`);
  const match = code.match(
    /_push\(\`<div\${\s*_ssrRenderAttrs\(_attrs\)\s*}>([^]*)<\/div>\`\)/
  );

  if (!match) {
    throw new Error(`Unexpected compile result:\n${code}`);
  }

  return { code, matched: match ? `\`${match[1]}\`` : null, ...more };
}

const compileSFC = (src, options = {}, fn) => {
  const { descriptor } = parse(src);
  fn && fn(descriptor);
  const result = compileScript(descriptor, {
    ...options,
    id: mockId,
    enableRefSugar: true,
  });
  return [result, descriptor];
};

function compileSFCScript(src, options) {
  const { descriptor } = parse(src);
  return compileScript(descriptor, {
    id: mockId,
    enableRefSugar: true,
    ...options,
  });
}

function compileWithSrcset(template, options) {
  const ast = baseParse(template);
  const srcsetTransform = options
    ? createSrcsetTransformWithOptions(normalizeOptions(options))
    : transformSrcset;

  transform(ast, {
    nodeTransforms: [srcsetTransform, transformElement],
    directiveTransforms: {
      bind: transformBind,
    },
  });
  return generate(ast, { mode: "module" });
}

function compileScoped(source, options) {
  return compileStyle({
    source,
    filename: "test.css",
    id: "data-v-test",
    scoped: true,
    ...options,
  });
}

const src = `
<img src="./logo.png" srcset="./logo.png"/>
<img src="./logo.png" srcset="./logo.png 2x"/>
<img src="./logo.png" srcset="./logo.png 2x"/>
<img src="./logo.png" srcset="./logo.png, ./logo.png 2x"/>
<img src="./logo.png" srcset="./logo.png 2x, ./logo.png"/>
<img src="./logo.png" srcset="./logo.png 2x, ./logo.png 3x"/>
<img src="./logo.png" srcset="./logo.png, ./logo.png 2x, ./logo.png 3x"/>
<img src="/logo.png" srcset="/logo.png, /logo.png 2x"/>
<img src="https://example.com/logo.png" srcset="https://example.com/logo.png, https://example.com/logo.png 2x"/>
<img src="/logo.png" srcset="/logo.png, ./logo.png 2x"/>
<img src="data:image/png;base64,i" srcset="data:image/png;base64,i 1x, data:image/png;base64,i 2x"/>`;

module.exports = {
  filterNullProps,
  f: filterNullProps,
  compileSFC,
  log,
  mockId,
  compile: compileSFCScript,
  compileStyle,
  compileWithSrcset,
  src,
  compileSFCScript,
  compileScoped,
  compileSSR,
  getCompiledSSRString,
  rc,
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
