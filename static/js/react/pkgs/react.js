/**
 * packages/react 包代码，在完成功能前提下尽量缩减代码量(比如：开发模式)
 * API: Object.assign, Array.isArray
 * @fileOverview
 * @name react.js
 * @author Zhicheng Lee<gccll.love@gmail.com>
 * @license MIT
 */

if (typeof window === 'undefined' && typeof global !== 'undefined') {
  window = global
}

window.__log = window.__log || function() { }

const isArray = Array.isArray
const hasOwnProperty = Object.prototype.hasOwnProperty;
const slice = Array.prototype.slice

// ReactSymbols.js
let REACT_ELEMENT_TYPE = 0xeac7;
let REACT_PORTAL_TYPE = 0xeaca;
let REACT_FRAGMENT_TYPE = 0xeacb;
let REACT_STRICT_MODE_TYPE = 0xeacc;
let REACT_PROFILER_TYPE = 0xead2;
let REACT_PROVIDER_TYPE = 0xeacd;
let REACT_CONTEXT_TYPE = 0xeace;
let REACT_FORWARD_REF_TYPE = 0xead0;
let REACT_SUSPENSE_TYPE = 0xead1;
let REACT_SUSPENSE_LIST_TYPE = 0xead8;
let REACT_MEMO_TYPE = 0xead3;
let REACT_LAZY_TYPE = 0xead4;
let REACT_SCOPE_TYPE = 0xead7;
let REACT_OPAQUE_ID_TYPE = 0xeae0;
let REACT_DEBUG_TRACING_MODE_TYPE = 0xeae1;
let REACT_OFFSCREEN_TYPE = 0xeae2;
let REACT_LEGACY_HIDDEN_TYPE = 0xeae3;
let REACT_CACHE_TYPE = 0xeae4;

if (typeof Symbol === 'function' && Symbol.for) {
  const symbolFor = Symbol.for;
  REACT_ELEMENT_TYPE = symbolFor('react.element');
  REACT_PORTAL_TYPE = symbolFor('react.portal');
  REACT_FRAGMENT_TYPE = symbolFor('react.fragment');
  REACT_STRICT_MODE_TYPE = symbolFor('react.strict_mode');
  REACT_PROFILER_TYPE = symbolFor('react.profiler');
  REACT_PROVIDER_TYPE = symbolFor('react.provider');
  REACT_CONTEXT_TYPE = symbolFor('react.context');
  REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
  REACT_SUSPENSE_TYPE = symbolFor('react.suspense');
  REACT_SUSPENSE_LIST_TYPE = symbolFor('react.suspense_list');
  REACT_MEMO_TYPE = symbolFor('react.memo');
  REACT_LAZY_TYPE = symbolFor('react.lazy');
  REACT_SCOPE_TYPE = symbolFor('react.scope');
  REACT_OPAQUE_ID_TYPE = symbolFor('react.opaque.id');
  REACT_DEBUG_TRACING_MODE_TYPE = symbolFor('react.debug_trace_mode');
  REACT_OFFSCREEN_TYPE = symbolFor('react.offscreen');
  REACT_LEGACY_HIDDEN_TYPE = symbolFor('react.legacy_hidden');
  REACT_CACHE_TYPE = symbolFor('react.cache');
}

const MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
const FAUX_ITERATOR_SYMBOL = '@@iterator';

function getIteratorFn(maybeIterable) {
  if (maybeIterable === null || typeof maybeIterable !== 'object') {
    return null;
  }
  const maybeIterator =
    (MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL]) ||
    maybeIterable[FAUX_ITERATOR_SYMBOL];
  if (typeof maybeIterator === 'function') {
    return maybeIterator;
  }
  return null;
}

// ReactCurrent*.js
const ReactCurrentOwner = {
  current: null
}

// ReactNoopUpdateQueue.js
const ReactNoopUpdateQueue = {
  // 检查该复合组件是不是被加载完成了
  // ARGS: publicInstance
  isMounted() {
    return false
  },

  // ARGS: publicInstance, callback, callerName
  enqueueForceUpdate() {
    console.error('bla bla...')
  },
  // ARGS: publicInstance, completeState, callback, callerName
  enqueueReplaceState() {
    console.error('bla bla...')
  },
  // ARGS: publicInstance, partialState, callback, callerName,
  enqueueSetState() {
    console.error('bla bla...')
  }
}

// ReactBaseClasses.js
const emptyObject = {}

function Component(props, context, updater) {
  this.props = props
  this.context = context
  this.refs = emptyObject
  // 初始化默认的 updater，实际的更新函数会由 renderer 注入
  this.updater = updater || ReactNoopUpdateQueue
}


Component.prototype.isReactComponent = {};

