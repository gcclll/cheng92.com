console.log('\n')
const Didact = {
  createElement,
  render
}

// ReactDOM.render
function render(element, container) {
  // TODO
}

// React.createElement
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child =>
        typeof child === 'object' ? child : createTextElement(child))
    }
  }
}

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text, // 类似 textContent 可以修改节点文本内容的属性
      children: []
    }
  }

}


try {
  if (module) {
    module.exports = Didact;
  }
} catch (e) {
  console.warn(e.message);
}
