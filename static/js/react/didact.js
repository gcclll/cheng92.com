console.log("\n");
const Didact = {
  createElement,
  render,
};

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
      nodeValue: text,
      children: [],
    },
  };
}

let wipRoot = null;
let currentRoot = null;
let nextUnitOfWork = null;
let deletion = null;

function render(element, container) {
  wipRoot = {
    type: container,
    props: {
      children: [element],
    },
    // 保存 old fiber 更新的时候用
    alternate: currentRoot,
  };

  // 重置或初始化待删除的节点，因为 fiber 更新发生在 commit 之前
  // 所以 commit 阶段已经没有 Old fiber 了
  deletion = [];
  // 将 root fiber 作为第一个 work unit
  nextUnitOfWork = wipRoot;
  // 这里并不会立即将元素添加到 DOM 树，因为浏览器可能会中断整棵树的渲染
  // 而是将渲染工作放到空闲时间去执行
}

// 空闲时间去循环执行 work unit
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    // 执行当前的 work unit 同时找到下一个待执行的 work unit
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    // 没有空余时间执行 work unit 任务了，需要暂停
    shouldYield = deadline.timeRemaining() < 1;
  }

  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }

  // 找个下一帧渲染之前的空余时间去执行
  requestIdleCallback(workLoop);
}

function commitRoot() {
  deletion.forEach(commitWork);
  // 提交 children 渲染
  commitWork(wipRoot.child);
  // 记录当前正在渲染的 root fiber tree
  currentRoot = wipRoot;
  // 重置，等待下一次更新的 root fiber tree
  wipRoot = null;
}

// 真正执行渲染的地方
function commitWork(fiber) {
  if (!fiber) return;

  // 找到要渲染的组件的父级元素，用来作为目标的 parent
  // 但是由于函数组件没有 dom 元素，所以要考虑到 fiber 没有 dom 的情况
  // 下去逐级往上找到右 dom 元素的那个祖先元素作为 parent
  const domParentFiber = fiber.parent;
  while (!domParentFiber) {
    domParentFiber = domParentFiber.parent;
  }
  const domParent = domParentFiber.dom;

  // 下面可以开始执行DOM操作了，这里操作主要分为
  // 三种：UPDATE, DELETION, PALCEMENT
  // 这个是在 performUnitOfWork 里面组织 fiber 结构的时候
  // 根据 diff 结果新增的 effectTag 值，标识 commit 阶段应该做什么
  if (fiber.effectTag === "PLACEMENT" && fiber.dom != null) {
    // 新增节点
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    // 更新节点, dom, old props, new props
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === "DELETION") {
    // 要考虑函数组件没有 fiber.dom 情况
    commitDeletion(fiber, domParent);
  }

  // 递归处理 first child -> sibling
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}

// 更新节点
// 1. onClick 类型的事件属性
// 2. 更新、删除、修改
const isEvent = (key) => key.startsWith("on");
const isProperty = (key) => key !== "children" && !isEvent(key);
// 新属性
const isNew = (prev, next) => (key) => prev[key] !== next[key];
// 要删除的属性
const isGone = (prev, next) => (key) => !key in next;
function updateDom(dom, prevProps, nextProps) {
  // 移除或更新 event listeners
  Object.keys(prevProps)
    .filter(isEvent)
    .filter((key) => !(key in nextProps) || isNew(prevProps, nextProps)(key))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.removeEventListener(eventType, prevProps[name]);
    });

  // 删除普通属性
  Object.keys(prevProps)
    .filter(isProperty)
    .filter(isGone(prevProps, nextProps))
    .forEach((name) => (dom[name] = ""));

  // 更新或新增
  Object.keys(nextProps)
    .filter(isProperty)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => (dom[name] = nextProps[name]));

  // 新增事件属性
  Object.keys(nextProps)
    .filter(isEvent)
    .filter(isNew(prevProps, nextProps))
    .forEach((name) => {
      const eventType = name.toLowerCase().substring(2);
      dom.addEventListener(eventType, nextProps[name]);
    });
}

