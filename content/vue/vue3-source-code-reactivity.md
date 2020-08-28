---
title: "Vue3.0源码系列（一）响应式原理 - Reactivity"
date: 2020-08-28T15:48:02+08:00
tags: ["vue", "vue3", "vuenext", "reactivity"]
categories: ["vue"]
---

> 该系列文章，均以测试用例通过为基准一步步实现一个 vue3 源码副本(学习)。

# 简介

`reactivity` 是 vue next 里面通过 `proxy` + `reflect` 实现的响应式模块。

源码路径： `packages/reactivity`

入口文件：`packages/reactivity/src/index.ts`

疑问点解答：

1. `shallowReactive` 相当于浅复制，只针对对象的一级 reactive，嵌套的对象不会 reactive

   参考：测试代码 reactive.spec.ts

   ```ts
   test('should keep reactive properties reactive', () => {
         const props: any = shallowReactive({ n: reactive({ foo: 1 }) })
         props.n = reactive({ foo: 2 })
         expect(isReactive(props.n)).toBe(true)
       })
   ```

[完整的 reactivity 模块代码链接。](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_over)

## 阶段代码链接

1. [测试用例 `reactive.spec.ts` 通过后的代码链接](#code1)
2. [测试用例 `effect.spec.ts`通过后的代码链接](#code2)
3. [05-21号 git pull 后的更新合 并之后的 reactive.js](#file-0521)
4. [将 reactive.js 拆分成 effect.js + baseHandlers.js](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_files_v)
5. [完成 collection handlers(set + get)](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_collection_get_set)
6. [完成 collection Map, Set 支持](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_collection_map_set)
7. [支持 Ref 类型](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_ref)
8. [支持 computed 属性](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_computed)

## 文中重点链接

1. [vue 中是如何防止在 effect(fn) 的 fn 中防止 ob.prop++ 导致栈溢出的？](#test-case-rloops)
2. [vue 中为何能对 JSON.parse(JSON.stringify({})) 起作用的？](#test-case-json)
3. [集合 handlers 的 get 函数实现 this 问题](#question-this)
4. [Key 和 rawKey 的问题(get 中)，为什么要两次 track:get？](#question-raw-key)
5. [为什么 key1 和 toReactive(key1) 后的 key11 前后 set 会改变 key1 对应的值？？？](#question-key1-key11)
6. [如果 Ref 类型放在一个对象中 reactive 化会有什么结果？？？](#reactive-nest-ref)
7. [计算属性的链式嵌套使用输出结果详细分析过程(想要透彻computed请看这里！！！)](#test-case-computed-chained)

## 遗留问题

1. **<font color="green">DONE</font>** `ownKeys` 代理收集的依赖不能被触发。
2. <font color="red">TODO</font> [Ref:a 类型在对象中执行 obj.a++ 之后依旧是 Ref 类型的 a ???](#question-ref-++)

## 更新

### 2020-05-21 21:19:07 git pull

# 模块结构

1. `__tests__/` 测试代码目录
2. `src/` 主要代码目录

`src` 目录下的文件：

1. `baseHandler.ts` 传入给代理的对象，代理 `Object/Array` 时使用的 Handlers。
2. `collectionHandlers.ts` 传入给代理的对象，代理 `[Week]Set/Map`类型时使用的 Handlers。
3. `computed.ts` 计算属性代码
4. `effect.ts`
5. `operations.ts` 操作类型枚举
6. `reactive.ts` 主要代码
7. `ref.ts` 

<!-- more -->

# Proxy 和 Reflect 回顾

将 reactive -> createReactiveObject 简化合并：

```js
function reactive(target, toProxy, toRaw, baseHandlers, collectionHandlers) {
  // ... 必须是对象 return

  // ... 已经设置过代理了
  let observed = null

  // ... 本身就是代理

  // ... 白名单检测

  // ... handlers

  // new 代理
  let handlers = baseHandlers || collectionHandlers || {} // ...
  observed = new Proxy(target, handlers)

  // 缓存代理设置结果到 toProxy, toRaw

  return observed
}
```

增加一个 reactive 对象：

```js
const target = {
  name: 'vuejs'
}

const observed = reactive(target, null, null, {
  get: function (target, prop, receiver) {
    console.log(target, prop, receiver === observed, 'get')
  }
})

console.log(target, observed)
	
```

输出结果：

> {name: "vuejs"} Proxy {name: "vuejs"}
>
> => original.name
> "vuejs"
> => observed.name
> index.js:28 true "name" true "get"
> undefined
> => observed === original
> false

访问 target, observed 的属性 name 结果如上，`observed` 是被代理之后的对象。

1. Observed.name 输出结果是 handler.get 执行之后的结果，因为没任何返回所以是 `undefined`
2. `get(target, prop, receiver)` 有三个参数，分别代表
   - target: 被代理的对象，即原始的那个 target 对象
   - prop: 要获取对象的属性值的 key
   - receiver: 代理之后的对象，即 `observed`

**其他主要几个代理方法**：

1. `set` 赋值的时候触发，对应 `Reflect.set(target, prop, value)`
2. `get` 取值的时候触发，对应 `Reflect.get(target, prop, reciver)`
3. `ownKeys` 使用 `for...in` 时触发，对应 `Reflect.ownKeys(target)`
4. `has` 使用 `prop in obj` 时触发，对应语法 ： `... in ...`
5. `deleteProperty` 使用 `delete obj.name` 触发，对应 `delete obj.name`
6. `apply` 被代理对象是函数的时候，通过 `fn.apply()` 时触发，handler 里对应 `fn()`
7. `construct` 构造器，`new target()` 时触发
8. `getPrototypeOf` 调用 `Object.getPrototypeOf(target)` 触发，返回对象 或 null
9. ` setPrototypeOf` 设置对象原型时触发，如： `obj.prototype = xxx`

```js
let original = {
  name: 'vuejs',
  foo: 1
}

original = test

const observed = reactive(original, null, null, {
  get: function (target, prop, receiver) {
    console.log(target === original, prop, receiver === observed, 'get')

    return Reflect.get(...arguments)
  },
  set: function (target, prop, value) {
    console.log(prop, value, 'set')
    Reflect.set(target, prop, value)
  },
  ownKeys: function (target) {
    console.log('get own keys...')
    return Reflect.ownKeys(target)
  },
  has: function (target, key) {
    console.log('has proxy handler...')
    return key in target
  },
  deleteProperty: function (target, key) {
    console.log(key + 'deleted from ', target)
    delete target[key]
  },
  // 适用于被代理对象是函数类型的
  apply: function (target, thisArg, argList) {
    console.log('apply...', argList)
    target(...argList)
  },
  construct(target, args) {
    console.log('proxy construct ... ', args)
    return new target(...args)
  },
  // 必须返回一个对象或者 null，代理 Object.getPrototypeOf 取对象原型
  getPrototypeOf(target) {
    console.log('proxy getPrototypeOf...')
    return null
  },
  setPrototypeOf(target, proto) {
    console.log('proxy setPrototypeOf...', proto)
  }
})

console.log(observed.name) // -> true "name" true "get"
observed.name = 'xxx' // -> name xxx set
for (let prop in observed) {
} // -> get own keys...
'name' in observed // -> has proxy handler
delete observed.foo // foo deleted from { name: 'xxx', foo: 1 }

function test() {
  console.log(this.name, 'test apply')
}

observed.apply(null, [1, 2, 3]) // apply... (3) [1, 2, 3]
// 注意点：proxy-construct 的第二个参数是传入构造函数时的参数列表
// 就算是以下面方式一个个传递的
new observed(1, 2, 3) // proxy construct ...  (3) [1, 2, 3]
Object.getPrototypeOf(observed) // proxy getPrototypeOf...
observed.prototype = {
  bar: 2
}

// prototype {bar: 2} set
// index.js:31 true "prototype" true "get"
// index.js:90 {bar: 2}
console.log(observed.prototype)

```

需要注意的点：

1. `construct` 的代理 `handler` 中的第二个参数是一个参数列表数组。
2. `getPrototypeOf` 代理里面返回一个正常的对象 或 `null`表示失败。 

# reactive 函数

```js
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  // 这里对只读的对象进行判断，因为只读的对象不允许修改值
  // 只要曾经被代理过的就会被存到 readonlyToRaw 这个 WeakMap 里面
  // 直接返回只读版本
  if (readonlyToRaw.has(target)) {
    return target
  }
  return createReactiveObject(
    target,
    rawToReactive,
    reactiveToRaw,
    mutableHandlers,
    mutableCollectionHandlers
  )
}
```

传入一个 `target` 返回代理对象。

# createReactiveObject

真正执行代理的是这个函数里面。

## 参数列表

1. `target` 被代理的对象
2. `toProxy` 一个 `WeakMap` 里面存储了 `target -> observed` 
3. `toRaw` 和 `toProxy` 刚好相反的一个 `WeakMap` 存储了 `observed -> target`
4. `baseHandlers` 代理时传递给 `Proxy` 的第二个参数
5. `collectionHandlers` 代理时传递给 `Proxy` 的第二个参数(一个包含四种集合类型的 `Set`)

## 函数体

下面是将 `reactive` 和 `createReactiveObject` 进行合并的代码。

事先声明的变量列表：

```js
// 集合类型的构造函数，用来检测 target 是使用 baseHandlers
// 还是 collectionHandlers
const collectionTypes = new Set([Set, Map, WeakMap, WeakSet])
// 只读对象的 map，只读对象代理时候直接返回原始对象
const readonlyToRaw = new WeakMap()
// 存储一些只读或无法代理的值
const rawValues = new WeakSet()

```

合并后的 `reactive(target, toProxy, toRaw, basehandlers, collectionHandlers)` 函数

```js
function reactive(target, toProxy, toRaw, baseHandlers, collectionHandlers) {
  // 只读的对象
  if (readonlyToRaw.has(target)) {
    return target
  }
  // ... 必须是对象 return
  if (target && typeof target !== 'object') {
    console.warn('不是对象，不能被代理。。。')
    return target
  }

  // toProxy 是一个 WeakMap ，存储了 observed -> target
  // 因此这里检测是不是已经代理过了避免重复代理情况
  let observed = toProxy.get(target)
  if (observed !== void 0) {
    console.log('target 已经设置过代理了')
    return observed
  }

  // ... 本身就是代理
  // toRaw 也是一个 WeakMap 存储了 target -> observed
  // 这里判断这个，可能是为了防止，将曾经被代理之后的 observed 传进来再代理的情况
  if (toRaw.has(target)) {
    console.log('target 本身已经是代理')
    return target
  }

  // ...... 这里省略非法对象的判断，放在后面展示 ......

  // 根据 target 类型决定使用哪个 handlers
  // `Set, Map, WeakSet, SeakMap` 四种类型使用 collectionHandlers 集合类型的 handlers
  // `Object, Array` 使用 basehandlers
  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers

  // new 代理
  observed = new Proxy(target, handlers)

  // 缓存代理设置结果到 toProxy, toRaw
  toProxy.set(observed, target)
  toRaw.set(target, observed)
  return observed
}
```

1. `readonlyToRaw.has(target)` 检测是否是只读对象，直接返回该对象

2. 检测 `target`是引用类型还是普通类型，只有引用类型才能被代理

3. `toProxy` 中存储了 `target->observed` 内容，检测 `target` 是不是已经有代理了

4. `toRaw` 中存储了 `observed->target` 检测是否已经是代理了

5. 五种不合法的对象类型，不能作为代理源

   ```js
   // ... 白名单检测，源码中调用的是 `canObserve` 这里一个个拆分来检测
     // 1. Vue 实例本身不能被代理
     if (target._isVue) {
       console.log('target 是 vue 实例，不能被代理')
       return target
     }
   
     // 2. Vue 的虚拟节点，其实就是一堆包含模板字符串的对象解构
     // 这个是用来生成 render 构建 DOM 的，不能用来被代理
     if (target._isVNode) {
       console.log('target 是虚拟节点，不能被代理')
       return targtet
     }
   
     // 限定了只能被代理的一些对象： 'Object, Array, Map, Set, WeakMap, WeakSet`
     // Object.prototype.toString.call(target) => [object Object] 取 (-1, 8)
     // 其实 `Object` 构造函数字符串
     const toRawType = (target) =>
       Object.prototype.toString.call(target).slice(8, -1)
     if (
       !['Object', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet'].includes(
         toRawType(target)
       )
     ) {
       console.log(
         `target 不是可代理范围对象('Object', 'Array', 'Map', 'Set', 'WeakMap', 'WeakSet')`
       )
       return target
     }
   
     // 那些被标记为只读或者非响应式的WeakSets的值
     if (rawValues.has(target)) {
       return target
     }
   
     // 被冻结的对象，是不允许任何修改操作的，不可用作响应式对象
     if (Object.isFrozen(target)) {
       return target
     }
   ```

6. 根据 target 的类型检测采用哪种类型的 `handlers`，集合类型使用 `collectionhandlers`，对象类型采用 `baseHandlers`

7. 创建代理 `new Proxy(target, handlers)`

8. 缓存代理源及代理结果到 `toProxy, toRaw` 避免出现重复代理的情况

9. 返回代理对象 `observed`。

## 使用 `reactive`

为了区分两种代理类型(集合类型，普通对象(对象和数组))，这里使用两个对象(`setTarget`, `objTarget`)，创建两个代理(`setObserved`, `objObserved`)，分别传入不同的代理 `handlers`，代码如下：

```js
const toProxy = new WeakMap()
const toRaw = new WeakMap()

const setTarget = new Set([1, 2, 3])
const objTarget = {
  foo: 1,
  bar: 2
}

const setObserved = reactive(setTarget, toProxy, toRaw, null, {
  get(target, prop, receiver) {
    console.log(prop, 'set get...')
    // return Reflect.get(target, prop, receiver)
  },
  // set/map 集合类型
  has(target, prop) {
    const ret = Reflect.has(target, prop)

    console.log(ret, target, prop, 'set has...')
    return ret
  }
})
const objObserved = reactive(
  objTarget,
  toProxy,
  toRaw,
  {
    // object/arary, 普通类型
    get(target, prop, receiver) {
      console.log(prop, 'object/array get...')
      return Reflect.get(target, prop, receiver)
    }
  },
  {}
)
```

输出代理的结果对象如下：`console.log(setObserved, objObserved)`

结果：`Proxy {1, 2, 3} Proxy {foo: 1, bar: 2}`

然后出现了错误，当我试图调用 `setObserved.has(1)` 的时候<span id="error-map">报错了</span>：

![](http://qiniu.ii6g.com/1589614203.png?imageMogr2/thumbnail/!100p)

获取 `setObserved.size` 属性报错，不同的是 `set proxy handler` 有被调用，这里应该是调用 `Reflect.get()` 时候报错了：

![](http://qiniu.ii6g.com/1589614685.png?imageMogr2/thumbnail/!100p)

[google 之后这里有篇文章里给出了问题原因和解决方案](https://medium.com/the-non-traditional-developer/safely-extending-the-javascript-set-object-using-proxies-3ce25702b8c3)

解决方法，在 `get proxy handler` 里面加上判断，如果是函数就使用 `target`去调用：

```js
const setObserved = reactive(setTarget, toProxy, toRaw, null, {
  get(target, prop, receiver) {
    switch (prop) {
      default: {
        // 如果是函数，经过代理之后会丢失作用域问题，所以要
        // 重新给他绑定下作用域
        console.log(prop, 'get...')
        return typeof target[prop] === 'function'
          ? target[prop].bind(target)
          : target[prop]
      }
    }
  },
 
```

结果：

> Proxy {1, 2, 3} Proxy {foo: 1, bar: 2}
> -> setObserved.has(1)
> has get...
> true

# baseHandlers.ts

这个文件模块出现了几个 handlers 是需要弄清楚的，比如：

`baseHandlers.ts` 里面和 **Array**, **Object** 有关的四个：

1. `mutableHandlers`
2. `readonlyHandlers`
3. `shallowReactiveHandlers`, 
4. `shallowReadonlyHandlers`


`collectionHandlers.ts` 里和集合相关的两个：

1. `mutableCollectionHandlers`
2. `readonlyCollectionHandlers`

在上一节讲过 `createReactiveObject` 需要给出两个 handlers 作为参数，一个是针对数组和普通对象的，另一个是针对集合类型的。

下面分别来看看两个文件中分别都干了什么？？？

## 列出文件中相关的函数和属性：

属性:

```js
// 符号集合
const builtInSymbols = new Set(/* ... */);
// 四个通过 createGetter 生成的 get 函数
const get = /*#__PURE__*/ createGetter()
const shallowGet = /*#__PURE__*/ createGetter(false, true)
const readonlyGet = /*#__PURE__*/ createGetter(true)
const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true)

// 三个数组函数 'includes', 'indexOf', 'lastIndexOf'
const arrayInstrumentations: Record<string, Function> = {}

// setter
const set = /*#__PURE__*/ createSetter()
const shallowSet = /*#__PURE__*/ createSetter(true)

```

函数：

```ts
// 创建 getter 函数的函数
function createGetter(isReadonly = false, shallow = false) { /* ... */ }

// 创建 setter 函数的函数
function createSetter(shallow = false) { /* ... */ }

// delete obj.name 原子操作
function deleteProperty(target: object, key: string | symbol): boolean { 	/*...*/ 
}

// 原子操作 key in obj
function has(target: object, key: string | symbol): boolean { /* ... */ }

// Object.keys(target) 操作，取对象 key
function ownKeys(target: object): (string | number | symbol)[]  {/*...*/}
```



四个要被导出的 `handlers`：

```ts
export const mutableHandlers: ProxyHandler<object> = {/*...*/}
export const readonlyHandlers: ProxyHandler<object> = {/*...*/}
export const shallowReactiveHandlers: ProxyHandler<object> = {/*...*/}
export const shallowReadonlyHandlers: ProxyHandler<object> = {/*...*/}
```

接下来一个个来分析分析，看看每个都有什么作用？？？

先从 `createGetter` 说起吧 -> 

为了下面方便调试，对上面的 `reactive()` 进行了简化，只保留了与 handlers 有关的部分：

```js
const collectionTypes = new Set([Set, Map, WeakMap, WeakSet])

function reactive(target, toProxy, toRaw, baseHandlers, collectionHandlers) {
  // 简化
  if (typeof target !== 'object') return target

  //... isVue, VNode...

  let observed = null

  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers

  observed = new Proxy(target, handlers)
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  return observed
}

const toProxy = new WeakMap(),
  toRaw = new WeakMap()
```

## createGetter(isReadonly = false, shallow = false)

参数： 

1. `isReadonly = false`
2. `shallow = false`

简化之后的 `createGetter`，先用它来创建一个 `get` 然后创建一个 `baseHandler: mutableHandlers` 可变的 `handlers`。

```js
{
  // 很明显这个 proxy handler get, 简化之后...
  return function get(target, key, receiver) {
    const res = Reflect.get(...arguments)
    // ... 省略1，如果是数组，且是 includes, indexOf, lastIndexOf 操作
    // 直接返回它对应的 res
    // ... 省略2，如果是符号属性，直接返回 res

    // ... 省略3, 浅 reactive，不支持嵌套

    // ... 省略4，isRef 类型，判断是数组还是对象，数组执行 track(...), 对象返回 res.value

    // 非只读属性，执行 track()，收集依赖
    !isReadonly && track(target, 'get', key)

    console.log(res, key, 'get...')
    // return res
    // 非对象直接返回原结果，如果是对象区分只读与否
    return typeof res === 'object' && res !== null
      ? isReadonly
        ? // need to lazy access readonly and reactive here to avoid
          // circular dependency
          res // ... readonly(res)
        : reactive(res, toProxy, toRaw, mutableHandlers)
      : res
  }
}
```

上面我们省略了暂时不关心的是哪个部分：

1. 数组类型且 key 是 `['includes', 'indexOf', 'lastIndexOf']` 其中任一一个
2. 符号属性处理
3. `ref` 类型处理

目前我们只关心如何创建 `get` 和一个最简单的 `basehandler: mutableHandler`

使用 `createGetter: get`

```js
// 示例 1
const objTarget = {
  foo: 1,
  bar: { 
    name: 'bar'
  }
}

// 将 createGetter 生成的 get -> mutableHandlers 传入 reactive
const objObserved = reactive(objTarget, toProxy, toRaw, mutableHandlers)
```

这里 `get` 我认为只有两个目的：

## 递归 `reactive`，就在最后返回的时候检测 `res` 结果时候

这里我们首先来验证下递归 `reactive` 问题，即当我们访问对象中嵌套对象里面的属性时候，实际上是不会触发 `get` 的，我们在 `createGetter` 的 `return` 前面加上一句 `return res` 。

也就是说不检测结果是不是对象，而直接返回当前取值的结果：

>=> objObserved.foo
>"foo" "get..."
>1
>=> objObserved.bar
>{name: "bar"} "bar" "get..."
>{name: "bar"}
>{name: "bar"} "bar" "get..."
>=> objObserved.bar.name
>{name: "bar"} "bar" "get..."
>"bar"
>=> const bar = objObserved.bar
>{name: "bar"} "bar" "get..."
>undefined
>=> bar.name
>"bar"

分析上面的测试结果：

- `objObserved.foo` 直接取对象的成员值，触发了 `proxy get`
- `objObserved.bar` 取对象的对象成员，触发了 `proxy get`

+ `objObserved.bar.name` 取嵌套对象的成员，触发了 `proxy get`但请注意实际上触发 `get` 的是 `objObserved.bar` 得取值过程，因为输出的 `res` 是 `{name: "bar"}`，也就是说取 `bar.name` 的`name`时候实际并没有触发 `proxy get`，这说明 `proxy get` 只能代理一级。

- 为了证明代理只能代理一级，下面通过 `bar = objObserved.bar` 再去取 `bar.name` 就很明显并没有触发 `proxy get`

通过上面的分析，这也就是为什么要在 `return` 的时候去检测是不是对象，如果是对象需要进行递归 `reactive`的动作。

那么，我们将 `return res` 注释掉再来看看结果如何：

>=> objObserved.foo
>1 "foo" "get..."
>1
>=> objObserved.bar
>{name: "bar"} "bar" "get..."
>Proxy {name: "bar"}
>=> objObserved.bar.name
>{name: "bar"} "bar" "get..."
>bar name get...
>"bar"
>=> const bar = objObserved.bar
>{name: "bar"} "bar" "get..."
>bar.name
>=> bar name get...
>"bar"

看到差异没，首先从 `objObserved.bar.name` 就可看出差异了，这里首先触发的实际是 `objObserved.bar` 的 `proxy get`，此时 `return` 的时候发现结果是个对象，因此将 `bar` 传入 `reactive(bar)` 进一步代理，完成之后取 `bar.name` 的时候 `bar` 已经是 reactive 对象了，因此就在 **{name: "bar"} "bar" "get..."** 后面紧跟着出现了**bar name get...** 输出。

此时，无论后面是赋值到变量 `bar` 再取 `bar.name` 结果一样会触发对应的 `proxy get`，毕竟对象是引用类型，类似指针一样，新增了一个变量指向它，它依旧在哪里。



到此，最基本的 `proxy get` 响应式也完成了，并且能做到嵌套对象的 reactive 化，感觉相比 vue3 之前的通过 `defineProperty` 实现更加清晰容易理解。

##  收集依赖(`track`)

既然有了响应式数据，那么接下来的重点就是如果利用其特性为我们做点事情，但是它又如何知道为我们做什么的，这个时候就有了所谓的“收集依赖”。

“收集依赖”就是在 `get` 取值期间发生的，也就是 `createGetter` 中的 `track()` 调用时触发了依赖收集动作。

`track()` 相关的代码在 `effect.ts` 中：

函数定义： 

`export function track(target: object, type: TrackOpTypes, key: unknown){} `

有三个参数：

1. target：proxy get 时候传递给 proxy 的那个对象
2. type: 要 track 的类型，有三种： `get`, `has`,`iterate`，分别是取值，检测属性存在性，以及迭代时。
3. Key: 针对 target 对象里面的属性，收集依赖到 `targetMap -> depsMap -> dep:Set` 中

简化 `track(target, type)`代码：

```js
// trackType -> get, has, iterate
function track(target, type, key) {
  // ...省略1 检测 shouldTrack 和 activeEffect 标记

  // 取 target 自己的依赖 map ，如果没有说明是首次，需要给它创建一个
  // 空的集合，这里使用 Map 而不是 WeakMap，为的是强引用，它涉及到
  // 数据的更新触发 UI 渲染，因此不该使用 WeakMap，否则可能会导致依赖丢失问题
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 接下来对 key 取其依赖
  // 如果属性的依赖不存在，说明该对象是首次使用，需要创建其依赖库
  // 且这里使用了 `Set` 是为了避免重复注册依赖情况，避免数据的更新导致重复触发
  // 同一个 update 情况
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  // 注册实际的 update: activeEffect 操作
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
  }
}
```

代码实现主要有三个过程：

1. 检测全局的 `targetMap` 中是不是有 `target` 自己的依赖仓库(`Map`)
2. 检测 `depsMap = targetMap.get(target)` 中是不是有取值 `key` 对应的依赖集合 `dep`
3. 注册 `activeEffect`对象，然后将当前 target-key-dep 注册到 activeEffect，然后发现每个 `activeEffect`会有自己的 `deps` 保存了所有对象 `key` 的依赖。 

收集依赖的过程如图：，执行取值 `activeEffect.deps` 中就会新增一个 `Set`

![](http://qiniu.ii6g.com/1589694976.png?imageMogr2/thumbnail/!100p)

到这里，依赖收集算是完成，但并不是很明白 `activeEffect` 具体是做什么的???

既然依赖收集，要搞明白 `activeEffect` 是做什么的，估计的从 `set` 入手了，下面来实现 `set` 从而完成一个完整的 `get -> dep -> set -> update` 的过程。

go on...

## createSetter(shallow = false)

源码简化版：

```js
function createSetter(shallow = false) {
  // 标准的 proxy set
  return function set(target, key, value, receiver) {
    // 取旧值
    const oldValue = target[key]

    // 先不管 shallow mode

    // 还记得 reactive 里面的 toRaw啊，对象这里就是取出
    // value 的原始对象 target，前提是它有 reactive() 过
    // 才会被存入到 toRaw: observed -> target 中
    // 暂时简化成： toRaw.get(value)
    value = toRaw.get(value)

    // ... 省略，ref 检测

    const hadKey = hasOwn(target, key)
    // 先执行设置原子操作
    const result = Reflect.set(target, key, value, receiver)

    // 只有对象是它自身的时候，才触发 dep-update(排除原型链)
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 新增属性操作
        trigger(target, 'add', key, value)
      } else if (hasChanged(value, oldValue)) {
        // 值改变操作,排除 NaN !== NaN 情况
        trigger(target, 'set', key, value, oldValue)
      }
    }

    return result
  }
}
```

这里主要有几个操作：

1. shallow mode 检测，已省略。
2. `value = toRaw(value)` 如果 value 是 observed，那么可以通过 toRaw 取出被代理之前的对象 target，还记得 `reactive()` 里面的那个 toRaw, toProxy 缓存操作吧。
3. 调用 `Reflect.set()` 先将值设置下去，然后再考虑是否触发依赖
4. 检测对象原型链，只有当对象是自身的时候才触发依赖
5. 触发的行为只有两种要么是新增属性(`add`)，要么是更改值(`set`, 值不变的情况不触发)

这里有个与 `createGetter` 里面收集依赖 (`track()`)对应的触发依赖函数： `trigger`。

接下来就是要看看 `trigger()` 里面都做了啥。

```js
function trigger(target, type, key, newValue, oldValue, oldTarget) {
  // step1: 检测是否被 track 过，没有根本就没有依赖
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // step2: 将 dep 加入到 effects
  // 创建两个 effects, 一个普通的，一个计算属性
  const effects = new Set()
  const computedRunners = new Set()
  // 根据 effect 的选项 computed 决定是添加到那个 Set 中
  const add = (effectsToAdd) =>
    effectsToAdd.forEach(
      (effect) =>
        (effect !== activeEffect || !shouldTrack) &&
        (effect.options.computed
          ? computedRunners.push(effect)
          : effects.push(effect))
    )

  // if ... clear
  if (false) {
    // TODO 清空动作，触发所有依赖
  }
  // 数组长度变化
  else if (false) {
    // TODO 触发更长度变化有关的所有依赖
  } else {
    // 例如： SET | ADD | DELETE 操作
    if (key !== void 0) {
      add(depsMap.get(key))
    }

    const isAddOrDelete =
      type === 'add' || (type === 'delete' && !Array.isArray(target))
    if (isAddOrDelete || (type === 'set' && target instanceof Map)) {
      // 删除或添加操作，或者 map 的设置操作
      add(depsMap.get(Array.isArray(target) ? 'length' : ITERATE_KEY))
    }

    // Map 的添加或删除操作
    if (isAddOrDelete && target instanceof Map) {
      add(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }

  // step3: 执行 effects 中所有的 dep

  const run = (effect) => {
    // 选项提供了自己的调度器，执行自己的
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  // 触发应该触发的依赖
  computedRunners.forEach(run)
  effects.forEach(run)
}
```

主要有三个步骤：

- step1: 检测是否收集过依赖，如果没有说明可能没有被用过，没什么可触发的
- step2: 主要是过滤收集到依赖，针对当前更改操作的所有依赖触发(add)
- step2: 经过第二步的依赖过滤之后，触发所有的依赖(run)

这里面有两个重要的属性(`effects`,`computedRunners`)和两个函数(`add`,`run`)

*add: 过滤，run: 执行。*



很明显，到这里，我们还是没有解决，依赖对应的 `update` 是如何收集的问题，因为 `set` 也只是将已经收集好 `dep` 执行而已。

# effect.ts

该文件中主要包含三个重要函数:

1. `trigger(target, type, key?, newValue?, oldValue?, oldTarget?)` 触发依赖函数
2. `effect->createReactiveEffect(fn, options)` 转换依赖函数成ReactiveEffect类型，并且立即执行它。
3. `track(target, type, key)`

以及一些辅助函数：

1. `isEffect()` 检测是不是 `ReactiveEffect` 类型
   `isEffect = fn => fn?._isEffect === true`

2. `stop(effect: ReactiveEffect)`
   停止 effect ，如果选项中提供了 onStop 监听该动作，执行它，重置 effect.active。

   ```ts
   export function stop(effect: ReactiveEffect) {
     if (effect.active) {
       cleanup(effect)
       if (effect.options.onStop) {
         effect.options.onStop()
       }
       effect.active = false
     }
   }
   ```

   

3. `cleanup(effect: ReactiveEffect)`

   ```ts
   // 在 track 的时候，加入 effect 时，对其做一次清理工作
   // 保证 effect.deps 干净
   function cleanup(effect: ReactiveEffect) {
     const { deps } = effect
     if (deps.length) {
       for (let i = 0; i < deps.length; i++) {
         deps[i].delete(effect)
       }
       deps.length = 0
     }
   }
   ```

   

4. `pauseTracking() `

   ```ts
   // 暂停 track 动作
   export function pauseTracking() {
     trackStack.push(shouldTrack)
     shouldTrack = false
   }
   ```

5. `enableTracking() `

   ```ts
   // 恢复 track 动作
   export function enableTracking() {
     trackStack.push(shouldTrack)
     shouldTrack = true
   }
   ```

6. `resetTracking() `

   ```ts
   // 重置 track，可能 fn 执行失败了，try ... finally ... 丢弃 fn:effect 时候调用
   export function resetTracking() {
     const last = trackStack.pop()
     shouldTrack = last === undefined ? true : last
   }
   ```

   

包含的属性变量：

```ts
// 保存着 target 对象的所有依赖的 Map <target, dep<Set>>
// target -> Map<key, dep[]>
const targetMap = new WeakMap<any, KeyToDepMap>()
// effect 栈，保存所有的 fn->effect
const effectStack: ReactiveEffect[] = []
// 当前激活状态的 effect
let activeEffect: ReactiveEffect | undefined

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

// 执行 effect 时，uid++，即每个 effect 都会有自己的唯一的 uid
let uid = 0

// 记录当前 effect 的状态，
let shouldTrack = true
// 当前 effect -> shouldTack
// 每增加一个 effect 记录 shouldTrack = true, push 到 trackStack
// 如果 effect.raw<fn> 执行异常会 pop 掉，还原 shouldTrack -> last, 
// pop trackStack
const trackStack: boolean[] = []
```

一直到这里我们基本完成了 `reactive->get->set->track->trigger->effect` 一系列动作，

也该我们测试的时候了，按正常应该会有我们想要的结果，响应式->注册fn:update->取值收集依赖-> 设置触发 fn:udpate 调用 

=>>>>>>>>>

比如：

```js
const r = (target) => reactive(target, toProxy, toRaw, mutableHandlers)

const fn = () => console.log('effect fn')
let res = effect(fn, {})
console.log(Object.keys(res), 'after effect')

let dummy
const counter = r({ num: 0 })
effect(() => (dummy = counter.num))
console.log(dummy, 'before')
counter.num = 7
console.log(dummy, 'after')

```

上面的例子运行之后，并没有得到我们想要的结果！！！

>effect fn
>["id", "_isEffect", "active", "raw", "deps", "options"] "after effect"
>0 "num" "get..."
>0 "before"
>0 "after"

按照我们的实现，理论上 after 的结果应该是 7 才对，但结果显示依然是 0，这说明了我们调用 `effect(fn)` 并没有与上面的 `r({ num: 0 })` 发生任何联系，即 fn 并没有被收集到 `counter.num` 的依赖 deps 中去，那这是为什么呢？？？

-----



我们来回顾分析下之前所作工作的整个过程(`reactive->get->set->track->trigger->effect`):

- `reactive` 将数据通过 `proxy` 转成响应式
- `get->track` 收集依赖，相关属性：targetMap, depsMap, dep, activeEffect, activeEffect.deps。
- `set->trigger` 触发依赖 update 函数，涉及到的 targetMap, depsMap,  add, run
- `effect` 将 update 函数，转换成 ReactiveEffect 类型

纵观这整个过程，尤其是 `get->track` ， `set->trigger -> effect` 收集，触发和 effect 三个过程，唯一有可能让他们发生联系的应该就是这个 `activeEffect` 模块域里的变量，标识着当前处于激活状态的 effect，它的使用几乎贯穿了整个过程(track->trigger->effect，这三个函数也都在 *effect.ts* 中实现)。

那么接下来......

前面都是简化之后的，现在看看完整的这三个函数实现：

## track(target, type, key)

```ts
export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (!shouldTrack || activeEffect === undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect.deps.push(dep)
    if (__DEV__ && activeEffect.options.onTrack) {
      activeEffect.options.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      })
    }
  }
}
```

## trigger(...)

```ts
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }

  const effects = new Set<ReactiveEffect>()
  const computedRunners = new Set<ReactiveEffect>()
  const add = (effectsToAdd: Set<ReactiveEffect> | undefined) => {
    if (effectsToAdd) {
      effectsToAdd.forEach(effect => {
        if (effect !== activeEffect || !shouldTrack) {
          if (effect.options.computed) {
            computedRunners.add(effect)
          } else {
            effects.add(effect)
          }
        } else {
          // the effect mutated its own dependency during its execution.
          // this can be caused by operations like foo.value++
          // do not trigger or we end in an infinite loop
        }
      })
    }
  }

  if (type === TriggerOpTypes.CLEAR) {
    // collection being cleared
    // trigger all effects for target
    depsMap.forEach(add)
  } else if (key === 'length' && isArray(target)) {
    depsMap.forEach((dep, key) => {
      if (key === 'length' || key >= (newValue as number)) {
        add(dep)
      }
    })
  } else {
    // schedule runs for SET | ADD | DELETE
    if (key !== void 0) {
      add(depsMap.get(key))
    }
    // also run for iteration key on ADD | DELETE | Map.SET
    const isAddOrDelete =
      type === TriggerOpTypes.ADD ||
      (type === TriggerOpTypes.DELETE && !isArray(target))
    if (
      isAddOrDelete ||
      (type === TriggerOpTypes.SET && target instanceof Map)
    ) {
      add(depsMap.get(isArray(target) ? 'length' : ITERATE_KEY))
    }
    if (isAddOrDelete && target instanceof Map) {
      add(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }

  const run = (effect: ReactiveEffect) => {
    if (__DEV__ && effect.options.onTrigger) {
      effect.options.onTrigger({
        effect,
        target,
        key,
        type,
        newValue,
        oldValue,
        oldTarget
      })
    }
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  // Important: computed effects must be run first so that computed getters
  // can be invalidated before any normal effects that depend on them are run.
  computedRunners.forEach(run)
  effects.forEach(run)
}
```

## effect(fn, options)

```ts
export function effect<T = any>(
  fn: () => T,
  options: ReactiveEffectOptions = EMPTY_OBJ
): ReactiveEffect<T> {
  if (isEffect(fn)) {
    fn = fn.raw
  }
  const effect = createReactiveEffect(fn, options)
  if (!options.lazy) {
    effect()
  }
  return effect
}


function createReactiveEffect<T = any>(
  fn: (...args: any[]) => T,
  options: ReactiveEffectOptions
): ReactiveEffect<T> {
  const effect = function reactiveEffect(...args: unknown[]): unknown {
    if (!effect.active) {
      return options.scheduler ? undefined : fn(...args)
    }
    if (!effectStack.includes(effect)) {
      cleanup(effect)
      try {
        enableTracking()
        effectStack.push(effect)
        activeEffect = effect
        return fn(...args)
      } finally {
        effectStack.pop()
        resetTracking()
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  } as ReactiveEffect
  effect.id = uid++
  effect._isEffect = true
  effect.active = true
  effect.raw = fn
  effect.deps = []
  effect.options = options
  return effect
}
```

## 对比三个函数

| 过程      | shouldTrack/activeEffect                                     |      |
| --------- | ------------------------------------------------------------ | ---- |
| `track`   | <font color="blue">if (!shouldTrack \|\| activeEffect === undefined) return</font> |      |
| `trigger` | add 里面有个判断：<font color="blue">if (!shouldTrack \|\| effect !== activeEffect)`</font>才会继续往下执行添加操作 |      |
| `effect`  | `effectStack.push(effect)`<br />`activeEffect = effect`<br />// enable tracking<br />`trackStack.push(shouldTrack)`<br />`shouldTrack = true` |      |

对下面测试代码逐行分析：

```js
let dummy
const counter = r({ num: 0 })
effect(() => (dummy = counter.num))
console.log(dummy, counter, 'before')
counter.num = 7
console.log(dummy, 'after')

```

1. `const counter = r({sum: 0})`
   这里将 { sum: 0 } reactive 代理之后赋值给了  `counter` 也就是说这个 `counter` 是个 `Proxy`：![](http://qiniu.ii6g.com/1589705626.png?imageMogr2/thumbnail/!100p)

2. `effect(() => (dummy = counter.num))`
   在这里调用 `effect(fn)` 注册了一个 updater，里面用到了 `counter.num` 那么就会触发 `counter.num` 的 `proxy get`，然后会触发 `track()` 收集依赖:
   ![](http://qiniu.ii6g.com/1589705890.png?imageMogr2/thumbnail/!100p)
   并且我们从图中结果可知， fn 实际被立即执行了一次，这是 `effect` 函数里面的操作。
   按预期，这里的 fn 应该会被收集到 counter.num 的 deps 中。
   我们在 `track()` 最后加上打印

   ```js
   if (!dep.has(activeEffect)) {
       dep.add(activeEffect)
       activeEffect?.deps?.push(dep)
       console.log(dep, activeEffect.deps)
     }
   ```

   结果：![](http://qiniu.ii6g.com/1589706174.png?imageMogr2/thumbnail/!100p)

   即，activeEffect.deps 以及收集到了 `counter.num` 的依赖: `Map(1) {"num" => Set(1)}`。
   ![](http://qiniu.ii6g.com/1589706408.png?imageMogr2/thumbnail/!100p)

3. `console.log(dummy, counter, 'before')`
   经过上面的结果分析，在第2步的时候，确实已经收集到了 counter.num 的 fn:updater，且存放到了 `targetMap -> despMap -> num:Set(1)` 中。
   因此这里的输出内容是： **0 "num" "get..."** 没什么毛病，那继续往下，问题或许处在设置的时候???

4. `counter.num = 7`
   最后发现问题所在，原始是个超级低级的问题(捂脸~~，没脸见人~~~)。
   没有创建 `set handler` 并添加到 mutableHandlers 里面。
   只要添加两句：
   `const set = createSetter()`
   然后：
   `const mutableHandlers = { get, set }`
   就能得到我们想要的结果。

5. `console.log(dummy, 'after')`
   最后看下最终输出：![](http://qiniu.ii6g.com/1589707939.png?imageMogr2/thumbnail/!100p)

   1 `effect(() => (dummy = counter.num)) `取值时 proxy get 里面的输出

   2： 设置值为 7 之前的输出

   3： 设置值当中的输出
   4： 最后一个log取值 proxy get 的输出
   5： 最后 log 的输出内容

虽然犯了个非常低级的错误，但也正因为这个低级错误，促使自己一步步的去跟踪 `get->track`, `set->trigger`, `effect` 整个过程，从而了解了依赖收集，updater 触发原理。

# 小结 1

到此一个比较完整的响应式代码也算告一段落，这里贴一下简化后可运行的完整代码([reactive.js](https://github.com/gcclll/vue-next-code-read/blob/master/packages/reactive.js))如下：

```js
const hasChanged = (value, oldValue) =>
  value !== oldValue && (value === value || oldValue === oldValue)
const __DEV__ = false
let shouldTrack = true
const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')
const effectStack = []
const trackStack = []
let uid = 0
const reactiveToRaw = new WeakMap()
const rawToReactive = new WeakMap()

// baseHandlers.ts start
const get = createGetter()
const set = createSetter()

// 存放目标依赖的 map： target -> depsMap
// 一个目标，有自己的一个 map 存放依赖
const targetMap = new WeakMap()
let activeEffect = {
  _isEffect: true,
  id: 0,
  active: false,
  raw: null,
  deps: [],
  options: {}
}

function toRaw(observed) {
  return reactiveToRaw.get(observed) || observed
}

function effect(fn, options = {}) {
  // 如果是个 activeEffect 类型，那么其执行函数应该是 fn.raw
  if (fn?._isEffect === true) {
    fn = fn.raw
  }

  // 接下来要创建一个 effect
  const _effect = function reactiveEffect(...args) {
    if (!_effect.active) {
      // 非激活状态
      return options.scheduler ? undefined : fn(...args)
    }

    if (!effectStack.includes(_effect)) {
      // 如果栈中不包含当前的 effect，即没有注册过该 effect
      // 注册过就不需要重复注册了
      // 添加前先执行清理工作 cleanup -> effect.deps[i].delete(effect)

      try {
        shouldTrack = true
        effectStack.push(_effect)
        activeEffect = _effect
        return fn(...args)
      } finally {
        // fn 执行异常了，移除对应的 effect
        effectStack.pop()
        const last = trackStack.pop()
        // 还原状态值
        shouldTrack = last === undefined ? true : last
        // 还原当前激活的 effect
        activeEffect = effectStack[effectStack.length - 1]
      }
    }
  }

  _effect.id = uid++
  _effect._isEffect = true
  _effect.active = true
  _effect.raw = fn
  _effect.deps = []
  _effect.options = options

  if (!options.lazy) {
    _effect()
  }

  return _effect
}

function trigger(target, type, key, newValue, oldValue, oldTarget) {
  // step1: 检测是否被 track 过，没有根本就没有依赖
  const depsMap = targetMap.get(target)
  if (!depsMap) return

  // step2: 将 dep 加入到 effects
  // 创建两个 effects, 一个普通的，一个计算属性
  const effects = new Set()
  const computedRunners = new Set()
  // 根据 effect 的选项 computed 决定是添加到那个 Set 中
  const add = (effectsToAdd) => {
    effectsToAdd?.forEach(
      (effect) =>
        (effect !== activeEffect || !shouldTrack) &&
        (effect.options.computed
          ? computedRunners.add(effect)
          : effects.add(effect))
    )
  }

  // if ... clear
  if (false) {
    // TODO 清空动作，触发所有依赖
  }
  // 数组长度变化
  else if (false) {
    // TODO 触发更长度变化有关的所有依赖
  } else {
    // 例如： SET | ADD | DELETE 操作
    if (key !== void 0) {
      add(depsMap.get(key))
    }

    const isAddOrDelete =
      type === 'add' || (type === 'delete' && !Array.isArray(target))
    if (isAddOrDelete || (type === 'set' && target instanceof Map)) {
      // 删除或添加操作，或者 map 的设置操作
      add(depsMap.get(Array.isArray(target) ? 'length' : ITERATE_KEY))
    }

    // Map 的添加或删除操作
    if (isAddOrDelete && target instanceof Map) {
      add(depsMap.get(MAP_KEY_ITERATE_KEY))
    }
  }

  // step3: 执行 effects 中所有的 dep

  const run = (effect) => {
    // 选项提供了自己的调度器，执行自己的
    if (effect.options.scheduler) {
      effect.options.scheduler(effect)
    } else {
      effect()
    }
  }

  // 触发应该触发的依赖
  computedRunners.forEach(run)
  effects.forEach(run)
}

// trackType -> get, has, iterate
function track(target, type, key) {
  if (!shouldTrack || activeEffect === undefined) return
  // ...省略1 检测 shouldTrack 和 activeEffect 标记

  // 取 target 自己的依赖 map ，如果没有说明是首次，需要给它创建一个
  // 空的集合，这里使用 Map 而不是 WeakMap，为的是强引用，它涉及到
  // 数据的更新触发 UI 渲染，因此不该使用 WeakMap，否则可能会导致依赖丢失问题
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }

  // 接下来对 key 取其依赖
  // 如果属性的依赖不存在，说明该对象是首次使用，需要创建其依赖库
  // 且这里使用了 `Set` 是为了避免重复注册依赖情况，避免数据的更新导致重复触发
  // 同一个 update 情况
  let dep = depsMap.get(key)
  if (!dep) {
    depsMap.set(key, (dep = new Set()))
  }

  // 注册实际的 update: activeEffect 操作
  if (!dep.has(activeEffect)) {
    dep.add(activeEffect)
    activeEffect?.deps?.push(dep)
  }
}
function createGetter(isReadonly = false, shallow = false) {
  // 很明显这个 proxy handler get, 简化之后...
  return function get(target, key, receiver) {
    const res = Reflect.get(...arguments)
    // ... 省略1，如果是数组，且是 includes, indexOf, lastIndexOf 操作
    // 直接返回它对应的 res
    // ... 省略2，如果是符号属性，直接返回 res

    // ... 省略3, 浅 reactive，不支持嵌套

    // ... 省略4，isRef 类型，判断是数组还是对象，数组执行 track(...), 对象返回 res.value

    // 非只读属性，执行 track()，收集依赖
    !isReadonly && track(target, 'get', key)

    console.log(res, key, 'get...')
    // return res
    // 非对象直接返回原结果，如果是对象区分只读与否
    return typeof res === 'object' && res !== null
      ? isReadonly
        ? // need to lazy access readonly and reactive here to avoid
          // circular dependency
          res // ... readonly(res)
        : reactive(res, toProxy, toRaw, mutableHandlers)
      : res
  }
}

function createSetter(shallow = false) {
  // 标准的 proxy set
  return function set(target, key, value, receiver) {
    // 取旧值
    const oldValue = target[key]

    // 先不管 shallow mode

    // 还记得 reactive 里面的 toRaw啊，对象这里就是取出
    // value 的原始对象 target，前提是它有 reactive() 过
    // 才会被存入到 toRaw: observed -> target 中
    // 暂时简化成： toRaw.get(value)
    value = toRaw(value)

    // ... 省略，ref 检测
    console.log(target, key, value, reactiveToRaw, 'set')

    const hadKey = Object.hasOwnProperty(target, key)
    // 先执行设置原子操作
    const result = Reflect.set(target, key, value, receiver)

    // 只有对象是它自身的时候，才触发 dep-update(排除原型链)
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 新增属性操作
        trigger(target, 'add', key, value)
      } else if (hasChanged(value, oldValue)) {
        // 值改变操作,排除 NaN !== NaN 情况
        trigger(target, 'set', key, value, oldValue)
      }
    }

    return result
  }
}

const mutableHandlers = {
  get,
  set
}
// baseHandlers.ts end

const collectionTypes = new Set([Set, Map, WeakMap, WeakSet])

function reactive(target, toProxy, toRaw, baseHandlers, collectionHandlers) {
  // 简化
  if (typeof target !== 'object') return target

  //... isVue, VNode...

  let observed = null

  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers

  observed = new Proxy(target, handlers)
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  return observed
}

const r = (target) =>
  reactive(target, rawToReactive, reactiveToRaw, mutableHandlers)

const fn = () => console.log('effect fn')
let res = effect(fn, {})
console.log(Object.keys(res), 'after effect')

// 使用示例
let dummy
const counter = r({ num: 0 })
effect(() => (dummy = counter.num))
console.log(dummy, counter, 'before')
counter.num = 7
console.log(dummy, counter, 'after')

```

核心函数：

| 函数名                                                       | 功能                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `createGetter->get`                                          | 创建 proxy 的 get handler，里面会调用 track 收集依赖         |
| `createSetter->set`                                          | 创建 proxy 的 set handler，里面会调用 trigger 触发 targetMap>depsMap>dep:Set依赖执行 |
| `track(target, type, key)`                                   | 收集 target 对象或 target[key] 属性的依赖                    |
| `trigger(target, type, key?, newValue?, oldValue?, oldTarget?)` | 触发 target 对象的依赖调用                                   |
| `effect(fn, options)`                                        | 注册reactive属性的updater                                    |

涉及到的核心属性：

ReactiveEffect 类型定义：

```ts
export interface ReactiveEffect<T = any> {
  (...args: any[]): T
  _isEffect: true
  id: number
  active: boolean
  raw: () => T
  deps: Array<Dep>
  options: ReactiveEffectOptions
}
```



| 属性名          | 类型                    | 作用                                                         |
| --------------- | ----------------------- | ------------------------------------------------------------ |
| `activeEffect`  | `ReactiveEffect`        | 记录当前的 effect，在 `effect()`注册updater的时候置为当前的 RE，在 `get->track` 里面添加到 targetMap->depsMap->dep 中，且同时更新自己的 `activeEffect.deps.push(dep)` |
| `effectStack`   | `Array<ReactiveEffect>` | 存放所有的 `ReactiveEffect` 的数组，也就是说页面中所有的 `updater<ReactiveEffect>` 都是存在这里面。但是每个 updater 执行完之后就会被移出 `effectStack`，因为 `efffect()`调用里面有个 `try...finally` 无论结果如何都会被 pop 掉。 |
| `shouldTrack`   | `Boolean`               | 用来追踪当前 effect->activeEffect 的状态                     |
| `trackStack`    | `Array<Boolean>`        | 用来存放当前 effect 的 shouldTrack 状态值                    |
| `targetMap`     | `WeakMap`               | 存放被 reactive 对象依赖的 Map，即：每个 target 在 targetMap 里面有自己的一个 depsMap，里面以 target => <key, Set> 形式存在，key 表示 target 上的一个属性键，Set 存放了该 key 的所有依赖 dep。![](http://qiniu.ii6g.com/1589709260.png?imageMogr2/thumbnail/!100p)层级关系：targetMap:WeakMap -> depsMap:Map -> dep:Set |
| `depsMap`       | `Map`                   | target 对象里所有属性和其依赖对应的关系集合，如：counter.num 的依赖： `{ "num" => Set(1) }` |
| `reactiveToRaw` | `WeakMap`               | 作为 reactive 的第三个参数 toRaw，保存了 observed->target 关系的 WeakMap。 |
| `rawToReactive` | `WeakMap`               | 作为 reactive 的第二个参数 toProxy，保存了 target->observed 关系的 WeakMap，和 `reactiveToRaw` 刚好相反。 |
| `uid`           | `Number`                | 每个 effect 都有一个唯一的 id，一直递增。                    |

# 支持数组 reactive

在这之前都是在对象基础上做的测试，并没有增加数组的支持，比如：jest(所有测试用例都来自官方仓库) ->

```js
test('嵌套的 reactives', () => {
    const original = {
      nested: {
        foo: 1
      },
      array: [{ bar: 2 }]
    }

    const observed = reactive(original)
    expect(isReactive(observed.nested)).toBe(true)
    expect(isReactive(observed.array)).toBe(true)
    expect(isReactive(observed.array[0])).toBe(true)
  })
```

测试结果：

![](http://qiniu.ii6g.com/1589852337.png?imageMogr2/thumbnail/!100p)

也就是说做到现在，并不支持数组的 reactive，这也是这节将要完善的点。

1. 数组三个方法(`includes, indexOf, lastIndexOf`)的依赖收集：

   ```js
   // 数组三个方法的处理
   const arrayInstrumentations = {}
   // 兼容数组三个索引方法，收集他们相关的依赖
   ;['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
     arrayInstrumentations[key] = function (...args) {
       const arra = toRaw(this)
       for (let i = 0, l = this.length; i < l; i++) {
         track(arr, 'get', i + '')
       }
   
       // 使用原始方法执行一次(有可能是 reactive 的)
       const res = arr[key](...args)
       if (res === -1 || res === false) {
         // 如果结果失败，使用原始方法再执行一次
         return arr[key](...args.map(toRaw))
       } else {
         return res
       }
     }
   })
   ```

2. `createGetter -> get` 的时候增加数组支持：

   ```js
   function createGetter(isReadonly = false, shallow = false) {
     return function get(target, key, receiver) {
       const targetIsArray = Array.isArray(target)
       if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
         return Reflect.get(arrayInstrumentations, key, receiver)
       }
   
       // ...省略
     }
   }
   ```

   到这里，我们已经可以正常收集到数组的依赖了，测试代码：

   ```html
   <script type="module">
       import { reactive, effect, targetMap } from './packages/reactive.js'
       let n
       let arr = ['vue', 'reactive']
       const observed = reactive(arr)
       effect(() => (n = observed[0]))
     	// 这里还可以添加多个依赖，比如：effect(() => (m = observed[0]))
     	// 这样，targetMap>depsMap:arr>dep 里面就会有两个了 [f, f]
       console.log({n, targetMap})
   </script>
   ```

   输出结果：

   ![image-20200519095740412](/Users/simon/Library/Application Support/typora-user-images/image-20200519095740412.png)

   - `effect(() => (n = observed[0]))`会执行一次 `fn` ，即取了一次数组的 `0` 下标值，触发了 `get`
   - 检测到是数组进入数组依赖收集程序`arrayInstrumentations` ，触发 `track` 收集依赖

   🙆‍♂️，依赖咱收集到了，第三步就是如何去触发它们了 >>>>

3. 数组的 set->trigger 实际上已经支持了

   ```js
   // 触发 updater
   function trigger(target, type, key, newValue, oldValue, oldTarget) {
     // ...
   
     if (type === 'clear') {
       // ...
     } else if (key === 'length' && Array.isArray(target)) {
       // ...
     } else {
       // 如果是数组，传入 key 是索引值，会进入这个 if 进行依赖收集
       if (key !== void 0) {
         // 对象属性 deps
         add(depsMap.get(key))
       }
   
   	// ...
   
   }
   ```

   所以下面的示例：

   ```html
   <script type="module">
       import { reactive, effect, targetMap } from './packages/reactive.js'
       let n, m
       let arr = ['vue', 'reactive']
       const observed = reactive(arr)
       effect(() => (n = observed[0]))
       effect(() => (m = observed[0]))
       observed[0] = 'setter n'
       observed[1] = 'setter m'
       console.log({n, m, targetMap})
     </script>
   ```

   输出结果(set 数组元素值的时候出发了 dep 更新 n, m 的值)：

![](http://qiniu.ii6g.com/1589858380.png?imageMogr2/thumbnail/!100p)

4. 最后 jest 测试结果(失败...):
   原因是之前的 `createGetter`代码又有个问题，返回的时候检测结果的时候，递归 reactive 传递了 target，应该是 res 才对：

   ```js
   return res && typeof res === 'object'
         ? isReadonly
           ? readonly(target) // 修正：target -> res
           : reactive(target) // 修正：target -> res
         : res
   ```

   修正之后 jest 结果(:perfect)：

   >☁  vue-next-code-read [master] ⚡  jest
   >PASS  packages/__tests__/reactive/reactive.spec.js
   >reactivity/reactive
   >✓ Object (4 ms)
   >✓ 嵌套的 reactives (1 ms)
   >
   >Test Suites: 1 passed, 1 total
   >Tests:       2 passed, 2 total
   >Snapshots:   0 total
   >Time:        7.547 s
   >Ran all test suites.
   >☁  vue-next-code-read [master] ⚡



OK，数组的 reactive 完成。



----

## jest 测试：

```
☁  vue-next-code-read [master] ⚡  jest
FAIL  packages/__tests__/reactive/reactive.spec.js
reactivity/reactive
✓ Object (5 ms)
✓ 嵌套的 reactives (1 ms)
✓ observed value should proxy mutations to original (Object) (1 ms)
✓ setting a property with an unobserved value should wrap with reactive (1 ms)
✕ observing already observed value should return same Proxy (4 ms)
✕ should not pollute original object with Proxies (2 ms)
✕ unwrap
✓ should not unwrap Ref<T>
✓ should unwrap computed refs
✕ non-observable values (36 ms)
✕ markRaw
✕ should not observe frozen objects (1 ms)
shallowReactive
✕ should not make non-reactive properties reactive
✕ should keep reactive properties reactive
```



1. <font color="red">✕ observing already observed value should return same Proxy (4 ms)</font>
   这个是因为 `createReactiveObject()`里面判断的时候判断错误：

   ```js
   if (toRaw.has(observed)) { // 修正成：target
     return target
   }
   ```

   修改后测试通过。

2. <font color="red">✕ should not pollute original object with Proxies (5 ms)</font>
   修改：

   ```js
   function createSetter(shallow = false) {
     return function set(target, key, value, receiver) {
       // 新增判断，如果是递归 reactive 设置的时候取原始值去传递给 reflect
       if (!shallow) {
         // 比如：value 如果是 Observed，那么从 reactiveToRaw 中取 proxy 
         // 之前的那个 target 出来，给 reflect
         value = toRaw(value)
         // TODO !shallow is ref
       }
   
       // const res = Reflect.set(...arguments)
       // 这里就不能直接 ...arguments 了，都将最新的 value 传递下去
       const res = Reflect.set(target, key, value, receiver)
   }
   ```

   修改后测试通过。

3. <font color="red">✕ unwrap</font>
   是因为没有导出 `toRaw` 函数导致的，导入下就好了。

4. <font color="red">✕ non-observable values (8 ms)</font>
   需要改些下测试用例：源码里面加了 expect -> toHaveBeenWarnedLast 为了更友好的提示。

   ```js
   /// 修改后：
   expect(reactive(1)).toBe(1)
   expect(reactive('foo')).toBe('foo')
   expect(reactive(false)).toBe(false)
   expect(reactive(null)).toBe(null)
   expect(reactive(undefined)).toBe(undefined)
   const s = Symbol()
   expect(reactive(s)).toBe(s)
   ```

5. <font color="red"> ✕ markRaw</font>
   在 `createReactiveObject()` 中增加 `canObserve(target)` 检测解决，因为检测中就有一项 `rawValues.has(value)`

6. <font color="red">✕ should not observe frozen objects (1 ms)</font>
   在 `createReactiveObject()` 中增加 `canObserve(target)` 检测解决。

7. <font color="red">✕ should not make non-reactive properties reactive</font>
   没导出 `shallowReactive`。

8. <font color="red">✕ should keep reactive properties reactive</font>

   ```js
   // 粗心的锅，这个写反了
   const shallowSet = createGetter(false, true)
   const shallowGet = createSetter(true)
   
   // 修正：
   const shallowSet = createSetter(true)
   const shallowGet = createSetter(false, true)
   ```

修正上述问题之后 jest 结果：

```
vue-next-code-read [master] ⚡  jest
PASS  packages/__tests__/reactive/reactive.spec.js
reactivity/reactive
✓ Object (6 ms)
✓ 嵌套的 reactives
✓ observed value should proxy mutations to original (Object) (1 ms)
✓ setting a property with an unobserved value should wrap with reactive (1 ms)
✓ observing already observed value should return same Proxy
✓ should not pollute original object with Proxies (1 ms)
✓ unwrap
✓ should not unwrap Ref<T> (1 ms)
✓ should unwrap computed refs
✓ non-observable values (2 ms)
✓ markRaw (1 ms)
✓ should not observe frozen objects (1 ms)
shallowReactive
✓ should not make non-reactive properties reactive
✓ should keep reactive properties reactive

Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        6.436 s
Ran all test suites.
```

<span id="code1">阶段代码链接 [reactive_with_array.js](https://github.com/gcclll/vue-next-code-read/blob/master/bakups/reactive_with_array.js)  代码</span>

# handlers续(baseHandlers 的 delete, has, ownKeys)

前面完成了 `proxy-set` 和 `proxy-get`，这节继续完成其他的 `proxy`，包含：

1. `deleteProperty(target, key)`
2. `ownKeys(target)`
3. `has(target, key)`

## delete

在之前实现的基础上 [reactive.js](https://github.com/gcclll/vue-next-code-read/blob/master/bakups/reactive_with_array.js) 增加 delete proxy，这之前先来看下现有的功能是否支持 delete 操作。

```js
const target = { foo: 1, bar: 2 }
const n = reactive(target)
let dum
effect(() => {
console.log('updating...')
dum = n.bar
})
/* console.log(targetMap.get(target), dum, 'map') */
console.log({ dum }, 'before')
delete n.bar  // code 1
// n.bar = 3 // code2
console.log({ dum }, 'after')
```

这里先注册一个 updater，后面通过更新 `n.bar` 值，来触发 updater，结果：

>updating...
>{dum: 2} "before"
>updating...
>{dum: 3} "after"

结果如我们所料，然后把 code1 放开，注释掉 code2，理论上也会触发 updater：

>updating...
>{dum: 2} "before"
>{dum: 2} "after"

实际结果非我们所料，因为还没实现......

接下来看下要实现 delete proxy 需要哪些步骤 >>>>>>

1. 声明  delete proxy handler : `deleteProperty`

   ```js
   // delete proxy
   function deleteProperty(target, key) {
     const hadKey = target.hasOwnProperty(key)
     const oldValue = target[key]
     // 操作先执行下去
     const result = Reflect.deleteProperty(target, key)
     // 如果执行成功且自身存在该属性，排除原型链操作
     if (result && hadKey) {
       // 直接触发 updaters
       trigger(target, 'delete', key, undefined, oldValue)
     }
     return result // 不能丢，必须反馈删除结果 boolean
   }
   ```

2. 加入到`mutableHandlers` 

   ```js
   const mutableHandlers = {
     get,
     set,
     deleteProperty
   }
   ```

只要经过上面简单的两步就实现了 `delete` 操作代理，但执行结果却报错了(明明和源码一样啊，悲催〒▽〒!!!)

![](http://qiniu.ii6g.com/1590046965.png?imageMogr2/thumbnail/!100p)

从输出可以看到， delete 操作确实触发了 updater，最后 `dum: undefined` 也证明了这点。

至于报错...，(⊙o⊙)…，(⊙o⊙)…，少了个 `return result` 将删除操作结果返回。

## has

```js
function has(target, key) {
  const result = Reflect.has(target, key)
  track(target, 'has', key)
  return result
}
```

更新 mutableHandlers:

```js
const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has
}
```

测试：

```js
const target = { foo: 1, bar: 2 }
const n = reactive(target)
let dum, has
const updater = () => {
  console.log('updating...')
  dum = 'bar' in n
}
effect(updater)

const dep = targetMap.get(target).get('bar')
for (let fn of dep) {
  console.log(fn.raw, fn.raw === updater, 'deps')
}
console.log({ dum }, 'before')
n.bar = 3
console.log({ dum }, 'after')
```

结果：

1. `'bar' in n` 收集依赖 `updater`
2. `n.bar = 3` 触发 `ownKeys` 收集到的 `updater`

>updating...
>() => {
>console.log('updating...')
>dum = 'bar' in n
>} true "deps"
>{dum: true} "before"
>updating...
>{dum: true} "after"

## ownKeys

```js
function ownKeys(target) {
  track(target, 'iterate', ITERATE_KEY)
  return Reflect.ownKeys(target)
}
```

更新 mutableHandlers:

```js
const mutableHandlers = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}
```

注意 `ownKeys` 的实现里使用到 了一个 Symbol: ITERATE_KEY，开始一直不明白 `trigger` 里为啥会用到这个去 `depsMap.get(ITERRATE_KEY)`，这里应该明白是怎么回事了，就是针对对象的迭代器操作的时候，使用到 `ownKeys`，需要对该操作收集依赖，那么就需要有个唯一的 key 去设置 `targetMap, depsMap`，这里的 `ITERATE_KEY` 就是这个作用，用它来收集(track)对象迭代操作的所有依赖，然后通过 trigger 里面查找这个符号值去取所有 updaters。

测试：

```js
const target = { foo: 1, bar: 2 }
const n = reactive(target)
let dum, has
const updater = () => {
  console.log('updating...')
  dum = Object.keys(n) // 触发依赖收集
}
effect(updater)

const dep = targetMap.get(target).get(ITERATE_KEY)
for (let it of dep) {
  console.log(it.raw, it.raw === updater, 'deps')
}

console.log(dum, 'before')
n.bar = 3 // 触发 updaters
console.log(dum, 'after')
```

结果：

>updating...
>{foo: 1, bar: 2} "own keys"
>() => {
>console.log('updating...')
>dum = Object.keys(n)
>} true "deps"
>(2) ["foo", "bar"] "before"
>(2) ["foo", "bar"] "after"

但是发现并没有触发 updaters。

trigger 里面加打印结果：

```js
// 非数组的删除或添加操作
const isAddOrDelete =
      type === 'add' || (type === 'delete' && !Array.isArray(target))

console.log({ type, key }, target instanceof Map)
// 对象的属性的新增和删除，或者 Map 类型的 set 操作
if (isAddOrDelete || (type === 'set' && target instanceof Map)) {
  add(depsMap.get(Array.isArray(target) ? 'length' : ITERATE_KEY))
}
```

输出 `{type: "set", key: "foo"} false` 说明确实有触发 `trigger`，但是条件：

`if (isAddOrDelete || (type === 'set' && target instanceof Map))`

阻止了它进入 `add` 收集 `ITERATE_KEY` 对应的依赖，因为 target 不是 Map 类型。

**TODO 为啥会这样？？？？？？？**

## jest 测试

```
☁  vue-next-code-read [master] ⚡  jest
PASS  packages/__tests__/reactive/reactive.spec.js
FAIL  packages/__tests__/reactive/effect.spec.js
● reactivity/effect › should observe iteration

expect(received).toBe(expected) // Object.is equality

Expected: "Hello World!"
Received: "Hello"

161 |     expect(dummy).toBe('Hello')
162 |     list.push('World!')

  > 163 |     expect(dummy).toBe('Hello World!')
  >  |                   ^
  > 164 |     list.shift()
  > 165 |     expect(dummy).toBe('World!')
  > 166 |   })

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:163:19)

● reactivity/effect › should observe implicit array length changes

  expect(received).toBe(expected) // Object.is equality

  Expected: "Hello World!"
  Received: "Hello"

    173 |     expect(dummy).toBe('Hello')
    174 |     list[1] = 'World!'

  > 175 |     expect(dummy).toBe('Hello World!')
  >  |                   ^
  > 176 |     list[3] = 'Hello!'
  > 177 |     expect(dummy).toBe('Hello World!  Hello!')
  > 178 |   })

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:175:19)

● reactivity/effect › should observe enumeration

  expect(received).toBe(expected) // Object.is equality

  Expected: 7
  Received: 3

    203 |     expect(dummy).toBe(3)
    204 |     numbers.num2 = 4

  > 205 |     expect(dummy).toBe(7)
  >  |                   ^
  > 206 |     delete numbers.num1
  > 207 |     expect(dummy).toBe(4)
  > 208 |   })

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:205:19)

● reactivity/effect › should not observe well-known symbol keyed properties

  expect(received).toBe(expected) // Object.is equality

  Expected: undefined
  Received: true

    234 |     array[key] = true
    235 |     expect(array[key]).toBe(true)

  > 236 |     expect(dummy).toBe(undefined)
  >  |                   ^
  > 237 |   })
  > 238 |
  > 239 |   it('should observe function valued properties', () => {

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:236:19)

● reactivity/effect › should observe json methods

  expect(received).toBe(expected) // Object.is equality

  Expected: 1
  Received: undefined

    523 |     })
    524 |     obj.a = 1

  > 525 |     expect(dummy.a).toBe(1)
  >  |                     ^
  > 526 |   })
  > 527 |
  > 528 |   it('should observe class method invocations', () => {

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:525:21)

● reactivity/effect › scheduler

  expect(jest.fn()).toHaveBeenCalledTimes(expected)

  Expected number of calls: 1
  Received number of calls: 0

    573 |     // should be called on first trigger
    574 |     obj.foo++

  > 575 |     expect(scheduler).toHaveBeenCalledTimes(1)
  >  |                       ^
  > 576 |     // should not run yet
  > 577 |     expect(dummy).toBe(1)
  > 578 |     // manually run

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:575:23)

● reactivity/effect › events: onTrack

  expect(jest.fn()).toHaveBeenCalledTimes(expected)

  Expected number of calls: 3
  Received number of calls: 0

    598 |     )
    599 |     expect(dummy).toEqual(['foo', 'bar'])

  > 600 |     expect(onTrack).toHaveBeenCalledTimes(3)
  >  |                     ^
  > 601 |     expect(events).toEqual([
  > 602 |       {
  > 603 |         effect: runner,

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:600:21)

● reactivity/effect › events: onTrigger

  expect(jest.fn()).toHaveBeenCalledTimes(expected)

  Expected number of calls: 1
  Received number of calls: 0

    637 |     obj.foo++
    638 |     expect(dummy).toBe(2)

  > 639 |     expect(onTrigger).toHaveBeenCalledTimes(1)
  >  |                       ^
  > 640 |     expect(events[0]).toEqual({
  > 641 |       effect: runner,
  > 642 |       target: toRaw(obj),

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:639:23)

● reactivity/effect › stop

  TypeError: (0 , _reactive2.stop) is not a function

    667 |     obj.prop = 2
    668 |     expect(dummy).toBe(2)

  > 669 |     stop(runner)
  >  |     ^
  > 670 |     obj.prop = 3
  > 671 |     expect(dummy).toBe(2)
  > 672 |

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:669:5)

● reactivity/effect › stop with scheduler

  expect(received).toBe(expected) // Object.is equality

  Expected: 1
  Received: 2

    689 |     )
    690 |     obj.prop = 2

  > 691 |     expect(dummy).toBe(1)
  >  |                   ^
  > 692 |     expect(queue.length).toBe(1)
  > 693 |     stop(runner)
  > 694 |

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:691:19)

● reactivity/effect › events: onStop

  TypeError: (0 , _reactive2.stop) is not a function

    704 |     })
    705 |

  > 706 |     stop(runner)
  >  |     ^
  > 707 |     expect(onStop).toHaveBeenCalled()
  > 708 |   })
  > 709 |

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:706:5)

● reactivity/effect › stop: a stopped effect is nested in a normal effect

  TypeError: (0 , _reactive2.stop) is not a function

    714 |       dummy = obj.prop
    715 |     })

  > 716 |     stop(runner)
  >  |     ^
  > 717 |     obj.prop = 2
  > 718 |     expect(dummy).toBe(1)
  > 719 |

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:716:5)

● reactivity/effect › should trigger all effects when array length is set 0

  expect(received).toBe(expected) // Object.is equality

  Expected: 3
  Received: 1

    773 |
    774 |     observed.unshift(3)

  > 775 |     expect(dummy).toBe(3)
  >  |                   ^
  > 776 |     expect(record).toBe(3)
  > 777 |
  > 778 |     observed.length = 0

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:775:19)

Test Suites: 1 failed, 1 passed, 2 total
Tests:       13 failed, 49 passed, 62 total
Snapshots:   0 total
Time:        2.917 s, estimated 3 s
Ran all test suites.
```

全是失败啊！！！

还是老老实实的一个个来解决吧......

1. <font color="red">● reactivity/effect › should observe iteration</font>

   数组操作失败，push 的时候没有触发 updater。

   示例：

   ```js
   const list = reactive(['Hello'])
   let dummy
   effect(() => {
     console.log('updating....')
     dummy = list.join(' ')
   })
   console.log(targetMap, 'dep')
   console.log(dummy, '1')
   list[0] = 'hello'
   /* list.push('World!') */
   console.log(dummy, '2')
   ```

   结果(直接索引赋值是生效的，那么为啥 push 没用？？？)：

   >updating....
   >test.html:20 WeakMap {Array(1) => Map(3)} "dep"
   >test.html:21 Hello 1
   >test.html:17 updating....
   >test.html:24 hello 2

   在 `list.push('World!')` 处打个断点：

   先触发的是`list` 的 get push :

   ![](http://qiniu.ii6g.com/1590068611.png?imageMogr2/thumbnail/!100p)

   然后再是触发的 length get

   ![](http://qiniu.ii6g.com/1590068464.png?imageMogr2/thumbnail/!100p)

   触发 key: 1 的 updater，但最后没有任何依赖被发现？？？

   ![](http://qiniu.ii6g.com/1590068984.png?imageMogr2/thumbnail/!100p)

   ![](http://qiniu.ii6g.com/1590069039.png?imageMogr2/thumbnail/!100p)

   看最后的图发现问题，首先，数组就一个元素，长度为1，最大索引为0，在 push 之后，长度为2，最大索引为1，也就是说这个新的索引即新的 key，属于新增属性操作，应该要走到 trigger:add ，但是实际走了 trigger:set 里面去了。

   问题就在 `if(!target.hasOwnProperty(key))` 这一行，它不应该取 `Reflect.set(...)` 之后的 target 因为这是更新之后的，肯定有 key: 1了。

   修改： 

   在 `Reflect.set(...)` 之前先 `hadKey = target.hasOwnProperty(key)` 然后使用缓存的 `hadKey` 进行判断 `if(!hadKey) {...}`。

   修改之后测试通过：

   >☁  vue-next-code-read [master] ⚡  jest
   >PASS  packages/__tests__/reactive/reactive.spec.js
   >PASS  packages/__tests__/reactive/effect.spec.js
   >
   >Test Suites: 2 passed, 2 total
   >Tests:       26 passed, 26 total
   >Snapshots:   0 total
   >Time:        7.645 s
   >Ran all test suites.

2. <font color="red">● reactivity/effect › should not observe well-known symbol keyed properties</font>

   js 内置的符号属性，不能被 observe，这是因为 `createGetter` 里面还没完成 `Symbol` 类型的检测，下面加上就OK了。

   需要增加以下内容：

   ```js
   // 1. 符号类型检测
   const isSymbol = (val) => typeof val === 'symbol'
   
   // 2. Symbol 上的所有符号属性
   const builtInSymbols = new Set(
     Object.getOwnPropertyNames(Symbol)
       .map(key => (Symbol)[key])
       .filter(isSymbol)
   )
   
   // 3. createGetter中增加判断
   function createGetter(...arg) {
     // ...
     
     if (isSymbol(key) && builtInSymbols.has(key) || key === '__proto__') {
       return res
     }  
     
     // ....
   }
   
   ```

   重测 jest 通过。

3. <font color="red">● reactivity/effect › scheduler</font>
   真怀疑当时自己是故意的，尽是些地级错误（捂脸，🤦‍♀️，(*/ω＼*)）！！！

   ```js
   // 修改前：
   // if (effect.options && effect.options.shecduler) {
   // 修改后：
   if (effect.options && effect.options.scheduler) {
   ```

4. <font color="red">● reactivity/effect › events: onTrack</font>

5. <font color="red">● reactivity/effect › events: onTrigger</font>

   两个是在 __DEV__ 模式下才会执行的，没有完成，现在给加上去吧。

   Track 里面，在 if dep.has 最后面增加统计事件 onTrack：

   ```js
   function track(target, type, key) {
    // ...
     if (!dep.has(activeEffect)) {
       // ...
       if (__DEV__ && activeEffect.options && activeEffect.options.onTrack) {
         activeEffect.options.onTrack({
           effect: activeEffect,
           target,
           type,
           key
         })
       }
     }
   }
   ```

   Trigger 里面，在执行 updaters 的开头增加 onTrigger 事件：

   ```js
   function trigger(target, type, key, newValue, oldValue, oldTarget) {
     // ...
   
     const run = (effect) => {
       const hasOpt = !!effect.options
       if (__DEV__ && hasOpt && effect.options.onTrigger) {
         effect.options.onTrigger({
           effect,
           target,
           key,
           type,
           newValue,
           oldValue,
           oldTarget
         })
       }
       // ...
     }
   }
   ```

   加完，jest 通过。

6. <font color="red">● stop</font>
   增加 stop 函数，停止 effect 行为，主要通过 effect.active，清理 effect.deps 来控制，阻止触发 deps。

   ```js
   function stop(effect) {
     if (effect.active) {
       cleanup(effect)
       if (effect.options && effect.options.onStop) {
         effect.options.onStop()
       }
       effect.active = false
     }
   }
   ```

到此 `effect.spec.ts` 中除了 `ref` 有关的测试用例全部测试通过，

![](http://qiniu.ii6g.com/1590139513.png?imageMogr2/thumbnail/!100p)

下面来逐个分析 >>> go go go...

## 测试用例结果分析

通过运行 `jest --verbose` 将所有用例测试结果列出：

- <font color="green">✓ should run the passed function once (wrapped by a effect) (4 ms)</font>

  ```js
  it('should run the passed function once (wrapped by a effect)', () => {
      const fnSpy = jest.fn(() => {})
      effect(fnSpy) // effect() 实现里面，如果没有传 options.lazy 就会立即执行一次
      expect(fnSpy).toHaveBeenCalledTimes(1) // 因此这里 fnSpy 会被调用一次
    })
  ```

- <font color="green">✓ should observe basic properties (1 ms)</font>

  ```js
  it('should observe basic properties', () => {
      let dummy
      const counter = reactive({ num: 0 })
      // updater: dummy = counter.num
      // 被立即调用， dummy = 0
      // 由于 counter.num 触发 trigger:get ，收集dep: 'num'->Set(1): updater
      effect(() => (dummy = counter.num)) 
  
      expect(dummy).toBe(0) // true
      counter.num = 7 // 赋值，trigger: set 触发 updater，赋值 dummy
      expect(dummy).toBe(7) // true
    })
  
  ```

- <font color="green">✓ should observe multiple properties</font>

  ```js
  it('should observe multiple properties', () => {
      let dummy
      // obj ={num1: 0, num2: 0}
      const counter = reactive({ num1: 0, num2: 0 })
      // updater: ...
      // updater 被立即调用，counter 的 num1, num2 被访问，分别触发他们的 trigger:get
      // 收集依赖，三次访问，三次收集同一个 updater
      // 由于 targetMap -> depsMap -> dep: new Set() 是个集合类型
      // 因此虽然是三次访问，但收集的都是 updater，因此每个 dep 里面保存的是同一个 updater
      effect(() => (dummy = counter.num1 + counter.num1 + counter.num2))
  
      expect(dummy).toBe(0) // 首次调用 updater 时候赋值了 0 + 0 + 0 = 0
    	// 这里先后赋值了 num1, num2，触发了两次 updater
    	// first: 0 + 0 + 7
    	// second: 7 + 7 + 7 = 21
    	// 测试如下面的示例代码
      counter.num1 = counter.num2 = 7 
      expect(dummy).toBe(21) // true
    })  
  
  ```

  测试代码：

  ```js
  let dummy,
      n = 0
  const counter = reactive({ num1: 0, num2: 0 })
  effect(() => (n++, (dummy = counter.num1 + counter.num1 + counter.num2)))
  
  console.log({ dummy, n }, 1)
  counter.num1 = counter.num2 = 7
  console.log({ dummy, n }, 2)
  ```

  结果图示：

  ![](http://qiniu.ii6g.com/1590139770.png?imageMogr2/thumbnail/!100p)

  1. depsMap 有两个 map，分别是 num1, num2，
  2. trigger: set 触发了两次，且 num2 先触发 num1 紧随其后，因为赋值操作是从右到左的顺序进行。    

- <font color="green">✓ should handle multiple effects (1 ms)</font>

  ```js
  it('should handle multiple effects', () => {
    let dummy1, dummy2
    const counter = reactive({ num: 0 })
    effect(() => (dummy1 = counter.num)) // 收集 updater1，执行一次，dummy1  = 0
    effect(() => (dummy2 = counter.num)) // 收集 updater2, 执行一次，dummy2 = 0
  
    expect(dummy1).toBe(0) // true 
    expect(dummy2).toBe(0) // true
    // trigger:set 取出 targetMap-depsMap-num:dep:Set(2) 即 updater1, updater2
    // 执行 updaters 之后，重新复制dummy1, dummy2 = 1
    counter.num++ 
    expect(dummy1).toBe(1) // true
    expect(dummy2).toBe(1) // true
  })
  ```

- <font color="green"> ✓ should observe nested properties (1 ms) </font>

  ```js
  it('should observe nested properties', () => {
    let dummy
    // 嵌套的 reactive 是在 createReativeObject 里面完成的
    // 在最后 return 结果的时候检测了是否是 isObject ，如果是进一步检测
    // isReadonly 与否，非只读返回 reactive(res) 对结果递归调用一次
    // 前提是没有设置shallow 标志，该标识表明只对目前的对象只做浅reactive
    // 即只做对象的一级响应式，里面嵌套的对象原样返回。
    // 这里调用的是 reactive 显然是递归 reactive 的。
    // obj = { nested: {num: 0 }}
    const counter = reactive({ nested: { num: 0 } })
    // 这里会触发两次 getter，一次是 counter.nested，一次是 nested.num
    // targetMap{ obj -> map, nested -> map } 存放了两个对象的映射
    // obj:map -> 'nested':Set(1), nested:map -> 'num':Set(1)
    // Set(1) 都是下面的 updater
    effect(() => (dummy = counter.nested.num)) 
  
    expect(dummy).toBe(0) // true
    counter.nested.num = 8 // 只会触发 'num':Set(1)
    expect(dummy).toBe(8) // true
  })
  ```

  转测试代码结果：

  ```js
  let dummy
  const counter = reactive({ nested: { num: 0 } })
  effect(() => (dummy = counter.nested.num))
  
  console.log({ dummy }, 1)
  counter.nested.num = 7
  console.log({ dummy }, 2)
  ```

  

  ![](http://qiniu.ii6g.com/1590118132.png?imageMogr2/thumbnail/!100p)

  ​	

      1.	Loc1 : 访问 counter.nested 收集的 `{counter:{nested:{num:0}}} -> Map{'nested' -> Set(1)}` 依赖。
      2.	Loc2: 访问 nested.num 收集的 {num:7}->Map{'num'->Set(1)} 依赖。
      3.	Loc2: 注意看这里，当给 counter.nested.num = 7 赋值的时候只会触发 'num' -> Set(1)。



- <font color="green"> ✓ should observe delete operations (1 ms)</font>

  ```js
  it('should observe delete operations', () => {
    let dummy
    const obj = reactive({ prop: 'value' })
    effect(() => (dummy = obj.prop)) // 收集依赖 updater
  
    expect(dummy).toBe('value') // true
    // 对象属性的删除操作，只会触发 trigger 里面的 if (key !== void 0) 收集依赖进 effects: []
    delete obj.prop // 触发 updater 重新复制 dummy: undefined
    expect(dummy).toBe(undefined) // true
  })
  ```

- <font color="green"> ✓ should observe has operations (1 ms)</font>

- <font color="green">✓ should observe properties on the prototype chain (9 ms)</font>

  ```js
  t('should observe properties on the prototype chain', () => {
      let dummy
      const counter = reactive({ num: 0 })
      const parentCounter = reactive({ num: 2 })
      Object.setPrototypeOf(counter, parentCounter)
      effect(() => (dummy = counter.num))// 收集 updater
  
      expect(dummy).toBe(0) // true
    	// 这里删除操作触发 deleteProperty proxy handler
    	// trigger: delete -> run deps -> 触发 updater
    	// 由于 updater 里面访问了 counter.num ，而 counter 自身的 num 在这时候已经被删除了
    	// 注意：deletePropery 里面是先执行了 Reflect.deleteProperty(...) 
    	// 然后再触发的 trigger:delete的，因此在 updater 执行的时候 counter.num 已经不存在
    	// 但是根据对象属性的访问原理，会去检查原型链上父级对象的，最后会找到 parentCounter.num
    	// 然后取出它的值：num: 2 赋值给 dummy，所以下面 dummy toBe(2) 为 true
      delete counter.num
      expect(dummy).toBe(2)
    	// 这里改变 parent num 时候也会触发 updater
    	// 是因为上面的 delete 操作导致去检查了原型链，访问了 parentCounter.num ，这个时候
    	// 也相当于触发了  parentCounter.num 的 get ，收集了 updater
      parentCounter.num = 4
      expect(dummy).toBe(4) // true
    	// 这里重新复制，触发 counter.num 的 set(createSetter)，
    	// 检测到自身没有该属性(在Reflect.set()之前)
    	// 然后触发 trigger:add 增加属性的操作
    	// 在 trigger 里面，触发之前收集到的 updater
      // (注意：counter.num 的 dep 这个时候并没有被移除的)
      counter.num = 3
      expect(dummy).toBe(3)
    })
  
  ```

- <font color="green">✓ should observe has operations on the prototype chain</font>

- <font color="green">✓ should observe inherited property accessors (2 ms)</font>

  访问器属性也是一样的道理。

- <font color="green">✓ should observe function call chains (1 ms)</font>

- <font color="green">✓ should observe iteration (1 ms)</font>

- <font color="green">✓ should observe implicit array length changes</font>

- <font color="green">✓ should observe sparse array mutations (1 ms)</font>

- <font color="green">✓ should observe enumeration (2 ms)</font>

- <font color="green">✓ should observe symbol keyed properties (2 ms)</font>

- <font color="green">✓ should not observe well-known symbol keyed properties (2 ms)</font>

  已知的符号属性，在 `createReactiveObject` 里面就被过滤掉了

  `if (isSymbol(res) && builtInSymbols.has(res) || res === '__proto__')`。

- <font color="green">✓ should observe function valued properties (1 ms)</font>

- <font color="green">✓ should observe chained getters relying on this (1 ms)</font>

- <font color="green">✓ should observe methods relying on this (1 ms)</font>

- <font color="green">✓ should not observe set operations without a value change (1 ms)</font>

  值没发生变化的时候不会重复触发 udpaters，`createSetter` 里面就已经有了判断：

  `if (value !== oldValue && (value === value || oldValue === oldValue))`

  值没变不会 trigger: set，后面的是为了过滤掉 `NaN` 的情况。

- <font color="green">✓ should not observe raw mutations (1 ms)</font>

  `toRaw` 就是将 `observed` 转成原始的那个对象，就不再是响应式的了，当然不会有啥作用。

- <font color="green">✓ should not be triggered by raw mutations</font>

  同上。

- <font color="green">✓ should not be triggered by inherited raw setters (1 ms)</font>

  同上。

- <span id="test-case-rloops"><font color="green">✓ should avoid implicit infinite recursive loops with itself (1 ms)</font></span>

  ```js
  const counter = reactive({ num: 0 })
  let n = 0
  const counterSpy = () => {
    n++
    counter.num++
  }
  effect(counterSpy)
  
  console.log(counter, n, '1')
  counter.num = 4
  console.log(counter, n, '2')
  ```

  运行结果：

  >// 这里是 updater 里面的 counter.num++ 触发的get
  >
  >{num: 0} {type: "get", key: "num", shouldTrack: true, activeEffect: ƒ} "track"
  >
  >// 因为 counter.num++ 触发的 set
  >
  >Map(1) {"num" => Set(1)} {type: "set", key: "num", newValue: 1, oldValue: 0} "trigger"
  >Proxy {num: 1} 1 "1" // log
  >
  >// 赋值操作引发的 trigger:set
  >
  >Map(1) {"num" => Set(1)} {type: "set", key: "num", newValue: 4, oldValue: 1} "trigger"
  >
  >// set 触发了updater -> trigger:get 
  >
  >{num: 4} {type: "get", key: "num", shouldTrack: true, activeEffect: ƒ} "track"
  >
  >// counter.num++ -> trigger:set
  >
  >Map(1) {"num" => Set(1)} {type: "set", key: "num", newValue: 5, oldValue: 4} "trigger"
  >Proxy {num: 5} 2 "2"

  好像没发现哪里拦截了，但是通过下面的例子，确实又会死循环：

  ```js
  let dummy
  
  const counter = {
    num: 0
  }
  
  let ob
  function update() {
    // ob.num = ob.num + 1
    dummy = ob.num++
    console.log({ dummy }, ob)
  }
  
  ob = new Proxy(counter, {
    set(target, key, value, receiver) {
      const res = Reflect.set(...arguments)
      update()
      return res
    },
    get(target, key, receiver) {
      return Reflect.get(...arguments)
    }
  })
  
  ob.num = 2
  
  ```

  node 运行之后：

  >/Users/simon/github/vuejs/vue-next-code-read/test/test.js:10
  >dummy = ob.num++
  > ^
  >
  >RangeError: Maximum call stack size exceeded

  所以肯定还是有哪里做了处理，防止死循环。

  经过一通 `console.log` 之后发现关键点就在 `trigger` 的 `add` 函数里面，它在查找依赖添加到将要执行的 `effects` 集合中的时候有两个前提条件：

  1. `!shouldTrack`
  2. `effect !== activeEffect`

  ![](http://qiniu.ii6g.com/1590131447.png?imageMogr2/thumbnail/!100p)

  图中输出的主要关键点在<font color="red" size="5">红色</font> 部分，这里检测到正在 `add` 的 `effect` 与当前激活状态的 `activeEffect` 是同一个所以结束触发 `trigger:set`，但是为什么 `shouldTrack = true` 且 `effect === activeEffect`呢？？？

  那么就要回头去看 `effect()` 的具体实现了，重点在 `try...finally`。

  ```js
  try {
    enableTracking()
    effectStack.push(_effect)
    activeEffect = _effect // 这里的 _effect 就是在 trigger 里用来与 activeEffect 比较的
    console.log({ ..._effect }, 'effect 1')
    return fn(...args) // trigger set 检测 shouldTrack 和 activeEffect
  } finally {
    effectStack.pop()
    // 而 shouldTrck 和 activeEffect 重置工作在这里，因此阻止了 fn 里面 ++ 操作引起的死循环
    // 因为 trigger -> add 需要检测 if (!shouldTrack || effect !== activeEffect)
    // 才会将找到的 dep:updater 加入到 run 要执行的 effects: [] 中去
    resetTracking() 
    activeEffect = effectStack[effectStack.length - 1]
    console.log({ ..._effect }, 'effect 2')
  }
  ```

  这段代码含义如下：

  1. 当执行 `effect(updater)` 时，执行上面的一段代码。

  2. `enableTracking()`  只要知道它是将 `shouldTrack = true` 了。

  3. 接下来缓存，赋值 effect

  4. 重点来了，执行 updater，这里执行的 updater里面是 `counter.num++` 会依次触发 `get` -> `set`

     Get 就是收集依赖，同一个 updater 只会有一个 (`Set(1)`)。

     Set 这里会触发 trigger:set 那么这里会检测 shouldTrack 和 activeEffect，但是这个时候两者的值并没有重置，也就是说告诉 trigger， `effect(updater)` 我还没执行完呢，你不能重复 trigger:set，但是我什么时候才能继续 trigger呢？？？这就是下面第5条该做的事情了。

  5. finally 在 udpater 首次执行完成之后恢复shouldTrack 和activeEffect的值，从而继续完成 `effect(updater)` 的任务直到 `finally` 的代码执行完毕。

  即这个问题的关键点在于 4和5，正是这里的逻辑防止了 updater 里面导致 set 死循环。

- <font color="green">✓ should allow explicitly recursive raw function loops (1 ms)</font>

  ```js
  it('should allow explicitly recursive raw function loops', () => {
      const counter = reactive({ num: 0 })
      const numSpy = jest.fn(() => {
        counter.num++
        if (counter.num < 10) {
          numSpy()
        }
      })
      effect(numSpy)
      expect(counter.num).toEqual(10)
      expect(numSpy).toHaveBeenCalledTimes(10)
    })
  ```

  有了前面一个测试用例的分析，这里的原理就一目了然了。

  首先 `counter.num++` 还是会因为 `effect(updater)` 没有完全结束而中断，只会执行一次 +1 操作。

  紧跟着的 `if` 相当于在 `try { return fn(...args) } }` 返回结果之前又调用了下自己，也就是说 num+1 会执行知道 `num = 10` ，所以最后结果是 `num=10`, updater 被调用了 10，才进入了 `effect -> finally` 结束当前的 `effect()`。

- <font color="green">✓ should avoid infinite loops with other effects (1 ms)</font>

  原理如上上。

- <font color="green">✓ should return a new reactive version of the function (1 ms)</font>

  因为 `effect(fn)` 最终都会被封装成 `ReactiveEffect` 类型的对象，所以肯定不相等了。

- <font color="green">✓ should discover new branches while running automatically (1 ms)</font>

- <font color="green">✓ should discover new branches when running manually (1 ms)</font>

  这两个原理都一样，在于 `?:` 执行的时候根据条件的真假是否有触发 `get`。

- <font color="green">✓ should not be triggered by mutating a property, which is used in an inactive branch (1 ms)</font>

- <font color="green">✓ should not double wrap if the passed function is a effect (1 ms)</font>

  `function effect(fn)` 的第一句就是为了防止这种情况发生，检测是不是 `_isEffect` ，是的话会将 `fn = fn.raw` 提取出来。 

- <font color="green">✓ should not run multiple times for a single mutation (1 ms)</font>

- <font color="green">✓ should allow nested effects (4 ms)</font>

  不管嵌套不嵌套只要 `effect` 完整执行完成，就能顺利的进行下一个 `effect()`。

- <span id="test-case-json"> <font color="green">✓ should observe json methods</font></span>

  ```js
  let dummy = {}
  const obj = reactive({})
  effect(() => {
    dummy = JSON.parse(JSON.stringify(obj))
  })
  
  console.log(targetMap, dummy, 'before')
  /* obj.a = 1 */
  /* console.log(targetMap, dummy, 'after') */
  ```

  注释最后两行，看输出

  ![](http://qiniu.ii6g.com/1590134578.png?imageMogr2/thumbnail/!100p)

  注意这里的一个迭代器为 key 的 dep，也就是 `JSON.stringify(obj)` 的时候说明有对 obj 进行遍历(迭代器操作，触发了 `ownKeys` proxy handler)。

  去看下 https://tc39.es/ecma262/ `JSON.stringify` 实现原理：

  >最后一步： Return ? [SerializeJSONProperty](https://tc39.es/ecma262/#sec-serializejsonproperty)(state, the empty String, wrapper). 进入到 SerializeJSONProperty
  >
  >Step2: 检测到是对象会去取它 的 `toJson` 值，这也就是为什么 最后收集到的依赖 depsMap 里面会有一个 key 为 `toJSON` 的项了：
  >
  >[Type](https://tc39.es/ecma262/#sec-ecmascript-data-types-and-values)(value) is Object or BigInt, then
  >
  >1. Let toJSON be ? [GetV](https://tc39.es/ecma262/#sec-getv)(value, "toJSON").
  >
  >然后检测到是对象会进入：SerializeJSONObject ( state, value )
  >
  >1. let partial be a new empty [List](https://tc39.es/ecma262/#sec-list-and-record-specification-type).
  >
  >2. For each elemen P of K , do 
  >
  >   // 这里会有一个迭代器操作，遍历对象属性，触发 ITERATE_KEY 依赖收集
  >
  >   1. Let strP be ? [SerializeJSONProperty](https://tc39.es/ecma262/#sec-serializejsonproperty)(state, P, value).
  >
  >

  结果就是说 `JSON.stringify` 会有对 obj 有迭代器操作，触发了 ownkeys proxy handler 调用 `track:ITERATE_KEY` 触发收集依赖。

- <font color="green">✓ should observe class method invocations (1 ms)</font>

- <font color="green">✓ lazy (5 ms)</font>

- <font color="green">✓ scheduler (1 ms)</font>

- <font color="green">✓ events: onTrack (1 ms)</font>

- <font color="green">✓ events: onTrigger (3 ms)</font>

- <font color="green">✓ stop (1 ms)</font>

- <font color="green">✓ stop with scheduler (2 ms)</font>

  来看下 stop 结合 scheduler 调度器是如何使用的。

  ```js
    it('stop with scheduler', () => {
      let dummy
      const obj = reactive({ prop: 1 })
      const queue = []
      const runner = effect(
        () => { // updater
          dummy = obj.prop // 这里会立即执行一次收集依赖
        },
        {
          
          scheduler: (e) => queue.push(e) 
        }
      )
      // 这里设置触发 trigger:set，但是因为有 scheduler 的存在，所以没有立即调用 effect
      // 而是执行了 scheduler 将 effect 推入了队列 queue
      obj.prop = 2 
      // 所以这里还是 1
      expect(dummy).toBe(1) // true
      // 因为上面的赋值触发 scheduler 缘故
      expect(queue.length).toBe(1) // true
      // 清理依赖，targetMap->depsMap->dep 里面的所有依赖清理掉
      // 且 effect.active = false
      stop(runner) 
  
      // a scheduled effect should not execute anymore after stopped
      // 这里执行的其实是 updater -> ReactiveEffect 化之后的 effect
      // 但是在 stop 之后 effect.active 已经是 FALSE 了
      // 所以会直接检测到 effect.options.scheduler 存在，返回 undefined 
      // 真正 try 里面的 执行 fn:updater 实际没有到。所以这里相当于什么都没干
      queue.forEach((e) => e())
      // 所以这里值也就不会有任何变化了
      // 如果要这里 updater 被调用只要去掉 stop 那句即可，active = true 进入正常
      // 的 effect{try...finaylly} 执行流程触发 updater
      expect(dummy).toBe(1)
    }
  ```

- <font color="green">✓ events: onStop (1 ms)</font>

- <font color="green">✓ stop: a stopped effect is nested in a normal effect (1 ms)</font>

- <font color="green">✓ markRaw (1 ms)</font>

- <font color="green">✓ should not be trigger when the value and the old value both are NaN (1 ms)</font>

- <font color="green">✓ should trigger all effects when array length is set 0 (1 ms)</font>

<span id="code2">阶段代码链接：[reactive_with_effect_spec_passed_js](https://github.com/gcclll/vue-next-code-read/blob/master/bakups/reactive_with_effect_spec_passed.js)  代码</span>

# 小结 2

又是一个周一了，周末又荒废中度过......，回顾下之前的内容(顺序按照当时实现前后顺序排列)：

## **<font color="purple">reactive - createReactiveObject</font>**

1. 参数： `[target, toProxy, toRaw, baseHandlers, collectionHandlers]；`
2. `new Proxy(target, handlers)`；
3. 根据类型选择 `handlers` ，集合类型(Map, Set)用collection，其他对象类型用 base；
4. 缓存 *proxy-target* 结果(toProxy: target -> observed, toRaw: observed -> target)；
5. 过滤条件(已经 proxy 或 toProxy 中已经存在的不用重复 new )；
6. 非对象判断，能 proxy 的必须是引用类型；
7. 过滤掉 5 中非法情况(_isVue, _isVNode, rawValues, isFrozen, 非 observable 五种情况)。

## **<font color="purple">createGetter</font>**

取值，递归 reactive，调用 track 收集依赖，数组检测(includes, indexOf, lastIndex 特殊处理)，等等。

1. 参数： `[isReadonly, shallow]`；
2. `Reflect.get()` 先取值
3. 判断结果是不是引用类型，如果是调用 reactive 将结果转响应式(嵌套的对象)
4. 检测是不是只读，如果是就返回只读版本(其实差别就是在 handlers)
5. shallow = true 情况，只 reactive 对象一级(嵌套不处理)
6. 非只读情况调用  `track()` 收集依赖
7. 检测 key 是不是数组的三个索引方法(includes, indexOf, lastIndexOf)，单独处理(`arrayInstrumentations`)

## **<font color="purple">createSetter</font>**

设置，调用 trigger 触发 deps(`targetMap -> depsMap -> dep`)，返回 `Reflect.set()` 结果。

1. 参数：`[shallow]`

2. `oldValue = target[key]`

3. 事先 `hasOwnProperty` 检测，缓存结果(添加属性的时候需要)

4. 调用 `Reflect.set(...)` 设置下去

5. 调用 `trigger(target, type, key, newValue, oldValue, oldTarget)` 触发 deps

6. 增加条件判断，不是什么情况都可以调用 trigger的

   a) target - receiver 必须是对应关系

   b) hasOwn 检测结果失败则为 `add` 操作，否则为 `set` 操作，且 set 操作必须是在值发生改变的情况(排除 `NaN`)

##  **<font color="purple">track</font>**

 createGetter 里面调用，用来收集依赖的，依赖都存储在 `targetMap` 里面，分为两级，

第一级是 Map{target -> Map} 类型

第二级也是 Map{key -> Set(deps)}

1. 参数：`[target, type, key]`
2. 从 targetMap 中取 depsMap 该 target 对象对应的所有依赖仓库，没有就初始化 `new Map()`
3. 从 depsMap 取对应 key 的所有依赖仓库 dep，没有就初始化 `new Set()`
4. 检测依赖是否存在(activeEffect)，确保不会重复添加
5. `dep.add(activeEffect) -> activeEffect.deps.push(dep)`
6. 增加判断，如果当前 `activeEffect` 未具备收集条件(**shouldTrack: true, activeEffect不为空**)，就退出依赖收集。

##  **<font color="purple">trigger</font>**

createSetter 里调用来，触发依赖调用的，主要包含两个内部函数(add, run)：

Add: 将于当前要 update 的 deps 收集到一个内部变量 `effects: Set()` 里。

Run: 使用 run去执行 effects 里面的 dep 

1. 参数： `[target, type, key, newValue, oldValue, oldTarget]`

2. 检测 targetMap -> target 没有依赖直接退出

3. 实现 add，添加条件：`shouldTrack = false, effect !== activeEffect` 这两个条件能防止栈溢出的问题(比如在 effect(fn) 的 fn 里面做 `ob.prop++` 操作，[之前有分析](#test-case-rloops)。)

4. 使用 add 收集 deps，三种情况

   a) 如果 type: clear 将所有 depsMap 添加进去

   b) 如果 key: length 且 target 是数组，说明是数组的增加和删除操作，将 depsMap 中 key 为 'length' 或者 key > newValue 情况的 dep 添加

   c) 其他为对象情况处理(Map类型或Object操作)

5. 最后去执行 run，flush 掉所有 deps(effects, computedEffects)。

##  **<font color="purple">effect</font>**

构造 dep 类型 ReactiveEffect，其中包含 `[_isEffect, active, raw, deps, options, id]`类型的对象。

1. 参数：`[fn, options]`
2. 检测 fn._isEffect 如果本身已经是个 ReactiveEffect，取出 fn = fn.raw，重新封装
3. 定义 _effect 函数，所以 vue3 里面每个 dep 都是一个函数类型，上面追加了若干参数
4. _effect 函数的实现重点是 effectStack 和 try...finally，try 里面 enable effect 执行 fn，finally 里面 disable effect。所以这里结合 trigger 里面的 shouldTrack 和 activeEffect 判断来协同防止栈溢出问题。
5. _effect 上追加 ReactiveEffect 必备的参数。
6. 执行一次 `_effect()` (前提是没有设置 options.lazy 属性为 true)

##  **<font color="purple">ownKeys, has, delete</font>**

这三个的实现非常简单

1. ownKeys 调用 track 收集依赖
2. has 调用 track 收集依赖
3. delete 调用 trigger 触发 delete 操作
4. 最后都要返回对应的 Reflect... 操作结果

## 其他

到此，第一阶段的工作基本已经完成了，我们也得到了一个基本可以跑起来，作用起来的 reactive 。

接下的内容主要有以下几点：

1. 集合类型的 **collectionHandlers** 实现，之前都是实现了 *baseHandlers*，既然 vue3 中独立成两个文件了，肯定有不小的差别，但是有了之前的基础，相信理解 **collectionHandlers** 不会那么困难。
2. ref 的实现，这块目前进度几乎为0️⃣，有待研究。
3. 最后就是其他几个测试用例文件的测试了。

漫漫源码路其修远兮，吾将前后左右以贯之，加油파이팅🤜🤛！！！

书大坐阵，稳~~~~~~

![](http://qiniu.ii6g.com/1.png?imageMogr2/thumbnail/!100p)

# 更新(2020-05-25 10:54:40)

前两天更新了下 vue 仓库源码，发现有不小的改动，这里提前把这些改动合并到之前的阅读上去，以防止后面越走越远，导致越难合并。

>5a3b44ca master origin/master chore: fix typo in comment (#1217)
>2b2beb91 build(deps-dev): bump @types/puppeteer from 2.1.0 to 2.1.1
>8e945c97 build(deps-dev): bump @microsoft/api-extractor from 7.8.1 to 7.8.2
>91c4e9b8 build(deps-dev): bump rollup from 2.10.4 to 2.10.5
>96a9d5c6 build(deps-dev): bump rollup from 2.10.2 to 2.10.4
>42e48b83 build(deps-dev): bump @types/jest from 25.2.2 to 25.2.3
>32b3f78a v3.0.0-beta.14 release: v3.0.0-beta.14

本节约定：

1. 先列出变更对比代码
2. 未变更的篇幅较多的代码将省略，如注释：// .... 省略

## reactive.ts

### <font color="red">**首先新增了两个类型：**</font>

1. ReactiveFlags 枚举对象，用来记录对象特征的，比如：是否只读等等

   ```ts
   export const enum ReactiveFlags {
     skip = '__v_skip',
     isReactive = '__v_isReactive',
     isReadonly = '__v_isReadonly',
     raw = '__v_raw',
     reactive = '__v_reactive',
     readonly = '__v_readonly'
   }
   ```

2. Target 接口类型

   ```ts
   // 会发现这个和上面的 ReactiveFlags 是相对应的，上面的 enum 代表的是 key 值字符串
   // 这里声明了一个 Target 类型，里面包含的就是上面所有 key 字符串对应值为 boolean 的一个对象
   // 都是些标识，标识这对象的各种特性
   interface Target {
     __v_skip?: boolean
     __v_isReactive?: boolean
     __v_isReadonly?: boolean
     __v_raw?: any
     __v_reactive?: any
     __v_readonly?: any
   }
   ```

### <font color="red">**canObserve 实现变化**</font>

**更新后**

```ts
// 就是把三种非法类型(_isVue, _isVNode, rawValues)进行合并了，使用一个__v_skip 来检测
// 所以关键我们要关注的将是这个 __v_skip 是在哪里给初始化的值(预想应该是在 createGetter 里面)
const canObserve = (value: Target): boolean => {
  return (
    !value.__v_skip &&
    isObservableType(toRawType(value)) &&
    !Object.isFrozen(value)
  )
}
```

**更新前**

```js
const canObserve = (value) => {
  return (
    !value._isVue &&
    !value._isVNode &&
    isObservableType(toRawType(value)) &&
    !rawValues.has(value) &&
    !Object.isFrozen(value)
  )
}
```



### <font color="red">reactive(target)</font>

**更新后**

```ts
export function reactive(target: object) {
  // if trying to observe a readonly proxy, return the readonly version.
  // 变化1 ： 使用了 __v_isReadonly 代替了 readonlyToRaw: WeakMap
  if (target && (target as Target).__v_isReadonly) {
    return target
  }
  // 变化2：这里现在只需要四个参数了，将 toProxy 和 toRaw 合并了？？？
  // 只能后面再说了
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers
  )
}
```



**更新前**

```js
// reactivity start
function reactive(target) {
  if (readonlyToRaw.has(target)) {
    return target
  }

  return createReactiveObject(
    target,
    rawToReactive,
    reactiveToRaw,
    mutableHandlers,
    mutableCollectionHandlers
  )
}
```

### <font color="red">createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers)</font>

去掉了 toProxy 和 toRaw，改成了 isReadonly，所以针对这个函数的更新，需要探究去掉这两者之后是如何实现该功能的，或者没有该功能了？？？

**更新后：**

```ts
// 变化1：参数变少了
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>
) {
  if (!isObject(target)) {
    if (__DEV__) {
      console.warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  // target is already a Proxy, return it.
  // exception: calling readonly() on a reactive object
  // 变化2：直接通过两个 __v_raw 和 __v_isReactive 过滤
  if (target.__v_raw && !(isReadonly && target.__v_isReactive)) {
    return target
  }
    
  // 变化3：直接返回对应的 target 版本
  // target already has corresponding Proxy
  // 这里应该是直接返回了 target 上的只读和reactive 版本
  // 所以这里就必然存在一个行为，将只读和 reactive 版本赋值到 __v_readonly，__v_reactive
  // 两个属性上去，继续>>>
  if (
    hasOwn(target, isReadonly ? ReactiveFlags.readonly : ReactiveFlags.reactive)
  ) {
    return isReadonly ? target.__v_readonly : target.__v_reactive
  }
  // only a whitelist of value types can be observed.
  // 这里就不说了，变动存在于 canObserve 函数内部
  if (!canObserve(target)) {
    return target
  }
  const observed = new Proxy(
    target,
    collectionTypes.has(target.constructor) ? collectionHandlers : baseHandlers
  )
  
  // 变化4：使用了 def 函数，估计缓存target两个版本，就是在这里实现的
  // 本次更新重点应该就是这个 def 了，离真相越来越近了......
  def(
    target,
    isReadonly ? ReactiveFlags.readonly : ReactiveFlags.reactive,
    observed
  )
  return observed
}
```

**更新前：**

```js
// 变化1：参数变少了
function createReactiveObject(
  target,
  toProxy,
  toRaw,
  baseHandlers,
  collectionHandlers
) {
  if (!target || typeof target !== 'object') {
    return target
  }

  // 变化2
  let observed = toProxy.get(target)
  if (observed !== void 0) {
    return observed
  }

  if (toRaw.has(target)) {
    return target
  } // 变化2 end
    
 	// 变化3：... 新增

  if (!canObserve(target)) {
    return target
  } 

  const handlers = collectionTypes.has(target.constructor)
    ? collectionHandlers
    : baseHandlers
  observed = new Proxy(target, handlers)
  
  // 变化4：使用 def 代替
  toProxy.set(target, observed)
  toRaw.set(observed, target)
  return observed
}
```

下面就不继续更了，都是些小函数围绕 def, Target, ReactiveFlags 的更新。

## baseHandlers.ts

### <font color="red">createGetter(isReadonly = false, shallow = false) </font>

**更新后(只有一个变化，标识性属性的读取处理)：**

```ts
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: object, key: string | symbol, receiver: object) {
    // 变化1：新增对标识性的属性读取，vue 给增加的一些属性
    if (key === ReactiveFlags.isReactive) {
      return !isReadonly
    } else if (key === ReactiveFlags.isReadonly) {
      return isReadonly
    } else if (key === ReactiveFlags.raw) {
      return target
    }

    const targetIsArray = isArray(target)
    // ... 为了节省篇幅，未变化的就省略吧，后续的也如此
}
```

**更新前：**

```js
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    // 变化1：新增
    /*
    	...
    */
    const targetIsArray = Array.isArray(target)
     // ... 为了节省篇幅，未变化的就省略吧，后续的也如此
}
```

## effect.ts

变量及类型声明变更：

```ts
type Dep = Set<ReactiveEffect> // 新增 Dep 类型
type KeyToDepMap = Map<any, Dep> // 新增对象的 key -> Dep
const targetMap = new WeakMap<any, KeyToDepMap>()
```

## jest

```
☁  vue-next-code-read [master] jest
FAIL  packages/__tests__/reactive/reactive.spec.js (5.447 s)
● reactivity/reactive › markRaw

expect(received).toBe(expected) // Object.is equality

Expected: false
Received: true

106 |     })
107 |     expect(isReactive(obj.foo)).toBe(true)

  > 108 |     expect(isReactive(obj.bar)).toBe(false)
  >  |                                 ^
  > 109 |   })
  > 110 |
  > 111 |   test('should not observe frozen objects', () => {

    at Object.<anonymous> (packages/__tests__/reactive/reactive.spec.js:108:33)

FAIL  packages/__tests__/reactive/effect.spec.js (5.589 s)
● reactivity/effect › markRaw

  expect(received).toBe(expected) // Object.is equality

  Expected: 0
  Received: 1

    744 |     expect(dummy).toBe(0)
    745 |     obj.foo.prop++

  > 746 |     expect(dummy).toBe(0)
  >  |                   ^
  > 747 |     obj.foo = { prop: 1 }
  > 748 |     expect(dummy).toBe(1)
  > 749 |   })

    at Object.<anonymous> (packages/__tests__/reactive/effect.spec.js:746:19)

Test Suites: 2 failed, 2 total
Tests:       2 failed, 59 passed, 61 total
Snapshots:   0 total
Time:        9.857 s
Ran all test suites.
```

这两个原因其实都是因为 canObserve 还没更新过来，修改如下：

```js
const canObserve = (value) => {
  return (
    !value.__v_skip &&
    isObservableType(toRawType(value)) &&
    !Object.isFrozen(value)
  )
}
```

重新 jest 通过：



>☁  vue-next-code-read [master] ⚡  jest
>PASS  packages/__tests__/reactive/reactive.spec.js (5.311 s)
>PASS  packages/__tests__/reactive/effect.spec.js (5.429 s)
>
>Test Suites: 2 passed, 2 total
>Tests:       61 passed, 61 total
>Snapshots:   0 total
>Time:        9.612 s
>Ran all test suites.
>☁  vue-next-code-read [master] ⚡

<span id="file-0521">[Reactive.js](https://github.com/gcclll/vue-next-code-read/blob/master/bakups/reactive_with_update_0521.js)</span>

## 

# collectionHandlers.ts

也该开始集合类型支持了，这部分的修改主要集中在这个文件里面，因为之前 reactive.ts, effect.ts 里面都已经把集合类型代码合并进去了(其实除了 trigger 里面有部分的 map 相关区分之后，绝大部分都是一样的)。

这里可能得做个事情，如果还想坚持使用一个 js 文件来完成功能，那只能考虑使用作用域对象来处理了，即将 baseHandlers 和 collectionHandlers 分别用单独一个对象来承载，因为里面的函数名都是同一个，不然就只能拆分成多个文件了。

思考中 ☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡☡......

还是拆分吧，和 vue 源码结构保持一致，增加 reactive 目录来承载。

分离之后的目录备份 [bakups/reactive_files_v]( https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_files_v)

下面进入正题 >>>>>>>>

新建 collectionHandlers.js 用来定义集合类型有关的 proxy handlers。

把 reactive.js 里面的 

```js
// TODO
export const mutableCollectionHandlers = {}
export const readonlyCollectionHandlers = {}
export const shallowCollectionHandlers = {}
```

移到 *collectionHandler.js* 里，这节接下来所有的工作都是为了构建这三个 handlers。

将按 get -> set -> size -> add -> deleteEntry -> has -> clear 顺序来一步步实现。

## 准备工作

有了 baseHandlers.ts 实现的基础，就没必要再那么详细的步骤去实现了，这里将所有准备工作做足，主要就是一些基础变量的声明，在理解它的基础上先声明好，而不是用的时候再去声明。

```ts
// reactive 化
const toReactive = <T extends unknown>(value: T): T =>
  isObject(value) ? reactive(value) : value

// readonly reactive
const toReadonly = <T extends unknown>(value: T): T =>
  isObject(value) ? readonly(value) : value

// shallow reactive
const toShallow = <T extends unknown>(value: T): T => value
// 取原型原子操作 Reflect
const getProto = <T extends CollectionTypes>(v: T): any =>
  Reflect.getPrototypeOf(v)

// 三个 handlers 对应的 instrumentations
const mutableInstrumentations: Record<string, Function> =  {/*...*/}
const shallowInstrumentations: Record<string, Function> = {/*...*/}
const readonlyInstrumentations: Record<string, Function> = {/*...*/}

// 集合类型几个迭代方法和迭代器
const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator]

// 三个 handlers 只需要一个 get ????????????
export const mutableCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, false)
}

export const shallowCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(false, true)
}

export const readonlyCollectionHandlers: ProxyHandler<CollectionTypes> = {
  get: createInstrumentationGetter(true, false)
}
```

## createInstrumentationGetter

由于三个 handlers 都是由这个生成的，所以我们不得不以这个函数作为切入点。

在这之前必须的完成准备工作，把需要的变量都实现准备好。

```js
// proxy handlers 对象
const mutableInstrumentations = {}
const shallowInstrumentations = {}
const readonlyInstrumentations = {}

function createInstrumentationGetter(isReadonly, shallow) {
  // 决定使用哪种类型的 instru...
  const instrumentations = shallow
    ? shallowInstrumentations
    : isReadonly
    ? readonlyInstrumentations
    : mutableInstrumentations

  // Reflect.get 类型的 proxy handler
  return (target, key, receiver) => {
    switch (key) {
      case ReactiveFlags.isReactive:
        return !isReadonly
      case ReactiveFlags.isReadonly:
        return isReadonly
      case ReactiveFlags.raw:
        return target
      default:
        break
    }
  }

  // 难道集合类型的 proxy handler 统统走的都是 proxy get ???
  return Reflect.get(
    hasOwn(instrumentations, key) && key in target ? instrumentations : target,
    key,
    receiver
  )
}
```

这里对于集合类型只提供一个 get proxy handler 和之前碰到过的报错 [VM1029:1 Uncaught TypeError: Method Map.prototype.get called on incompatible receiver [object Object]](#error-map) 问题是一样的，网上说的是丢失了作用域，看报错的提示也确实是这个原因。

根源在于你使用 observed->Map 的时候，需要通过 `observed.get()` 去调用，但 observed 是个 Proxy 类型，在 proxy handler 里面 Reflect 需要调用的又是 Map 类型上面的 get 方法(因为它是 target 的原子操作啊)，因此就出现了 Proxy -> 调用 Map.prototype.get 导致失败报错 。

要解决这个问题，最简单是改变 Reflect.get 的调用作用，如：

```js
var m = new Map([
  ['foo', 1],
  ['bar', 2]
])
var ob = new Proxy(m, {
  get(target, key, receiver) {
    console.log({ key }, target, '111 get proxy')
    return Reflect.get.call(target, target, key, receiver)
  }
})

```

既然现在知道了 map 的操作都需要通过 get 来进行进一步"代理"，`createInstrumentationGetter` 也实现了，这个也很简单，就是根据特性判断采用那一个 instrumentations，然后返回 `Reflect.get` 结果，中间加上了 ReactiveFlags 的一些判断而已。

三个 handlers ：

```js
export const mutableCollectionHandlers = {
  get: createInstrumentationGetter(false, false)
}
export const readonlyCollectionHandlers = {
  get: createInstrumentationGetter(true, false)
}
export const shallowCollectionHandlers = {
  get: createInstrumentationGetter(false, true)
}
```

## get(target, key, wrap)

```js
function get(target, key, wrap) {
  target = toRaw(target)
  const rawKey = toRaw(key)
  console.log({ target, key, rawKey }, 'get')
  if (key !== rawKey) {
    track(target, 'get', key)
  }
  track(target, 'get', rawKey)
  const { has, get } = getProto(target)
  if (has.call(target, key)) {
    return wrap(get.call(target, key))
  } else if (has.call(target, rawKey)) {
    return wrap(get.call(target, rawKey))
  }
}
```

测试：

```js
var or = new Map([
  ['foo', 1],
  ['bar', 2]
])

var ob = reactive(or)
console.log(isReactive(ob), 'is reactive')
console.log(or instanceof Map, 'or is map')
console.log(ob instanceof Map, 'ob is map')
console.log('=============================')

let dummy
effect(() => {
  dummy = ob.get('key')
})

console.log({ dummy }, '1')
ob.set('foo', 2)
```

结果：

![](http://qiniu.ii6g.com/1590398397.png?imageMogr2/thumbnail/!100p)

注意看 createInstrumentationGetter 返回的箭头函数里返回的值：

```js
return Reflect.get(
  hasOwn(instrumentations, key) && key in target
  ? instrumentations
  : target,
  key,
  receiver
)

// 上面的假设是 mutableInstrumentations，那么上面的代码就相当于
// 假设调用的是 observed.get(key, ...)，那么第二个参数 key = 'get'
return Reflect.get({
  get() { /* mutableInstrumentations 里面的 get 方法*/ }
}, 'get', receiver)

```

经过上面的转换之后就比较有意思了，不管你通过 observed 调用什么方法，最终都会被转成 Reflect.get 取值操作，而取值的关键在于两点：

1. 被取值的对象这里就是我们真正定义的 proxy handler 对象，里面包含了指定特性需要的函数
2. key 为 observed 调用的那个方法名称，必须取值 observed.get 那么 key 就是 'get'，observed.set ，那么 key 就是 'set'

最终 observed.get ---> 其实就是 `mutableInstrumentations.get` 。

### <font color="red">TODO</font> 疑问？？

1. Get 里的 两次 toRaw 是啥意思？？？

   ```js
   function get(target, key, wrap) {
     // 这里为啥要取两次 toRaw，然后可能会触发两次 track???
     target = toRaw(target)
     const rawKey = toRaw(key)
     if (key !== rawKey) {
       track(target, 'get', key)
     }
     track(target, 'get', rawKey)
   }
   ```

2. <span id="question-this">在实现 get 的时候 vue 源码里是这样的： `get(this: MapTypes, ...)` 但实际这种语法在 js 中肯定是不支持的</span>

   然后自己就改写了下：

   ```js
   // proxy handlers 对象
   const mutableInstrumentations = {
     get(scope, key) {
       return get(this, key, toReactive)
     },
     set
   }
   ```

   结果发现不太对：

   ```js
   var or = new Map()
   var ob = reactive(or)
   
   let dummy
   effect(() => {
     dummy = ob.get('key')
     console.log({ dummy }, 'effect')
   })
   
   console.log({ dummy }, '1')
   /* ob.set('key', 'value') */
   /* console.log({ dummy }, '2') */
   console.log(targetMap.get(or))
   ```

   结果：

   ![](http://qiniu.ii6g.com/1590402707.png?imageMogr2/thumbnail/!100p)

   这里收集的依赖的 key 竟然是 `undefined`，也就是说传入给 `get(target, key, wrap)` 的 key 丢失了。

   虽然知道原因：就是上面的 mutableInstrumentations 的 get 多了一个参数啊，这貌似哪里不太对，无奈去看了下 `vue.global.js` 打包之后的代码，才发现端倪。

   

   ```js
   // 打包之后的 get
   const readonlyInstrumentations = {
     get(key) { // 请看这里，打包之后第一个 this 没有了
       return get$1(this, key, toReadonly)
     },
   }
   
   // 打包之前的 get，ts语法
   const mutableInstrumentations: Record<string, Function> = {
     get(this: MapTypes, key: unknown) {
       return get(this, key, toReactive)
     }
   }
   ```

   由于 js 是不支持用 this 做函数参数的，所以只能从 TypeScript 去方向着手了......，然后，然后就有了结果：

   ts 中的 [this 作为函数第一个参数的语法](https://www.typescriptlang.org/docs/handbook/functions.html)说明

   ![](http://qiniu.ii6g.com/1590403211.png?imageMogr2/thumbnail/!100p)

   被圈圈的两个单词是关键，它就是个假的参数，作用也就是让函数能声明它被调用的那个对象是什么类型，因此也就明白为何打包之前和打包之后代码的差异了。

   所以该问题解决方法就是去掉第一个参数，只有一个参数 key ，如：

   ```js
   const mutableInstrumentations = {
     get(key) {
       return get(this, key, toReactive)
     },
     set
   }
   ```

   

## set(this, key, value)

弄清楚 TypeScript 的 this argument 之后，解决了 get 也就解决了 set 问题了。

```js
function set(key, value) {

  value = toRaw(value)
  // 取调用 set 的那个对象，取出它原型上的 has, get, set，
  // 也就是 target: Map 
  const target = toRaw(this)
  const { has, get, set } = getProto(target)

  let hadKey = has.call(target, key)
  if (!hadKey) {
    // key 是不是有可能也是个 observed ???
    // Map 的 key 不仅限于普通类型，可以是任意类型
    key = toRaw(key)
    // 那么重新取一次值
    hadKey = has.call(target, key)
  } else if (__DEV__) {
    // TODO
  }

  // 取旧值
  const oldValue = get.call(target, key)
  // 把值设置到 observed 之前的对象上，可参考下面的结果图
  const result = set.call(target, key, value)
  
  // 下面就是跟 basehandler 一样的增加或设置操作了
  if (!hadKey) {
    trigger(target, 'add', key, value)
  } else if (hasChanged(value, oldValue)) {
    trigger(target, 'set', key, value, oldValue)
  }
  
  // 记得返回设置结果
  return result
}
```

测试：

```js
var or = new Map()
var ob = reactive(or)

let dummy
effect(() => {
  dummy = ob.get('key')
})

console.log({ dummy }, '1')
ob.set('key', 'value')
console.log({ dummy }, '2')
console.log(targetMap.get(or))
```

结果：

![](http://qiniu.ii6g.com/1590405427.png?imageMogr2/thumbnail/!100p)

有了 get 和 set 实现打基础下面的实现就🌾渠成了，但革命还未成功，依旧需要努力谨慎，🐩🐩🐩......

## size(target)

Map 的 size 属性是一个原型是上的属性： [Map.prototype.size](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/size)， 至于为什么要用ITERATE_KEY 那就需要看下

[这里了](https://tc39.es/ecma262/#sec-get-map.prototype.size)

实现的时候是需要对 Map 进行迭代的(`for [key, value] of map`)，因此会触发 iterate 行为来收集依赖。

```js
function size(target) {
  target = toRaw(target)
  track(target, 'iterate', ITERATE_KEY)
  // size 是在 Map 原型上的一个属性
  return Reflect.get(getProto(target), 'size', target)
}
```

更新 mutableInstrumentations:

```js
// proxy handlers 对象
const mutableInstrumentations = {
  get(key) {
    return get(this, key, toReactive)
  },
  set,
  get size() {
    return size(this)
  }
}
```

## add(value)

限于 Set 类型使用，但是为啥不加个判断呢？？？

```js
function add(value) {
  value = toRaw(value)
  const target = toRaw(this)
  const proto = getProto(target) // Set.prototype ....
  const hadKey = proto.has.call(target, value) // Set.prototype.has
  const result = proto.add.call(target, value) // Set.prototype.add
  if (!hadKey) {
    trigger(target, 'add', value, value)
  }
  return result
}
```

测试

```js
var or = new Set()
var ob = reactive(or)

const fn = () => {}
let dummy
effect(() => {
  dummy = ob.has(fn)
})

console.log({ dummy }, 'before')
ob.add(fn)
console.log({ dummy }, 'after')
```

结果：

>{dummy: false} "before"
>{dummy: true} "after"

## deleteEntry(key)

Map/Set.prototype.delete 的 proxy handler

```js
function deleteEntry(key) {
  const target = toRaw(this)
  const { has, get, delete: del } = getProto(target)
  const hadKey = has.call(target, key)
  if (!hadKey) {
    key = toRaw(key)
    hadKey = has.call(target, key)
  } else if (__DEV__) {
    // TODO
  }

  const oldValue = get ? get.call(target, key) : undefined
  const result = del.call(target, key)

  if (hadKey) {
    trigger(target, 'delete', key, undefined, oldValue)
  }
  return result
}
```



测试

```js
var or = new Map()
var ob = reactive(or)

const fn = () => {}
let dummy
effect(() => {
  dummy = ob.has(fn)
})

console.log({ dummy }, 'before') // false
ob.set(fn, true) // 增加，触发 fn -> updater
console.log({ dummy }, 'after') // true
ob.clear() // 清空，trigger: clear
console.log({ dummy }, 'cleared') // false
ob.set(fn, false) // trigger: add
console.log({ dummy }, 'add') // true
ob.delete(fn) // trigger: delete
console.log({ dummy }, 'deleted') // false
```

结果

>{dummy: false} "before"
>{dummy: true} "after"
>{dummy: false} "cleared"
>{dummy: true} "add"
>{dummy: false} "deleted"

## has(key)

```js
function has(key) {
  const target = toRaw(this)
  const rawKey = toRaw(key)
  if (key !== rawKey) {
    track(target, 'has', key)
  }
  track(target, 'has', rawKey)

  const has = getProto(target).has
  return has.call(target, key) || has.call(target, rawKey)
}	
```

测试：

```js
var or = new Map()
var ob = reactive(or)

let dummy, has
effect(() => {
  dummy = ob.size
  has = ob.has('a')
})

console.log({ dummy, has }, 'before')
ob.set('a', 1) // 改变了 size
console.log({ dummy, has }, 'after')
```

结果：

>{dummy: 0, has: false} "before"
>{dummy: 1, has: true} "after"



## clear()

```js
function clear() {
  const target = toRaw(this)
  const hadItems = target.size !== 0
  const oldTarget = __DEV__
    ? target instanceof Map
      ? new Map(target)
      : new Set(target)
    : undefined

  const result = getProto(target).clear.call(target)
  if (hadItems) {
    trigger(target, 'clear', undefined, undefined, oldTarget)
  }
  return result
}
```

测试

```js
var or = new Set()
var ob = reactive(or)

const fn = () => {}
let dummy
effect(() => {
  dummy = ob.has(fn)
})

console.log({ dummy }, 'before')
ob.add(fn)
console.log({ dummy }, 'after')
ob.clear()
console.log({ dummy }, 'cleared')
```

结果

>{dummy: false} "before"
>{dummy: true} "after"
>{dummy: false} "cleared"

## forEach(isReadonly, shallow)

```js
  return function forEach(callback, thisArg) {
    const observed = this
    const target = toRaw(observed)

    const wrap = isReadonly ? toReadonly : shallow ? toShallow : toReactive

    !isReadonly && track(target, 'iterate', ITERATE_KEY)

    // 封装的目的：
    // 1. 确保在 thisArg 作用域下调用
    // 2. 确保传递给 callback 的值都是 creative 的
    function wrappedCallback(value, key) {
      return callback.call(thisArg, wrap(value), wrap(key), observed)
    }
    return getProto(target).forEach.call(target, wrappedCallback)
  }
```



测试

```js
var or = new Map()
var ob = reactive(or)

const fn = () => {}
let dummy
effect(() => {
  ob.forEach((key, val) => {
    dummy++
  })
})

console.log({ dummy }, 0)
ob.set(1, 1)
console.log({ dummy }, 1)
ob.set(2, 2)
console.log({ dummy }, 2)
ob.set(3, 3)
console.log({ dummy }, 3)
```

未实现之前结果

>{dummy: 0} 0
>{dummy: 0} 1
>{dummy: 0} 2
>{dummy: 0} 3

实现之后结果

>{dummy: 0} 0
>{dummy: 1} 1
>{dummy: 3} 2
>{dummy: 6} 3

## 三个小矮人(handlers, createIterableMethod)

只读操作的 handlers ：

```js
// 只读函数，会改变对象的操作均不响应
function createReadonlyMethod(type) {
  return function (...args) {
    if (__DEV__) {
      const key = args[0] ? `on key "${args[0]}" ` : ``
      console.warn(
        `${type} operation ${key}failed: target is readonly.`,
        toRaw(this)
      )
    }
    return type === 'delete' ? false : this
  }
}
```

三个小主人公：

```js
// proxy handlers 对象
const mutableInstrumentations = {
  get(key) {
    return get(this, key, toReactive)
  },
  set,
  get size() {
    return size(this)
  },
  has,
  add,
  clear,
  delete: deleteEntry,
  forEach: createForEach(false, false)
}
const shallowInstrumentations = {
  get(key) {
    return get(this, key, toShallow)
  },
  get size() {
    return size(this)
  },
  has,
  add,
  set,
  delete: deleteEntry,
  clear,
  forEach: createForEach(false, true)
}
const readonlyInstrumentations = {
  get(key) {
    return get(this, key, toReadonly)
  },
  get size() {
    return size(this)
  },
  has,
  add: createReadonlyMethod('add'),
  set: createReadonlyMethod('set'),
  delete: createReadonlyMethod('delete'),
  clear: createReadonlyMethod('clear'),
  forEach: createForEach(true, false)
}
```

针对迭代器操作，创建迭代器代理 handler:

```js
function createIterableMethod(method, isReadonly, shallow) {
  return function (...args) {
    const target = toRaw(this)
    const isMap = target instanceof Map
    // 检测是不是 Set 或 Map，Map迭代的时候返回的是for [key, value] of map
    // Set 迭代的时候返回的时候是 for value of set
    // Object.entries()
    const isPair = method === 'entries' || (method === Symbol.iterator && isMap)
    // Object.keys()
    const isKeyOnley = method === 'keys' && isMap
    // 取出原生的 迭代器
    const innerIterator = getProto(target)[method].apply(target, args)
    // 嵌套 reactive
    const wrap = isReadonly ? toReadonly : shallow ? toShallow : toReactive
    // 触发迭代器 收集依赖
    !isReadonly &&
      track(target, 'iterate', isKeyOnley ? MAP_KEY_ITERATE_KEY : ITERATE_KEY)

    return { // 封装一层，迭代器的两个必备条件：1. next()，2. Symbol.iterator 必须实现
      next() {
        // 原本的迭代器
        const { value, done } = innerIterator.next()
        return done
          ? { value, done }
          : {
          		// 处理 entries 或 keys, values，对嵌套的对象进行 reactiv
              value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
              done
            }
      },
      // 可迭代对象实现基础
      [Symbol.iterator]() {
        return this
      }
    }
  }
}
```

测试

```js
var or = new Map()
var ob = reactive(or)

const fn = () => {}
let keys, values, entries
effect(() => {
  keys = ob.keys()
  values = ob.values()
  entries = ob.entries()
})

console.log(keys.next(), values.next(), entries.next(), 0)
ob.set('a', 1)
console.log(keys.next(), values.next(), entries.next(), 1)

```

结果

![](http://qiniu.ii6g.com/1590456092.png?imageMogr2/thumbnail/!100p)

## jest

结果：

>☁  vue-next-code-read [master] ⚡  jest
>PASS  packages/__tests__/reactive/reactive.spec.js
>PASS  packages/__tests__/reactive/effect.spec.js
>PASS  packages/__tests__/reactive/collection/WeakSet.spec.js
>PASS  packages/__tests__/reactive/collection/Map.spec.js
>PASS  packages/__tests__/reactive/collection/WeakMap.spec.js
>PASS  packages/__tests__/reactive/collection/Set.spec.js
>
>Test Suites: 6 passed, 6 total
>Tests:       132 passed, 132 total
>Snapshots:   0 total
>Time:        5.278 s
>Ran all test suites.

分析

- <font color="green">✓ instanceof (3 ms)</font>

  ![](http://qiniu.ii6g.com/1590458265.png?imageMogr2/thumbnail/!100p)

  注意 Proxy 之后的 observed 的 __proto__ 值是 Map ，所以对 observed 使用 instanceof Map(查找原型链) 结果肯定是 true。

- <font color="green">✓ should observe mutations (2 ms)</font>

  ```js
  it('should observe mutations', () => {
    let dummy
    const map = reactive(new Map())
    effect(() => {
      // 这里触发的是 map 对象的 'get' proxy handler
      // key = 'get', 最后通过 Reflect.get(instrumentations{...}, 'get', receiver)
      // 即最后调用 'get' 方法的是 instrumentations 这些对象
      // 如： mutableInstrmentations 的 get(key) { return get(this, key, toReactive) }
      // 然后 get(key) 的 key = 'key'，传递给 `get(this, ...)`
      // 然后在 get(this, ...) 里面通过 call->proto 去调用原型上的方法，解决作用域丢失的问题
      dummy = map.get('key')
    })
  
    expect(dummy).toBe(undefined) // true
    // 调用的是 instrumentations 的 set => set(this, ...)
    map.set('key', 'value') // map{'key' => 'value'}, trigger: add
    expect(dummy).toBe('value') // true
    map.set('key', 'value2') // trigger: set
    expect(dummy).toBe('value2') // true
    map.delete('key') // trigger: delete
    expect(dummy).toBe(undefined)
  })
  ```

- <font color="green">✓ should observe mutations with observed value as key (1 ms)</font>

  ```js
  let dummy
  const key = reactive({})
  const value = reactive({})
  const map = reactive(new Map())
  effect(() => {
  dummy = map.get(key)
  })
  
  expect(dummy).toBe(undefined)
  map.set(key, value) // 用 observe 对象作为 key 和 value
  expect(dummy).toBe(value) // true，都是引用类型，非值传递
  map.delete(key)
  expect(dummy).toBe(undefined)
  ```

- <font color="green">✓ should observe size mutations (1 ms)</font>

- <font color="green"> ✓ should observe for of iteration (2 ms)</font>

- <font color="green">  ✓ should observe forEach iteration (1 ms)</font>

- <font color="green"> ✓ should observe keys iteration (3 ms)</font>

- <font color="green"> ✓ should observe values iteration (3 ms)</font>

- <font color="green"> ✓ should observe entries iteration (5 ms)</font>

- <font color="green"> ✓ should be triggered by clearing (3 ms)</font>

- <font color="green"> ✓ should not observe custom property mutations (6 ms)</font>

- <font color="green"> ✓ should not observe non value changing mutations (4 ms)</font>

- <font color="green"> ✓ should not observe raw data (1 ms)</font>

- <font color="green"> ✓ should not pollute original Map with Proxies (7 ms)</font>

- <font color="green">✓ should return observable versions of contained values (1 ms)</font>

- <font color="green">✓ should observed nested data (2 ms)</font>

- <font color="green">✓ should observe nested values in iterations (forEach) (1 ms)</font>

- <font color="green">✓ should observe nested values in iterations (values) (1 ms)</font>

- <font color="green">✓ should observe nested values in iterations (entries) (2 ms)</font>

- <font color="green">✓ should observe nested values in iterations (for...of) (2 ms)</font>

- <font color="green">✓ should not be trigger when the value and the old value both are NaN (1 ms)</font>

- <font color="green">✓ should work with reactive keys in raw map (1 ms)</font>

- <font color="green">✓ should track set of reactive keys in raw map</font>

- <font color="green">✓ should track deletion of reactive keys in raw map (1 ms)</font>

- <font color="green">✓ should warn when both raw and reactive versions of the same object is used as key</font>

- <font color="green">✓ should not trigger key iteration when setting existing keys (4 ms)</font>

## 小结

这节工作也基本完成了，所有 collection 相关的四个测试用例都测试通过，说明代码**照抄**(🤦‍♂️)的结果也正常。那现在也应该基本了解对于集合类型的 proxy 处理，vue 是怎么个实现的。

首先，proxy 是没有提供和集合类型有关的原子操作代理的，所以直接使用 new Proxy(map) 是没法实现我们想要的功能的，同时也会出现方法应用不当的报错(丢失方法的作用域了，把 Map.prototype.method 的方法应用到了 Proxy 类型)。

为了解决这个问题，vue 里面 collection 有关的操作全部都是通过 get proxy 代理来实现，下面是几个关键点和疑问点：

1. 所有接口全部使用 get proxy 通道转发，调用 `Reflect.get(instrumentations, key, receiver)`

2. 在所有的实际 proxy handler里面(如：set, get, delete, ...)，解决作用域问题，取target 上的原型方法

3. 并且所有的原型上的方法(如：has, get, set)都通过 `has.call(target)` 解决调用域的问题

4. Key 和 rawKey 的问题(get 中)，直接看测试代码分析🥵<span id="question-raw-key"></span>

   ```js
   const key1 = {}
   const key11 = reactive(key1)
   const ob = reactive(new Map())
   let n1, n2
   effect(() => {
     n1 = ob.get(key1)
     n2 = ob.get(key11)
   })
   
   ob.set(key1, '1')
   console.log({ n1, n2 }, ob, '1')
   ob.set(key11, '11')
   console.log({ n1, n2 }, ob, '2')
   ```

   结果

   ![](http://qiniu.ii6g.com/1590472850.png?imageMogr2/thumbnail/!100p)

   Get 源码：

   ```js
   // key -> 'key11'
   function get(target, key, wrap) {
     target = toRaw(target)
     // 这里会对 key 有个 toRaw 操作，就是针对 key 是 proxy 的可能
     // 最后 key11 传进来实际 rawKey = key1，并且触发 track 的时候
     // rawKey 是必定会触发的，这保证了 key 非 proxy 时的能正常收集依赖
     // 而 key !== rawKey -> trigger: get-key 就是针对 proxy key11 的情况也会
     // 触发 track:get 收集依赖，因为 proxy key11 肯定是不会等于 key1 的。
     // 所以 key1, key11 在 map.get(key1) 或 map.get(key11) 的时候都能正常收集到依赖
     const rawKey = toRaw(key)
     if (key !== rawKey) {
       track(target, 'get', key)
     }
     track(target, 'get', rawKey)
     // ...
   }
   ```

   然后在 set 的时候：

   ```js
   function set(key, value) {
     // ...
   
     // 这一段操作就是为了确保，key1 和 proxy key11 都能正确取到依赖
     // 所以说 get 里面的 rawKey 和 key 的操作和这里的 toRaw 操作是相对应的
     // 如果没有 get 里的 rawKey-key 操作，这里如果传入 proxy key11 就不会有依赖触发
     // 因为 get 里面根本不会触发 track:get
     // 如果 set 这里不加这一段处理，就算 get-track:get 了，这里也会找不到 proxy key11 导致
     // 会触发非正常的 trigger:add 操作。
     let hadKey = has.call(target, key)
     if (!hadKey) {
       key = toRaw(key)
       hadKey = has.call(target, key)
     } else if (__DEV__) {
       // TODO
     }
   	// ...
   }
   ```

   

5. <span id="question-key1-key11">为什么 key1 和 toReactive(key1) 后的 key11 前后 set 会改变 key1 对应的值？？？</span>

   ```js
   const key1 = {}
   const key2 = {}
   const ob = reactive(new Map())
   
   ob.set(key1, '1')
   // 这里 key1 被转成了 Proxy，在 createIterableMethod 里面做的
   // 返回 iterable 的 next() 里面的行为，会把所有 value 都变成 wrap(value)
   // reactive 的，下面的 key11 其实就是 key1 经过 reactive 之后的 proxy
   const key11 = ob.keys().next().value
   
   // 验证 key11 与 key1 关系的猜测：
   // console.log(key11, key1, toRaw(key11) === key1) // code1
   
   // 验证 key11 与 key1 关系的猜测：
   console.log(toRaw(key11) === key1, ob, '1')
   
   // 然后我们将 key11 作为 key 设置给 ob
   ob.set(key11, '11')
   console.log(toRaw(key11) === key1, ob, '11')
   ```

   直接看结果图：

   

   ![](http://qiniu.ii6g.com/1590465056.png?imageMogr2/thumbnail/!100p)

   把 code1 注释掉，加上下面的代码，看下结果:

   ![](http://qiniu.ii6g.com/1590465566.png?imageMogr2/thumbnail/!100p)

   修正：“命名” -> “明明”。

   也就是说我们通过设置 key1 的 proxy 版本 key11 却能让 key1 的值发生变化。那得分析分析这是为什么了？？？原因其实很简单，请看 `set(key, value)` 源码：

   ```js
   // key -> key11, value -> '11'
   function set(key, value) {
     // ...
     
     // 首先是检测有没有 key11，咦，发现没有诶，
     // 那有没可能它是个 proxy ???
     let hadKey = has.call(target, key)
     if (!hadKey) {
       // 好吧，那就还原下吧，取出 proxy 之前的那个 target
       key = toRaw(key)
       // 返现 key11 你不就是 key1 转过来的吗？？？
       // key1 我有啊 ，所以这里的 hadKey 就成了 true
       // key 就成了 key1
       hadKey = has.call(target, key)
     } else if (__DEV__) {
       // TODO
     }
     
     // 因此下面其实就是通过 proxy:key11 的原版 key1 去触发 trigger: set
   	// ...
   }
   ```

   更直观点的测试：

   ```js
   const key1 = {}
   const key11 = reactive(key1)
   const ob = reactive(new Map())
   
   ob.set(key1, '1')
   // 验证 key11 与 key1 关系的猜测：
   console.log(toRaw(key11) === key1, ob, '1')
   // 然后我们将 key11 作为 key 设置给 ob
   ob.set(key11, '11')
   console.log(toRaw(key11) === key1, ob, '11')
   ```

# ref.ts

前面已经完成了 reactive 模块大部分且最基本的功能了，这节将完成剩余两大块computed 和 ref 其中的 ref.ts，

来揭露其真实的面目。

Ref 类型定义([unique symbol 类型定义](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-7.html#unique-symbol))：

```ts
declare const RefSymbol: unique symbol

// Ref 类型主要有两个属性，一个 值为 true 的唯一的符号属性
// 一个是 value 值
export interface Ref<T = any> {
  [RefSymbol]: true
  value: T
}
```

## 内容列表

| 变量/函数                      | 描述                                             |
| ------------------------------ | ------------------------------------------------ |
| `convert(val)`                 | 将对象转成 reactive                              |
| `isRef(r)`                     | 判断是不是 Ref 类型，依据是 r.__v_isRef 标识的值 |
| `ref(value)`                   | 创建 Ref 类型，调用 `createRef(value)`           |
| `shallowRef(value)`            | 创建 Ref 类型，调用 `createRef(value, true)`     |
| `createRef(rawValue, shallow)` | 创建 Ref 类型                                    |
| `triggerRef(ref: Ref)`         | trigger Ref 的 value 值变更 deps                 |
| `unref(ref)`                   | 取消 Ref，即返回 ref.value 原始值                |
| `customRef(factory)`           | 由创建者去定义 get, set 应该做哪些事情           |
| `toRefs(object)`               | 将对象的所有 key 的值转成 Ref                    |
| `toRef(object, key)`           | 被 toRefs 调用                                   |

完整的 ref.js(除了类型定义，不到100行，🐂👃)

## 源码

```js
import { isObject, hasChanged } from '../util.js'
import { reactive, isProxy, toRaw, collectionTypes } from './reactive.js'
import { track, trigger, __DEV__ } from './effect.js'

export const convert = (val) => (isObject(val) ? reactive(val) : val)

export function ref(value) {
  return createRef(value)
}

export function shallowRef(value) {
  return createRef(value, true)
}
// get track, set trigger
export function createRef(rawValue, shallow = false) {
  if (isRef(rawValue)) {
    return rawValue
  }

  let value = shallow ? rawValue : convert(rawValue)

  const r = {
    __v_isRef: true,
    get value() {
      track(r, 'get', 'value')
      return value
    },
    set value(newVal) {
      if (hasChanged(toRaw(newVal), rawValue)) {
        rawValue = newVal
        value = shallow ? newVal : convert(newVal)
        trigger(r, 'set', 'value', __DEV__ ? { newValue: newVal } : void 0)
      }
    }
  }

  return r
}

// 手动触发 ref: set
export function triggerRef(ref) {
  trigger(ref, 'set', 'value', __DEV__ ? { newValue: ref.value } : void 0)
}

export function isRef(r) {
  return r ? r.__v_isRef === true : false
}

export function unref(ref) {
  return isRef(ref) ? ref.value : ref
}

export function customRef(factory) {
  const { get, set } = factory(
    () => track(r, 'get', 'value'),
    () => trigger(r, 'set', 'value')
  )

  const r = {
    __v_isRef: true,
    get value() {
      return get()
    },
    set value(v) {
      set(v)
    }
  }
}

export function toRefs(object) {
  const ret = {}
  for (const key in object) {
    ret[key] = toRef(object, key)
  }
  return ret
}

export function toRef(object, key) {
  return {
    __v_isRef: true,
    get value() {
      return object[key]
    },
    set value(newVal) {
      object[key] = newVal
    }
  }
}

```

给之前的代码加上 ref 功能：

1. baseHandlers.js

## 测试

### ref(value)

```js
// 将 100 变成 reactive 的 r -> { __v_isRef: true, get value() {}, set value() {} }
const r = ref(100)
let dummy
effect(() => {
  dummy = r.value
})

console.log(targetMap.get(r), 'deps')
```

输出：

![](http://qiniu.ii6g.com/1590477277.png?imageMogr2/thumbnail/!100p)

effect 里面使用到了 r.value 触发 get value() 访问器，里面使用 `track(r, 'get', 'value', void 0)` 收集依赖，所以从  `targetMap.get(r)` 可以取到 'value' => Set(1) 这个 Dep。

更新 ref 值：

```js
const r = ref(100)
let dummy
effect(() => {
  dummy = r.value
})

console.log({ dummy }, '1')
r.value = 200
console.log({ dummy }, '2')
```

结果:

>{dummy: 100} "1"
>{dummy: 200} "2"

所以说，Ref 的存在就是让普通类型的值也能 reactive。

**应用到对象上**

```js
const r = ref({ nested: { num: 0 } })
console.log(r)

let dummy
effect(() => {
  dummy = r.value.nested.num
})

console.log({ dummy }, '1')
r.value.nested.num = 100
```

结果：

>{__v_isRef: true}
>Map(1) {"value" => Set(1)}
>{dummy: 0} "1"
>{dummy: 100} "2"

### shallowRef(value)

**shallowRef**  就是针对对象类型使用 Ref 的时候是否需要对对象里面的嵌套对象进行 reactive 化。

```js
const r = shallowRef({ nested: { num: 0 } })
console.log(r)

let dummy
effect(() => {
  dummy = r.value.nested.num
})

console.log({ dummy }, '1')
r.value.nested.num = 100
```

结果：

![](http://qiniu.ii6g.com/1590477847.png?imageMogr2/thumbnail/!100p)

对象最终会被整个成为 value，因为是用的 shallowRef，所以改变 r.value.nested.num 的值是不会触发 dummy 更新的。

其他用法直接看下面的测试用例解析吧！！！

## jest

结果:

>☁  vue-next-code-read [master] ⚡  jest
>PASS  packages/__tests__/reactive/reactive.spec.js
>PASS  packages/__tests__/reactive/ref.spec.js
>PASS  packages/__tests__/reactive/effect.spec.js
>PASS  packages/__tests__/reactive/collection/WeakSet.spec.js
>PASS  packages/__tests__/reactive/collection/Set.spec.js
>PASS  packages/__tests__/reactive/collection/Map.spec.js
>PASS  packages/__tests__/reactive/collection/WeakMap.spec.js
>
>Test Suites: 7 passed, 7 total
>Tests:       149 passed, 149 total
>Snapshots:   0 total
>Time:        5.94 s
>Ran all test suites.
>☁  vue-next-code-read [master] ⚡

- <font color="green">✓ should hold a value (8 ms)</font>

  ```js
  it('should hold a value', () => {
    const a = ref(1) // a -> { get value() {}, set value(val) {}, __v_isRef: true }
    expect(a.value).toBe(1) // true
    a.value = 2 // 在构造 set value(val) { trigger(r, 'set', 'value', void 0) }
    expect(a.value).toBe(2) // true
  })
  ```

- <font color="green">✓ should be reactive (2 ms)</font>

  ```js
  it('should be reactive', () => {
    const a = ref(1) // { get value(), set value(), __v_isRef: true }
    let dummy
    let calls = 0
    effect(() => {
      calls++ // 1
      dummy = a.value // 1
    })
    expect(calls).toBe(1) // true，effect会立即执行一次
    expect(dummy).toBe(1) // true，同上
    a.value = 2 // 赋值触发 set value -> trigger: set
    expect(calls).toBe(2) // 因为赋值 trigger: set 触发 updater
    expect(dummy).toBe(2)
    // same value should not trigger
    a.value = 2 // 值没变，被 hasChanged() 阻拦，不 trigger
    // if (hasChanged(toRaw(newVal), rawValue)) {
    expect(calls).toBe(2)
    expect(dummy).toBe(2)
  })
  
  ```

- <font color="green">✓ should make nested properties reactive (2 ms)</font>

  ```js
  it('should make nested properties reactive', () => {
    const a = ref({
      count: 1
    })
    let dummy
    effect(() => {
      // a.value 触发一次 ref track
      // a.value.count 触发一次普通的 reactive track
      // 所以这里会有两次 track
      dummy = a.value.count
    })
    expect(dummy).toBe(1) // true
    a.value.count = 2 // 这里依旧会触发两次 get
    expect(dummy).toBe(2) // true
  })
  
  ```

  测试：![](http://qiniu.ii6g.com/1590483209.png?imageMogr2/thumbnail/!100p)

- <font color="green">✓ should work without initial value (1 ms)</font>

  createRef(undefined) 并不影响它的使用，只会初始值是 undefined。

- <font color="green">✓ should work like a normal property when nested in a reactive object (2 ms)</font><span id="reactive-nest-ref"></span>

  ```js
  it('should work like a normal property when nested in a reactive object', () => {
    const a = ref(1)
    // 这里 ref 类型的a 被作为对象成员传递给 reactive 之后，会被转成正常的值
    // 因为 baseHandlers.js 里面的 createGetter 的时候，有检测 isRef 是不是 Ref 类型 ?
    // 如果是且非数组的话会直接返回 res.value ，其实就是被普通化了(unref)之后将结果返回
    // 也就是说它只影响在 get 的时候返回的值，实际上在嵌套的对象里面 a 还是 Ref: a 类型的那个 a
    /*
    	if (isRef(res)) {
        if (targetIsArray) {
          !isReadonly && track(target, 'get', key)
          return res
        }
        return res.value
      }
    */
    // 所有后面可以直接 obj.a++ 操作
    const obj = reactive({
      a,
      b: {
        c: a
      }
    })
  
    let dummy1
    let dummy2
  
    effect(() => {
      // 这个时候的 a 和 c 虽然一开始都是 a，但是由于传递给 
      // reactive 之后被还原成最原始的值 1 了，所以这里 dummy1,2 都是 1
      // 而非表面上的 Ref(1)
      dummy1 = obj.a 
      dummy2 = obj.b.c
    })
  
    const assertDummiesEqualTo = (val) =>
    [dummy1, dummy2].forEach((dummy) => expect(dummy).toBe(val))
  
    // 有了上面的结论下面结果就很明显了，也很好理解了
    assertDummiesEqualTo(1) // true，被还原的 Ref(1)
    a.value++ // ++ 之后改变的是 Ref:a，引用类型
    // 但是这里为什么是 2 呢？？？
    // 原因其实就是上面 reactive 的时候 只是在 trigger:get 的时候返回的是 ref.value
    // 实际上并没有改变 Ref:a 自身，只是影响了 get 的返回值而已
    assertDummiesEqualTo(2) 
    // 但是这里 obj.a++ <=> obj.a = obj.a + 1
    obj.a++
    assertDummiesEqualTo(3)
    obj.b.c++
    assertDummiesEqualTo(4)
  })
  
  ```

  看下最后 obj 变成啥了？

  ![](http://qiniu.ii6g.com/1590485724.png?imageMogr2/thumbnail/!100p)

  <span id="question-ref-++">最后可以看到 Ref:a 在 obj 里面尽管执行了 obj.a++ 和 obj.b.c++ 依旧还是 Ref: a？？？？</span>

  

- <font color="green">✓ should unwrap nested ref in types (1 ms)</font>

  在 createRef 第一行就加了检测是不是 Ref 如果是就直接返回了。

- <font color="green">✓ should unwrap nested values in types (1 ms)</font>

  ```js
   it('should unwrap nested values in types', () => {
      const a = {
        b: ref(0) // 这里虽然是 Ref
      }
  
      const c = ref(a) // 发生嵌套了
  
      // 但是在访问的时候，还记得之前那个测试用例碰到的问题吗？
      // createGetter 里面返回 Ref 会直接 返回 ref.value
      // 所以这里访问 c.value.b 其实相当于 c.value.b.value 
      // 所以 + 1 的结果肯定是 number 类型
      expect(typeof (c.value.b + 1)).toBe('number')
    })
  
  ```

  

- <font color="green">✓ should NOT unwrap ref types nested inside arrays</font>

  这个用例和上一个是一样的原理，有个不同的地方是，target 是数组，createGetter 不是返回 res.value 了，而是直接返回 res，因为是数组类型且取的是整个数组对象。

  而后面通过 `arr[i]` 取值就和上一个用例一样了，一样会检测到数组元素如果是 Ref 照样会返回 res.value，所以在数组中使用 Ref(val) 做数组成员，然后 ref 数组是没有问题的。

- <font color="green">✓ should keep tuple types (6 ms)</font>

  不管你是什么类型元素，数组类型首先是整个数组访问直接返回 ref，然后如果是数组元素会检测是不是引用类型，如果是就 reactive ，不是直接返回结果。

- <font color="green">✓ should keep symbols (4 ms)</font>

- <font color="green">✓ unref</font>

- <font color="green">✓ shallowRef (2 ms)</font>

  ```js
  test('shallowRef', () => {
    const sref = shallowRef({ a: 1 }) // shallow，那么里面的 {a:1} 对象是不会被 reactive 的
    expect(isReactive(sref.value)).toBe(false)// 所以这里就是 False
  
    let dummy
    effect(() => {
      // 这里依然会立即执行一次，且只会触发一次 track:get，因为有 sref.value 取值操作
      // 但是由于 {a: 1} 并不是 Reactive ，所以对 a 的取值是不会触发 track:get 的
      dummy = sref.value.a
    })
    expect(dummy).toBe(1) // true
  
    sref.value = { a: 2 } // 这里重新赋值整个 value
    expect(isReactive(sref.value)).toBe(false) // 虽然改变了 value 但的值依旧是普通对象
    expect(dummy).toBe(2) // 因为改变了 value，而 sref 还是 ref 类型，会触发 set value 
  })
  ```

  

- <font color="green">✓ shallowRef force trigger (1 ms)</font>

  手动调用 triggerRef 触发 `trigger(r, 'set', 'value', void 0)` 执行以来 deps

- <font color="green">✓ isRef (1 ms)</font>

- <font color="green">✓ toRef (2 ms)</font>

- <font color="green">✓ toRefs (1 ms)</font>

- <font color="green">✓ customRef</font>
  自定义 Ref 功能最主要的就是将控制权交给使用者，比如何时 track dep，何时 trigger dep 操作。

  ```js
  test('customRef', () => {
      let value = 1
      let _trigger
  
      const custom = customRef((track, trigger) => ({
        get() {
          track() // 根据实际情况调用来收集依赖
          return value
        },
        set(newValue) {
          value = newValue
          _trigger = trigger // 可缓存 trigger 不一定要立即触发 deps
        }
      }))
  
      expect(isRef(custom)).toBe(true) // customRef 依旧返回的是 Ref
  
      let dummy
      effect(() => {
        dummy = custom.value
      })
      expect(dummy).toBe(1)
  
      custom.value = 2
      // should not trigger yet
      expect(dummy).toBe(1)
  
      _trigger()
      expect(dummy).toBe(2)
    })
  
  ```

[ref 版 reactive.js](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/reactive_ref)

# computed.ts

最后一个了，两周的坚持总算快结束了。

这块的实现就更简单了，就一个 computed() 函数，结合 effect() + ref 来实现。

```js
export function computed(getterOrOptions) {
  let getter, setter

  if (typeof getterOrOptions === 'function') {
    getter = getterOrOptions
    setter = __DEV__ ? () => console.warn('计算属性只读。') : noop
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }

  let dirty = true // 脏位检查，为 true 表示值有变化，重新取值
  let value
  let computed 

  // runner 不会立即执行，直到计算属性取值在 get value 中手动调用
  // 来触发所有有关的依赖，重新计算得到最新的值 value
  const runner = effect(getter, {
    lazy: true,
    computed: true,
    // 然后这里提供调度器，不直接
    scheduler: () => {
      if (!dirty) {
        dirty = true
        trigger(computed, 'set', 'value')
      }
    }
  })

  computed = {
    __v_isRef: true,
    effect: runner,
    get value() {
      // 取值时，检测 dirty ，如果脏了(有变)，就重新 runner 取值，运行所有 deps，得到最新的值
      if (dirty) { 
        value = runner()
        dirty = false // 重新计算后的重置 
      }
      track(computed, 'get', 'value') // 收集依赖
      return value
    },
    set value(newValue) {
      setter(newValue)
    }
  }

  return computed
}
```

## 测试一：依赖收集

```js
const value = reactive({})
const cValue = computed(() => value.foo)
cValue.value
console.log(
  cValue.effect.deps[0].values().next().value === cValue.effect,
  value
)  // true Proxy {__v_reactive: Proxy}
```

当 cValue.value 执行对 Ref 进行取值(get value())触发，执行

```js
computed = {
  // ...
  effect: runner,
  get value() {
    if (dirty) { // 检测到 dirty = true
      // 执行 effect -> 执行 getter: () => value.foo
      // 计算新值 undefined 赋值给 value
      value = runner() 
      dirty = false 
    }
    track(computed, 'get', 'value') // 触发
	}
  // ...
}
```

`cValue.value` 首先这一句会触发两个 `track`

>{shouldTrack: true, type: "get", key: "foo", target: {…}, activeEffect: ƒ}
>{shouldTrack: true, activeEffect: undefined, type: "get", key: "value", target: {…}}

1. `get value()` 里面执行了 runner() -> value.foo 取了一次 foo ，所以 *type: get, key: foo*
2. `get value()` 里手动执行了一次 `track(computed, 'get', 'value')`，但是由于 activeEffect 是 undefined 所以不会继续往下执行

因此，虽然调用了两次 track ，但只有 value.foo 的 track 会去往下收集 `effect:runner` 这个依赖。所以：

`cValue.effect.deps[0].values().next().value === cValue.effect // --> true` 

随后， `value.foo = 1` 会触发上面收集到的依赖，执行一次 runner() 取 value.foo 的最新值： 1。

![](http://qiniu.ii6g.com/1590548272.png?imageMogr2/thumbnail/!100p)

注意图中圈起来的，其实我想知道在调用 value.foo = 1 之后 cValue.value 的值会不会发生改变，按照代码逻辑是不会改变的，也就还是 undefined。但是直接点击 `...` 浏览器会相当于触发一次 `getter` 操作，最后结果会是 1，但是这不是我们想要的，不能让它触发。

那么就得想办法在它触发之前将老的值输出出来才行，结合代码只有在 `get value()` 一开始加上打印才行，如下：

```js
computed = {
  // ...
  get value() {
    // 因为点击省略号会触发 getter ，会进入到这里
    // 所以只需要提前将值打印出来就知道在 value.foo 设置下去之后
    // cValue.value 其实是没有发生任何改变的，依旧还是 undefined
    console.log({ value }, 'before runner')
    if (dirty) {
      value = runner()
      dirty = false
    }
    track(computed, 'get', 'value')
    return value
  },
}
```

![](http://qiniu.ii6g.com/1590548546.png?imageMogr2/thumbnail/!100p)

然后修改下输出： 

```js
const value = reactive({})
const cValue = computed(() => value.foo)
console.log(cValue.value, '1') // undefined，触发 runner() 执行 () => value.foo
// 在这里并不会立即触发 runner() 调用 () => value.foo 更新 cValue.value 的值
// 所以在这里设置之后到最后的 log 之前 cValue.value 依旧是 undefined
// 但是这里会有个动作和 computed 有关，那就是计算属性里面的 scheduler() 
// 里面会检测 dirty = false(因为上面 get value 过，所以是 false)，
// 触发 trigger(computed, 'set', 'value')，这里会触发所有和 computed-value 有关的依赖
// 还有个重要的就是将 dirty = true，这样，后面当访问计算属性的时候才会触发 runner() 更新值
value.foo = 1 
// 然后访问一次 cValue.value 触发其 get value() 检测到 dirty 是 true
// 然后触发 runner() 调用 () => value.foo 更新 value 的值
// 所以下面的输出值就是 value.foo 的值
console.log(cValue.value, '2') // 1
```

## jest

- <font color="green">✓ should return updated value (5 ms)</font>

  ```js
  it('should return updated value', () => {
    const value = reactive({})
    // 提供的是函数，所以只有 getter，且不会立即执行(计算属性有设置：lazy: true)
    // 返回一个 Ref 类型值
    // 依赖属性：value.foo
    const cValue = computed(() => value.foo)
    // 取值收集 value 的依赖，此时 dirty = true，执行 runner() 得到 undefined
    expect(cValue.value).toBe(undefined)
    // 赋值触发 value.foo 的 trigger: set，然后检测到该 effect 有提供 scheduler
    // 因此调用 cValue.options.scheduer 
    // 此时的 dirty = false(get value 的时候置为 false 的)，
    // 触发 cValue 的 trigger: set -> value 调用 set value()
    value.foo = 1
    expect(cValue.value).toBe(1)
  })
  
  ```

  

- <font color="green">✓ should compute lazily (3 ms)</font>

  ```js
  it('should compute lazily', () => {
    const value = reactive({})
    const getter = jest.fn(() => value.foo)
    const cValue = computed(getter)
  
    // lazy
    expect(getter).not.toHaveBeenCalled() // 计算属性默认是 lazy 的所以不会立即执行
  
    expect(cValue.value).toBe(undefined) // get value() -> runner() -> 触发一次 getter
    expect(getter).toHaveBeenCalledTimes(1) // true
  
    // should not compute again
    cValue.value // 因为上面取过一次值了所有 dirty = false ，不会重复 runner()
    expect(getter).toHaveBeenCalledTimes(1)
  
    // should not compute until needed
    // 不会立即重新计算，此时 cValue.value 值依旧是 undefined，上面有分析过了
    // 由于 foo 有收集到 computed.effect 这个依赖，一次赋值的时候会触发它执行
    // 而 computed.effect.options.scheduler 又存在，因此会执行 scheduler
    // 里面重置 dirty = true，标识值由变化
    value.foo = 1 
    // 因为不会触发 get value() 就不会 runner()，也就不会重新 getter()
    expect(getter).toHaveBeenCalledTimes(1) 
  
    // now it should compute
    // 发生取值操作，会触发 get value() 此时 dirty = true(value.foo = 1的时候触发的 scheduler)
    // 因此这里取值的时候会发现值变化了，所以需要重新 runner() 取新值，然后又置 dirty = false
    expect(cValue.value).toBe(1)
    // 上面取值，runn() -> getter()
    expect(getter).toHaveBeenCalledTimes(2)
  
    // should not compute again
    cValue.value // 一样的道理，dirty = false 了，所以不会重新 runner()
    expect(getter).toHaveBeenCalledTimes(2)
  })
  ```

  

- <font color="green">✓ should trigger effect (1 ms)</font>

  ```js
  const value = reactive({})
  const cValue = computed(() => value.foo)
  let dummy
  effect(() => {
    // 这个会立即执行一次，触发 get value() 执行 runner() -> getter()
    // 但是 value.foo 是没有指定 所以是 undefined
    dummy = cValue.value 
  })
  expect(dummy).toBe(undefined)
  // 这里设置为什么会触发 effect(fn) 里面的 fn 呢？？？
  // 1. computed(updater1) 执行完之后，effect:runner() 并未立即执行
  //   所以 shouldTrack = true 和 activeEffect = undefined 并没有任何改变
  // 2. effect(fn) 执行完会立即执行 fn，里面访问了 cValue.value 触发 get value()
  //   执行 effect:runner() -> getter(): () => value.foo 此时 value.foo 取值触发其收集依赖
  //   此时的 activeEffect 其实还是 fn，因为 fn 没有执行完就不会重置(try...finally)
  // 3. 所以下面执行 value.foo = 1 的时候是会触发 fn 执行的，因为在 2 中已经将它收集到了
  // 4. 执行 fn 导致 cValue.value 取值，触发 get value() 执行 runner() -> getter() 取最新的
  //    值 1，因此 dummy 的值就是 1 了。
  value.foo = 1
  expect(dummy).toBe(1)
  ```

  所以上这个用例的关键点在于**<font color="red">理解 value.foo 是如何收集到 effect(fn) 里面的fn</font>**，因为 fn 里面并没有直接访问 value.foo ，而是访问的 cValue.value。

- <font color="green">✓ should work when chained (1 ms)</font><span id="test-case-computed-chained"></span>

  ```js
  it('should work when chained', () => {
    const value = reactive({ foo: 0 })
    const c1 = computed(() => value.foo)
    const c2 = computed(() => c1.value + 1)
    // 1. c2:runner() -> c2:getter() -> c1.value -> c1:runner() -> c1.getter() -> 0 + 1 = 1
    // 且此时 value.foo 收集到了 c1.effect
    // 且 c1.value 在触发 get value() 时候收集到了 c2.effect
    expect(c2.value).toBe(1) 
    // 2. 因为上面触发了 c1:runner() 所以 c1.value = 0
    expect(c1.value).toBe(0)
    // 3. 因为在 step1 value.foo 收集到了 c1:effect，所以这里改变 value.foo
    //   会触发 c1:effect，执行 runner()，将 c1:dirty 置为 true
    value.foo++
    // 4. c2.value -> c2: get value() -> c2 runner() -> c1.value: get value()
    //    -> c1 runner() -> value.foo = 1 + 1 = 2
    expect(c2.value).toBe(2)
    // 5. c1.value 此时就算不访问 c1.value 触发 get value() 这里 c1.value 也是 1
    expect(c1.value).toBe(1)
  })
  
  ```

  为了方便区分，这里给 `computed(getterOrOptions, id)` 加个 id 参数，方便跟踪当前是按个 computed .

  ```js
  // 从结果直接分析原因，将下面的输出行用 Pn 标记
  const value = reactive({ foo: 0 })
  const c1 = computed(() => value.foo, 'c1')
  const c2 = computed(() => c1.value + 1, 'c2')
  // 首先上面三行不会触发任何输出
  // 1. log1 会触发 P1,P2,P3，原因：
  //    c2.value -> c2:get value()输出P1, dirty = true -> 
  //          runner() + track + dirty = false ->
  //    执行 c2:getter(), c1.value + 1 -> 访问 c1.value 
  //    c1.value -> c1:get value()输出P2, dirty = true -> 
  //          runner() + track + dirty = false ->
  //    执行 c1:getter(), c1.value = value.foo = 0
  //    然后往回推： c1.value -> c1.value + 1 = 1 -> c2.value -> 输出 P3，c2.value 值为 1
  // 2. 第一步结束之后的状态：
  //    value.foo, deps[c1.effect]，value.foo = 1
  //    因为都触发了 get value() 所以各自收集到了自身的 effect 
  //    c1, deps[c1.effect], c1.value = 0, dirty = false，等待 scheduler 调用置为 true
  //    c2, deps[c2.effect], c2.value = 1, dirty = false，等待 scheduler 调用置为 true
  console.log(c2.value, 'c2.value 1') // log1, 1
  // 3. log2 会触发 P4, P5，原因：
  //    只是 c1.value 取值，会触发 get value()，因此有了 P4 输出
  //    但因为此时的 dirty = false 不会重复执行 runner()，所以值依旧是 0，最后输出 P5
  console.log(c1.value, 'c1.value 1') // log2, 0
  
  // 增加下面三个输出，让依赖收集结果更清晰
  const dep = targetMap.get(toRaw(value))
  // 这里收集到的是 c1.effect，因为 c1.value ->get value() 执行了 runner() 触发
  // value.foo 将 c1.effect 收进 deps
  console.log(dep, dep.get('foo').values().next().value === c1.effect) // , true
  console.log(
    c1.effect.deps,
    c1.effect.deps[0].values().next().value === c1.effect, // true
    'c1 deps'
  )
  console.log(
    c2.effect.deps,
    c2.effect.deps[0].values().next().value === c2.effect, // true
    'c2 deps'
  )
  
  // 这里++，会触发 c1.effect，因为 c1:dirty = false，所以调用 c1.options.scheduler，
  // c1.dirty = true，trigger-c1:set-value
  // 记住一点：computed 属性没有取值就不会触发 runner()，所以这句执行之后
  // c1.value 依旧是 0，c2.value 依旧是 1
  // 通过之前的方式可测试出结果，如下图中结果
  value.foo++
  
  // 4. log3 会输出 P9, P10, P11
  // c2.value 取值，触发 c2:runner() 重新计算值，c1.value + 1，触发
  // c1.value 取值，触发 c1:runner() 重新计算值，得到 c1.value = value.foo(++之后的值为1) = 1
  // 然后：c2.value = c1.value + 1 = 1 + 1 = 2
  // 所以这里会输出2，请看下面的，P9,P10,P11，其实这句之后 c1.value 已经是 1了
  // 因为这里触发了 c1.value 取值
  console.log(c2.value, 'c2.value 2') // log3, 2
  // 5. log4会输出 P12,P13，其实这里无论用不用 c1.value 它的值都已经是 1 了
  //    所以这里纯粹只是取值，不会重复 runner()，因为 step 4-log3 触发过 get value() diry = false
  //    了。
  console.log(c1.value, 'c1.value 2') // log4, 1
  ```

  输出：

  >P1: {id: "c2", value: undefined} "before runner"
  >P2: {id: "c1", value: undefined} "before runner"
  >P3: 1 "c2.value 1"
  >P4: {id: "c1", value: 0} "before runner"
  >P5: 0 "c1.value 1"
  >
  >P6: Map(1) {"foo" => Set(1)} true
  >P7: [Set(1)] true "c1 deps"
  >P8: [Set(1)] true "c2 deps"
  >
  >// 新增 Log3 之后的输出
  >
  >P9: {id: "c2", value: 1} "before runner"
  >P10: {id: "c1", value: 0} "before runner"
  >P11: 2 "c2.value 2"
  >
  >// 新增 log4 之后的输出
  >
  >P12: {id: "c1", value: 1} "before runner"
  >P13: 1 "c1.value 2"

  点击省略号输出：

  ![](http://qiniu.ii6g.com/1590560419.png?imageMogr2/thumbnail/!100p)

  

- <font color="green">✓ should trigger effect when chained (3 ms)</font>

  [请看上一个用例的分析---->>](#test-case-computed-chained)

- <font color="green">✓ should trigger effect when chained (mixed invocations) (3 ms)</font>

  [请看上上一个用例的分析---->>](#test-case-computed-chained)

- <font color="green">✓ should no longer update when stopped (2 ms)</font>

  同上。但是有一点需要知道，stop() 主要干两件事：

  1. cleanup(effect) -> deps = [] 清空依赖
  2. effect.active = false

  那么问题就很清晰了，stop 之后 active 为 false，在执行 effect() 的时候一开始就是检测是不是激活状态，如果不是会返回 undefined(有 scheduler清空)或者 fn(...args) 执行结果。不会继续往下执行 try...finally。

  ```js
  if (!_effect.active) {
    return options.scheduler ? undefined : fn(...args)
  }
  ```

  所以说这里 stop 之后再赋值，调用 effect.scheduler() 相当于什么都没干。

- <font color="green">✓ should support setter (2 ms)</font>

- <font color="green">✓ should trigger effect w/ setter</font>

  plusOne.value = 0` 会触发 setter 调用 options.set: `n.value = val - 1`。

  那么 n.value 变了 就会触发 effect(fn) 里面的 dep:fn 更新 dummy 值。

- <font color="green">✓ should warn if trying to set a readonly computed</font>



# 总结

<font size="20" color="red">Over</font><font size="3">💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥💥.</font>

终于结束了，经过两周的坚持，终于将 vue3.0 reactivity 模块源码“抄完”了。

此时此刻，貌似没什么话要写的了......，唯有

<font color="magenta" size="6">路漫漫其修远兮，吾将上下而求索！！！</font>



两周以来，每天脑子空闲了里面都是 vue3.0 reactivity 代码，甚至睡觉都在做梦敲这块的代码，做梦都在思考所经历的代码流程和细节。

总的下来，只有感叹自己能力不足，越学习越觉得自己垃圾！！！

路还很长，不能放弃，回来这几年总感觉心有力而余不足，更是感叹大学没好好学好基础，更体会到书到用时方恨少方恨少，(⊙o⊙)…，有点扯远了！！！

-----



还是老老实实的来复盘⑧ （开始 -> 🔚）：

## **第一阶段：reactive() **

`reactive(target) -> createObjectReactive(target, isReadonly, baseHandlers, collectionHandlers)`

创建 reactive 对象，之前的 toProxy, toRaw 改成了 ReactiveFlags 标记方式存储到 target 和 observed 对象上了，而不是单独的声明两个模块遍历来专门存储 target -> observed 和 observed -> target 的关系。

**baseHandlers**: 基本对象类型的 proxy handler，原生的 Reflect 基本都提供了对应的能力。

**collectionHandlers**：集合类型(Map, Set, WeakMap, WeakSet) 对象的 proxy handlers，由于原生 Reflect 并没有支持它们的原子操作，所以只能通过对象的 proxy get ，来获取所调用的方法名去对应的 instrumentations 里面查找与之相关的 handler 来模拟集合类型的所有操作。

可进行 reactive 的的条件

1. _isVue: false 表示 Vue 实例类型
2. _VNode: false 虚拟节点类型
3. !rawValues 中的类型或值
4. 可 observable 类型(除Map, Set, WeakMap, WeakSet, Object, Array意外的类型)
5. 非 Object.isFrozen 类型

经过更新之后前面三种都合并到了 ReactiveFlags.__v_skip 里面了(结合 markRaw(value) 将不能被观察的值置为 __v_skip: true)。

最后变成了三种检测：

1. __v_skip = false
2. observable 类型
3. 非 frozen 对象

取消 toProxy, toRaw 之后使用 target.__v_readonly 和 target.__v_reactive 来保存 observed,  target.__v_raw 来保存 proxy 之前的对象。

所以一旦检测到 __v_readonly 和 __v_reactive 值存在就直接返回这个缓存的 proxy。

## 第二阶段：baseHandlers

**createGetter -> 创建 proxy get**：

返回的时候检测 isReadonly 决定使用 readonly() 还是 reactive() 做深层的 reactive。

如果指定了 shallow = true 参数，那么只会针对对象的第一层做 reactive。

如果是数组的三个索引操作，直接进入 arrayInstrumentations 处理，调用封装之后的 includes, indexOf, lastIndexOf。

如果是 Ref 类型直接返回 res.value，如果又是数组，手动 track 一次数组元素的 'get' 操作，直接返回该数组 res。

**createSetter -> 创建 proxy set**：

如果是 Ref 类型要将值设置到 oldValue.value 上，而不是直接将值通过 Reflect.set() 设置下去。

然后根据 oldValue 和 newValue 进行比较，排除 NaN 的可能之后，如果有发生变化就调用 trigger，如果 target 上没有的 key 就是 `trigger: add`，否则 `trigger:set`。

**deleteProperty -> 创建 proxy delete**：

trigger delete。

**has -> 创建 proxy has**：

track has 收集依赖。

**ownKeys -> 创建 proxy ownKeys** ：

track ITERATE_KEY 迭代器收集依赖。

## 第三阶段：effect() 构建 Dep

effect(fn, options) 是将 fn 构造成 Dep 类型，所以，其实Vue里面所有的依赖都是一个 effect 函数，函数上挂了若干个属性(`_isEffect, active, id, deps, options, raw`)。

这里的重点在于 reactiveEffect 函数的实现里面有个 try...finally 它结合 shouldTrack 和 activeEffect 保证了在 Dep 里面执行 `value.n++` 不会出现死循环，因为 trigger 里面的 add 操作会检测这两个值，如果 `activeEffect !== effect`(当前的这个 Dep) 或者 `shouldTrack = false` 才会收集要执行的依赖。

```js
try {
  // enable effect
  return fn(...) // 这个就是 effect(() => {}) 传入的函数
} catch {
	// 结束当前 effect 构建
	// shouldTrack = false
	// activeEffect = undefined
}
```

## 第四阶段：collectionHandlers

这里就有意思了......

因为没有集合类型的直接 proxy 对应的 Reflect，因此只能采取另类的方式来解决这个问题。

不管什么情况下，obj.fn 都属于属性值的访问，也就是说当使用 obj.fn() 的时候，无论如何都会出发 obj 对 fn 属性的 `get` 操作。

所以对于 collectionHandlers 里面就只有一个 get。

然后通过 obj.fn -> 出发 get, key 为 fn -> `Reflect.get(instrumentations, 'fn', ...)`，然后通过 fn 即函数名称去 instrumentations 里面找到对应的函数(比如：set, get, add, has, 等等...)。

最后根据调用 `obj.fn(...args)` 时传递的参数转接到 instrumentations 里面对应的函数参数上。

这部分的重点在于 instrumentations 里面函数的调用时作用域问题的解决：

1. 从 target.prototype 原型上取出对应的方法(如：has, get, set, add)
2. 然后通过 `has.call(target)` 然后将调用域指回给 target(Map, Set...)

不然会出现 Map.prototype.has 在 Proxy 类型上调用而找不到函数的问题。

另一个需要关注的是 key, rawKey 的问题，这里的意义在于：

​	<font color="blue">*如果 key-> proxyKey ，如果同时用 key 和 proxyKey 取 get 值的时候会发现最终 proxyKey 会被转成 key再取值。这里应该是为了避免 proxyKey 和 key 会同时被添加如 Map 或 Set 问题*。</font>

## 第四阶段：Ref

Ref 类型，主要提供了将原始类型值转成 reactive 的能力。

它通过将值封装成 ： `{__v_isRef: true, get value(){}, set value() {} }` 对象来完成 reactive 功能。

这里重点是几个函数：

1. `ref(value)` 将值转成 Ref 类型
2. `createRef(value, shallow)` 被 ref 或 shallowRef 调用来创建 Ref
3. `triggerRef(ref)` 触发 Ref 上的 deps
4. `customRef(factory)` 提供外部自定义 Ref 能力
5. `toRef(object)` 将对象转成 Ref 类型

Ref 类型关键：

1. get value() -> track 收集依赖
2. set value(val) -> trigger 依赖

## 第五阶段：computed(getterOrOptions)

computed 实现原理：

1. Ref 类型
2. dirty 脏检查位

所以计算属性就是个 Ref 类型结果对象，包含(`__v_isRef, get value(), set value()`)，有两种使用方式

1. getterOrOptions 是函数那么就只会有 getter
2. getterOrOptions 是对象可以提供自定义的 setter 和 getter

每个 computed 都有一个名为 runner 的 effect，用来处理计算属性所依赖的值的变更所需要作出的行为。

一个计算属性使用流程大概是这样的：

1. 取值触发 get value() 

2. 检查 dirty，如果为 true，表示值由边则调用 runner() 重新计算新值

3. 如果依赖的值发生变更，也会触发 runner()

   *因为 runner 是个 effect，在 fn 里面使用其他值(比如：`obj.foo`)会触发这些值来收集这个 effect:runner 所以这些值改变会触发 runner。*

4. 即 obj.foo++ 改变，调用 trigger:set，trigger的时候检测到 runner 有schudler 所有调用它

   *此时 runner: dirty 如果是 false 情况下就会触发 trigger(computed, 'set', 'value')，重点是会将脏位标识置为 dirty = true，那么下次取值的时候就会知道值发生改变了，就会触发 runner() 重新计算值。*

5. 经过第四部之后， computed.value 并没有真正的更新，必须它被实际访问的时候才会去触发 runner() 重新计算值。

**所以说计算属性并不是在依赖值更新之后就会立即发生变化，必须在依赖值变更之后被访问了之后触发 get value() 才会重新计算值。**

----

严格来说应该不是按照这五个阶段来完成的，其实最耗时间的是在第一和第二阶段，尤其是第二阶段。

第二阶段耗时间的地方有两个

1. createGetter -> track
2. createSetter -> trigger

主要时间花在这两个上了，所以如果还可以拆分阶段肯定是这里。

