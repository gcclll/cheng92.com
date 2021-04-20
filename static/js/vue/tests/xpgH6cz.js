function setStyle(el) {
  el.style.background = "red";
  el.style.width = "300px";
  el.style.height = "30px";
  el.innerText = "请点击我触发 click 事件";
}
(async function () {
  const { render, h, patchProp } = VueRuntimeDOM;
  let div = document.querySelector(".xpgH6cz");
  let el = document.createElement("div");
  const _logp = (...args) => logp(div, ...args);
  // setStyle(el);

  patchProp(el, "id", null, "foo");
  _logp(el, "prop id", [
    `patchProp(el, 'id', null, 'foo')`,
    `el.id = ${el.id}`,
  ]);

  // id
  patchProp(el, "id", null, null);
  _logp(el, "null 被转成了 '' 空字符串", [
    `patchProp(el, 'id', null, null)`,
    `el.id = ${el.id}`,
  ]);

  // input value="foo"
  el = document.createElement("input");
  patchProp(el, "<input/> value", null, "foo");
  _logp(el, "value 属性", [
    `patchProp(el, 'value', null, 'foo')`,
    `el.value = ${el.value}`,
  ]);

  // input value=null
  el = document.createElement("input");
  patchProp(el, "value", null, null);
  _logp(el, "<input/> value 属性 null", [
    `patchProp(el, 'value', null, null)`,
    `el.value = ${el.value}`,
  ]);

  // select
  el = document.createElement("select");
  patchProp(el, "style", null, { width: "100px", height: "20px" });
  patchProp(el, "multiple", null, "");
  _logp(el, "<select/> boolean 值 ''", [
    `patchProp(el, "multiple", null, '')`,
    `el.multiple = ${el.multiple}`,
  ]);

  // select
  el = document.createElement("select");
  patchProp(el, "style", null, { width: "100px", height: "20px" });
  patchProp(el, "multiple", null, null);
  _logp(el, "<select/> boolean 值 null", [
    `patchProp(el, "multiple", null, null)`,
    `el.multiple = ${el.multiple}`,
    `这里是 false 的原因是判断条件是： if (value === '' && type === 'boolean') `,
    `也就是说只要不是空字符串值，都会是 false`,
  ]);
})();
