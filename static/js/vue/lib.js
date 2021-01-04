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
const { log } = require(process.env.BLOG_JS + "/utils.js");

const mockId = "xxxxxxxx";

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
  compileSFC,
  log,
  mockId,
  compile: compileSFCScript,
  compileStyle,
  compileWithSrcset,
  src,
  compileSFCScript,
  compileScoped,
};
