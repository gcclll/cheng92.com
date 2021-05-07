console.log("\n");
const Didact = {
  createElement,
  render,
};

// ReactDOM.render
function render(element, container) {
  // 1. 创建当前树根节点元素
  const dom =
    element.type === "TEXT_ELEMENT"
      ? document.createTextNode("")
      : document.createElement(element.type);

  const isProperty = (key) => key !== "children";
  Object.keys(element.props)
    .filter(isProperty)
    .forEach((name) => (dom[name] = element.props[name]));

  // 2. 遍历所有的 children 创建子元素
  element.props.children.forEach((child) => render(child, dom /*parent*/));

  container.appendChild(dom);
}

// React.createElement
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map((child) =>
        typeof child === "object" ? child : createTextElement(child)
      ),
    },
  };
}

function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text, // 类似 textContent 可以修改节点文本内容的属性
      children: [],
    },
  };
}

export { Didact };

try {
  if (module) {
    module.exports = Didact;
  }
} catch (e) {
  console.warn("module:" + e.message);
}
