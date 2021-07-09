function setStyle(el) {
  el.style.background = "red";
  el.style.width = "300px";
  el.style.height = "30px";
  el.innerText = "请点击我触发 click 事件";
}
(async function () {
  const { render, h, patchProp } = VueRuntimeDOM;
  let div = document.querySelector(".xTDpGGF");
  let el = document.createElement("div");
  setStyle(el);

  const _logp = (...args) => logp(div, ...args);
  const timeout = () => new Promise((r) => setTimeout(r));
  let pp;
  let n = 0,
    p;
  const fn = () => {
    p = _logp(null, "", "fn called " + ++n, p);
  };

  let event = new Event("click");

  patchProp(el, "onClick", null, fn);
  el.dispatchEvent(event);
  await timeout();
  el.dispatchEvent(event);
  await timeout();
  el.dispatchEvent(event);
  await timeout();
  pp = _logp(el, "should assign event handler", [
    `patchProp(el, "onClick", null, callback)`,
    `called: ` + n,
  ]);

  // multiple events //////////////////////////////////////////////////////////
  await timeout();
  el = document.createElement("div");
  setStyle(el);
  let p1,
    p2,
    pp2,
    n1 = 0,
    n2 = 0;
  const fn1 = () => (p1 = _logp(null, "", "fn1 called " + ++n1, p1));
  const fn2 = () => (p2 = _logp(null, "", "fn2 called " + ++n2, p2));
  patchProp(el, "onClick", null, [fn1, fn2]);
  el.dispatchEvent(event);
  await timeout();
  pp2 = _logp(el, "同时绑定多个事件", [
    `patchProp(el, 'onClick', null, [fn1, fn2])`,
    `n1 = ${n1}, n2 = ${n2}`,
  ]);

  // 本地事件 /////////////////////////////////////////////////////////////////
  await timeout();
  let p3,
    pp3,
    n3 = 0;
  window.__globalSpy = () => (p3 = _logp(null, "", "fn3 called " + ++n3, p3));
  el = document.createElement("div");
  setStyle(el);
  patchProp(el, "onlick", null, "__globalSpy(1)");
  el.dispatchEvent(event);
  await timeout();
  if (n3 > 5) {
    delete window.__globalSpy;
  }
  pp3 = _logp(el, "应该支持本地事件 onclick", [
    `patchProp(el, "onlick", null, "__globalSpy(1)")`,
    `n1 = ${n3}`,
  ]);
})();
