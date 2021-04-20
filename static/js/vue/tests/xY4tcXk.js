(function test() {
  const { render, h, patchProp } = VueRuntimeDOM;
  const div = document.querySelector(".xY4tcXk");
  let el = document.createElement("div");
  const _logp = (...args) => logp(div, ...args);

  patchProp(el, "style", {}, "color:red");
  _logp(el, 'patch string style: "color:red"', [
    "patchProp(el, 'style', {}, 'color:red')",
  ]);
  patchProp(el, "style", null, null);
  _logp(el, "patch remove style", ["patchProp(el, 'style', null, null)"]);
  const value = (el.style.cssText = "color:red;");
  let called = 0;
  Object.defineProperty(el.style, "cssText", {
    get: () => value,
    set: () => called++,
  });
  patchProp(el, "style", value, value);
  _logp(el, "patch same string style", [
    "patchProp(el, 'style', value, value)",
    "相同的字符串 style 不会被处理，因为只有值不同的时候才会重新设置 cssText",
    "if (prev !== next) {",
    "    style.cssText = next",
    "}",
  ]);

  patchProp(el, "style", {}, { marginRight: "10px" });
  _logp(el, "patch camel case attribute", [
    "patchProp(el, 'style', {  }, { marginRight: '10px' })",
    "新 style 对象： { marginRight: '10px' }",
    "patch 之后 cssText = " + el.style.cssText,
  ]);

  patchProp(el, "style", {}, { marginRight: "10px" });
  _logp(el, "patch camel case attribute", [
    "patchProp(el, 'style', {  }, { marginRight: '10px' })",
    "新 style 对象： { marginRight: '10px' }",
    "patch 之后 cssText = " + el.style.cssText,
  ]);

  patchProp(el, "style", {}, { color: "red !important" });
  _logp(el, "!important", [
    `patchProp(el, "style", {}, { color: 'red !important' })`,
    "patch 之后 cssText = " + el.style.cssText,
  ]);

  patchProp(el, "style", null, null);
  patchProp(el, "style", {}, { "--theme": "red" });
  _logp(el, "CSS 自定义属性", [
    `patchProp(el, "style", {}, { '--theme': 'red'})`,
    "after, cssText = " + el.style.cssText,
  ]);

  patchProp(el, "style", {}, { transition: "all 1s" });
  _logp(el, "auto vendor prefixing，自动添加前缀", [
    `patchProp(el, "style", {}, { transition: "all 1s" })`,
    "after, cssText = " + el.style.cssText,
    `el.style.WebkitTransition = ` + el.style.WebkitTransition,
  ]);

  patchProp(
    el,
    "style",
    {},
    { display: ["-webkit-box", "-ms-flexbox", "flex"] }
  );
  _logp(el, "同一个属性对应多个值", [
    `patchProp(el, "style", {}, { display: ['-webkit-box', '-ms-flexbox', 'flex'] })`,
    "after, cssText = " + el.style.cssText,
    `el.style.display = ` + el.style.display,
  ]);
})();