// 1. 总是用这个去更新 state，而不应该直接修改 this.state
// 2. this.state 并不一定会立即更新，因此直接访问可能会得到旧的值
// 3. setState 有可能会被异步地去执行，多个修改值的行为可能最后会合并成一次实际改动，
// 可能传入一个回调函数，这个函数会在值发生变化之后被调用
// 4. callback 会在将来某个时间点被执行(可能异步地)， callback(state, props, context)
// 这三个参数是最新的组件参数，它们的值可能和 this.* 不一样，因为 callback 可能会
// 在 receiveProps 之后 shouldComponentUpdate 之前执行，此时新 state, props, context
// 可能还没有合并更新到 this 上
Component.prototype.setState = function(partialState, callback) {
  this.updater.enqueueSetState(this, partialState, callback, 'setState')
}

// 强制更新组件，它不会触发 `shouldComponentUpdate`, 但是会触发
// `componentWillUpate` 和 `componentDidUpdate`
Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

function ComponentDummy() { }
ComponentDummy.prototype = Component.prototype

function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
Object.assign(pureComponentPrototype, Component.prototype);
pureComponentPrototype.isPureReactComponent = true;

// ReactContext.js
function createContext(defaultValue) {
  const context = {
    $$typeof: REACT_CONTEXT_TYPE,
    // 支持多并发的 renderers, 将它们区分出 primary 和 secondary，如：
    // React Native(primary), Fabric(secondary)
    // React DOM(primary), React ART(secondary)
    // secondary renderers 将单独存储它们的 context values
    _currentValue: defaultValue,
    _currentValue2: defaultValue,
    // 用下跟踪当前 context 有多少并发 renderers
    _threadCount: 0,
    // 循环引用
    Provider: null,
    Consumer: null
  }

  context.Provider = {
    $$typeof: REACT_PROFILER_TYPE,
    _context: context
  }

  context.Consumer = context

  return context
}

// ReactChildren.js
const SEPARATOR = '.'
const SUBSEPARATOR = ':'

// 将 key 包装一层以致它可以安全的做为 reactid 使用
// xx=xx -> $xx=0xx ?
// xx:xx -> $xx=2xx ?
function escape(key) {
  const escapeRegex = /[=:]/g;
  const escaperLookup = {
    '=': '=0',
    ':': '=2',
  };
  const escapedString = key.replace(escapeRegex, match => escaperLookup[match]);

  return '$' + escapedString;
}

const userProvidedKeyEscapeRegex = /\/+/g;
// xx///xx -> xx$&/xx
function escapeUserProvidedKey(text) {
  return text.replace(userProvidedKeyEscapeRegex, '$&/');
}

function getElementKey(element, index) {
  if (typeof element === 'object' && element !== null && element.key != null) {
    return escape('' + element.key);
  }
  // Implicit key determined by the index in the set
  return index.toString(36);
}

function mapIntoArray(
  children,
  array,
  escapedPrefix,
  nameSoFar,
  callback
) {
  const type = typeof children

  if (type === 'undefined' || type === 'boolean') {
    children = null
  }

  let invokeCallback = false

  if (children === null) {
    invokeCallback = true;
  } else {
    switch (type) {
      case 'string':
      case 'number':
        invokeCallback = true;
        break;
      case 'object':
        switch (children.$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
        }
    }
  }

  if (invokeCallback) {
    const child = children
    let mappedChild = callback(child)

    const childKey =
      nameSoFar === '' ? SEPARATOR + getElementKey(child, 0) : nameSoFar;

    if (isArray(mappedChild)) { // 数组递归处理
      let escapedChildKey = '';
      if (childKey != null) {
        escapedChildKey = escapeUserProvidedKey(childKey) + '/';
      }
      mapIntoArray(mappedChild, array, escapedChildKey, '', c => c);
    } else if (mappedChild != null) {
      if (isValidElement(mappedChild)) {
        mappedChild = cloneAndReplaceKey(
          mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          escapedPrefix +
          // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
          (mappedChild.key && (!child || child.key !== mappedChild.key)
            ? // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
            // eslint-disable-next-line react-internal/safe-string-coercion
            escapeUserProvidedKey('' + mappedChild.key) + '/'
            : '') +
          childKey,
        );
      }
      array.push(mappedChild);
    }

    return 1
  }

  let child;
  let nextName;
  // 当前子树下发现的 child 数量
  let subtreeCount = 0;
  const nextNamePrefix =
    nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

  if (isArray(children)) {
    for (let i = 0; i < children.length; i++) {
      child = children[i];
      nextName = nextNamePrefix + getElementKey(child, i);
      subtreeCount += mapIntoArray(
        child,
        array,
        escapedPrefix,
        nextName,
        callback,
      );
    }
  } else {
    const iteratorFn = getIteratorFn(children);
    if (typeof iteratorFn === 'function') {
      const iterableChildren = children;

      // 迭达器, Generator 函数？
      const iterator = iteratorFn.call(iterableChildren);
      let step;
      let ii = 0;
      while (!(step = iterator.next()).done) {
        child = step.value;
        nextName = nextNamePrefix + getElementKey(child, ii++);
        subtreeCount += mapIntoArray(
          child,
          array,
          escapedPrefix,
          nextName,
          callback,
        );
      }
    } else if (type === 'object') {
      throw new Error('Objects 不是有效的 React child, 必须是函数或数组')
    }
  }

  return subtreeCount
}