// 删除的时候要考虑有没 fiber.dom 如果没有一直往下找有 fiber.dom 的子节点
function commitDeletion(fiber, parent) {
  if (fiber.dom) {
    parent.removeChild(fiber.dom);
  } else {
    commitDeletion(fiber.child, parent);
  }
}

function performUnitOfWork(fiber) {
  const isFunctionComponent = fiber.type instanceof Function;
  if (isFunctionComponent) {
    // 函数组件，函数组件没有 fiber.dom
    updateFunctionComponent(fiber);
  } else {
    // 普通组件更新
    updateHostComponent(fiber);
  }

  // 开始找下一个 work unit
  // 到这里 fiber 结构初始化完成，此时每个 fiber 也有了自己的
  // 三个引用 fiber.child, fiber.parent, fiber.sibling
  // 下面将要去找到当前 Fiber 的下一个 work unit，查找遵循优先级:
  // fiber.child > fiber.sibling > fiber.parent.sibling
  if (!fiber.child) {
    return fiber.child;
  }

  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}

let hookIndex = null;
let wipFiber = null;
// 函数组件没有 dom ，且 children 需要执行函数获得
function updateFunctionComponent(fiber) {
  // 初始化 state hooks，每个函数组件内可多次调用 useState
  // 在 setState 时候的 action 会保存到 hooks[] 中去等待组件下次
  // 调用的时候执行，所以在函数组件返回之前它的状态就已经是最新的了
  wipFiber = fiber;
  hookIndex = 0;
  wipFiber.hooks = [];

  const children = [fiber.type(fiber.props)];
  reconcileChildren(fiber, children);
}

function updateHostComponent() {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  reconcileChildren(fiber, fiber.props.children);
}

// 根据不同操作类型，组织新的 child fiber 结构
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;

  while (index < elements.length) {
    const element = elements[index];
    let newFiber = null;

    // 操作类型
    const sameType = oldFiber && element && oldFiber.type === element.type;

    if (sameType) {
      // 更新
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE",
      };
    }

    if (element && !sameType) {
      // 新增
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT",
      };
    }

    if (oldFiber && !sameType) {
      // 删除
      oldFiber.effectTag = "DELETION";
      // 因为 commit 是从 root 从上往下提交的，且在提交阶段
      // 已经丢失了 old fiber，因为上面结构已经更新了，因此这里需要记录
      // 哪些节点需要删除
      deletion.push(oldFiber);
    }

    // 三个引用
    if (index === 0) {
      // 表示是 parent 的第一个 child，标记为 first child
      fiber.child = newFiber;
    } else {
      // 非第一次的时候，等于是节点的兄弟节点
      // 第二个引用，优先级低于 first child
      prevSibling.sibling = newFiber;
    }

    prevSibling = newFiber;
    index++;
  }
}

function useState(initial) {
  const oldHook =
    wipFiber.alternate &&
    wipFiber.alternate.hooks &&
    wipFiber.alternate.hooks[hookIndex];

  // 有可能是非首次渲染的组件更新操作，所以要去取一次更新之前的状态
  const hook = {
    state: oldHook ? oldHook.state : initial,
    // 保存 setState 的 callback，在组件 render 的时候去执行
    queue: [],
  };

  const actions = oldHook ? oldHook.queue : [];
  actions.forEach((action) => (hook.state = action(hook.state)));

  const setState = (action) => {
    hook.queue.push(action);

    // 将一次更新组织成一个新的 work unit(fiber)，赋值给
    // nextUnitOfWork 等待去执行
    wipRoot = {
      dom: currentRoot.dom,
      props: currentRoot.props,
      alternate: currentRoot,
    };

    nextUnitOfWork = wipRoot;
    // 初始化一次待删除的节点，此时并没有开始更新
    deletion = [];
  };

  wipFiber.hooks.push(hook);
  hookIndex++;
  return [hook.state, setState];
}
