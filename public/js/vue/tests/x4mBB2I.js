(function test() {
  const { render, h, patchProp } = VueRuntimeDOM;
  const xlinkNS = "http://www.w3.org/1999/xlink";
  const div = document.querySelector(".x4mBB2I");
  let el = document.createElementNS("http://www.w3.org/2000/svg", "use");
  const _logp = (...args) => logp(div, ...args);
  const getHref = () => el.getAttributeNS(xlinkNS, "href");

  patchProp(el, "xlink:href", null, "a", true);
  _logp(el, "xlink attributes", [
    `patchProp(el, 'xlink:href', null, 'a', true)`,
    `xlinkNS href = ${getHref()}`,
  ]);

  patchProp(el, "xlink:href", "a", null, true);
  _logp(el, "xlink attributes", [
    `patchProp(el, 'xlink:href', null, null, true)`,
    `xlinkNS href = ${getHref()}`,
  ]);
})();