// `props.children`
// func: mapFunction(child, index) 会被每一个叶子节点调用
function mapChildren(children, func, context) {
  window.__log('Function:mapChildren')
  if (children == null) return children

  const result = []
  let count = 0
  mapIntoArray(children, result, '', '', child => func.call(context, child, count++))
  window.__log('children count: ' + result.length)
  return result
}

function countChildren(children) {
  let n = 0
  mapChildren(children, () => n++)
  return n
}

function forEachChildren(children, forEachFunc, forEachContext) {
  window.__log('Function:forEachChildren')
  mapChildren(children, function() {
    forEachFunc.apply(this, arguments)
  }, forEachContext)
}

function toArray(children) {
  return mapChildren(children, child => child) || []
}

function onlyChild(children) {
  if (!isValidElement(chldren)) {
    throw new Error(
      'React.Children.only expected to receive a single React element child.',
    );
  }
  return children
}

// ReactMemo.js
function memo(type, compare) {
  const elementType = {
    $$typeof: REACT_MEMO_TYPE,
    type,
    compare: compare ?? null
  }
  return elementType
}

// ReactElement.js

const RESERVED_PROPS = {
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

// React 组件结构
const ReactElement = function(type, key, ref, self, source, owner, props) {
  const element = {
    // This tag allows us to uniquely identify this as a React Element
    $$typeof: REACT_ELEMENT_TYPE,

    // Built-in properties that belong on the element
    type: type,
    key: key,
    ref: ref,
    props: props,

    // Record the component responsible for creating this element.
    _owner: owner,
  };

  return element;
};

function createElement(type, config, children) {
  let propName
  const props = {}

  let key = null
  let ref = null
  let self = null
  let source = null

  // 比如：事件，其它 props 等
  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref
    }

    if (hasValidKey(config)) {
      key = '' + config.key
    }

    self = config.__self ?? null
    source = config.__source ?? null

    // 保留属性保存到新的 props 对象中
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        // 非 key, ref, __self, __source 的属性
        props[propName] = config[propName]
      }
    }
  }

  // children 可能不止一个参数，支持这么调用
  // React.createElement('div', {...}, child1, child2, ..., childN)
  // 最后 children = [child1, child2, ..., childN]
  const childrenLength = arguments.length - 2
  if (childrenLength === 1) {
    props.children = children
  } else if (childrenLength > 1) {
    props.children = slice.call(arguments, 2)
  }

  // 解析默认的 props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName]
      }
    }
  }

  return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props)
}

function isValidElement(object) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}

function hasValidRef(config) {
  return config.ref !== undefined
}

function hasValidKey(config) {
  return config.key !== undefined
}

function cloneElement(element, config, children) {
  if (element === null || element === undefined) {
    throw new Error(
      `React.cloneElement(...): The argument must be a React element, but you passed ${element}.`,
    );
  }

  let propName;

  // Original props are copied
  const props = Object.assign({}, element.props);

  // Reserved names are extracted
  let key = element.key;
  let ref = element.ref;
  // Self is preserved since the owner is preserved.
  const self = element._self;
  // Source is preserved since cloneElement is unlikely to be targeted by a
  // transpiler, and the original source is probably a better indicator of the
  // true owner.
  const source = element._source;

  // Owner will be preserved, unless ref is overridden
  let owner = element._owner;

  if (config != null) {
    if (hasValidRef(config)) {
      // Silently steal the ref from the parent.
      ref = config.ref;
      owner = ReactCurrentOwner.current;
    }
    if (hasValidKey(config)) {
      key = '' + config.key;
    }

    // Remaining properties override existing props
    let defaultProps;
    if (element.type && element.type.defaultProps) {
      defaultProps = element.type.defaultProps;
    }
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        if (config[propName] === undefined && defaultProps !== undefined) {
          // Resolve default props
          props[propName] = defaultProps[propName];
        } else {
          props[propName] = config[propName];
        }
      }
    }
  }

  // Children can be more than one argument, and those are transferred onto
  // the newly allocated props object.
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    props.children = slice.call(arguments, 2);
  }

  return ReactElement(element.type, key, ref, self, source, owner, props);
}

function cloneAndReplaceKey(oldElement, newKey) {
  const newElement = ReactElement(
    oldElement.type,
    newKey,
    oldElement.ref,
    oldElement._self,
    oldElement._source,
    oldElement._owner,
    oldElement.props,
  );

  return newElement;
}

try {
  module.exports = {
    REACT_ELEMENT_TYPE,
    memo,
    // element
    createElement,
    cloneElement,

    Component,
    PureComponent,
    // children
    Children: {
      forEach: forEachChildren,
      map: mapChildren,
      count: countChildren,
      only: onlyChild,
      toArray
    }
  }
} catch (e) {
  console.warn('[scheduler.js] not in node environment.')
}
