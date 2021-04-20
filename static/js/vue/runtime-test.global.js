var VueRuntimeTest = (function (exports) {
  'use strict';

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */
  function makeMap(str, expectsLowerCase) {
      const map = Object.create(null);
      const list = str.split(',');
      for (let i = 0; i < list.length; i++) {
          map[list[i]] = true;
      }
      return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
  }

  const GLOBALS_WHITE_LISTED = 'Infinity,undefined,NaN,isFinite,isNaN,parseFloat,parseInt,decodeURI,' +
      'decodeURIComponent,encodeURI,encodeURIComponent,Math,Number,Date,Array,' +
      'Object,Boolean,String,RegExp,Map,Set,JSON,Intl';
  const isGloballyWhitelisted = /*#__PURE__*/ makeMap(GLOBALS_WHITE_LISTED);

  function normalizeStyle(value) {
      if (isArray(value)) {
          const res = {};
          for (let i = 0; i < value.length; i++) {
              const item = value[i];
              const normalized = normalizeStyle(isString(item) ? parseStringStyle(item) : item);
              if (normalized) {
                  for (const key in normalized) {
                      res[key] = normalized[key];
                  }
              }
          }
          return res;
      }
      else if (isObject(value)) {
          return value;
      }
  }
  const listDelimiterRE = /;(?![^(]*\))/g;
  const propertyDelimiterRE = /:(.+)/;
  function parseStringStyle(cssText) {
      const ret = {};
      cssText.split(listDelimiterRE).forEach(item => {
          if (item) {
              const tmp = item.split(propertyDelimiterRE);
              tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
          }
      });
      return ret;
  }
  function normalizeClass(value) {
      let res = '';
      if (isString(value)) {
          res = value;
      }
      else if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              res += normalizeClass(value[i]) + ' ';
          }
      }
      else if (isObject(value)) {
          for (const name in value) {
              if (value[name]) {
                  res += name + ' ';
              }
          }
      }
      return res.trim();
  }

  /**
   * For converting {{ interpolation }} values to displayed strings.
   * @private
   */
  const toDisplayString = (val) => {
      return val == null
          ? ''
          : isObject(val)
              ? JSON.stringify(val, replacer, 2)
              : String(val);
  };
  const replacer = (_key, val) => {
      if (isMap(val)) {
          return {
              [`Map(${val.size})`]: [...val.entries()].reduce((entries, [key, val]) => {
                  entries[`${key} =>`] = val;
                  return entries;
              }, {})
          };
      }
      else if (isSet(val)) {
          return {
              [`Set(${val.size})`]: [...val.values()]
          };
      }
      else if (isObject(val) && !isArray(val) && !isPlainObject(val)) {
          return String(val);
      }
      return val;
  };

  const EMPTY_OBJ =  Object.freeze({})
      ;
  const EMPTY_ARR =  Object.freeze([]) ;
  const NOOP = () => { };
  /**
   * Always return false.
   */
  const NO = () => false;
  const onRE = /^on[^a-z]/;
  const isOn = (key) => onRE.test(key);
  const isModelListener = (key) => key.startsWith('onUpdate:');
  const extend = Object.assign;
  const remove = (arr, el) => {
      const i = arr.indexOf(el);
      if (i > -1) {
          arr.splice(i, 1);
      }
  };
  const hasOwnProperty = Object.prototype.hasOwnProperty;
  const hasOwn = (val, key) => hasOwnProperty.call(val, key);
  const isArray = Array.isArray;
  const isMap = (val) => toTypeString(val) === '[object Map]';
  const isSet = (val) => toTypeString(val) === '[object Set]';
  const isFunction = (val) => typeof val === 'function';
  const isString = (val) => typeof val === 'string';
  const isSymbol = (val) => typeof val === 'symbol';
  const isObject = (val) => val !== null && typeof val === 'object';
  const isPromise = (val) => {
      return isObject(val) && isFunction(val.then) && isFunction(val.catch);
  };
  const objectToString = Object.prototype.toString;
  const toTypeString = (value) => objectToString.call(value);
  const toRawType = (value) => {
      // extract "RawType" from strings like "[object RawType]"
      return toTypeString(value).slice(8, -1);
  };
  const isPlainObject = (val) => toTypeString(val) === '[object Object]';
  const isIntegerKey = (key) => isString(key) &&
      key !== 'NaN' &&
      key[0] !== '-' &&
      '' + parseInt(key, 10) === key;
  const isReservedProp = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,' +
      'onVnodeBeforeMount,onVnodeMounted,' +
      'onVnodeBeforeUpdate,onVnodeUpdated,' +
      'onVnodeBeforeUnmount,onVnodeUnmounted');
  const cacheStringFunction = (fn) => {
      const cache = Object.create(null);
      return ((str) => {
          const hit = cache[str];
          return hit || (cache[str] = fn(str));
      });
  };
  const camelizeRE = /-(\w)/g;
  /**
   * @private
   */
  const camelize = cacheStringFunction((str) => {
      return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
  });
  const hyphenateRE = /\B([A-Z])/g;
  /**
   * @private
   */
  const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
  /**
   * @private
   */
  const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
  /**
   * @private
   */
  const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));
  // compare whether a value has changed, accounting for NaN.
  const hasChanged = (value, oldValue) => value !== oldValue && (value === value || oldValue === oldValue);
  const invokeArrayFns = (fns, arg) => {
      for (let i = 0; i < fns.length; i++) {
          fns[i](arg);
      }
  };
  const def = (obj, key, value) => {
      Object.defineProperty(obj, key, {
          configurable: true,
          enumerable: false,
          value
      });
  };
  const toNumber = (val) => {
      const n = parseFloat(val);
      return isNaN(n) ? val : n;
  };

  const targetMap = new WeakMap();
  // effect 任务队列
  const effectStack = [];
  let activeEffect;
  const ITERATE_KEY = Symbol( 'iterate' );
  const MAP_KEY_ITERATE_KEY = Symbol( 'Map key iterate' );
  // fn 是不是经过封装之后的 ReactiveEffect
  function isEffect(fn) {
      return fn && fn._isEffect === true;
  }
  function effect(fn, options = EMPTY_OBJ) {
      if (isEffect(fn)) {
          fn = fn.raw; // 取出原始的函数，封装之前的
      }
      // 封装成 ReactiveEffect
      const effect = createReactiveEffect(fn, options);
      if (!options.lazy) {
          // 如果并没指定 lazy: true 选项，则立即执行 effect 收集依赖
          // 因为 effect 一般都会有取值操作，此时会触发 proxy get handler
          // 然后执行 track() 结合当前的 activeEffect 即 effect() 执行时候的这个
          // effect，这样取值操作就和当前取值作用域下的依赖函数建立的依赖关系
          effect();
      }
      return effect;
  }
  function stop(effect) {
      if (effect.active) {
          cleanup(effect);
          if (effect.options.onStop) {
              effect.options.onStop();
          }
          effect.active = false;
      }
  }
  let uid = 0;
  function createReactiveEffect(fn, options) {
      // 将 fn 执行封装成  ReactiveEffect 类型的函数
      const effect = function reactiveEffect() {
          if (!effect.active) {
              // 非激活状态，可能是手动调用了 stop
              // 那么执行的时候就需要考虑调用 stop 者是否提供了手动调度该 effect
              // 的函数 scheduler ? 也就是说你停止你可以重新启动
              return options.scheduler ? undefined : fn();
          }
          if (!effectStack.includes(effect)) {
              // 1. cleanup, 保持纯净
              cleanup(effect);
              try {
                  // 2. 使其 tracking 状态有效，track() 中有用
                  enableTracking(); // track() 可以执行收集操作
                  effectStack.push(effect); // effect 入栈
                  // 3. 保存为当前的 activeEffect, track() 中有用
                  activeEffect = effect; // 记录当前的 effect -> track/trigger
                  // 4. 执行 fn 并返回结果
                  return fn(); // 返回执行结果
              }
              finally {
                  // 始终都会执行，避免出现异常将 effect 进程卡死
                  // 5. 如果执行异常，丢弃当前的 effect ，并将状态重置为上一个 effect
                  //   由一个 effect 栈来维护。
                  effectStack.pop();
                  resetTracking();
                  activeEffect = effectStack[effectStack.length - 1];
              }
          }
      };
      effect.id = uid++;
      effect.allowRecurse = !!options.allowRecurse;
      effect._isEffect = true;
      effect.active = true;
      effect.raw = fn; // 这里保存原始函数引用
      effect.deps = [];
      effect.options = options;
      return effect;
  }
  function cleanup(effect) {
      // track() 里面执行dep.add 的同时会将当前被依赖对象存储到
      // activeEffect.deps 里面，这里就是讲这些收集的被依赖者列表全清空
      const { deps } = effect;
      if (deps.length) {
          for (let i = 0; i < deps.length; i++) {
              deps[i].delete(effect);
          }
          deps.length = 0;
      }
  }
  // 当前 effect 没有完成情况下不接受下一个动作
  let shouldTrack = true;
  const trackStack = [];
  function pauseTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = false;
  }
  function enableTracking() {
      trackStack.push(shouldTrack);
      shouldTrack = true;
  }
  function resetTracking() {
      // 重置为上一个 effect track的状态
      const last = trackStack.pop();
      shouldTrack = last === undefined ? true : last;
  }
  /**
   * 负责收集依赖
   * @param {object} target 被代理的原始对象
   * @param {TrackOpTypes} type 操作类型, get/has/iterate
   * @param {unknown} key
   */
  function track(target, type, key) {
      if (!shouldTrack || activeEffect === undefined) {
          return;
      }
      // Map< obj -> Map<key, Set[...deps]> >
      let depsMap = targetMap.get(target);
      if (!depsMap) {
          // 初始化
          targetMap.set(target, (depsMap = new Map()));
      }
      let dep = depsMap.get(key);
      if (!dep) {
          depsMap.set(key, (dep = new Set()));
      }
      // 正在请求收集的 effect ，是初次出现
      if (!dep.has(activeEffect)) {
          dep.add(activeEffect);
          // 自身保存一份被依赖者名单
          activeEffect.deps.push(dep);
          if ( activeEffect.options.onTrack) {
              activeEffect.options.onTrack({
                  effect: activeEffect,
                  target,
                  type,
                  key
              });
          }
      }
  }
  function trigger(target, type, key, newValue, oldValue, oldTarget) {
      const depsMap = targetMap.get(target);
      if (!depsMap) {
          return;
      }
      const effects = new Set();
      const add = (effectsToAdd) => {
          if (effectsToAdd) {
              effectsToAdd.forEach(effect => {
                  if (effect !== activeEffect || effect.allowRecurse) {
                      effects.add(effect);
                  }
              });
          }
      };
      if (type === "clear" /* CLEAR */) {
          depsMap.forEach(add);
      }
      else if (key === 'length' && isArray(target)) {
          depsMap.forEach((dep, key) => {
              if (key === 'length' || key >= newValue) {
                  add(dep);
              }
          });
      }
      else {
          // SET | ADD | DELETE operation
          if (key !== void 0) {
              add(depsMap.get(key));
          }
          // 迭代器 key，for...of, 使用迭代器是对数据的监听变化
          switch (type) {
              case "add" /* ADD */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  else if (isIntegerKey(key)) {
                      // 如果是数组添加元素，将 length 依赖添加到执行队列
                      add(depsMap.get('length'));
                  }
                  break;
              case "delete" /* DELETE */:
                  if (!isArray(target)) {
                      add(depsMap.get(ITERATE_KEY));
                      if (isMap(target)) {
                          add(depsMap.get(MAP_KEY_ITERATE_KEY));
                      }
                  }
                  break;
              case "set" /* SET */:
                  if (isMap(target)) {
                      add(depsMap.get(ITERATE_KEY));
                  }
                  break;
          }
      }
      const run = (effect) => {
          if ( effect.options.onTrigger) {
              effect.options.onTrigger({
                  effect,
                  target,
                  key,
                  type,
                  newValue,
                  oldValue,
                  oldTarget
              });
          }
          if (effect.options.scheduler) {
              effect.options.scheduler(effect);
          }
          else {
              effect();
          }
      };
      effects.forEach(run);
  }

  const builtInSymbols = new Set(Object.getOwnPropertyNames(Symbol)
      .map(key => Symbol[key])
      .filter(isSymbol));
  const get = /*#__PURE__*/ createGetter();
  const shallowGet = /*#__PURE__*/ createGetter(false, true);
  const readonlyGet = /*#__PURE__*/ createGetter(true);
  const shallowReadonlyGet = /*#__PURE__*/ createGetter(true, true);
  // 数组内置方法处理
  const arrayInstrumentations = {};
  ['includes', 'indexOf', 'lastIndexOf'].forEach((key) => {
      const method = Array.prototype[key];
      arrayInstrumentations[key] = function (...args) {
          const arr = toRaw(this);
          for (let i = 0, l = this.length; i < l; i++) {
              track(arr, "get" /* GET */, i + '');
          }
          const res = method.apply(arr, args);
          if (res === -1 || res === false) {
              return method.apply(arr, args.map(toRaw));
          }
          else {
              return res;
          }
      };
  });
  ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
      const method = Array.prototype[key];
      arrayInstrumentations[key] = function (...args) {
          pauseTracking();
          const res = method.apply(this, args);
          resetTracking();
          return res;
      };
  });
  /**
   * 创建取值函数@param {boolean} isReadonly 是不是只读，将决定是否代理 set 等改变
   * 对象操作@param {boolean} shallow 指定是否对对象进行浅 reactive(类似浅复制)，
   * 只对一级属性进行 reactive
   */
  function createGetter(isReadonly = false, shallow = false) {
      // target: 被取值的对象，key: 取值的属性，receiver: this 的值
      return function get(target, key, receiver) {
          // 1. key is reactive
          if (key === "__v_isReactive" /* IS_REACTIVE */) {
              // 读取对象的 __v_isReactive
              return !isReadonly;
          }
          else if (key === "__v_isReadonly" /* IS_READONLY */) {
              // 2. key is readonly
              return isReadonly;
          }
          else if (key === "__v_raw" /* RAW */ &&
              receiver === (isReadonly ? readonlyMap : reactiveMap).get(target)) {
              // 3. key is the raw target
              return target;
          }
          // 4. target is array
          const targetIsArray = isArray(target);
          if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
              return Reflect.get(arrayInstrumentations, key, receiver);
          }
          const res = Reflect.get(target, key, receiver);
          if (isSymbol(key)
              ? builtInSymbols.has(key)
              : key === `__proto__` || key === `__v_isRef`) {
              return res;
          }
          if (!isReadonly) {
              // DONE 6. not readonly, need to track and collect deps
              track(target, "get" /* GET */, key);
          }
          // 是否只需要 reactive 一级属性(不递归 reactive)
          // ADD
          if (shallow) {
              return res;
          }
          // 6. res isRef
          if (isRef(res)) {
              // ref unwrapping - does not apply for Array + integer key.
              const shouldUnwrap = !targetIsArray || !isIntegerKey(key);
              return shouldUnwrap ? res.value : res;
          }
          // 7. res is object -> reactive recursivly
          if (isObject(res)) {
              // 递归 reactive 嵌套对象，feat: b2143f9
              return isReadonly ? readonly(res) : reactive(res);
          }
          return res;
      };
  }
  const set = /*#__PURE__*/ createSetter();
  const shallowSet = /*#__PURE__*/ createSetter(true);
  function createSetter(shallow = false) {
      return function set(target, key, value, receiver) {
          const oldValue = target[key];
          // shallow or not, or ref ?
          if (!shallow) {
              value = toRaw(value);
              // 非数组，旧值是 ref 类型，但是新值不是，则将新值设置到旧值的 value 属性上
              if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                  oldValue.value = value;
                  return true;
              }
          }
          const hadKey = isArray(target) && isIntegerKey(key)
              ? Number(key) < target.length
              : hasOwn(target, key);
          const result = Reflect.set(target, key, value, receiver);
          if (target === toRaw(receiver)) {
              if (!hadKey) {
                  trigger(target, "add" /* ADD */, key, value);
              }
              else if (hasChanged(value, oldValue)) {
                  trigger(target, "set" /* SET */, key, value, oldValue);
              }
          }
          return result;
      };
  }
  function deleteProperty(target, key) {
      const hadKey = hasOwn(target, key);
      const oldValue = target[key];
      const result = Reflect.deleteProperty(target, key);
      if (result && hadKey) {
          // 删除成功，触发 DELETE
          trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
      }
      return result;
  }
  function has(target, key) {
      const result = Reflect.has(target, key);
      if (!isSymbol(key) || !builtInSymbols.has(key)) {
          track(target, "has" /* HAS */, key);
      }
      return result;
  }
  function ownKeys(target) {
      track(target, "iterate" /* ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
      return Reflect.ownKeys(target);
  }
  const mutableHandlers = {
      get,
      set,
      deleteProperty,
      has,
      ownKeys
  };
  const readonlyHandlers = {
      get: readonlyGet,
      set(target, key) {
          {
              console.warn(`Set operation on key "${String(key)}" failed: target is readonly.`, target);
          }
          return true;
      },
      deleteProperty(target, key) {
          {
              console.warn(`Delete operation on key "${String(key)}" failed: target is readonly.`, target);
          }
          return true;
      }
  };
  const shallowReactiveHandlers = extend({}, mutableHandlers, {
      get: shallowGet,
      set: shallowSet
  });
  // Props handlers are special in the sense that it should not unwrap top-level
  // refs (in order to allow refs to be explicitly passed down), but should
  // retain the reactivity of the normal readonly object.
  const shallowReadonlyHandlers = extend({}, readonlyHandlers, {
      get: shallowReadonlyGet
  });

  const toReactive = (value) => isObject(value) ? reactive(value) : value;
  const toReadonly = (value) => isObject(value) ? readonly(value) : value;
  const toShallow = (value) => value;
  const getProto = (v) => Reflect.getPrototypeOf(v);
  function get$1(target, key, isReadonly = false, isShallow = false) {
      target = target["__v_raw" /* RAW */];
      const rawTarget = toRaw(target);
      // 下面处理是针对 key 可能是 proxy 类型
      // 次数，proxy key 和对应的 raw key 都要收集当前依赖
      const rawKey = toRaw(key); // key 有可能也是 proxy
      if (key !== rawKey) {
          // proxy key
          !isReadonly && track(rawTarget, "get" /* GET */, key);
      }
      // raw key
      !isReadonly && track(rawTarget, "get" /* GET */, rawKey);
      const { has } = getProto(rawTarget);
      // 递归处理对象类型
      const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
      // 取值考虑到 rawKey 和 key 不同的情况
      if (has.call(rawTarget, key)) {
          return wrap(target.get(key));
      }
      else if (has.call(rawTarget, rawKey)) {
          return wrap(target.get(rawKey));
      }
  }
  function has$1(key, isReadonly = false) {
      const target = this["__v_raw" /* RAW */];
      const rawTarget = toRaw(target);
      const rawKey = toRaw(key);
      if (key !== rawKey) {
          !isReadonly && track(rawTarget, "has" /* HAS */, key);
      }
      !isReadonly && track(rawTarget, "has" /* HAS */, rawKey);
      return key === rawKey
          ? target.has(key)
          : target.has(key) || target.has(rawKey);
  }
  function size(target, isReadonly = false) {
      target = target["__v_raw" /* RAW */];
      !isReadonly && track(toRaw(target), "iterate" /* ITERATE */, ITERATE_KEY);
      return Reflect.get(target, 'size', target);
  }
  function add(value) {
      value = toRaw(value);
      const target = toRaw(this);
      const proto = getProto(target);
      const hadKey = proto.has.call(target, value);
      target.add(value);
      // 因为 set 是不会存在重复元素的，所以只会在没有当前 key 的情况下才会执行
      // 添加操作
      if (!hadKey) {
          trigger(target, "add" /* ADD */, value, value);
      }
      return this;
  }
  function set$1(key, value) {
      value = toRaw(value);
      const target = toRaw(this);
      const { has, get } = getProto(target);
      let hadKey = has.call(target, key);
      // 考虑 key 可能是 proxy
      if (!hadKey) {
          // to add
          key = toRaw(key);
          hadKey = has.call(target, key);
      }
      else {
          checkIdentityKeys(target, has, key);
      }
      const oldValue = get.call(target, key);
      // 设值结果
      target.set(key, value);
      if (!hadKey) {
          // 添加操作
          trigger(target, "add" /* ADD */, key, value);
      }
      else if (hasChanged(value, oldValue)) {
          // 设值操作
          trigger(target, "set" /* SET */, key, value, oldValue);
      }
      return this;
  }
  function deleteEntry(key) {
      const target = toRaw(this);
      const { has, get } = getProto(target);
      let hadKey = has.call(target, key);
      if (!hadKey) {
          key = toRaw(key);
          hadKey = has.call(target, key);
      }
      else {
          checkIdentityKeys(target, has, key);
      }
      const oldValue = get ? get.call(target, key) : undefined;
      const result = target.delete(key);
      if (hadKey) {
          trigger(target, "delete" /* DELETE */, key, undefined, oldValue);
      }
      return result;
  }
  function clear() {
      const target = toRaw(this);
      const hadItems = target.size !== 0;
      const oldTarget =  isMap(target)
              ? new Map(target)
              : new Set(target)
          ;
      const result = target.clear();
      if (hadItems) {
          trigger(target, "clear" /* CLEAR */, undefined, undefined, oldTarget);
      }
      return result;
  }
  function createForEach(isReadonly, isShallow) {
      return function forEach(callback, thisArg) {
          const observed = this;
          const target = observed["__v_raw" /* RAW */];
          const rawTarget = toRaw(target);
          const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
          !isReadonly && track(rawTarget, "iterate" /* ITERATE */, ITERATE_KEY);
          return target.forEach((value, key) => {
              // 重要：确保回调
              // 1. 在 reactive map 作用域下被执行(this, 和第三个参数)
              // 2. 接受的 value 值应该是个 reactive/readonly 类型
              return callback.call(thisArg, wrap(value), wrap(key), observed);
          });
      };
  }
  function createIterableMethod(method, isReadonly, isShallow) {
      return function (...args) {
          const target = this["__v_raw" /* RAW */];
          const rawTarget = toRaw(target);
          const targetIsMap = isMap(rawTarget);
          const isPair = method === 'entries' || (method === Symbol.iterator && targetIsMap);
          const isKeyOnly = method === 'keys' && targetIsMap;
          const innerIterator = target[method](...args);
          const wrap = isReadonly ? toReadonly : isShallow ? toShallow : toReactive;
          !isReadonly &&
              track(rawTarget, "iterate" /* ITERATE */, isKeyOnly ? MAP_KEY_ITERATE_KEY : ITERATE_KEY);
          // return a wrapped iterator which returns observed versions of the
          // values emitted from the real iterator
          return {
              next() {
                  const { value, done } = innerIterator.next();
                  return done
                      ? { value, done }
                      : {
                          value: isPair ? [wrap(value[0]), wrap(value[1])] : wrap(value),
                          done
                      };
              },
              [Symbol.iterator]() {
                  return this;
              }
          };
      };
  }
  function createReadonlyMethod(type) {
      return function (...args) {
          {
              const key = args[0] ? `on key "${args[0]}"` : ``;
              console.warn(`${capitalize(type)} operation ${key} failed: target is readonly.`, toRaw(this));
          }
          return type === "delete" /* DELETE */ ? false : this;
      };
  }
  const mutableInstrumentations = {
      // get proxy handler, this -> target
      get(key) {
          // collection get 执行期间
          return get$1(this, key);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, false)
  };
  const shallowInstrumentations = {
      get(key) {
          return get$1(this, key, false, true);
      },
      get size() {
          return size(this);
      },
      has: has$1,
      add,
      set: set$1,
      delete: deleteEntry,
      clear,
      forEach: createForEach(false, true)
  };
  const readonlyInstrumentations = {
      get(key) {
          return get$1(this, key, true);
      },
      get size() {
          return size(this, true);
      },
      has(key) {
          return has$1.call(this, key, true);
      },
      add: createReadonlyMethod("add" /* ADD */),
      set: createReadonlyMethod("set" /* SET */),
      delete: createReadonlyMethod("delete" /* DELETE */),
      clear: createReadonlyMethod("clear" /* CLEAR */),
      forEach: createForEach(true, false)
  };
  const iteratorMethods = ['keys', 'values', 'entries', Symbol.iterator];
  iteratorMethods.forEach(method => {
      mutableInstrumentations[method] = createIterableMethod(method, false, false);
      readonlyInstrumentations[method] = createIterableMethod(method, true, false);
      shallowInstrumentations[method] = createIterableMethod(method, false, true);
  });
  function createInstrumentationGetter(isReadonly, shallow) {
      const instrumentations = shallow
          ? shallowInstrumentations
          : isReadonly
              ? readonlyInstrumentations
              : mutableInstrumentations;
      return (target, key, receiver) => {
          if (key === "__v_isReactive" /* IS_REACTIVE */) {
              return !isReadonly;
          }
          else if (key === "__v_isReadonly" /* IS_READONLY */) {
              return isReadonly;
          }
          else if (key === "__v_raw" /* RAW */) {
              return target;
          }
          // collection get 取值期间，这里只是负责将 get/set/... 方法取出来
          // map.get() -> 分给两步: fn = map.get -> fn()
          // 取 fn 在下面，fn() 执行实际在 mutableInstrumentation 里面
          // 所以 mutableInstrumentations.get 的两个参数分别是：
          // 1. this -> map
          // 2. key -> map.get('foo') 的 'foo'
          return Reflect.get(hasOwn(instrumentations, key) && key in target
              ? instrumentations
              : target, key, receiver);
      };
  }
  const mutableCollectionHandlers = {
      get: createInstrumentationGetter(false, false)
  };
  const shallowCollectionHandlers = {
      get: createInstrumentationGetter(false, true)
  };
  const readonlyCollectionHandlers = {
      get: createInstrumentationGetter(true, false)
  };
  function checkIdentityKeys(target, has, key) {
      // 同时有 key 和 proxy key 存在的情况
      const rawKey = toRaw(key);
      if (rawKey !== key && has.call(target, rawKey)) {
          const type = toRawType(target);
          console.warn(`Reactive ${type} contains both the raw and reactive ` +
              `versions of the same object${type === `Map` ? ` as keys` : ``}, ` +
              `which can lead to inconsistencies. ` +
              `Avoid differentiating between the raw and reactive versions ` +
              `of an object and only use the reactive version if possible.`);
      }
  }

  const reactiveMap = new WeakMap();
  const readonlyMap = new WeakMap();
  function targetTypeMap(rawType) {
      switch (rawType) {
          case 'Object':
          case 'Array':
              return 1 /* COMMON */;
          case 'Map':
          case 'Set':
          case 'WeakMap':
          case 'WeakSet':
              return 2 /* COLLECTION */;
          default:
              return 0 /* INVALID */;
      }
  }
  function getTargetType(value) {
      return value["__v_skip" /* SKIP */] || !Object.isExtensible(value)
          ? 0 /* INVALID */
          : targetTypeMap(toRawType(value));
  }
  function reactive(target) {
      // 如果试图 observe 一个只读 proxy，返回只读版本
      if (target && target["__v_isReadonly" /* IS_READONLY */]) {
          return target;
      }
      return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers);
  }
  /**
   * Return a shallowly-reactive copy of the original object, where only the root
   * level properties are reactive. It also does not auto-unwrap refs (even at the
   * root level).
   */
  function shallowReactive(target) {
      return createReactiveObject(target, false, shallowReactiveHandlers, shallowCollectionHandlers);
  }
  /**
   * Creates a readonly copy of the original object. Note the returned copy is not
   * made reactive, but `readonly` can be called on an already reactive object.
   */
  function readonly(target) {
      return createReactiveObject(target, true, readonlyHandlers, readonlyCollectionHandlers);
  }
  /**
   * Returns a reactive-copy of the original object, where only the root level
   * properties are readonly, and does NOT unwrap refs nor recursively convert
   * returned properties.
   * This is used for creating the props proxy object for stateful components.
   */
  function shallowReadonly(target) {
      return createReactiveObject(target, true, shallowReadonlyHandlers, readonlyCollectionHandlers);
  }
  function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
      if (!isObject(target)) {
          {
              console.warn(`value cannot be made reactive: ${String(target)}`);
          }
          return target;
      }
      // target 已经是 Proxy，不用重复代理
      // 异常情况：在一个 reactive object 上调用 readonly()
      if (target["__v_raw" /* RAW */] &&
          !(isReadonly && target["__v_isReactive" /* IS_REACTIVE */])) {
          return target;
      }
      // 代理缓存中有，直接取已缓存的
      const proxyMap = isReadonly ? readonlyMap : reactiveMap;
      const existingProxy = proxyMap.get(target);
      if (existingProxy) {
          return existingProxy;
      }
      // 只有合法的类型(Object|Array|[Weak]Map|[Weak]Set)才能被代理
      const targetType = getTargetType(target);
      if (targetType === 0 /* INVALID */) {
          return target;
      }
      const proxy = new Proxy(target, targetType === 2 /* COLLECTION */ ? collectionHandlers : baseHandlers);
      // 缓存代理映射关系
      proxyMap.set(target, proxy);
      return proxy;
  }
  function isReactive(value) {
      if (isReadonly(value)) {
          // 如果是只读的，判断 value 的原始对象
          return isReactive(value["__v_raw" /* RAW */]);
      }
      return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
  }
  function isReadonly(value) {
      return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
  }
  function isProxy(value) {
      return isReactive(value) || isReadonly(value);
  }
  function toRaw(observed) {
      // 从 proxy 对象中取其原来的初始对象
      return ((observed && toRaw(observed["__v_raw" /* RAW */])) || observed);
  }
  // 标记为 raw 对象，即不可被代理的对象，设置了 __v_skip 属性
  function markRaw(value) {
      def(value, "__v_skip" /* SKIP */, true);
      return value;
  }

  const convert = (val) => isObject(val) ? reactive(val) : val;
  function isRef(r) {
      return Boolean(r && r.__v_isRef === true);
  }
  function ref(value) {
      return createRef(value);
  }
  function shallowRef(value) {
      return createRef(value, true);
  }
  class RefImpl {
      constructor(_rawValue, _shallow = false) {
          this._rawValue = _rawValue;
          this._shallow = _shallow;
          this.__v_isRef = true;
          this._value = _shallow ? _rawValue : convert(_rawValue);
      }
      get value() {
          track(toRaw(this), "get" /* GET */, 'value');
          return this._value;
      }
      set value(newVal) {
          if (hasChanged(toRaw(newVal), this._rawValue)) {
              this._rawValue = newVal;
              this._value = this._shallow ? newVal : convert(newVal);
              trigger(toRaw(this), "set" /* SET */, 'value', newVal);
          }
      }
  }
  function createRef(rawValue, shallow = false) {
      if (isRef(rawValue)) {
          return rawValue;
      }
      return new RefImpl(rawValue, shallow);
  }
  function triggerRef(ref) {
      trigger(toRaw(ref), "set" /* SET */, 'value',  ref.value );
  }
  function unref(ref) {
      return isRef(ref) ? ref.value : ref;
  }
  const shallowUnwrapHandlers = {
      get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
      set: (target, key, value, receiver) => {
          const oldValue = target[key];
          if (isRef(oldValue) && !isRef(value)) {
              oldValue.value = value;
              return true;
          }
          else {
              return Reflect.set(target, key, value, receiver);
          }
      }
  };
  function proxyRefs(objectWithRefs) {
      return isReactive(objectWithRefs)
          ? objectWithRefs
          : new Proxy(objectWithRefs, shallowUnwrapHandlers);
  }
  class CustomRefImpl {
      constructor(factory) {
          this.__v_isRef = true;
          const { get, set } = factory(() => track(this, "get" /* GET */, 'value'), () => trigger(this, "set" /* SET */, 'value'));
          this._get = get;
          this._set = set;
      }
      get value() {
          return this._get();
      }
      set value(newVal) {
          this._set(newVal);
      }
  }
  function customRef(factory) {
      return new CustomRefImpl(factory);
  }
  function toRefs(object) {
      if ( !isProxy(object)) {
          console.warn(`toRefs() expects a reactive object but received a plain one.`);
      }
      const ret = isArray(object) ? new Array(object.length) : {};
      for (const key in object) {
          ret[key] = toRef(object, key);
      }
      return ret;
  }
  class ObjectRefImpl {
      constructor(_object, _key) {
          this._object = _object;
          this._key = _key;
          this.__v_isRef = true;
      }
      get value() {
          return this._object[this._key];
      }
      set value(newVal) {
          this._object[this._key] = newVal;
      }
  }
  function toRef(object, key) {
      return isRef(object[key])
          ? object[key]
          : new ObjectRefImpl(object, key);
  }

  // 计算属性模板
  class ComputedRefImpl {
      constructor(getter, _setter, isReadonly) {
          this._setter = _setter;
          this._dirty = true;
          this.__v_isRef = true;
          this.effect = effect(getter, {
              lazy: true,
              scheduler: () => {
                  if (!this._dirty) {
                      this._dirty = true;
                      trigger(toRaw(this), "set" /* SET */, 'value');
                  }
              }
          });
          this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
      }
      get value() {
          if (this._dirty) {
              this._value = this.effect();
              this._dirty = false;
          }
          track(toRaw(this), "get" /* GET */, 'value');
          return this._value;
      }
      set value(newValue) {
          this._setter(newValue);
      }
  }
  function computed(getterOrOptions) {
      let getter;
      let setter;
      if (isFunction(getterOrOptions)) {
          getter = getterOrOptions;
          setter =  () => {
                  console.warn('Write operation failed: computed value is readonly');
              }
              ;
      }
      else {
          getter = getterOrOptions.get;
          setter = getterOrOptions.set;
      }
      return new ComputedRefImpl(getter, setter, isFunction(getterOrOptions) || !getterOrOptions.set);
  }

  const stack = [];
  function pushWarningContext(vnode) {
      stack.push(vnode);
  }
  function popWarningContext() {
      stack.pop();
  }
  function warn(msg, ...args) {
      // avoid props formatting or warn handler tracking deps that might be mutated
      // during patch, leading to infinite recursion.
      pauseTracking();
      const instance = stack.length ? stack[stack.length - 1].component : null;
      const appWarnHandler = instance && instance.appContext.config.warnHandler;
      const trace = getComponentTrace();
      if (appWarnHandler) {
          callWithErrorHandling(appWarnHandler, instance, 11 /* APP_WARN_HANDLER */, [
              msg + args.join(''),
              instance && instance.proxy,
              trace
                  .map(({ vnode }) => `at <${formatComponentName(instance, vnode.type)}>`)
                  .join('\n'),
              trace
          ]);
      }
      else {
          const warnArgs = [`[Vue warn]: ${msg}`, ...args];
          /* istanbul ignore if */
          if (trace.length &&
              // avoid spamming console during tests
              !false) {
              warnArgs.push(`\n`, ...formatTrace(trace));
          }
          console.warn(...warnArgs);
      }
      resetTracking();
  }
  function getComponentTrace() {
      let currentVNode = stack[stack.length - 1];
      if (!currentVNode) {
          return [];
      }
      // we can't just use the stack because it will be incomplete during updates
      // that did not start from the root. Re-construct the parent chain using
      // instance parent pointers.
      const normalizedStack = [];
      while (currentVNode) {
          const last = normalizedStack[0];
          if (last && last.vnode === currentVNode) {
              last.recurseCount++;
          }
          else {
              normalizedStack.push({
                  vnode: currentVNode,
                  recurseCount: 0
              });
          }
          const parentInstance = currentVNode.component && currentVNode.component.parent;
          currentVNode = parentInstance && parentInstance.vnode;
      }
      return normalizedStack;
  }
  /* istanbul ignore next */
  function formatTrace(trace) {
      const logs = [];
      trace.forEach((entry, i) => {
          logs.push(...(i === 0 ? [] : [`\n`]), ...formatTraceEntry(entry));
      });
      return logs;
  }
  function formatTraceEntry({ vnode, recurseCount }) {
      const postfix = recurseCount > 0 ? `... (${recurseCount} recursive calls)` : ``;
      const isRoot = vnode.component ? vnode.component.parent == null : false;
      const open = ` at <${formatComponentName(vnode.component, vnode.type, isRoot)}`;
      const close = `>` + postfix;
      return vnode.props
          ? [open, ...formatProps(vnode.props), close]
          : [open + close];
  }
  /* istanbul ignore next */
  function formatProps(props) {
      const res = [];
      const keys = Object.keys(props);
      keys.slice(0, 3).forEach(key => {
          res.push(...formatProp(key, props[key]));
      });
      if (keys.length > 3) {
          res.push(` ...`);
      }
      return res;
  }
  /* istanbul ignore next */
  function formatProp(key, value, raw) {
      if (isString(value)) {
          value = JSON.stringify(value);
          return raw ? value : [`${key}=${value}`];
      }
      else if (typeof value === 'number' ||
          typeof value === 'boolean' ||
          value == null) {
          return raw ? value : [`${key}=${value}`];
      }
      else if (isRef(value)) {
          value = formatProp(key, toRaw(value.value), true);
          return raw ? value : [`${key}=Ref<`, value, `>`];
      }
      else if (isFunction(value)) {
          return [`${key}=fn${value.name ? `<${value.name}>` : ``}`];
      }
      else {
          value = toRaw(value);
          return raw ? value : [`${key}=`, value];
      }
  }

  const ErrorTypeStrings = {
      ["bc" /* BEFORE_CREATE */]: 'beforeCreate hook',
      ["c" /* CREATED */]: 'created hook',
      ["bm" /* BEFORE_MOUNT */]: 'beforeMount hook',
      ["m" /* MOUNTED */]: 'mounted hook',
      ["bu" /* BEFORE_UPDATE */]: 'beforeUpdate hook',
      ["u" /* UPDATED */]: 'updated',
      ["bum" /* BEFORE_UNMOUNT */]: 'beforeUnmount hook',
      ["um" /* UNMOUNTED */]: 'unmounted hook',
      ["a" /* ACTIVATED */]: 'activated hook',
      ["da" /* DEACTIVATED */]: 'deactivated hook',
      ["ec" /* ERROR_CAPTURED */]: 'errorCaptured hook',
      ["rtc" /* RENDER_TRACKED */]: 'renderTracked hook',
      ["rtg" /* RENDER_TRIGGERED */]: 'renderTriggered hook',
      [0 /* SETUP_FUNCTION */]: 'setup function',
      [1 /* RENDER_FUNCTION */]: 'render function',
      [2 /* WATCH_GETTER */]: 'watcher getter',
      [3 /* WATCH_CALLBACK */]: 'watcher callback',
      [4 /* WATCH_CLEANUP */]: 'watcher cleanup function',
      [5 /* NATIVE_EVENT_HANDLER */]: 'native event handler',
      [6 /* COMPONENT_EVENT_HANDLER */]: 'component event handler',
      [7 /* VNODE_HOOK */]: 'vnode hook',
      [8 /* DIRECTIVE_HOOK */]: 'directive hook',
      [9 /* TRANSITION_HOOK */]: 'transition hook',
      [10 /* APP_ERROR_HANDLER */]: 'app errorHandler',
      [11 /* APP_WARN_HANDLER */]: 'app warnHandler',
      [12 /* FUNCTION_REF */]: 'ref function',
      [13 /* ASYNC_COMPONENT_LOADER */]: 'async component loader',
      [14 /* SCHEDULER */]: 'scheduler flush. This is likely a Vue internals bug. ' +
          'Please open an issue at https://new-issue.vuejs.org/?repo=vuejs/vue-next'
  };
  function callWithErrorHandling(fn, instance, type, args) {
      let res;
      try {
          res = args ? fn(...args) : fn();
      }
      catch (err) {
          handleError(err, instance, type);
      }
      return res;
  }
  function callWithAsyncErrorHandling(fn, instance, type, args) {
      if (isFunction(fn)) {
          const res = callWithErrorHandling(fn, instance, type, args);
          if (res && isPromise(res)) {
              res.catch(err => {
                  handleError(err, instance, type);
              });
          }
          return res;
      }
      const values = [];
      for (let i = 0; i < fn.length; i++) {
          values.push(callWithAsyncErrorHandling(fn[i], instance, type, args));
      }
      return values;
  }
  function handleError(err, instance, type, throwInDev = true) {
      const contextVNode = instance ? instance.vnode : null;
      if (instance) {
          let cur = instance.parent;
          // the exposed instance is the render proxy to keep it consistent with 2.x
          const exposedInstance = instance.proxy;
          // in production the hook receives only the error code
          const errorInfo =  ErrorTypeStrings[type] ;
          while (cur) {
              const errorCapturedHooks = cur.ec;
              if (errorCapturedHooks) {
                  for (let i = 0; i < errorCapturedHooks.length; i++) {
                      if (errorCapturedHooks[i](err, exposedInstance, errorInfo) === false) {
                          return;
                      }
                  }
              }
              cur = cur.parent;
          }
          // app-level handling
          const appErrorHandler = instance.appContext.config.errorHandler;
          if (appErrorHandler) {
              callWithErrorHandling(appErrorHandler, null, 10 /* APP_ERROR_HANDLER */, [err, exposedInstance, errorInfo]);
              return;
          }
      }
      logError(err, type, contextVNode, throwInDev);
  }
  function logError(err, type, contextVNode, throwInDev = true) {
      {
          const info = ErrorTypeStrings[type];
          if (contextVNode) {
              pushWarningContext(contextVNode);
          }
          warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`);
          if (contextVNode) {
              popWarningContext();
          }
          // crash in dev by default so it's more noticeable
          if (throwInDev) {
              throw err;
          }
          else {
              console.error(err);
          }
      }
  }

  let isFlushing = false; // 开始 flush pre/job/post
  let isFlushPending = false; // 正在 flush pre cbs
  // job
  const queue = []; // job 队列
  let flushIndex = 0; // for -> job 时候的索引
  // 默认 pre cb 队列
  const pendingPreFlushCbs = [];
  // 正在执行的 pre cbs，由 pendingPreFlushCbs 去重而来的任务队列
  let activePreFlushCbs = null;
  let preFlushIndex = 0;
  // post 类型的 cb 队列
  const pendingPostFlushCbs = [];
  // 当前正在执行的 post cbs 队列，由 pendingPostFlushCbs 去重而来
  // 且它不会执行期间进行扩充，而是在 flushJobs 中 queue jobs 执行完成之后
  // 的 finally 里面检测 post 队列重新调用 flushJobs 来清空
  let activePostFlushCbs = null;
  let postFlushIndex = 0;
  // 空的 Promise 用来进行异步化，实现 nextTick
  const resolvedPromise = Promise.resolve();
  // 当 flushJobs 执行完毕，即当 pre/job/post 队列中所有
  // 任务都完成之后返回的一个 promise ，所以当使用 nextTick()
  // 的时候，对应的代码都是在这个基础完成之后调用
  // 所以 nextTick() 顾名思义就是在当前的 tick 下所有任务(pre/job/post)都
  // 执行完毕之后才执行的代码
  let currentFlushPromise = null;
  // queue job 可以作为 pre cbs 的父级任务
  // 比如：在手动调用 flushPreFlushCbs(seen, parentJob) 就可以
  // 传一个 queue job 当做当前 cbs 的父级任务。
  // 这个用途是为了避免该 job 的上一次入列任务(包括 job 及其子 pre cbs)
  // 还没完成就再次调用 queueJob 重复入列, 说白了就是为了同一个 job 不能在
  // parentJob 完成之前调用 queueJob，就算调了也没用
  let currentPreFlushParentJob = null;
  // pre/job/post 三种任务在同一个 tick 下，一次执行上限是100个
  // 超出视为死循环
  const RECURSION_LIMIT = 100;
  // 这个函数将使得 fn 或使用了 await 时候后面的代码总是在
  // 当前 tick 下的 pre/job/post 队列都 flush 空了之后执行
  function nextTick(fn) {
      const p = currentFlushPromise || resolvedPromise;
      return fn ? p.then(this ? fn.bind(this) : fn) : p;
  }
  function queueJob(job) {
      // the dedupe search uses the startIndex argument of Array.includes()
      // by default the search index includes the current job that is being run
      // so it cannot recursively trigger itself again.
      // if the job is a watch() callback, the search will start with a +1 index to
      // allow it recursively trigger itself - it is the user's responsibility to
      // ensure it doesn't end up in an infinite loop.
      // 1. 队列为空或不包含当前正入列的 job
      // 2. job 非当前 parent job
      if ((!queue.length ||
          !queue.includes(job, isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex)) &&
          job !== currentPreFlushParentJob) {
          queue.push(job);
          queueFlush();
      }
  }
  // 立即启动异步 flush 操作
  function queueFlush() {
      if (!isFlushing && !isFlushPending) {
          isFlushPending = true;
          currentFlushPromise = resolvedPromise.then(flushJobs);
      }
  }
  // 失效一个任务就是将其删除
  function invalidateJob(job) {
      const i = queue.indexOf(job);
      if (i > -1) {
          queue.splice(i, 1);
      }
  }
  // pre/post 任务入列函数，注意点
  // 1. 不能重复添加同一个 cb
  // 2. 如果指定了 allowRecurse: true 是可以重复添加的
  // 如下面的实现，查找从 index+1 开始肯定是找不到的
  function queueCb(cb, activeQueue, pendingQueue, index) {
      if (!isArray(cb)) {
          if (!activeQueue ||
              !activeQueue.includes(cb, cb.allowRecurse ? index + 1 : index)) {
              pendingQueue.push(cb);
          }
      }
      else {
          // 如果 cb 是个数组，那么它是个组件生命周期的 Hook 函数，这些函数只能被
          // 一个 job 触发，且在对应的 queue flush 函数中进过了去重操作
          // 因为这里直接跳过去重检测提高性能
          // 意思就是，在 flush[Pre|Post]FlushCbs 函数执行期间会进行去重操作，
          // 因此这里不需要重复做(如： activePostFlushCbs, activePreFlushCbs 都是
          // 去重之后待执行的 cbs)
          pendingQueue.push(...cb);
      }
      queueFlush();
  }
  function queuePreFlushCb(cb) {
      queueCb(cb, activePreFlushCbs, pendingPreFlushCbs, preFlushIndex);
  }
  function queuePostFlushCb(cb) {
      queueCb(cb, activePostFlushCbs, pendingPostFlushCbs, postFlushIndex);
  }
  // flush pre cbs，在 flushJobs 中优先调用，也就是说 pre cbs
  // 在同一 tick 内执行优先级最高，即最先执行(pre cbs > job > post cbs)
  // 并且它会一直递归到没有新的 pre cbs 为止
  // 比如： 有10个任务，执行到第5个的时候来了个新的任务(queuePreFlushCb(cb))
  // 那么这个任务会在前面10个执行完成之后作为第 11 个去执行，但记住是下次递归时完成
  function flushPreFlushCbs(seen, parentJob = null) {
      if (pendingPreFlushCbs.length) {
          currentPreFlushParentJob = parentJob;
          activePreFlushCbs = [...new Set(pendingPreFlushCbs)];
          pendingPreFlushCbs.length = 0;
          {
              seen = seen || new Map();
          }
          for (preFlushIndex = 0; preFlushIndex < activePreFlushCbs.length; preFlushIndex++) {
              // 检查递归更新问题
              {
                  checkRecursiveUpdates(seen, activePreFlushCbs[preFlushIndex]);
              }
              activePreFlushCbs[preFlushIndex]();
          }
          activePreFlushCbs = null;
          preFlushIndex = 0;
          currentPreFlushParentJob = null;
          // 递归 flush 直到所有 pre jobs 被执行完成
          flushPreFlushCbs(seen, parentJob);
      }
  }
  // flush post cbs 和 pre cbs 差不多，唯一不同的点在于：
  // 如果执行期间有新的任务进来 (queuePostFlushCb(cb)) 的时候
  // 它不是在当前 post cbs 后面立即执行，而是当 pre cbs -> jobs -> post -cbs
  // 执行完一轮之后在 flushJobs 的 finally 中重启新一轮的 flushJobs
  // 所以，这期间如果有新的 pre cbs 或 Jobs 那么这两个都会在新的 post cbs
  // 之前得到执行
  function flushPostFlushCbs(seen) {
      if (pendingPostFlushCbs.length) {
          const deduped = [...new Set(pendingPostFlushCbs)];
          pendingPostFlushCbs.length = 0;
          // #1947 already has active queue, nested flushPostFlushCbs call
          if (activePostFlushCbs) {
              activePostFlushCbs.push(...deduped);
              return;
          }
          activePostFlushCbs = deduped;
          {
              seen = seen || new Map();
          }
          activePostFlushCbs.sort((a, b) => getId(a) - getId(b));
          for (postFlushIndex = 0; postFlushIndex < activePostFlushCbs.length; postFlushIndex++) {
              // 递归 update 检查
              {
                  checkRecursiveUpdates(seen, activePostFlushCbs[postFlushIndex]);
              }
              activePostFlushCbs[postFlushIndex]();
          }
          activePostFlushCbs = null;
          postFlushIndex = 0;
      }
  }
  const getId = (job) => job.id == null ? Infinity : job.id;
  // 开启三种任务 flush 操作，优先级 pre cbs > jobs > post cbs
  function flushJobs(seen) {
      isFlushPending = false;
      isFlushing = true;
      {
          seen = seen || new Map();
      }
      flushPreFlushCbs(seen); // 默认的 job 类型
      // flush 之前对 queue 排序
      // 1. 组件更新顺序：parent -> child，因为 parent 总是在 child 之前
      //    被创建，因此 parent render effect 有更低的优先级数字(数字越小越先创建？)
      // 2. 如果组件在 parent 更新期间被卸载了，那么它的更新都会被忽略掉
      queue.sort((a, b) => getId(a) - getId(b));
      // 开始 flush
      try {
          for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
              const job = queue[flushIndex];
              if (job) {
                  // 检查递归更新问题
                  if (true) {
                      checkRecursiveUpdates(seen, job);
                  }
                  callWithErrorHandling(job, null, 14 /* SCHEDULER */);
              }
          }
      }
      finally {
          // 情况队列
          flushIndex = 0;
          queue.length = 0;
          // flush `post` 类型的 flush cbs
          flushPostFlushCbs(seen);
          isFlushing = false;
          currentFlushPromise = null;
          // 代码执行到当前 tick 的时候，有可能有新的 job 加入
          // some postFlushCb queued jobs!
          // keep flushing until it drains.
          if (queue.length || pendingPostFlushCbs.length) {
              flushJobs(seen);
          }
      }
  }
  function checkRecursiveUpdates(seen, fn) {
      if (!seen.has(fn)) {
          seen.set(fn, 1);
      }
      else {
          const count = seen.get(fn);
          if (count > RECURSION_LIMIT) {
              throw new Error(`Maximum recursive updates exceeded. ` +
                  `This means you have a reactive effect that is mutating its own ` +
                  `dependencies and thus recursively triggering itself. Possible sources ` +
                  `include component template, render function, updated hook or ` +
                  `watcher source function.`);
          }
          else {
              seen.set(fn, count + 1);
          }
      }
  }

  function setDevtoolsHook(hook) {
      exports.devtools = hook;
  }
  function devtoolsInitApp(app, version) {
      // TODO queue if devtools is undefined
      if (!exports.devtools)
          return;
      exports.devtools.emit("app:init" /* APP_INIT */, app, version, {
          Fragment,
          Text,
          Comment,
          Static
      });
  }
  function devtoolsUnmountApp(app) {
      if (!exports.devtools)
          return;
      exports.devtools.emit("app:unmount" /* APP_UNMOUNT */, app);
  }
  const devtoolsComponentRemoved = /*#__PURE__*/ createDevtoolsComponentHook("component:removed" /* COMPONENT_REMOVED */);
  function createDevtoolsComponentHook(hook) {
      return (component) => {
          if (!exports.devtools)
              return;
          exports.devtools.emit(hook, component.appContext.app, component.uid, component.parent ? component.parent.uid : undefined);
      };
  }
  function devtoolsComponentEmit(component, event, params) {
      if (!exports.devtools)
          return;
      exports.devtools.emit("component:emit" /* COMPONENT_EMIT */, component.appContext.app, component, event, params);
  }

  function emit(instance, event, ...rawArgs) {
      const props = instance.vnode.props || EMPTY_OBJ;
      {
          const { emitsOptions, propsOptions: [propsOptions] } = instance;
          if (emitsOptions) {
              if (!(event in emitsOptions)) {
                  if (!propsOptions || !(toHandlerKey(event) in propsOptions)) {
                      warn(`Component emitted event "${event}" but it is neither declared in ` +
                          `the emits option nor as an "${toHandlerKey(event)}" prop.`);
                  }
              }
              else {
                  const validator = emitsOptions[event];
                  if (isFunction(validator)) {
                      const isValid = validator(...rawArgs);
                      if (!isValid) {
                          warn(`Invalid event arguments: event validation failed for event "${event}".`);
                      }
                  }
              }
          }
      }
      let args = rawArgs;
      const isModelListener = event.startsWith('update:');
      // for v-model update:xxx events, apply modifiers on args
      const modelArg = isModelListener && event.slice(7);
      if (modelArg && modelArg in props) {
          const modifiersKey = `${modelArg === 'modelValue' ? 'model' : modelArg}Modifiers`;
          const { number, trim } = props[modifiersKey] || EMPTY_OBJ;
          if (trim) {
              args = rawArgs.map(a => a.trim());
          }
          else if (number) {
              args = rawArgs.map(toNumber);
          }
      }
      {
          devtoolsComponentEmit(instance, event, args);
      }
      {
          const lowerCaseEvent = event.toLowerCase();
          if (lowerCaseEvent !== event && props[toHandlerKey(lowerCaseEvent)]) {
              warn(`Event "${lowerCaseEvent}" is emitted in component ` +
                  `${formatComponentName(instance, instance.type)} but the handler is registered for "${event}". ` +
                  `Note that HTML attributes are case-insensitive and you cannot use ` +
                  `v-on to listen to camelCase events when using in-DOM templates. ` +
                  `You should probably use "${hyphenate(event)}" instead of "${event}".`);
          }
      }
      // convert handler name to camelCase. See issue #2249
      let handlerName = toHandlerKey(camelize(event));
      let handler = props[handlerName];
      // for v-model update:xxx events, also trigger kebab-case equivalent
      // for props passed via kebab-case
      if (!handler && isModelListener) {
          handlerName = toHandlerKey(hyphenate(event));
          handler = props[handlerName];
      }
      if (handler) {
          callWithAsyncErrorHandling(handler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
      }
      const onceHandler = props[handlerName + `Once`];
      if (onceHandler) {
          if (!instance.emitted) {
              (instance.emitted = {})[handlerName] = true;
          }
          else if (instance.emitted[handlerName]) {
              return;
          }
          callWithAsyncErrorHandling(onceHandler, instance, 6 /* COMPONENT_EVENT_HANDLER */, args);
      }
  }
  function normalizeEmitsOptions(comp, appContext, asMixin = false) {
      if (!appContext.deopt && comp.__emits !== undefined) {
          return comp.__emits;
      }
      const raw = comp.emits;
      let normalized = {};
      // apply mixin/extends props
      let hasExtends = false;
      if ( !isFunction(comp)) {
          const extendEmits = (raw) => {
              hasExtends = true;
              extend(normalized, normalizeEmitsOptions(raw, appContext, true));
          };
          if (!asMixin && appContext.mixins.length) {
              appContext.mixins.forEach(extendEmits);
          }
          if (comp.extends) {
              extendEmits(comp.extends);
          }
          if (comp.mixins) {
              comp.mixins.forEach(extendEmits);
          }
      }
      if (!raw && !hasExtends) {
          return (comp.__emits = null);
      }
      if (isArray(raw)) {
          raw.forEach(key => (normalized[key] = null));
      }
      else {
          extend(normalized, raw);
      }
      return (comp.__emits = normalized);
  }
  // Check if an incoming prop key is a declared emit event listener.
  // e.g. With `emits: { click: null }`, props named `onClick` and `onclick` are
  // both considered matched listeners.
  function isEmitListener(options, key) {
      if (!options || !isOn(key)) {
          return false;
      }
      //onXxxx or onXxxOnce, 因为 @click.once 会解析成 onClickOnce
      key = key.slice(2).replace(/Once$/, '');
      // 检测条件：
      // 1. slice(1) 应该是去掉 @click 中的 `@` ?
      // 2. clickEvent -> click-event
      // 3. click
      // 支持三种形式的事件名
      return (hasOwn(options, key[0].toLowerCase() + key.slice(1)) ||
          // onClick -> on-click
          hasOwn(options, hyphenate(key)) ||
          hasOwn(options, key));
  }

  /**
   * mark the current rendering instance for asset resolution (e.g.
   * resolveComponent, resolveDirective) during render
   */
  let currentRenderingInstance = null;
  function setCurrentRenderingInstance(instance) {
      currentRenderingInstance = instance;
  }
  /**
   * dev only flag to track whether $attrs was used during render.
   * If $attrs was used during render then the warning for failed attrs
   * fallthrough can be suppressed.
   * 开发是用的标识，用来跟踪 $attrs 静态属性在 render 期间是否被使用
   * 如果被使用了，或许就不需要给出警告？啥意思???
   */
  let accessedAttrs = false;
  function markAttrsAccessed() {
      accessedAttrs = true;
  }
  function renderComponentRoot(instance) {
      const { type: Component, vnode, proxy, withProxy, props, propsOptions: [propsOptions], slots, attrs, emit, render, renderCache, data, setupState, ctx } = instance;
      let result;
      currentRenderingInstance = instance;
      {
          accessedAttrs = false;
      }
      try {
          let fallthroughAttrs;
          if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              // withProxy is a proxy with a different `has` trap only for
              // runtime-compiled render functions using `with` block.
              const proxyToUse = withProxy || proxy;
              console.log('normalize vnode');
              result = normalizeVNode(render.call(proxyToUse, proxyToUse, renderCache, props, setupState, data, ctx));
              fallthroughAttrs = attrs;
          }
          else {
              // functional
              const render = Component;
              // in dev, mark attrs accessed if optional props (attrs === props)
              if (true && attrs === props) {
                  markAttrsAccessed();
              }
              result = normalizeVNode(render.length > 1
                  ? render(props, true
                      ? {
                          get attrs() {
                              markAttrsAccessed();
                              return attrs;
                          },
                          slots,
                          emit
                      }
                      : { attrs, slots, emit })
                  : render(props, null /* we know it doesn't need it */));
              fallthroughAttrs = Component.props
                  ? attrs
                  : getFunctionalFallthrough(attrs);
          }
          // attr merging
          // in dev mode, comments are preserved, and it's possible for a template
          // to have comments along side the root element which makes it a fragment
          let root = result;
          let setRoot = undefined;
          if (true && result.patchFlag & 2048 /* DEV_ROOT_FRAGMENT */) {
              ;
              [root, setRoot] = getChildRoot(result);
          }
          if (Component.inheritAttrs !== false && fallthroughAttrs) {
              const keys = Object.keys(fallthroughAttrs);
              const { shapeFlag } = root;
              if (keys.length) {
                  if (shapeFlag & 1 /* ELEMENT */ ||
                      shapeFlag & 6 /* COMPONENT */) {
                      if (propsOptions && keys.some(isModelListener)) {
                          // If a v-model listener (onUpdate:xxx) has a corresponding declared
                          // prop, it indicates this component expects to handle v-model and
                          // it should not fallthrough.
                          // related: #1543, #1643, #1989
                          fallthroughAttrs = filterModelListeners(fallthroughAttrs, propsOptions);
                      }
                      root = cloneVNode(root, fallthroughAttrs);
                  }
                  else if (true && !accessedAttrs && root.type !== Comment) {
                      const allAttrs = Object.keys(attrs);
                      const eventAttrs = [];
                      const extraAttrs = [];
                      for (let i = 0, l = allAttrs.length; i < l; i++) {
                          const key = allAttrs[i];
                          if (isOn(key)) {
                              // ignore v-model handlers when they fail to fallthrough
                              if (!isModelListener(key)) {
                                  // remove `on`, lowercase first letter to reflect event casing
                                  // accurately
                                  eventAttrs.push(key[2].toLowerCase() + key.slice(3));
                              }
                          }
                          else {
                              extraAttrs.push(key);
                          }
                      }
                      if (extraAttrs.length) {
                          warn(`Extraneous non-props attributes (` +
                              `${extraAttrs.join(', ')}) ` +
                              `were passed to component but could not be automatically inherited ` +
                              `because component renders fragment or text root nodes.`);
                      }
                      if (eventAttrs.length) {
                          warn(`Extraneous non-emits event listeners (` +
                              `${eventAttrs.join(', ')}) ` +
                              `were passed to component but could not be automatically inherited ` +
                              `because component renders fragment or text root nodes. ` +
                              `If the listener is intended to be a component custom event listener only, ` +
                              `declare it using the "emits" option.`);
                      }
                  }
              }
          }
          // inherit directives
          if (vnode.dirs) {
              if (true && !isElementRoot(root)) {
                  warn(`Runtime directive used on component with non-element root node. ` +
                      `The directives will not function as intended.`);
              }
              root.dirs = root.dirs ? root.dirs.concat(vnode.dirs) : vnode.dirs;
          }
          // inherit transition data
          if (vnode.transition) {
              if (true && !isElementRoot(root)) {
                  warn(`Component inside <Transition> renders non-element root node ` +
                      `that cannot be animated.`);
              }
              root.transition = vnode.transition;
          }
          if (true && setRoot) {
              setRoot(root);
          }
          else {
              result = root;
          }
      }
      catch (err) {
          handleError(err, instance, 1 /* RENDER_FUNCTION */);
          result = createVNode(Comment);
      }
      currentRenderingInstance = null;
      return result;
  }
  /**
   * dev only
   * In dev mode, template root level comments are rendered, which turns the
   * template into a fragment root, but we need to locate the single element
   * root for attrs and scope id processing.
   */
  const getChildRoot = (vnode) => {
      const rawChildren = vnode.children;
      const dynamicChildren = vnode.dynamicChildren;
      const childRoot = filterSingleRoot(rawChildren);
      if (!childRoot) {
          return [vnode, undefined];
      }
      const index = rawChildren.indexOf(childRoot);
      const dynamicIndex = dynamicChildren ? dynamicChildren.indexOf(childRoot) : -1;
      const setRoot = (updatedRoot) => {
          rawChildren[index] = updatedRoot;
          if (dynamicChildren) {
              if (dynamicIndex > -1) {
                  dynamicChildren[dynamicIndex] = updatedRoot;
              }
              else if (updatedRoot.patchFlag > 0) {
                  vnode.dynamicChildren = [...dynamicChildren, updatedRoot];
              }
          }
      };
      return [normalizeVNode(childRoot), setRoot];
  };
  function filterSingleRoot(children) {
      let singleRoot;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          if (isVNode(child)) {
              // ignore user comment
              if (child.type !== Comment || child.children === 'v-if') {
                  if (singleRoot) {
                      // has more than 1 non-comment child, return now
                      return;
                  }
                  else {
                      singleRoot = child;
                  }
              }
          }
          else {
              return;
          }
      }
      return singleRoot;
  }
  const getFunctionalFallthrough = (attrs) => {
      let res;
      for (const key in attrs) {
          if (key === 'class' || key === 'style' || isOn(key)) {
              (res || (res = {}))[key] = attrs[key];
          }
      }
      return res;
  };
  const filterModelListeners = (attrs, props) => {
      const res = {};
      for (const key in attrs) {
          if (!isModelListener(key) || !(key.slice(9) in props)) {
              res[key] = attrs[key];
          }
      }
      return res;
  };
  const isElementRoot = (vnode) => {
      return (vnode.shapeFlag & 6 /* COMPONENT */ ||
          vnode.shapeFlag & 1 /* ELEMENT */ ||
          vnode.type === Comment // potential v-if branch switch
      );
  };
  function shouldUpdateComponent(prevVNode, nextVNode, optimized) {
      console.log('should update component');
      const { props: prevProps, children: prevChildren, component } = prevVNode;
      const { props: nextProps, children: nextChildren, patchFlag } = nextVNode;
      const emits = component.emitsOptions;
      // 运行时 vnode 上的指令或者 transition 动画，强制 child 更新
      if (nextVNode.dirs || nextVNode.transition) {
          return true;
      }
      if (optimized && patchFlag >= 0) {
          if (patchFlag & 1024 /* DYNAMIC_SLOTS */) {
              // 插槽内容引用的值可能发生了改变，比如： v-for 中
              return true;
          }
          if (patchFlag & 16 /* FULL_PROPS */) {
              if (!prevProps) {
                  return !!nextProps;
              }
              return hasPropsChanged(prevProps, nextProps, emits);
          }
          else if (patchFlag & 8 /* PROPS */) {
              const dynamicProps = nextVNode.dynamicProps;
              for (let i = 0; i < dynamicProps.length; i++) {
                  const key = dynamicProps[i];
                  // 只要有一个属性名不一样，就需要更新
                  if (nextProps[key] !== prevProps[key] &&
                      !isEmitListener(emits, key)) {
                      return true;
                  }
              }
          }
      }
      else {
          if (prevChildren || nextChildren) {
              if (!nextChildren || !nextChildren.$stable) {
                  return true;
              }
          }
          if (prevProps === nextProps) {
              return false;
          }
          if (!prevProps) {
              return !!nextProps;
          }
          if (!nextProps) {
              return true;
          }
          return hasPropsChanged(prevProps, nextProps, emits);
      }
      return false;
  }
  function hasPropsChanged(prevProps, nextProps, emitsOptions) {
      console.log('has changed props');
      const nextKeys = Object.keys(nextProps);
      // 包含属性数不一样，可能删除、添加了
      if (nextKeys.length !== Object.keys(prevProps).length) {
          return true;
      }
      for (let i = 0; i < nextKeys.length; i++) {
          const key = nextKeys[i];
          // 值不同，且不是事件属性
          if (nextProps[key] !== prevProps[key] &&
              !isEmitListener(emitsOptions, key)) {
              return true;
          }
      }
      return false;
  }
  function updateHOCHostEl({ vnode, parent }, el // HostNode
  ) {
      while (parent && parent.subTree === vnode) {
          (vnode = parent.vnode).el = el;
          parent = parent.parent;
      }
  }

  const isSuspense = (type) => type.__isSuspense;
  // Suspense exposes a component-like API, and is treated like a component
  // in the compiler, but internally it's a special built-in type that hooks
  // directly into the renderer.
  const SuspenseImpl = {
      // In order to make Suspense tree-shakable, we need to avoid importing it
      // directly in the renderer. The renderer checks for the __isSuspense flag
      // on a vnode's type and calls the `process` method, passing in renderer
      // internals.
      // 为了确保 tree-shakable Suspense 组件功能，避免直接在 renderer 中引入
      // 而是在 renderer 中通过 __isSuspense 结合 true 检测
      __isSuspense: true,
      process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, 
      // platform-specific impl passed from renderer
      rendererInternals) {
          if (n1 == null) {
              mountSuspense(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, rendererInternals);
          }
          else {
              patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, rendererInternals);
          }
      },
      hydrate: hydrateSuspense,
      create: createSuspenseBoundary
  };
  // Force-casted public typing for h and TSX props inference
  const Suspense = ( SuspenseImpl
      );
  function mountSuspense(vnode, container, anchor, parentComponent, parentSuspense, isSVG, optimized, rendererInternals) {
      const { p: patch, o: { createElement } } = rendererInternals;
      const hiddenContainer = createElement('div');
      const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, container, hiddenContainer, anchor, isSVG, optimized, rendererInternals));
      // start mounting the content subtree in an off-dom container
      patch(null, (suspense.pendingBranch = vnode.ssContent), hiddenContainer, null, parentComponent, suspense, isSVG);
      // now check if we have encountered any async deps
      if (suspense.deps > 0) {
          // has async
          // mount the fallback tree
          patch(null, vnode.ssFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
          isSVG);
          setActiveBranch(suspense, vnode.ssFallback);
      }
      else {
          // Suspense has no async deps. Just resolve.
          suspense.resolve();
      }
  }
  function patchSuspense(n1, n2, container, anchor, parentComponent, isSVG, { p: patch, um: unmount, o: { createElement } }) {
      const suspense = (n2.suspense = n1.suspense);
      suspense.vnode = n2;
      n2.el = n1.el;
      const newBranch = n2.ssContent;
      const newFallback = n2.ssFallback;
      const { activeBranch, pendingBranch, isInFallback, isHydrating } = suspense;
      if (pendingBranch) {
          suspense.pendingBranch = newBranch;
          if (isSameVNodeType(newBranch, pendingBranch)) {
              // same root type but content may have changed.
              patch(pendingBranch, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG);
              if (suspense.deps <= 0) {
                  suspense.resolve();
              }
              else if (isInFallback) {
                  patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                  isSVG);
                  setActiveBranch(suspense, newFallback);
              }
          }
          else {
              // toggled before pending tree is resolved
              suspense.pendingId++;
              if (isHydrating) {
                  // if toggled before hydration is finished, the current DOM tree is
                  // no longer valid. set it as the active branch so it will be unmounted
                  // when resolved
                  suspense.isHydrating = false;
                  suspense.activeBranch = pendingBranch;
              }
              else {
                  unmount(pendingBranch, parentComponent, suspense);
              }
              // increment pending ID. this is used to invalidate async callbacks
              // reset suspense state
              suspense.deps = 0;
              // discard effects from pending branch
              suspense.effects.length = 0;
              // discard previous container
              suspense.hiddenContainer = createElement('div');
              if (isInFallback) {
                  // already in fallback state
                  patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG);
                  if (suspense.deps <= 0) {
                      suspense.resolve();
                  }
                  else {
                      patch(activeBranch, newFallback, container, anchor, parentComponent, null, // fallback tree will not have suspense context
                      isSVG);
                      setActiveBranch(suspense, newFallback);
                  }
              }
              else if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
                  // toggled "back" to current active branch
                  patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG);
                  // force resolve
                  suspense.resolve(true);
              }
              else {
                  // switched to a 3rd branch
                  patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG);
                  if (suspense.deps <= 0) {
                      suspense.resolve();
                  }
              }
          }
      }
      else {
          if (activeBranch && isSameVNodeType(newBranch, activeBranch)) {
              // root did not change, just normal patch
              patch(activeBranch, newBranch, container, anchor, parentComponent, suspense, isSVG);
              setActiveBranch(suspense, newBranch);
          }
          else {
              // root node toggled
              // invoke @pending event
              const onPending = n2.props && n2.props.onPending;
              if (isFunction(onPending)) {
                  onPending();
              }
              // mount pending branch in off-dom container
              suspense.pendingBranch = newBranch;
              suspense.pendingId++;
              patch(null, newBranch, suspense.hiddenContainer, null, parentComponent, suspense, isSVG);
              if (suspense.deps <= 0) {
                  // incoming branch has no async deps, resolve now.
                  suspense.resolve();
              }
              else {
                  const { timeout, pendingId } = suspense;
                  if (timeout > 0) {
                      setTimeout(() => {
                          if (suspense.pendingId === pendingId) {
                              suspense.fallback(newFallback);
                          }
                      }, timeout);
                  }
                  else if (timeout === 0) {
                      suspense.fallback(newFallback);
                  }
              }
          }
      }
  }
  function createSuspenseBoundary(vnode, parent, parentComponent, container, hiddenContainer, anchor, isSVG, optimized, rendererInternals, isHydrating = false) {
      const { p: patch, m: move, um: unmount, n: next, o: { parentNode, remove } } = rendererInternals;
      const timeout = toNumber(vnode.props && vnode.props.timeout);
      const suspense = {
          vnode,
          parent,
          parentComponent,
          isSVG,
          container,
          hiddenContainer,
          anchor,
          deps: 0,
          pendingId: 0,
          timeout: typeof timeout === 'number' ? timeout : -1,
          activeBranch: null,
          pendingBranch: null,
          isInFallback: true,
          isHydrating,
          isUnmounted: false,
          effects: [],
          resolve(resume = false) {
              const { vnode, activeBranch, pendingBranch, pendingId, effects, parentComponent, container } = suspense;
              if (suspense.isHydrating) {
                  suspense.isHydrating = false;
              }
              else if (!resume) {
                  // 1. transition 支持，将 move() 操作注册到 afterLeave 回调
                  // 2. 卸载当前的 subTree 可能是 fallback
                  // 3. 不是 transition dely enter 进行 move()
                  // 这里最后执行的操作就是 move() 如果是 transition delay enter
                  // 则将 move() 注册到 afterLeave，否则直接执行 move() 将 suspense
                  // 内容渲染到真实DOM上
                  const delayEnter = activeBranch &&
                      pendingBranch.transition &&
                      pendingBranch.transition.mode === 'out-in';
                  if (delayEnter) {
                      activeBranch.transition.afterLeave = () => {
                          if (pendingId === suspense.pendingId) {
                              move(pendingBranch, container, anchor, 0 /* ENTER */);
                          }
                      };
                  }
                  // this is initial anchor on mount
                  let { anchor } = suspense;
                  // unmount current active tree
                  if (activeBranch) {
                      // if the fallback tree was mounted, it may have been moved
                      // as part of a parent suspense. get the latest anchor for insertion
                      anchor = next(activeBranch);
                      unmount(activeBranch, parentComponent, suspense, true);
                  }
                  if (!delayEnter) {
                      // move content from off-dom container to actual container
                      move(pendingBranch, container, anchor, 0 /* ENTER */);
                  }
              }
              // 标记当前激活状态的分支，此时是 #default
              setActiveBranch(suspense, pendingBranch);
              suspense.pendingBranch = null;
              suspense.isInFallback = false;
              // flush buffered effects
              // check if there is a pending parent suspense
              // 注册的 effect 处理，这里的处理说明了 suspense 的父子依赖执行
              // 的顺序问题， effects 是按照数组加入顺序执行的(详情可以查看 reactivity 文章)
              // 所以 effects 的优先级是自上而下的，即 parent-parent > parent > children
              let parent = suspense.parent;
              let hasUnresolvedAncestor = false;
              while (parent) {
                  if (parent.pendingBranch) {
                      // found a pending parent suspense, merge buffered post jobs
                      // into that parent
                      parent.effects.push(...effects);
                      hasUnresolvedAncestor = true;
                      break;
                  }
                  parent = parent.parent;
              }
              // no pending parent suspense, flush all jobs
              // 如果没有挂起的 parent suspense 直接 flush 掉所有任务
              // 结合上面的 while 举例：
              // CompA -> CompB -> CompC
              // 当解析到 CompC 时，一直往上检测 B 和 A 如果 B 有挂起的任务
              // C 这里的任务不会被 flush，而是加入到 B 的队列等待执行
              // 然后 C 解析完成，回溯到 B 的解析，此时又遵循同一套规则检测 A 的
              // 挂起任务，直到最后要么立即执行 B 的任务要么 B 的任务也加入到 A
              // 最后由 A 执行所有的任务(包含子 suspense 的)
              if (!hasUnresolvedAncestor) {
                  queuePostFlushCb(effects);
              }
              suspense.effects = [];
              // invoke @resolve event
              const onResolve = vnode.props && vnode.props.onResolve;
              if (isFunction(onResolve)) {
                  onResolve();
              }
          },
          fallback(fallbackVNode) {
              if (!suspense.pendingBranch) {
                  return;
              }
              const { vnode, activeBranch, parentComponent, container, isSVG } = suspense;
              const onFallback = vnode.props && vnode.props.onFallback;
              if (isFunction(onFallback)) {
                  onFallback();
              }
              const anchor = next(activeBranch);
              const mountFallback = () => {
                  if (!suspense.isInFallback) {
                      return;
                  }
                  // 加载 fallback 分支树
                  patch(null, fallbackVNode, container, anchor, parentComponent, null, // fallback 不会有 suspense 内容
                  isSVG);
                  setActiveBranch(suspense, fallbackVNode);
              };
              const delayEnter = fallbackVNode.transition && fallbackVNode.transition.mode === 'out-in';
              if (delayEnter) {
                  activeBranch.transition.afterLeave = mountFallback;
              }
              // unmount current active branch
              unmount(activeBranch, parentComponent, null, // no suspense so unmount hooks fire now
              true // shouldRemove
              );
              suspense.isInFallback = true;
              if (!delayEnter) {
                  mountFallback();
              }
          },
          move(container, anchor, type) {
              suspense.activeBranch &&
                  move(suspense.activeBranch, container, anchor, type);
              suspense.container = container;
          },
          next() {
              return suspense.activeBranch && next(suspense.activeBranch);
          },
          registerDep(instance, setupRenderEffect) {
              const isInPendingSuspense = !!suspense.pendingBranch;
              if (isInPendingSuspense) {
                  suspense.deps++;
              }
              const hydratedEl = instance.vnode.el;
              // 捕获 setup 执行的异常，或接受执行的结果
              instance
                  .asyncDep.catch(err => {
                  handleError(err, instance, 0 /* SETUP_FUNCTION */);
              })
                  .then(asyncSetupResult => {
                  // 当 setup() 的 promise 状态变更之后重试
                  // 因为在解析之前组件可能已经被卸载了
                  if (instance.isUnmounted ||
                      suspense.isUnmounted ||
                      suspense.pendingId !== instance.suspenseId) {
                      return;
                  }
                  // 从该组件开始重试，状态标记为已经完成
                  instance.asyncResolved = true;
                  const { vnode } = instance;
                  handleSetupResult(instance, asyncSetupResult);
                  if (hydratedEl) {
                      // 虚拟节点可能在 async dep 状态完成之前被某个更新替换掉了
                      vnode.el = hydratedEl;
                  }
                  const placeHolder = !hydratedEl && instance.subTree.el;
                  setupRenderEffect(instance, vnode, 
                  // 组件可能在 resolve 之前被移除了
                  // 如果这个不是一个 hydration，instance.subTree 将会是个注释
                  // 占位节点
                  parentNode(hydratedEl || instance.subTree.el), hydratedEl ? null : next(instance.subTree), suspense, isSVG, optimized);
                  if (placeHolder) {
                      remove(placeHolder);
                  }
                  updateHOCHostEl(instance, vnode.el);
                  // only decrease deps count if suspense is not already resolved
                  // 没有任何依赖了就开始解析 Suspense
                  if (isInPendingSuspense && --suspense.deps === 0) {
                      suspense.resolve();
                  }
              });
          },
          unmount(parentSuspense, doRemove) {
              suspense.isUnmounted = true;
              if (suspense.activeBranch) {
                  unmount(suspense.activeBranch, parentComponent, parentSuspense, doRemove);
              }
              if (suspense.pendingBranch) {
                  unmount(suspense.pendingBranch, parentComponent, parentSuspense, doRemove);
              }
          }
      };
      return suspense;
  }
  function hydrateSuspense(node, vnode, parentComponent, parentSuspense, isSVG, optimized, rendererInternals, hydrateNode) {
      /* eslint-disable no-restricted-globals */
      const suspense = (vnode.suspense = createSuspenseBoundary(vnode, parentSuspense, parentComponent, node.parentNode, document.createElement('div'), null, isSVG, optimized, rendererInternals, true /* hydrating */));
      // there are two possible scenarios for server-rendered suspense:
      // - success: ssr content should be fully resolved
      // - failure: ssr content should be the fallback branch.
      // however, on the client we don't really know if it has failed or not
      // attempt to hydrate the DOM assuming it has succeeded, but we still
      // need to construct a suspense boundary first
      const result = hydrateNode(node, (suspense.pendingBranch = vnode.ssContent), parentComponent, suspense, optimized);
      if (suspense.deps === 0) {
          suspense.resolve();
      }
      return result;
      /* eslint-enable no-restricted-globals */
  }
  function normalizeSuspenseChildren(vnode) {
      const { shapeFlag, children } = vnode;
      let content, fallback;
      if (shapeFlag & 32 /* SLOTS_CHILDREN */) {
          content = normalizeSuspenseSlot(children.default);
          fallback = normalizeSuspenseSlot(children.fallback);
      }
      else {
          content = normalizeSuspenseSlot(children);
          fallback = normalizeVNode(null);
      }
      return {
          content,
          fallback
      };
  }
  function normalizeSuspenseSlot(s) {
      if (isFunction(s)) {
          s = s();
      }
      if (isArray(s)) {
          // ROOT 必须是单节点 <div>...</div>
          const singleChild = filterSingleRoot(s);
          if ( !singleChild) {
              warn(`<Suspense> slots expect a single root node.`);
          }
          s = singleChild;
      }
      return normalizeVNode(s);
  }
  function queueEffectWithSuspense(fn, suspense) {
      if (suspense && suspense.pendingBranch) {
          if (isArray(fn)) {
              suspense.effects.push(...fn);
          }
          else {
              suspense.effects.push(fn);
          }
      }
      else {
          queuePostFlushCb(fn);
      }
  }
  function setActiveBranch(suspense, branch) {
      suspense.activeBranch = branch;
      const { vnode, parentComponent } = suspense;
      const el = (vnode.el = branch.el);
      // in case suspense is the root node of a component,
      // recursively update the HOC el
      if (parentComponent && parentComponent.subTree === vnode) {
          parentComponent.vnode.el = el;
          updateHOCHostEl(parentComponent, el);
      }
  }

  let isRenderingCompiledSlot = 0;
  const setCompiledSlotRendering = (n) => (isRenderingCompiledSlot += n);
  /**
   * Compiler runtime helper for rendering `<slot/>`
   * @private
   */
  function renderSlot(slots, name, props = {}, 
  // this is not a user-facing function, so the fallback is always generated by
  // the compiler and guaranteed to be a function returning an array
  fallback) {
      let slot = slots[name];
      if ( slot && slot.length > 1) {
          warn(`SSR-optimized slot function detected in a non-SSR-optimized render ` +
              `function. You need to mark this component with $dynamic-slots in the ` +
              `parent template.`);
          slot = () => [];
      }
      // a compiled slot disables block tracking by default to avoid manual
      // invocation interfering with template-based block tracking, but in
      // `renderSlot` we can be sure that it's template-based so we can force
      // enable it.
      isRenderingCompiledSlot++;
      openBlock();
      const validSlotContent = slot && ensureValidVNode(slot(props));
      const rendered = createBlock(Fragment, { key: props.key || `_${name}` }, validSlotContent || (fallback ? fallback() : []), validSlotContent && slots._ === 1 /* STABLE */
          ? 64 /* STABLE_FRAGMENT */
          : -2 /* BAIL */);
      isRenderingCompiledSlot--;
      return rendered;
  }
  function ensureValidVNode(vnodes) {
      return vnodes.some(child => {
          if (!isVNode(child))
              return true;
          if (child.type === Comment)
              return false;
          if (child.type === Fragment &&
              !ensureValidVNode(child.children))
              return false;
          return true;
      })
          ? vnodes
          : null;
  }

  /**
   * Wrap a slot function to memoize current rendering instance
   * @private
   */
  function withCtx(fn, ctx = currentRenderingInstance) {
      if (!ctx)
          return fn;
      const renderFnWithContext = (...args) => {
          // If a user calls a compiled slot inside a template expression (#1745), it
          // can mess up block tracking, so by default we need to push a null block to
          // avoid that. This isn't necessary if rendering a compiled `<slot>`.
          if (!isRenderingCompiledSlot) {
              openBlock(true /* null block that disables tracking */);
          }
          const owner = currentRenderingInstance;
          setCurrentRenderingInstance(ctx);
          const res = fn(...args);
          setCurrentRenderingInstance(owner);
          if (!isRenderingCompiledSlot) {
              closeBlock();
          }
          return res;
      };
      renderFnWithContext._c = true;
      return renderFnWithContext;
  }

  // SFC scoped style ID management.
  let currentScopeId = null;
  const scopeIdStack = [];
  /**
   * @private
   */
  function pushScopeId(id) {
      scopeIdStack.push((currentScopeId = id));
  }
  /**
   * @private
   */
  function popScopeId() {
      scopeIdStack.pop();
      currentScopeId = scopeIdStack[scopeIdStack.length - 1] || null;
  }
  /**
   * @private
   */
  function withScopeId(id) {
      return ((fn) => withCtx(function () {
          pushScopeId(id);
          const res = fn.apply(this, arguments);
          popScopeId();
          return res;
      }));
  }

  const isTeleport = (type) => type.__isTeleport;
  const isTeleportDisabled = (props) => props && (props.disabled || props.disabled === '');
  const isTargetSVG = (target) => typeof SVGElement !== 'undefined' && target instanceof SVGElement;
  const resolveTarget = (props, select) => {
      const targetSelector = props && props.to;
      if (isString(targetSelector)) {
          if (!select) {
              
                  warn(`Current renderer does not support string target for Teleports. ` +
                      `(missing querySelector renderer option)`);
              return null;
          }
          else {
              const target = select(targetSelector);
              if (!target) {
                  
                      warn(`Failed to locate Teleport target with selector "${targetSelector}". ` +
                          `Note the target element must exist before the component is mounted - ` +
                          `i.e. the target cannot be rendered by the component itself, and ` +
                          `ideally should be outside of the entire Vue component tree.`);
              }
              return target;
          }
      }
      else {
          if ( !targetSelector && !isTeleportDisabled(props)) {
              warn(`Invalid Teleport target: ${targetSelector}`);
          }
          return targetSelector;
      }
  };
  const TeleportImpl = {
      __isTeleport: true,
      process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, internals) {
          const { mc: mountChildren, pc: patchChildren, pbc: patchBlockChildren, o: { insert, querySelector, createText, createComment } } = internals;
          const disabled = isTeleportDisabled(n2.props);
          const { shapeFlag, children } = n2;
          if (n1 == null) {
              // insert anchors in the main view
              const placeholder = (n2.el =  createComment('teleport start')
                  );
              const mainAnchor = (n2.anchor =  createComment('teleport end')
                  );
              insert(placeholder, container, anchor);
              insert(mainAnchor, container, anchor);
              const target = (n2.target = resolveTarget(n2.props, querySelector));
              const targetAnchor = (n2.targetAnchor = createText(''));
              if (target) {
                  insert(targetAnchor, target);
                  // #2652 we could be teleporting from a non-SVG tree into an SVG tree
                  isSVG = isSVG || isTargetSVG(target);
              }
              else if ( !disabled) {
                  warn('Invalid Teleport target on mount:', target, `(${typeof target})`);
              }
              const mount = (container, anchor) => {
                  // Teleport *always* has Array children. This is enforced in both the
                  // compiler and vnode children normalization.
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(children, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
              };
              if (disabled) {
                  mount(container, mainAnchor);
              }
              else if (target) {
                  mount(target, targetAnchor);
              }
          }
          else {
              // update content
              n2.el = n1.el;
              const mainAnchor = (n2.anchor = n1.anchor);
              const target = (n2.target = n1.target);
              const targetAnchor = (n2.targetAnchor = n1.targetAnchor);
              const wasDisabled = isTeleportDisabled(n1.props);
              const currentContainer = wasDisabled ? container : target;
              const currentAnchor = wasDisabled ? mainAnchor : targetAnchor;
              isSVG = isSVG || isTargetSVG(target);
              if (n2.dynamicChildren) {
                  // fast path when the teleport happens to be a block root
                  patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren, currentContainer, parentComponent, parentSuspense, isSVG);
                  // even in block tree mode we need to make sure all root-level nodes
                  // in the teleport inherit previous DOM references so that they can
                  // be moved in future patches.
                  traverseStaticChildren(n1, n2, true);
              }
              else if (!optimized) {
                  patchChildren(n1, n2, currentContainer, currentAnchor, parentComponent, parentSuspense, isSVG);
              }
              if (disabled) {
                  if (!wasDisabled) {
                      // enabled -> disabled
                      // move into main container
                      moveTeleport(n2, container, mainAnchor, internals, 1 /* TOGGLE */);
                  }
              }
              else {
                  // target changed
                  if ((n2.props && n2.props.to) !== (n1.props && n1.props.to)) {
                      const nextTarget = (n2.target = resolveTarget(n2.props, querySelector));
                      if (nextTarget) {
                          moveTeleport(n2, nextTarget, null, internals, 0 /* TARGET_CHANGE */);
                      }
                      else {
                          warn('Invalid Teleport target on update:', target, `(${typeof target})`);
                      }
                  }
                  else if (wasDisabled) {
                      // disabled -> enabled
                      // move into teleport target
                      moveTeleport(n2, target, targetAnchor, internals, 1 /* TOGGLE */);
                  }
              }
          }
      },
      remove(vnode, { r: remove, o: { remove: hostRemove } }) {
          const { shapeFlag, children, anchor } = vnode;
          hostRemove(anchor);
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              for (let i = 0; i < children.length; i++) {
                  remove(children[i]);
              }
          }
      },
      move: moveTeleport,
      hydrate: hydrateTeleport
  };
  function moveTeleport(vnode, container, parentAnchor, { o: { insert }, m: move }, moveType = 2 /* REORDER */) {
      // move target anchor if this is a target change.
      if (moveType === 0 /* TARGET_CHANGE */) {
          insert(vnode.targetAnchor, container, parentAnchor);
      }
      const { el, anchor, shapeFlag, children, props } = vnode;
      const isReorder = moveType === 2 /* REORDER */;
      // move main view anchor if this is a re-order.
      if (isReorder) {
          insert(el, container, parentAnchor);
      }
      // if this is a re-order and teleport is enabled (content is in target)
      // do not move children. So the opposite is: only move children if this
      // is not a reorder, or the teleport is disabled
      if (!isReorder || isTeleportDisabled(props)) {
          // Teleport has either Array children or no children.
          if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
              for (let i = 0; i < children.length; i++) {
                  move(children[i], container, parentAnchor, 2 /* REORDER */);
              }
          }
      }
      // move main view anchor if this is a re-order.
      if (isReorder) {
          insert(anchor, container, parentAnchor);
      }
  }
  function hydrateTeleport(node, vnode, parentComponent, parentSuspense, optimized, { o: { nextSibling, parentNode, querySelector } }, hydrateChildren) {
      const target = (vnode.target = resolveTarget(vnode.props, querySelector));
      if (target) {
          // if multiple teleports rendered to the same target element, we need to
          // pick up from where the last teleport finished instead of the first node
          const targetNode = target._lpa || target.firstChild;
          if (vnode.shapeFlag & 16 /* ARRAY_CHILDREN */) {
              if (isTeleportDisabled(vnode.props)) {
                  vnode.anchor = hydrateChildren(nextSibling(node), vnode, parentNode(node), parentComponent, parentSuspense, optimized);
                  vnode.targetAnchor = targetNode;
              }
              else {
                  vnode.anchor = nextSibling(node);
                  vnode.targetAnchor = hydrateChildren(targetNode, vnode, target, parentComponent, parentSuspense, optimized);
              }
              target._lpa =
                  vnode.targetAnchor && nextSibling(vnode.targetAnchor);
          }
      }
      return vnode.anchor && nextSibling(vnode.anchor);
  }
  // Force-casted public typing for h and TSX props inference
  const Teleport = TeleportImpl;

  const COMPONENTS = 'components';
  const DIRECTIVES = 'directives';
  /**
   * @private
   */
  function resolveComponent(name) {
      return resolveAsset(COMPONENTS, name) || name;
  }
  const NULL_DYNAMIC_COMPONENT = Symbol();
  /**
   * @private
   */
  function resolveDynamicComponent(component) {
      if (isString(component)) {
          return resolveAsset(COMPONENTS, component, false) || component;
      }
      else {
          // invalid types will fallthrough to createVNode and raise warning
          return (component || NULL_DYNAMIC_COMPONENT);
      }
  }
  /**
   * @private
   */
  function resolveDirective(name) {
      return resolveAsset(DIRECTIVES, name);
  }
  // implementation
  function resolveAsset(type, name, warnMissing = true) {
      const instance = currentRenderingInstance || currentInstance;
      if (instance) {
          const Component = instance.type;
          // self name has highest priority
          if (type === COMPONENTS) {
              // special self referencing call generated by compiler
              // inferred from SFC filename
              if (name === `_self`) {
                  return Component;
              }
              const selfName = getComponentName(Component);
              if (selfName &&
                  (selfName === name ||
                      selfName === camelize(name) ||
                      selfName === capitalize(camelize(name)))) {
                  return Component;
              }
          }
          const res = 
          // local registration
          // check instance[type] first for components with mixin or extends.
          resolve(instance[type] || Component[type], name) ||
              // global registration
              resolve(instance.appContext[type], name);
          if ( warnMissing && !res) {
              warn(`Failed to resolve ${type.slice(0, -1)}: ${name}`);
          }
          return res;
      }
      else {
          warn(`resolve${capitalize(type.slice(0, -1))} ` +
              `can only be used in render() or setup().`);
      }
  }
  function resolve(registry, name) {
      return (registry &&
          (registry[name] ||
              registry[camelize(name)] ||
              registry[capitalize(camelize(name))]));
  }

  /* eslint-disable no-restricted-globals */
  let isHmrUpdating = false;
  const hmrDirtyComponents = new Set();
  // Expose the HMR runtime on the global object
  // This makes it entirely tree-shakable without polluting the exports and makes
  // it easier to be used in toolings like vue-loader
  // Note: for a component to be eligible for HMR it also needs the __hmrId option
  // to be set so that its instances can be registered / removed.
  {
      const globalObject = typeof global !== 'undefined'
          ? global
          : typeof self !== 'undefined'
              ? self
              : typeof window !== 'undefined'
                  ? window
                  : {};
      globalObject.__VUE_HMR_RUNTIME__ = {
          createRecord: tryWrap(createRecord),
          rerender: tryWrap(rerender),
          reload: tryWrap(reload)
      };
  }
  const map = new Map();
  function createRecord(id, component) {
      if (!component) {
          warn(`HMR API usage is out of date.\n` +
              `Please upgrade vue-loader/vite/rollup-plugin-vue or other relevant ` +
              `depdendency that handles Vue SFC compilation.`);
          component = {};
      }
      if (map.has(id)) {
          return false;
      }
      map.set(id, {
          component: isClassComponent(component) ? component.__vccOpts : component,
          instances: new Set()
      });
      return true;
  }
  function rerender(id, newRender) {
      const record = map.get(id);
      if (!record)
          return;
      if (newRender)
          record.component.render = newRender;
      // Array.from creates a snapshot which avoids the set being mutated during
      // updates
      Array.from(record.instances).forEach(instance => {
          if (newRender) {
              instance.render = newRender;
          }
          instance.renderCache = [];
          // this flag forces child components with slot content to update
          isHmrUpdating = true;
          instance.update();
          isHmrUpdating = false;
      });
  }
  function reload(id, newComp) {
      const record = map.get(id);
      if (!record)
          return;
      // Array.from creates a snapshot which avoids the set being mutated during
      // updates
      const { component, instances } = record;
      if (!hmrDirtyComponents.has(component)) {
          // 1. Update existing comp definition to match new one
          newComp = isClassComponent(newComp) ? newComp.__vccOpts : newComp;
          extend(component, newComp);
          for (const key in component) {
              if (!(key in newComp)) {
                  delete component[key];
              }
          }
          // 2. Mark component dirty. This forces the renderer to replace the component
          // on patch.
          hmrDirtyComponents.add(component);
          // 3. Make sure to unmark the component after the reload.
          queuePostFlushCb(() => {
              hmrDirtyComponents.delete(component);
          });
      }
      Array.from(instances).forEach(instance => {
          if (instance.parent) {
              // 4. Force the parent instance to re-render. This will cause all updated
              // components to be unmounted and re-mounted. Queue the update so that we
              // don't end up forcing the same parent to re-render multiple times.
              queueJob(instance.parent.update);
          }
          else if (instance.appContext.reload) {
              // root instance mounted via createApp() has a reload method
              instance.appContext.reload();
          }
          else if (typeof window !== 'undefined') {
              // root instance inside tree created via raw render(). Force reload.
              window.location.reload();
          }
          else {
              console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
          }
      });
  }
  function tryWrap(fn) {
      return (id, arg) => {
          try {
              return fn(id, arg);
          }
          catch (e) {
              console.error(e);
              console.warn(`[HMR] Something went wrong during Vue component hot-reload. ` +
                  `Full reload required.`);
          }
      };
  }

  const Fragment = Symbol( 'Fragment' );
  const Text = Symbol( 'Text' );
  const Comment = Symbol( 'Comment' );
  const Static = Symbol( 'Static' );
  // Since v-if and v-for are the two possible ways node structure can dynamically
  // change, once we consider v-if branches and each v-for fragment a block, we
  // can divide a template into nested blocks, and within each block the node
  // structure would be stable. This allows us to skip most children diffing
  // and only worry about the dynamic nodes (indicated by patch flags).
  // 针对 v-if, v-for 动态性做的由于，减少对静态节点的 diff ，只需要关心动态节点即可
  const blockStack = [];
  let currentBlock = null;
  /**
   * Open a block.
   * This must be called before `createBlock`. It cannot be part of `createBlock`
   * because the children of the block are evaluated before `createBlock` itself
   * is called. The generated code typically looks like this:
   *
   * ```js
   * function render() {
   *   return (openBlock(),createBlock('div', null, [...]))
   * }
   * ```
   * disableTracking is true when creating a v-for fragment block, since a v-for
   * fragment always diffs its children.
   *
   * @private
   */
  function openBlock(disableTracking = false) {
      blockStack.push((currentBlock = disableTracking ? null : []));
  }
  function closeBlock() {
      blockStack.pop();
      currentBlock = blockStack[blockStack.length - 1] || null;
  }
  // Whether we should be tracking dynamic child nodes inside a block.
  // Only tracks when this value is > 0
  // We are not using a simple boolean because this value may need to be
  // incremented/decremented by nested usage of v-once (see below)
  // 是否应该 tracking block 内动态的孩子节点
  let shouldTrack$1 = 1;
  /**
   * Block tracking sometimes needs to be disabled, for example during the
   * creation of a tree that needs to be cached by v-once. The compiler generates
   * code like this:
   *
   * ``` js
   * _cache[1] || (
   *   setBlockTracking(-1),
   *   _cache[1] = createVNode(...),
   *   setBlockTracking(1),
   *   _cache[1]
   * )
   * ```
   *
   * @private
   */
  function setBlockTracking(value) {
      shouldTrack$1 += value;
  }
  /**
   * Create a block root vnode. Takes the same exact arguments as `createVNode`.
   * A block root keeps track of dynamic nodes within the block in the
   * `dynamicChildren` array.
   *
   * @private
   */
  function createBlock(type, props, children, patchFlag, dynamicProps) {
      const vnode = createVNode(type, props, children, patchFlag, dynamicProps, true /* isBlock: prevent a block from tracking itself */);
      // save current block children on the block vnode
      vnode.dynamicChildren = currentBlock || EMPTY_ARR;
      // close block
      closeBlock();
      // a block is always going to be patched, so track it as a child of its
      // parent block
      if (shouldTrack$1 > 0 && currentBlock) {
          currentBlock.push(vnode);
      }
      return vnode;
  }
  function isVNode(value) {
      return value ? value.__v_isVNode === true : false;
  }
  function isSameVNodeType(n1, n2) {
      if (
          n2.shapeFlag & 6 /* COMPONENT */ &&
          hmrDirtyComponents.has(n2.type)) {
          // HMR only: if the component has been hot-updated, force a reload.
          // 组件被热更新，强制重新加载
          return false;
      }
      return n1.type === n2.type && n1.key === n2.key;
  }
  let vnodeArgsTransformer;
  /**
   * Internal API for registering an arguments transform for createVNode
   * used for creating stubs in the test-utils
   * It is *internal* but needs to be exposed for test-utils to pick up proper
   * typings
   */
  function transformVNodeArgs(transformer) {
      vnodeArgsTransformer = transformer;
  }
  const createVNodeWithArgsTransform = (...args) => {
      return _createVNode(...(vnodeArgsTransformer
          ? vnodeArgsTransformer(args, currentRenderingInstance)
          : args));
  };
  const InternalObjectKey = `__vInternal`;
  const normalizeKey = ({ key }) => key != null ? key : null;
  const normalizeRef = ({ ref }) => {
      return (ref != null
          ? isString(ref) || isRef(ref) || isFunction(ref)
              ? { i: currentRenderingInstance, r: ref }
              : ref
          : null);
  };
  const createVNode = ( createVNodeWithArgsTransform
      );
  function _createVNode(type, props = null, children = null, patchFlag = 0, dynamicProps = null, isBlockNode = false) {
      // 无效的 tag 类型
      if (!type || type === NULL_DYNAMIC_COMPONENT) {
          if ( !type) {
              warn(`Invalid vnode type when creating vnode: ${type}.`);
          }
          type = Comment;
      }
      // 1. type is vnode
      if (isVNode(type)) {
          // createVNode receiving an existing vnode. This happens in cases like
          // <component :is="vnode"/>
          // #2078 make sure to merge refs during the clone instead of overwriting it
          const cloned = cloneVNode(type, props, true /* mergeRef: true */);
          if (children) {
              normalizeChildren(cloned, children);
          }
          return cloned;
      }
      // 2. class component
      if (isClassComponent(type)) {
          type = type.__vccOpts;
      }
      // 3. props 处理, class & style normalization
      if (props) {
          // for reactive or proxy objects, we need to clone it to enable mutation.
          if (isProxy(props) || InternalObjectKey in props) {
              props = extend({}, props);
          }
          let { class: klass, style } = props;
          if (klass && !isString(klass)) {
              // 1. string -> klass
              // 'foo' -> 'foo'
              // 2. array -> '' + arr.join(' ')
              // ['foo', 'bar'] -> 'foo bar'
              // 3. object -> '' + value ? ' value' : ''
              // { foo: true, bar: false, baz: true } -> 'foo baz'
              props.class = normalizeClass(klass);
          }
          if (isObject(style)) {
              // reactive state objects need to be cloned since they are likely to be
              // mutated
              if (isProxy(style) && !isArray(style)) {
                  style = extend({}, style);
              }
              // 1. array -> object
              // [{ color: 'red' }, 'font-size:10px;height:100px;'] ->
              // { color: 'red', 'font-size': '10px', height: '100px' }
              // 2. object -> object 原样返回
              props.style = normalizeStyle(style);
          }
      }
      // encode the vnode type information into a bitmap
      const shapeFlag = isString(type)
          ? 1 /* ELEMENT */
          :  isSuspense(type)
              ? 128 /* SUSPENSE */
              : isTeleport(type)
                  ? 64 /* TELEPORT */
                  : isObject(type)
                      ? 4 /* STATEFUL_COMPONENT */
                      : isFunction(type)
                          ? 2 /* FUNCTIONAL_COMPONENT */
                          : 0;
      // 4. warn STATEFUL_COMPONENT
      if ( shapeFlag & 4 /* STATEFUL_COMPONENT */ && isProxy(type)) {
          type = toRaw(type);
          warn(`Vue received a Component which was made a reactive object. This can ` +
              `lead to unnecessary performance overhead, and should be avoided by ` +
              `marking the component with \`markRaw\` or using \`shallowRef\` ` +
              `instead of \`ref\`.`, `\nComponent that was made reactive: `, type);
      }
      // 构建 vnode 对象
      const vnode = {
          __v_isVNode: true,
          ["__v_skip" /* SKIP */]: true /*不用做响应式处理*/,
          type,
          props,
          key: props && normalizeKey(props),
          ref: props && normalizeRef(props),
          scopeId: currentScopeId,
          children: null,
          component: null,
          suspense: null,
          ssContent: null,
          ssFallback: null,
          dirs: null,
          transition: null,
          el: null,
          anchor: null,
          target: null,
          targetAnchor: null,
          staticCount: 0,
          shapeFlag,
          patchFlag,
          dynamicProps,
          dynamicChildren: null,
          appContext: null
      };
      // 5. 检查 key, 不能是 NaN
      if ( vnode.key !== vnode.key) {
          warn(`VNode created with invalid key (NaN). VNode type:`, vnode.type);
      }
      // 6. normalize children
      normalizeChildren(vnode, children);
      // 7. normalize suspense children
      if ( shapeFlag & 128 /* SUSPENSE */) {
          const { content, fallback } = normalizeSuspenseChildren(vnode);
          vnode.ssContent = content;
          vnode.ssFallback = fallback;
      }
      // 8. currentBlock
      if (shouldTrack$1 > 0 &&
          // 避免 block 节点 tracking 自己
          !isBlockNode &&
          // has current parent block
          currentBlock &&
          // presence of a patch flag indicates this node needs patching on updates.
          // component nodes also should always be patched, because even if the
          // component doesn't need to update, it needs to persist the instance on to
          // the next vnode so that it can be properly unmounted later.
          (patchFlag > 0 || shapeFlag & 6 /* COMPONENT */) &&
          // the EVENTS flag is only for hydration and if it is the only flag, the
          // vnode should not be considered dynamic due to handler caching.
          patchFlag !== 32 /* HYDRATE_EVENTS */) {
          currentBlock.push(vnode);
      }
      return vnode;
  }
  function cloneVNode(vnode, extraProps, mergeRef = false) {
      // This is intentionally NOT using spread or extend to avoid the runtime
      // key enumeration cost.
      const { props, ref, patchFlag } = vnode;
      const mergedProps = extraProps ? mergeProps(props || {}, extraProps) : props;
      return {
          __v_isVNode: true,
          ["__v_skip" /* SKIP */]: true,
          type: vnode.type,
          props: mergedProps,
          key: mergedProps && normalizeKey(mergedProps),
          ref: extraProps && extraProps.ref
              ? // #2078 in the case of <component :is="vnode" ref="extra"/>
                  // if the vnode itself already has a ref, cloneVNode will need to merge
                  // the refs so the single vnode can be set on multiple refs
                  mergeRef && ref
                      ? isArray(ref)
                          ? ref.concat(normalizeRef(extraProps))
                          : [ref, normalizeRef(extraProps)]
                      : normalizeRef(extraProps)
              : ref,
          scopeId: vnode.scopeId,
          children: vnode.children,
          target: vnode.target,
          targetAnchor: vnode.targetAnchor,
          staticCount: vnode.staticCount,
          shapeFlag: vnode.shapeFlag,
          // if the vnode is cloned with extra props, we can no longer assume its
          // existing patch flag to be reliable and need to add the FULL_PROPS flag.
          // note: perserve flag for fragments since they use the flag for children
          // fast paths only.
          patchFlag: extraProps && vnode.type !== Fragment
              ? patchFlag === -1 // hoisted node
                  ? 16 /* FULL_PROPS */
                  : patchFlag | 16 /* FULL_PROPS */
              : patchFlag,
          dynamicProps: vnode.dynamicProps,
          dynamicChildren: vnode.dynamicChildren,
          appContext: vnode.appContext,
          dirs: vnode.dirs,
          transition: vnode.transition,
          // These should technically only be non-null on mounted VNodes. However,
          // they *should* be copied for kept-alive vnodes. So we just always copy
          // them since them being non-null during a mount doesn't affect the logic as
          // they will simply be overwritten.
          component: vnode.component,
          suspense: vnode.suspense,
          ssContent: vnode.ssContent && cloneVNode(vnode.ssContent),
          ssFallback: vnode.ssFallback && cloneVNode(vnode.ssFallback),
          el: vnode.el,
          anchor: vnode.anchor
      };
  }
  /**
   * @private
   */
  function createTextVNode(text = ' ', flag = 0) {
      return createVNode(Text, null, text, flag);
  }
  /**
   * @private
   */
  function createStaticVNode(content, numberOfNodes) {
      // A static vnode can contain multiple stringified elements, and the number
      // of elements is necessary for hydration.
      const vnode = createVNode(Static, null, content);
      vnode.staticCount = numberOfNodes;
      return vnode;
  }
  /**
   * @private
   */
  function createCommentVNode(text = '', 
  // when used as the v-else branch, the comment node must be created as a
  // block to ensure correct updates.
  asBlock = false) {
      return asBlock
          ? (openBlock(), createBlock(Comment, null, text))
          : createVNode(Comment, null, text);
  }
  function normalizeVNode(child) {
      if (child == null || typeof child === 'boolean') {
          // empty placeholder
          return createVNode(Comment);
      }
      else if (isArray(child)) {
          // fragment
          return createVNode(Fragment, null, child);
      }
      else if (typeof child === 'object') {
          // already vnode, this should be the most common since compiled templates
          // always produce all-vnode children arrays
          // 这是最常用的情况，因为使用模板的时候最后生成的 children 是数组
          return child.el === null ? child : cloneVNode(child);
      }
      else {
          // strings and numbers
          return createVNode(Text, null, String(child));
      }
  }
  // 针对 template-compiled render fns 做的优化
  function cloneIfMounted(child) {
      // child.el 如果存在的话，child 属于静态节点会被静态提升
      // 所以需要 clone 一份出来，否则直接返回 child
      return child.el === null ? child : cloneVNode(child);
  }
  function normalizeChildren(vnode, children) {
      let type = 0;
      const { shapeFlag } = vnode;
      if (children == null) {
          children = null;
      }
      else if (isArray(children)) {
          type = 16 /* ARRAY_CHILDREN */;
      }
      else if (typeof children === 'object') {
          // & 操作，这里等于是检测是 ELEMENT 还是 TELEPORT
          // 因为 ShapeFlags 内的值是通过左移位得到的
          if (shapeFlag & 1 /* ELEMENT */ || shapeFlag & 64 /* TELEPORT */) {
              // Normalize slot to plain children for plain element and Teleport
              const slot = children.default;
              if (slot) {
                  // _c marker is added by withCtx() indicating this is a compiled slot
                  slot._c && setCompiledSlotRendering(1);
                  normalizeChildren(vnode, slot());
                  slot._c && setCompiledSlotRendering(-1);
              }
              return;
          }
          else {
              type = 32 /* SLOTS_CHILDREN */;
              const slotFlag = children._;
              if (!slotFlag && !(InternalObjectKey in children)) {
                  children._ctx = currentRenderingInstance;
              }
              else if (slotFlag === 3 /* FORWARDED */ && currentRenderingInstance) {
                  // a child component receives forwarded slots from the parent.
                  // its slot type is determined by its parent's slot type.
                  if (currentRenderingInstance.vnode.patchFlag & 1024 /* DYNAMIC_SLOTS */) {
                      children._ = 2 /* DYNAMIC */;
                      vnode.patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  }
                  else {
                      children._ = 1 /* STABLE */;
                  }
              }
          }
      }
      else if (isFunction(children)) {
          // 如果是函数当做 slot children ?
          children = { default: children, _ctx: currentRenderingInstance };
          type = 32 /* SLOTS_CHILDREN */;
      }
      else {
          children = String(children);
          // force teleport children to array so it can be moved around
          if (shapeFlag & 64 /* TELEPORT */) {
              type = 16 /* ARRAY_CHILDREN */;
              children = [createTextVNode(children)];
          }
          else {
              type = 8 /* TEXT_CHILDREN */;
          }
      }
      vnode.children = children;
      vnode.shapeFlag |= type;
  }
  function mergeProps(...args) {
      const ret = extend({}, args[0]);
      for (let i = 1; i < args.length; i++) {
          const toMerge = args[i];
          for (const key in toMerge) {
              if (key === 'class') {
                  if (ret.class !== toMerge.class) {
                      ret.class = normalizeClass([ret.class, toMerge.class]);
                  }
              }
              else if (key === 'style') {
                  ret.style = normalizeStyle([ret.style, toMerge.style]);
              }
              else if (isOn(key)) {
                  const existing = ret[key];
                  const incoming = toMerge[key];
                  if (existing !== incoming) {
                      ret[key] = existing
                          ? [].concat(existing, toMerge[key])
                          : incoming;
                  }
              }
              else if (key !== '') {
                  ret[key] = toMerge[key];
              }
          }
      }
      return ret;
  }

  function initProps(instance, rawProps, isStateful, isSSR = false) {
      const props = {};
      const attrs = {};
      def(attrs, InternalObjectKey, 1);
      setFullProps(instance, rawProps, props, attrs);
      // TODO validation
      if (isStateful) {
          instance.props = isSSR ? props : shallowReactive(props);
      }
      else {
          if (!instance.type.props) {
              // functional optional props, props === attrs
              instance.props = attrs;
          }
          else {
              // functional declared props
              instance.props = props;
          }
      }
      instance.attrs = attrs;
  }
  function updateProps(instance, rawProps, rawPrevProps, optimized) {
      const { props, attrs, vnode: { patchFlag } } = instance;
      const rawCurrentProps = toRaw(props);
      const [options] = instance.propsOptions;
      if (
      // 开发模式下，总是强制进行 full diff
      !(
          (instance.type.__hmrId ||
              (instance.parent && instance.parent.type.__hmrId))) &&
          (optimized || patchFlag > 0) &&
          !(patchFlag & 16 /* FULL_PROPS */)) {
          if (patchFlag & 8 /* PROPS */) {
              const propsToUpdate = instance.vnode.dynamicProps;
              for (let i = 0; i < propsToUpdate.length; i++) {
                  const key = propsToUpdate[i];
                  const value = rawProps[key];
                  if (options) {
                      // attr / props 在初始化阶段会被分离开，在这里只需要检测
                      // attrs 有没有该属性
                      if (hasOwn(attrs, key)) {
                          attrs[key] = value;
                      }
                      else {
                          const camelizedKey = camelize(key);
                          props[camelizedKey] = resolvePropValue(options, rawCurrentProps, camelizedKey, value, instance);
                      }
                  }
                  else {
                      attrs[key] = value;
                  }
              }
          }
      }
      else {
          // full props update
          setFullProps(instance, rawProps, props, attrs);
          // in case of dynamic props, check if we need to delete keys from
          // the props object
          let kebabKey;
          for (const key in rawCurrentProps) {
              if (!rawProps ||
                  // for camelcase
                  (!hasOwn(rawProps, key) &&
                      ((kebabKey = hyphenate(key)) === key || !hasOwn(rawProps, kebabKey)))) {
                  if (options) {
                      if (rawPrevProps &&
                          // for camelCase
                          (rawPrevProps[key] !== undefined ||
                              // for kebad-case
                              rawPrevProps[kebabKey] !== undefined)) {
                          props[key] = resolvePropValue(options, rawProps || EMPTY_OBJ, key, undefined, instance);
                      }
                  }
                  else {
                      delete props[key];
                  }
              }
          }
          if (attrs !== rawCurrentProps) {
              for (const key in attrs) {
                  if (!rawProps || !hasOwn(rawProps, key)) {
                      delete attrs[key];
                  }
              }
          }
      }
      // trigger updates for $attrs in case it's used in component slots
      trigger(instance, "set" /* SET */, '$attrs');
  }
  function setFullProps(instance, rawProps, props, attrs) {
      const [options, needCastKeys] = instance.propsOptions;
      if (rawProps) {
          for (const key in rawProps) {
              const value = rawProps[key];
              // key, ref 保留，不往下传
              // 即这两个属性不会继承给 child
              if (isReservedProp(key)) {
                  continue;
              }
              let camelKey;
              if (options && hasOwn(options, (camelKey = camelize(key)))) {
                  props[camelKey] = value;
              }
              else if (!isEmitListener(instance.emitsOptions, key)) {
                  attrs[key] = value;
              }
          }
      }
      if (needCastKeys) {
          const rawCurrentProps = toRaw(props);
          for (let i = 0; i < needCastKeys.length; i++) {
              const key = needCastKeys[i];
              props[key] = resolvePropValue(options, rawCurrentProps, key, rawCurrentProps[key], instance);
          }
      }
  }
  function resolvePropValue(options, props, key, value, instance) {
      /*
       * 这里面的处理是针对 props: { name: { ... } } 类型而言
       * 1. 默认值的处理， default 可能是函数或普通类型值，如果是函数应该得到
       * 函数执行的结果作为它的值，注意下面的检测函数时前置条件是该类型不是函数，
       * 如果类型也是函数，默认值就是该函数本身，而非执行后的结果值
       * 2. 布尔值的处理，值转成 true or false
       */
      const opt = options[key];
      if (opt != null) {
          const hasDefault = hasOwn(opt, 'default');
          // 默认值
          if (hasDefault && value === undefined) {
              const defaultValue = opt.default;
              // props: { name: { default: (props) => 'xxx' } }
              // 类型不是函数？但是默认值是函数，执行得到结果
              if (opt.type !== Function && isFunction(defaultValue)) {
                  setCurrentInstance(instance);
                  value = defaultValue(props);
                  setCurrentInstance(null);
              }
              else {
                  // props: { name: { default: 'xxx' } }
                  value = defaultValue;
              }
          }
          // boolean casting
          if (opt[0 /* shouldCast */]) {
              if (!hasOwn(props, key) && !hasDefault) {
                  value = false;
              }
              else if (opt[1 /* shouldCastTrue */] &&
                  (value === '' || value === hyphenate(key))) {
                  value = true;
              }
          }
      }
      return value;
  }
  function normalizePropsOptions(comp, appContext, asMixin = false) {
      if (!appContext.deopt && comp.__props) {
          return comp.__props;
      }
      const raw = comp.props;
      const normalized = {};
      const needCastKeys = [];
      // mixin/extends props 应用
      let hasExtends = false;
      // 必须开支 2.x options api 支持，且不是函数式组件
      // 继承来的属性，用法： ~CompA = { extends: CompB, ... }~
      // CompA 会继承 CompB 的 props
      if ( !isFunction(comp)) {
          const extendProps = (raw) => {
              hasExtends = true;
              const [props, keys] = normalizePropsOptions(raw, appContext, true);
              extend(normalized, props);
              if (keys) {
                  needCastKeys.push(...keys);
              }
          };
          // Comp: { mixins: [mixin] } 处理
          if (!asMixin && appContext.mixins.length) {
              appContext.mixins.forEach(extendProps);
          }
          // Comp: { extends: CompA } 处理
          if (comp.extends) {
              extendProps(comp.extends);
          }
          if (comp.mixins) {
              comp.mixins.forEach(extendProps);
          }
      }
      // 既没有自身的 props 也没有 extends 继承来的 props 初始化为 []
      if (!raw && !hasExtends) {
          return (comp.__props = EMPTY_ARR);
      }
      if (isArray(raw)) {
          // 当 props 是数组的时候，必须是字符类型，如: props: ['foo', 'bar', 'foo-bar']
          // 'foo-bar' 会转成 'fooBar'，不允许 '$xxx' 形式的变量名
          for (let i = 0; i < raw.length; i++) {
              const normalizedKey = camelize(raw[i]);
              // 组件的属性名不能是以 $xx 开头的名称，这个是作为内部属性的
              if (validatePropName(normalizedKey)) {
                  normalized[normalizedKey] = EMPTY_OBJ;
              }
          }
      }
      else if (raw) {
          // 对象类型 props: { foo: 1, bar: 2, ... }
          for (const key in raw) {
              // 'foo-bar' -> 'fooBar'
              const normalizedKey = camelize(key);
              // 检查 $xxx 非法属性
              if (validatePropName(normalizedKey)) {
                  const opt = raw[key];
                  // ? 值为数组或函数变成： { type: opt } ?
                  // 这里含义其实是： ~props: { foo: [Boolean, Function] }~
                  // 可以用数组定义该属性可以是多种类型的其中一种
                  const prop = (normalized[normalizedKey] =
                      isArray(opt) || isFunction(opt) ? { type: opt } : opt);
                  if (prop) {
                      // 找到 Boolean 在 foo: [Boolean, Function] 中的索引
                      const booleanIndex = getTypeIndex(Boolean, prop.type);
                      const stringIndex = getTypeIndex(String, prop.type);
                      prop[0 /* shouldCast */] = booleanIndex > -1;
                      // [String, Boolean] 类型，String 在 Boolean 前面
                      prop[1 /* shouldCastTrue */] =
                          stringIndex < 0 || booleanIndex < stringIndex;
                      // 如果是布尔类型的值或者有默认值的属性需要转换
                      // 转换是根据 type 和 default 值处理
                      // type非函数，default是函数，执行 default() 得到默认值
                      if (booleanIndex > -1 || hasOwn(prop, 'default')) {
                          needCastKeys.push(normalizedKey);
                      }
                  }
              }
          }
      }
      return (comp.__props = [normalized, needCastKeys]);
  }
  function validatePropName(key) {
      // 非内部属性？
      if (key[0] !== '$') {
          return true;
      }
      else {
          // $xxx 为保留属性
          warn(`Invalid prop name: "${key}" is a reserved property.`);
      }
      return false;
  }
  // use function string name to check type constructors
  // so that it works across vms / iframes.
  function getType(ctor) {
      const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
      return match ? match[1] : '';
  }
  function isSameType(a, b) {
      return getType(a) === getType(b);
  }
  function getTypeIndex(type, expectedTypes) {
      if (isArray(expectedTypes)) {
          for (let i = 0, len = expectedTypes.length; i < len; i++) {
              if (isSameType(expectedTypes[i], type)) {
                  return i;
              }
          }
      }
      else if (isFunction(expectedTypes)) {
          return isSameType(expectedTypes, type) ? 0 : -1;
      }
      return -1;
  }

  const isInternalKey = (key) => key[0] === '_' || key === '$stable';
  const normalizeSlotValue = (value) => isArray(value)
      ? value.map(normalizeVNode)
      : [normalizeVNode(value)];
  const normalizeSlot = (key, rawSlot, ctx) => withCtx((props) => {
      // warn: 在 Render 函数外执行了 slot function
      return normalizeSlotValue(rawSlot(props));
  }, ctx);
  const normalizeObjectSlots = (rawSlots, slots) => {
      const ctx = rawSlots._ctx;
      for (const key in rawSlots) {
          if (isInternalKey(key)) {
              continue;
          }
          const value = rawSlots[key];
          if (isFunction(value)) {
              slots[key] = normalizeSlot(key, value, ctx);
          }
          else if (value != null) {
              // warn: 使用 function slots 性能更好
              const normalized = normalizeSlotValue(value);
              slots[key] = () => normalized;
          }
      }
  };
  const normalizeVNodeSlots = (instance, children) => {
      const normalized = normalizeSlotValue(children);
      instance.slots.default = () => normalized;
  };
  const initSlots = (instance, children) => {
      if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
          const type = children._;
          if (type) {
              instance.slots = children;
              // make compiler marker non-enumerable
              def(children, '_', type);
          }
          else {
              normalizeObjectSlots(children, (instance.slots = {}));
          }
      }
      else {
          instance.slots = {};
          if (children) {
              normalizeVNodeSlots(instance, children);
          }
      }
      def(instance.slots, InternalObjectKey, 1);
  };
  const updateSlots = (instance, children) => {
      const { vnode, slots } = instance;
      let needDeletionCheck = true;
      let deletionComparisonTarget = EMPTY_OBJ;
      if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
          const type = children._;
          if (type) {
              // compiled slots.
              if ( isHmrUpdating) ;
              else if (type === 1 /* STABLE */) {
                  // compiled AND stable
                  // 不需要更新，跳过 slots 删除操作
                  needDeletionCheck = false;
              }
              else {
                  // compiled but dynamic (v-if/v-for on slots)
                  // update slots, but skip normalization
                  extend(slots, children);
              }
          }
          else {
              needDeletionCheck = !children.$stable;
              normalizeObjectSlots(children, slots);
          }
          deletionComparisonTarget = children;
      }
      else if (children) {
          // non slot object children (direct value)
          // passed to a component
          normalizeVNodeSlots(instance, children);
          deletionComparisonTarget = { default: 1 };
      }
      // delete stale slots
      // 删除旧的 slots
      if (needDeletionCheck) {
          for (const key in slots) {
              // 非 `_` 内部插槽，且不再新的 children 中的
              if (!isInternalKey(key) && !(key in deletionComparisonTarget)) {
                  delete slots[key];
              }
          }
      }
  };

  /**
  Runtime helper for applying directives to a vnode. Example usage:

  const comp = resolveComponent('comp')
  const foo = resolveDirective('foo')
  const bar = resolveDirective('bar')

  return withDirectives(h(comp), [
    [foo, this.x],
    [bar, this.y]
  ])
  */
  const isBuiltInDirective = /*#__PURE__*/ makeMap('bind,cloak,else-if,else,for,html,if,model,on,once,pre,show,slot,text');
  function validateDirectiveName(name) {
      if (isBuiltInDirective(name)) {
          warn('Do not use built-in directive ids as custom directive id: ' + name);
      }
  }
  /**
   * Adds directives to a VNode.
   */
  function withDirectives(vnode, directives) {
      const internalInstance = currentRenderingInstance;
      if (internalInstance === null) {
           warn(`withDirectives can only be used inside render functions.`);
          return vnode;
      }
      const instance = internalInstance.proxy;
      const bindings = vnode.dirs || (vnode.dirs = []);
      for (let i = 0; i < directives.length; i++) {
          let [dir, value, arg, modifiers = EMPTY_OBJ] = directives[i];
          if (isFunction(dir)) {
              dir = {
                  mounted: dir,
                  updated: dir
              };
          }
          bindings.push({
              dir,
              instance,
              value,
              oldValue: void 0,
              arg,
              modifiers
          });
      }
      return vnode;
  }
  function invokeDirectiveHook(vnode, prevVNode, instance, name) {
      const bindings = vnode.dirs;
      const oldBindings = prevVNode && prevVNode.dirs;
      for (let i = 0; i < bindings.length; i++) {
          const binding = bindings[i];
          if (oldBindings) {
              binding.oldValue = oldBindings[i].value;
          }
          const hook = binding.dir[name];
          if (hook) {
              callWithAsyncErrorHandling(hook, instance, 8 /* DIRECTIVE_HOOK */, [
                  vnode.el,
                  binding,
                  vnode,
                  prevVNode
              ]);
          }
      }
  }

  function createAppContext() {
      return {
          app: null,
          config: {
              isNativeTag: NO,
              performance: false,
              globalProperties: {},
              optionMergeStrategies: {},
              isCustomElement: NO,
              errorHandler: undefined,
              warnHandler: undefined
          },
          mixins: [],
          components: {},
          directives: {},
          provides: Object.create(null)
      };
  }
  let uid$1 = 0;
  function createAppAPI(render, hydrate) {
      return function createApp(rootComponent, rootProps = null) {
          if (rootProps != null && !isObject(rootProps)) {
               warn(`root props passed to app.mount() must be an object.`);
              rootProps = null;
          }
          const context = createAppContext();
          const installedPlugins = new Set();
          let isMounted = false;
          const app = (context.app = {
              _uid: uid$1++,
              _component: rootComponent,
              _props: rootProps,
              _container: null,
              _context: context,
              version,
              get config() {
                  return context.config;
              },
              set config(v) {
                  {
                      warn(`app.config cannot be replaced. Modify individual options instead.`);
                  }
              },
              use(plugin, ...options) {
                  if (installedPlugins.has(plugin)) {
                       warn(`Plugin has already been applied to target app.`);
                  }
                  else if (plugin && isFunction(plugin.install)) {
                      // 函数直接执行
                      installedPlugins.add(plugin);
                      plugin.install(app, ...options);
                  }
                  else if (isFunction(plugin)) {
                      // 没有 install 函数时
                      installedPlugins.add(plugin);
                      plugin(app, ...options);
                  }
                  else {
                      // plugin 必须要么自己是函数，要么是包含 install 函数的对象
                      warn(`A plugin must either be a function or an object with an "install" ` +
                          `function.`);
                  }
                  return app;
              },
              mixin(mixin) {
                  {
                      if (!context.mixins.includes(mixin)) {
                          context.mixins.push(mixin);
                          // 带有 props/emits 的全局 mixin 会是的 props/emits 缓存优化失效
                          if (mixin.props || mixin.emits) {
                              context.deopt = true;
                          }
                      }
                      else {
                          warn('Mixin has already been applied to target app' +
                              (mixin.name ? `: ${mixin.name}` : ''));
                      }
                  }
                  return app;
              },
              component(name, component) {
                  {
                      // 验证组件名称是否合法
                      validateComponentName(name, context.config);
                  }
                  // 没有对应组件，视为根据名称获取组件操作
                  if (!component) {
                      return context.components[name];
                  }
                  if ( context.components[name]) {
                      // 组件已经注册过了，再次注册等于覆盖原有的
                      warn(`Component "${name}" has already been registered in target app.`);
                  }
                  context.components[name] = component;
                  return app;
              },
              directive(name, directive) {
                  {
                      validateDirectiveName(name);
                  }
                  if (!directive) {
                      return context.directives[name];
                  }
                  if ( context.directives[name]) {
                      warn(`Directive "${name}" has already been registered in target app.`);
                  }
                  context.directives[name] = directive;
                  return app;
              },
              mount(rootContainer, isHydrate) {
                  if (!isMounted) {
                      const vnode = createVNode(rootComponent, rootProps);
                      // 保存 app context 到 root VNode 节点上
                      // 这个将会在初始化 mount 时候被设置到根实例上
                      vnode.appContext = context;
                      // HMR root reload
                      {
                          context.reload = () => {
                              render(cloneVNode(vnode), rootContainer);
                          };
                      }
                      if (isHydrate && hydrate) {
                          hydrate(vnode, rootContainer);
                      }
                      else {
                          render(vnode, rootContainer);
                      }
                      isMounted = true;
                      app._container = rootContainer;
                      rootContainer.__vue_app__ = app;
                      {
                          devtoolsInitApp(app, version);
                      }
                      return vnode.component.proxy;
                  }
                  else {
                      warn(`App has already been mounted.\n` +
                          `If you want to remount the same app, move your app creation logic ` +
                          `into a factory function and create fresh app instances for each ` +
                          `mount - e.g. \`const createMyApp = () => createApp(App)\``);
                  }
              },
              unmount() {
                  if (isMounted) {
                      render(null, app._container);
                      {
                          devtoolsUnmountApp(app);
                      }
                  }
                  else {
                      warn(`Cannot unmount an app that is not mounted.`);
                  }
              },
              provide(key, value) {
                  if ( key in context.provides) {
                      warn(`App already provides property with key "${String(key)}". ` +
                          `It will be overwritten with the new value.`);
                  }
                  // TypeScript doesn't allow symbols as index type
                  // https://github.com/Microsoft/TypeScript/issues/24587
                  context.provides[key] = value;
                  return app;
              }
          });
          return app;
      };
  }

  function injectHook(type, hook, target = currentInstance, prepend = false) {
      if (target) {
          const hooks = target[type] || (target[type] = []);
          // 将 hook 的执行封装成一个 error handling warpper 函数，并且缓存到 hook.__weh
          // 上，这样在调度器里面调用的时候可以进行去重，因为 scheduler 里面执行的时候
          // 有去重操作，这里的 __weh = 'with error handling'
          const wrappedHook = hook.__weh ||
              (hook.__weh = (...args) => {
                  if (target.isUnmounted) {
                      return;
                  }
                  // 在所有的声明周期函数中都 disable tracking
                  // 因为它们有可能在 effects 中被调用
                  pauseTracking();
                  // 在 hook 执行期间设置 currentInstance = targt
                  // 假设 hook 没有同步地触发其他 hooks，即在一个 hook 里面同步调用
                  // 另一个声明周期函数？
                  setCurrentInstance(target);
                  const res = callWithAsyncErrorHandling(hook, target, type, args);
                  setCurrentInstance(null);
                  resetTracking();
                  return res;
              });
          prepend ? hooks.unshift(wrappedHook) : hooks.push(wrappedHook);
          return wrappedHook;
      }
      else {
          // xxx -> onXxx
          const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''));
          warn(`${apiName} is called when there is no active component instance to be ` +
              `associated with. ` +
              `Lifecycle injection APIs can only be used during execution of setup().` +
              ( ` If you are using async setup(), make sure to register lifecycle ` +
                      `hooks before the first await statement.`
                  ));
      }
  }
  const createHook = (lifecycle) => (hook, target = currentInstance) => !isInSSRComponentSetup && injectHook(lifecycle, hook, target);
  const onBeforeMount = createHook("bm" /* BEFORE_MOUNT */);
  const onMounted = createHook("m" /* MOUNTED */);
  const onBeforeUpdate = createHook("bu" /* BEFORE_UPDATE */);
  const onUpdated = createHook("u" /* UPDATED */);
  const onBeforeUnmount = createHook("bum" /* BEFORE_UNMOUNT */);
  const onUnmounted = createHook("um" /* UNMOUNTED */);
  const onRenderTriggered = createHook("rtg" /* RENDER_TRIGGERED */);
  const onRenderTracked = createHook("rtc" /* RENDER_TRACKED */);
  const onErrorCaptured = (hook, target = currentInstance) => {
      injectHook("ec" /* ERROR_CAPTURED */, hook, target);
  };

  function useTransitionState() {
      const state = {
          isMounted: false,
          isLeaving: false,
          isUnmounting: false,
          leavingVNodes: new Map()
      };
      onMounted(() => {
          state.isMounted = true;
      });
      onBeforeUnmount(() => {
          state.isUnmounting = true;
      });
      return state;
  }
  const TransitionHookValidator = [Function, Array];
  const BaseTransitionImpl = {
      name: `BaseTransition`,
      props: {
          mode: String,
          appear: Boolean,
          persisted: Boolean,
          // enter
          onBeforeEnter: TransitionHookValidator,
          onEnter: TransitionHookValidator,
          onAfterEnter: TransitionHookValidator,
          onEnterCancelled: TransitionHookValidator,
          // leave
          onBeforeLeave: TransitionHookValidator,
          onLeave: TransitionHookValidator,
          onAfterLeave: TransitionHookValidator,
          onLeaveCancelled: TransitionHookValidator,
          // appear
          onBeforeAppear: TransitionHookValidator,
          onAppear: TransitionHookValidator,
          onAfterAppear: TransitionHookValidator,
          onAppearCancelled: TransitionHookValidator
      },
      setup(props, { slots }) {
          const instance = getCurrentInstance();
          const state = useTransitionState();
          let prevTransitionKey;
          return () => {
              const children = slots.default && getTransitionRawChildren(slots.default(), true);
              if (!children || !children.length) {
                  return;
              }
              // warn multiple elements
              if ( children.length > 1) {
                  warn('<transition> can only be used on a single element or component. Use ' +
                      '<transition-group> for lists.');
              }
              // there's no need to track reactivity for these props so use the raw
              // props for a bit better perf
              const rawProps = toRaw(props);
              const { mode } = rawProps;
              // check mode
              if ( mode && !['in-out', 'out-in', 'default'].includes(mode)) {
                  warn(`invalid <transition> mode: ${mode}`);
              }
              // at this point children has a guaranteed length of 1.
              const child = children[0];
              if (state.isLeaving) {
                  return emptyPlaceholder(child);
              }
              // in the case of <transition><keep-alive/></transition>, we need to
              // compare the type of the kept-alive children.
              const innerChild = getKeepAliveChild(child);
              if (!innerChild) {
                  return emptyPlaceholder(child);
              }
              const enterHooks = resolveTransitionHooks(innerChild, rawProps, state, instance);
              setTransitionHooks(innerChild, enterHooks);
              const oldChild = instance.subTree;
              const oldInnerChild = oldChild && getKeepAliveChild(oldChild);
              let transitionKeyChanged = false;
              const { getTransitionKey } = innerChild.type;
              if (getTransitionKey) {
                  const key = getTransitionKey();
                  if (prevTransitionKey === undefined) {
                      prevTransitionKey = key;
                  }
                  else if (key !== prevTransitionKey) {
                      prevTransitionKey = key;
                      transitionKeyChanged = true;
                  }
              }
              // handle mode
              if (oldInnerChild &&
                  oldInnerChild.type !== Comment &&
                  (!isSameVNodeType(innerChild, oldInnerChild) || transitionKeyChanged)) {
                  const leavingHooks = resolveTransitionHooks(oldInnerChild, rawProps, state, instance);
                  // update old tree's hooks in case of dynamic transition
                  setTransitionHooks(oldInnerChild, leavingHooks);
                  // switching between different views
                  if (mode === 'out-in') {
                      state.isLeaving = true;
                      // return placeholder node and queue update when leave finishes
                      leavingHooks.afterLeave = () => {
                          state.isLeaving = false;
                          instance.update();
                      };
                      return emptyPlaceholder(child);
                  }
                  else if (mode === 'in-out') {
                      leavingHooks.delayLeave = (el, earlyRemove, delayedLeave) => {
                          const leavingVNodesCache = getLeavingNodesForType(state, oldInnerChild);
                          leavingVNodesCache[String(oldInnerChild.key)] = oldInnerChild;
                          // early removal callback
                          el._leaveCb = () => {
                              earlyRemove();
                              el._leaveCb = undefined;
                              delete enterHooks.delayedLeave;
                          };
                          enterHooks.delayedLeave = delayedLeave;
                      };
                  }
              }
              return child;
          };
      }
  };
  // export the public type for h/tsx inference
  // also to avoid inline import() in generated d.ts files
  const BaseTransition = BaseTransitionImpl;
  function getLeavingNodesForType(state, vnode) {
      const { leavingVNodes } = state;
      let leavingVNodesCache = leavingVNodes.get(vnode.type);
      if (!leavingVNodesCache) {
          leavingVNodesCache = Object.create(null);
          leavingVNodes.set(vnode.type, leavingVNodesCache);
      }
      return leavingVNodesCache;
  }
  // The transition hooks are attached to the vnode as vnode.transition
  // and will be called at appropriate timing in the renderer.
  function resolveTransitionHooks(vnode, props, state, instance) {
      const { appear, mode, persisted = false, onBeforeEnter, onEnter, onAfterEnter, onEnterCancelled, onBeforeLeave, onLeave, onAfterLeave, onLeaveCancelled, onBeforeAppear, onAppear, onAfterAppear, onAppearCancelled } = props;
      const key = String(vnode.key);
      const leavingVNodesCache = getLeavingNodesForType(state, vnode);
      const callHook = (hook, args) => {
          hook &&
              callWithAsyncErrorHandling(hook, instance, 9 /* TRANSITION_HOOK */, args);
      };
      const hooks = {
          mode,
          persisted,
          beforeEnter(el) {
              let hook = onBeforeEnter;
              if (!state.isMounted) {
                  if (appear) {
                      hook = onBeforeAppear || onBeforeEnter;
                  }
                  else {
                      return;
                  }
              }
              // for same element (v-show)
              if (el._leaveCb) {
                  el._leaveCb(true /* cancelled */);
              }
              // for toggled element with same key (v-if)
              const leavingVNode = leavingVNodesCache[key];
              if (leavingVNode &&
                  isSameVNodeType(vnode, leavingVNode) &&
                  leavingVNode.el._leaveCb) {
                  // force early removal (not cancelled)
                  leavingVNode.el._leaveCb();
              }
              callHook(hook, [el]);
          },
          enter(el) {
              let hook = onEnter;
              let afterHook = onAfterEnter;
              let cancelHook = onEnterCancelled;
              if (!state.isMounted) {
                  if (appear) {
                      hook = onAppear || onEnter;
                      afterHook = onAfterAppear || onAfterEnter;
                      cancelHook = onAppearCancelled || onEnterCancelled;
                  }
                  else {
                      return;
                  }
              }
              let called = false;
              const done = (el._enterCb = (cancelled) => {
                  if (called)
                      return;
                  called = true;
                  if (cancelled) {
                      callHook(cancelHook, [el]);
                  }
                  else {
                      callHook(afterHook, [el]);
                  }
                  if (hooks.delayedLeave) {
                      hooks.delayedLeave();
                  }
                  el._enterCb = undefined;
              });
              if (hook) {
                  hook(el, done);
                  if (hook.length <= 1) {
                      done();
                  }
              }
              else {
                  done();
              }
          },
          leave(el, remove) {
              const key = String(vnode.key);
              if (el._enterCb) {
                  el._enterCb(true /* cancelled */);
              }
              if (state.isUnmounting) {
                  return remove();
              }
              callHook(onBeforeLeave, [el]);
              let called = false;
              const done = (el._leaveCb = (cancelled) => {
                  if (called)
                      return;
                  called = true;
                  remove();
                  if (cancelled) {
                      callHook(onLeaveCancelled, [el]);
                  }
                  else {
                      callHook(onAfterLeave, [el]);
                  }
                  el._leaveCb = undefined;
                  if (leavingVNodesCache[key] === vnode) {
                      delete leavingVNodesCache[key];
                  }
              });
              leavingVNodesCache[key] = vnode;
              if (onLeave) {
                  onLeave(el, done);
                  if (onLeave.length <= 1) {
                      done();
                  }
              }
              else {
                  done();
              }
          },
          clone(vnode) {
              return resolveTransitionHooks(vnode, props, state, instance);
          }
      };
      return hooks;
  }
  // the placeholder really only handles one special case: KeepAlive
  // in the case of a KeepAlive in a leave phase we need to return a KeepAlive
  // placeholder with empty content to avoid the KeepAlive instance from being
  // unmounted.
  function emptyPlaceholder(vnode) {
      if (isKeepAlive(vnode)) {
          vnode = cloneVNode(vnode);
          vnode.children = null;
          return vnode;
      }
  }
  function getKeepAliveChild(vnode) {
      return isKeepAlive(vnode)
          ? vnode.children
              ? vnode.children[0]
              : undefined
          : vnode;
  }
  function setTransitionHooks(vnode, hooks) {
      if (vnode.shapeFlag & 6 /* COMPONENT */ && vnode.component) {
          setTransitionHooks(vnode.component.subTree, hooks);
      }
      else if ( vnode.shapeFlag & 128 /* SUSPENSE */) {
          vnode.ssContent.transition = hooks.clone(vnode.ssContent);
          vnode.ssFallback.transition = hooks.clone(vnode.ssFallback);
      }
      else {
          vnode.transition = hooks;
      }
  }
  function getTransitionRawChildren(children, keepComment = false) {
      let ret = [];
      let keyedFragmentCount = 0;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // handle fragment children case, e.g. v-for
          if (child.type === Fragment) {
              if (child.patchFlag & 128 /* KEYED_FRAGMENT */)
                  keyedFragmentCount++;
              ret = ret.concat(getTransitionRawChildren(child.children, keepComment));
          }
          // comment placeholders should be skipped, e.g. v-if
          else if (keepComment || child.type !== Comment) {
              ret.push(child);
          }
      }
      // #1126 if a transition children list contains multiple sub fragments, these
      // fragments will be merged into a flat children array. Since each v-for
      // fragment may contain different static bindings inside, we need to de-op
      // these children to force full diffs to ensure correct behavior.
      if (keyedFragmentCount > 1) {
          for (let i = 0; i < ret.length; i++) {
              ret[i].patchFlag = -2 /* BAIL */;
          }
      }
      return ret;
  }

  const isKeepAlive = (vnode) => vnode.type.__isKeepAlive;
  const KeepAliveImpl = {
      name: `KeepAlive`,
      __isKeepAlive: true,
      inheritRef: true,
      props: {
          include: [String, RegExp, Array],
          exclude: [String, RegExp, Array],
          max: [String, Number]
      },
      setup(props, { slots }) {
          const cache = new Map();
          const keys = new Set();
          let current = null;
          const instance = getCurrentInstance();
          const parentSuspense = instance.suspense;
          const sharedContext = instance.ctx;
          const { renderer: { p: patch, m: move, um: _unmount, o: { createElement } } } = sharedContext;
          const storageContainer = createElement('div');
          sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
              const instance = vnode.component;
              move(vnode, container, anchor, 0 /* ENTER */, parentSuspense);
              // props 可能发生变化，这里执行一次 patch 操作
              patch(instance.vnode, vnode, container, anchor, instance, parentSuspense, isSVG, optimized);
              queuePostRenderEffect(() => {
                  instance.isDeactivated = false;
                  if (instance.a) {
                      // activated 周期函数
                      invokeArrayFns(instance.a);
                  }
                  const vnodeHook = vnode.props && vnode.props.onVnodeMounted;
                  if (vnodeHook) {
                      invokeVNodeHook(vnodeHook, instance.parent, vnode);
                  }
              }, parentSuspense);
          };
          sharedContext.deactivate = (vnode) => {
              const instance = vnode.component;
              move(vnode, storageContainer, null, 1 /* LEAVE */, parentSuspense);
              queuePostRenderEffect(() => {
                  if (instance.da) {
                      invokeArrayFns(instance.da);
                  }
                  const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted;
                  if (vnodeHook) {
                      invokeVNodeHook(vnodeHook, instance.parent, vnode);
                  }
                  instance.isDeactivated = true;
              }, parentSuspense);
          };
          // 对 renderer unmount 的一次封装
          function unmount(vnode) {
              resetShapeFlag(vnode);
              _unmount(vnode, instance, parentSuspense);
          }
          // 过滤掉缓存
          function pruneCache(filter) {
              cache.forEach((vnode, key) => {
                  const name = getComponentName(vnode.type);
                  if (name && (!filter || !filter(name))) {
                      pruneCacheEntry(key);
                  }
              });
          }
          function pruneCacheEntry(key) {
              const cached = cache.get(key);
              if (!current || cached.type !== current.type) {
                  // 新增或节点类型发生变化，直接卸载掉老的
                  unmount(cached);
              }
              else if (current) {
                  // 重置标记就可以了？
                  // 当前激活的实例不该再是 kept-alive
                  // 我们不能立即卸载但是稍后会进行卸载，所以这里先重置其标记
                  // 不能立即卸载？
                  // 是因为在 activate 和 deactivate 中的周期函数调用
                  // 是采用的 post 类型异步执行的缘故吗？
                  resetShapeFlag(current);
              }
              cache.delete(key);
              keys.delete(key);
          }
          // 监听 include/exclude 属性变化
          watch(() => [props.include, props.exclude], ([include, exclude]) => {
              // 支持三种类型
              // 1. 字符串, 'a,b,c'
              // 2. 正则表达式， /a|b|c/
              // 3. 数组， ['a', 'b', 'c', /d/, /e|f/]
              include && pruneCache(name => matches(include, name));
              exclude && pruneCache(name => !matches(exclude, name));
          }, { flush: 'post', deep: true });
          // 在 render 之后缓存子树(subTree)
          let pendingCacheKey = null;
          const cacheSubtree = () => {
              if (pendingCacheKey != null) {
                  cache.set(pendingCacheKey, getInnerChild(instance.subTree));
              }
          };
          // 注册生命周期
          onMounted(cacheSubtree);
          onUpdated(cacheSubtree);
          onBeforeUnmount(() => {
              cache.forEach(cached => {
                  const { subTree, suspense } = instance;
                  const vnode = getInnerChild(subTree);
                  if (cached.type === vnode.type) {
                      // 有缓存的节点
                      // 当前实例会成为 keep-alive 的 unmount 一部分
                      resetShapeFlag(vnode);
                      // 但是在这里执行它的 deactivated 钩子函数
                      const da = vnode.component.da;
                      da && queuePostRenderEffect(da, suspense);
                      return;
                  }
                  // 没有缓存的直接 unmount
                  unmount(cached);
              });
          });
          return () => {
              // 根据组件的执行流程，这个函数将会在 setupComponent() 中
              // 执行 setup() 得到 setupResult ，传递给 handleSetupResult()
              // 函数，这里面检测 setupResult 也就是这个匿名函数，如果它是函数
              // 会直接被当做 render 函数处理(instance.render 或 instance.ssrRender)
              // 结论就是，这个匿名函数是 render() 函数
              pendingCacheKey = null;
              if (!slots.default) {
                  // 组件支持默认插槽使用方式
                  return null;
              }
              const children = slots.default();
              const rawVNode = children[0];
              if (children.length > 1) {
                  // KeepAlive 组件只能包含一个组件作为 child
                  // 也就是说 ~<keep-alive><CompA/><CompB/></keep-alive/>~
                  // 是不合法的使用
                  current = null;
                  // warn...
                  return children;
              }
              else if (!isVNode(rawVNode) ||
                  (!(rawVNode.shapeFlag & 4 /* STATEFUL_COMPONENT */) &&
                      !(rawVNode.shapeFlag & 128 /* SUSPENSE */))) {
                  // 1. 非 VNode 类型节点
                  // 2. 既不是有状态组件(对象类型组件)也不是 Suspense 的时候
                  // 相反意味着，节点必须满足下面几种情况
                  // 1. 是 VNode 类型且是有状态组件(非函数式组件)
                  // 2. 或者是 VNode 类型且是Suspense 组件
                  current = null;
                  return rawVNode;
              }
              // 也就是说 keep-alive 只接受有状态组件或者 Suspense 作为唯一的 child
              let vnode = getInnerChild(rawVNode);
              const comp = vnode.type;
              const name = getComponentName(comp);
              const { include, exclude, max } = props;
              if (
              // 无缓存的节点
              (include && (!name || !matches(include, name))) ||
                  // 在不缓存的节点们之列
                  (exclude && name && matches(exclude, name))) {
                  current = vnode;
                  return rawVNode;
              }
              const key = vnode.key == null ? comp : vnode.key;
              const cachedVNode = cache.get(key);
              // 克隆一份如果它有被复用的话，因为我们即将修改它
              if (vnode.el) {
                  vnode = cloneVNode(vnode);
                  if (rawVNode.shapeFlag & 128 /* SUSPENSE */) {
                      rawVNode.ssContent = vnode;
                  }
              }
              pendingCacheKey = key;
              if (cachedVNode) {
                  vnode.el = cachedVNode.el;
                  vnode.component = cachedVNode.component;
                  if (vnode.transition) {
                      // 在 subTree 上递归更新 transition 钩子函数
                      setTransitionHooks(vnode, vnode.transition);
                  }
                  // 避免 vnode 正在首次 mount
                  vnode.shapeFlag |= 512 /* COMPONENT_KEPT_ALIVE */;
                  // 标记 key 为最新的
                  keys.delete(key);
                  keys.add(key);
              }
              else {
                  // 没有缓存的情况
                  keys.add(key);
                  // 删除最老的 entry，缓冲池已经满了，删除掉最老的那个
                  if (max && keys.size > parseInt(max, 10)) {
                      // 因为 Set 没有直接取指定位置元素的值
                      // 这里的目的是变相的取 Set 中第一个元素，即最早 add 的那个 key
                      // 如： new Set([1,2,3,4]) => keys.values() => <1,2,3,4>
                      // next() 得到迭代器下一个值 { value: 1, done: false }
                      // .value 得到第一个集合元素的值
                      pruneCacheEntry(keys.values().next().value);
                  }
              }
              // 避免 vnode 正在被卸载，在renderer unmount 中会检测
              vnode.shapeFlag |= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
              current = vnode;
              return rawVNode;
          };
      }
  };
  const KeepAlive = KeepAliveImpl;
  function matches(pattern, name) {
      if (isArray(pattern)) {
          return pattern.some((p) => matches(p, name));
      }
      else if (isString(pattern)) {
          return pattern.split(',').indexOf(name) > -1;
      }
      else if (pattern.test) {
          return pattern.test(name);
      }
      /* istanbul ignore next */
      return false;
  }
  function onActivated(hook, target) {
      registerKeepAliveHook(hook, "a" /* ACTIVATED */, target);
  }
  function onDeactivated(hook, target) {
      registerKeepAliveHook(hook, "da" /* DEACTIVATED */, target);
  }
  function registerKeepAliveHook(hook, type, target = currentInstance) {
      // cache the deactivate branch check wrapper for injected hooks so the same
      // hook can be properly deduped by the scheduler. "__wdc" stands for "with
      // deactivation check".
      const wrappedHook = hook.__wdc ||
          (hook.__wdc = () => {
              // only fire the hook if the target instance is NOT in a deactivated branch.
              let current = target;
              while (current) {
                  if (current.isDeactivated) {
                      return;
                  }
                  current = current.parent;
              }
              hook();
          });
      injectHook(type, wrappedHook, target);
      // In addition to registering it on the target instance, we walk up the parent
      // chain and register it on all ancestor instances that are keep-alive roots.
      // This avoids the need to walk the entire component tree when invoking these
      // hooks, and more importantly, avoids the need to track child components in
      // arrays.
      if (target) {
          let current = target.parent;
          while (current && current.parent) {
              if (isKeepAlive(current.parent.vnode)) {
                  injectToKeepAliveRoot(wrappedHook, type, target, current);
              }
              current = current.parent;
          }
      }
  }
  function injectToKeepAliveRoot(hook, type, target, keepAliveRoot) {
      // injectHook wraps the original for error handling, so make sure to remove
      // the wrapped version.
      const injected = injectHook(type, hook, keepAliveRoot, true /* prepend */);
      onUnmounted(() => {
          remove(keepAliveRoot[type], injected);
      }, target);
  }
  function resetShapeFlag(vnode) {
      let shapeFlag = vnode.shapeFlag;
      if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
          shapeFlag -= 256 /* COMPONENT_SHOULD_KEEP_ALIVE */;
      }
      if (shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
          shapeFlag -= 512 /* COMPONENT_KEPT_ALIVE */;
      }
      vnode.shapeFlag = shapeFlag;
  }
  function getInnerChild(vnode) {
      return vnode.shapeFlag & 128 /* SUSPENSE */ ? vnode.ssContent : vnode;
  }

  let hasMismatch = false;
  const isSVGContainer = (container) => /svg/.test(container.namespaceURI) && container.tagName !== 'foreignObject';
  const isComment = (node) => node.nodeType === 8 /* COMMENT */;
  // Note: hydration is DOM-specific
  // But we have to place it in core due to tight coupling with core - splitting
  // it out creates a ton of unnecessary complexity.
  // Hydration also depends on some renderer internal logic which needs to be
  // passed in via arguments.
  function createHydrationFunctions(rendererInternals) {
      const { mt: mountComponent, p: patch, o: { patchProp, nextSibling, parentNode, remove, insert, createComment } } = rendererInternals;
      const hydrate = (vnode, container) => {
          if ( !container.hasChildNodes()) {
              warn(`Attempting to hydrate existing markup but container is empty. ` +
                  `Performing full mount instead.`);
              patch(null, vnode, container);
              return;
          }
          hasMismatch = false;
          hydrateNode(container.firstChild, vnode, null, null);
          flushPostFlushCbs();
          if (hasMismatch && !false) {
              // this error should show up in production
              console.error(`Hydration completed but contains mismatches.`);
          }
      };
      const hydrateNode = (node, vnode, parentComponent, parentSuspense, optimized = false) => {
          const isFragmentStart = isComment(node) && node.data === '[';
          const onMismatch = () => handleMismatch(node, vnode, parentComponent, parentSuspense, isFragmentStart);
          const { type, ref, shapeFlag } = vnode;
          const domType = node.nodeType;
          vnode.el = node;
          let nextNode = null;
          switch (type) {
              case Text:
                  if (domType !== 3 /* TEXT */) {
                      nextNode = onMismatch();
                  }
                  else {
                      if (node.data !== vnode.children) {
                          hasMismatch = true;
                          
                              warn(`Hydration text mismatch:` +
                                  `\n- Client: ${JSON.stringify(node.data)}` +
                                  `\n- Server: ${JSON.stringify(vnode.children)}`);
                          node.data = vnode.children;
                      }
                      nextNode = nextSibling(node);
                  }
                  break;
              case Comment:
                  if (domType !== 8 /* COMMENT */ || isFragmentStart) {
                      nextNode = onMismatch();
                  }
                  else {
                      nextNode = nextSibling(node);
                  }
                  break;
              case Static:
                  if (domType !== 1 /* ELEMENT */) {
                      nextNode = onMismatch();
                  }
                  else {
                      // determine anchor, adopt content
                      nextNode = node;
                      // if the static vnode has its content stripped during build,
                      // adopt it from the server-rendered HTML.
                      const needToAdoptContent = !vnode.children.length;
                      for (let i = 0; i < vnode.staticCount; i++) {
                          if (needToAdoptContent)
                              vnode.children += nextNode.outerHTML;
                          if (i === vnode.staticCount - 1) {
                              vnode.anchor = nextNode;
                          }
                          nextNode = nextSibling(nextNode);
                      }
                      return nextNode;
                  }
                  break;
              case Fragment:
                  if (!isFragmentStart) {
                      nextNode = onMismatch();
                  }
                  else {
                      nextNode = hydrateFragment(node, vnode, parentComponent, parentSuspense, optimized);
                  }
                  break;
              default:
                  if (shapeFlag & 1 /* ELEMENT */) {
                      if (domType !== 1 /* ELEMENT */ ||
                          vnode.type !== node.tagName.toLowerCase()) {
                          nextNode = onMismatch();
                      }
                      else {
                          nextNode = hydrateElement(node, vnode, parentComponent, parentSuspense, optimized);
                      }
                  }
                  else if (shapeFlag & 6 /* COMPONENT */) {
                      // when setting up the render effect, if the initial vnode already
                      // has .el set, the component will perform hydration instead of mount
                      // on its sub-tree.
                      const container = parentNode(node);
                      const hydrateComponent = () => {
                          mountComponent(vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container), optimized);
                      };
                      // async component
                      const loadAsync = vnode.type.__asyncLoader;
                      if (loadAsync) {
                          loadAsync().then(hydrateComponent);
                      }
                      else {
                          hydrateComponent();
                      }
                      // component may be async, so in the case of fragments we cannot rely
                      // on component's rendered output to determine the end of the fragment
                      // instead, we do a lookahead to find the end anchor node.
                      nextNode = isFragmentStart
                          ? locateClosingAsyncAnchor(node)
                          : nextSibling(node);
                  }
                  else if (shapeFlag & 64 /* TELEPORT */) {
                      if (domType !== 8 /* COMMENT */) {
                          nextNode = onMismatch();
                      }
                      else {
                          nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, optimized, rendererInternals, hydrateChildren);
                      }
                  }
                  else if ( shapeFlag & 128 /* SUSPENSE */) {
                      nextNode = vnode.type.hydrate(node, vnode, parentComponent, parentSuspense, isSVGContainer(parentNode(node)), optimized, rendererInternals, hydrateNode);
                  }
                  else {
                      warn('Invalid HostVNode type:', type, `(${typeof type})`);
                  }
          }
          if (ref != null) {
              setRef(ref, null, parentSuspense, vnode);
          }
          return nextNode;
      };
      const hydrateElement = (el, vnode, parentComponent, parentSuspense, optimized) => {
          optimized = optimized || !!vnode.dynamicChildren;
          const { props, patchFlag, shapeFlag, dirs } = vnode;
          // skip props & children if this is hoisted static nodes
          if (patchFlag !== -1 /* HOISTED */) {
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'created');
              }
              // props
              if (props) {
                  if (!optimized ||
                      (patchFlag & 16 /* FULL_PROPS */ ||
                          patchFlag & 32 /* HYDRATE_EVENTS */)) {
                      for (const key in props) {
                          if (!isReservedProp(key) && isOn(key)) {
                              patchProp(el, key, null, props[key]);
                          }
                      }
                  }
                  else if (props.onClick) {
                      // Fast path for click listeners (which is most often) to avoid
                      // iterating through props.
                      patchProp(el, 'onClick', null, props.onClick);
                  }
              }
              // vnode / directive hooks
              let vnodeHooks;
              if ((vnodeHooks = props && props.onVnodeBeforeMount)) {
                  invokeVNodeHook(vnodeHooks, parentComponent, vnode);
              }
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
              }
              if ((vnodeHooks = props && props.onVnodeMounted) || dirs) {
                  queueEffectWithSuspense(() => {
                      vnodeHooks && invokeVNodeHook(vnodeHooks, parentComponent, vnode);
                      dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
                  }, parentSuspense);
              }
              // children
              if (shapeFlag & 16 /* ARRAY_CHILDREN */ &&
                  // skip if element has innerHTML / textContent
                  !(props && (props.innerHTML || props.textContent))) {
                  let next = hydrateChildren(el.firstChild, vnode, el, parentComponent, parentSuspense, optimized);
                  let hasWarned = false;
                  while (next) {
                      hasMismatch = true;
                      if ( !hasWarned) {
                          warn(`Hydration children mismatch in <${vnode.type}>: ` +
                              `server rendered element contains more child nodes than client vdom.`);
                          hasWarned = true;
                      }
                      // The SSRed DOM contains more nodes than it should. Remove them.
                      const cur = next;
                      next = next.nextSibling;
                      remove(cur);
                  }
              }
              else if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                  if (el.textContent !== vnode.children) {
                      hasMismatch = true;
                      
                          warn(`Hydration text content mismatch in <${vnode.type}>:\n` +
                              `- Client: ${el.textContent}\n` +
                              `- Server: ${vnode.children}`);
                      el.textContent = vnode.children;
                  }
              }
          }
          return el.nextSibling;
      };
      const hydrateChildren = (node, parentVNode, container, parentComponent, parentSuspense, optimized) => {
          optimized = optimized || !!parentVNode.dynamicChildren;
          const children = parentVNode.children;
          const l = children.length;
          let hasWarned = false;
          for (let i = 0; i < l; i++) {
              const vnode = optimized
                  ? children[i]
                  : (children[i] = normalizeVNode(children[i]));
              if (node) {
                  node = hydrateNode(node, vnode, parentComponent, parentSuspense, optimized);
              }
              else {
                  hasMismatch = true;
                  if ( !hasWarned) {
                      warn(`Hydration children mismatch in <${container.tagName.toLowerCase()}>: ` +
                          `server rendered element contains fewer child nodes than client vdom.`);
                      hasWarned = true;
                  }
                  // the SSRed DOM didn't contain enough nodes. Mount the missing ones.
                  patch(null, vnode, container, null, parentComponent, parentSuspense, isSVGContainer(container));
              }
          }
          return node;
      };
      const hydrateFragment = (node, vnode, parentComponent, parentSuspense, optimized) => {
          const container = parentNode(node);
          const next = hydrateChildren(nextSibling(node), vnode, container, parentComponent, parentSuspense, optimized);
          if (next && isComment(next) && next.data === ']') {
              return nextSibling((vnode.anchor = next));
          }
          else {
              // fragment didn't hydrate successfully, since we didn't get a end anchor
              // back. This should have led to node/children mismatch warnings.
              hasMismatch = true;
              // since the anchor is missing, we need to create one and insert it
              insert((vnode.anchor = createComment(`]`)), container, next);
              return next;
          }
      };
      const handleMismatch = (node, vnode, parentComponent, parentSuspense, isFragment) => {
          hasMismatch = true;
          
              warn(`Hydration node mismatch:\n- Client vnode:`, vnode.type, `\n- Server rendered DOM:`, node, node.nodeType === 3 /* TEXT */
                  ? `(text)`
                  : isComment(node) && node.data === '['
                      ? `(start of fragment)`
                      : ``);
          vnode.el = null;
          if (isFragment) {
              // remove excessive fragment nodes
              const end = locateClosingAsyncAnchor(node);
              while (true) {
                  const next = nextSibling(node);
                  if (next && next !== end) {
                      remove(next);
                  }
                  else {
                      break;
                  }
              }
          }
          const next = nextSibling(node);
          const container = parentNode(node);
          remove(node);
          patch(null, vnode, container, next, parentComponent, parentSuspense, isSVGContainer(container));
          return next;
      };
      const locateClosingAsyncAnchor = (node) => {
          let match = 0;
          while (node) {
              node = nextSibling(node);
              if (node && isComment(node)) {
                  if (node.data === '[')
                      match++;
                  if (node.data === ']') {
                      if (match === 0) {
                          return nextSibling(node);
                      }
                      else {
                          match--;
                      }
                  }
              }
          }
          return node;
      };
      return [hydrate, hydrateNode];
  }

  // implementation, close to no-op
  function defineComponent(options) {
      return isFunction(options) ? { setup: options, name: options.name } : options;
  }

  const isAsyncWrapper = (i) => !!i.type.__asyncLoader;
  function defineAsyncComponent(source) {
      if (isFunction(source)) {
          source = { loader: source };
      }
      const { loader, loadingComponent: loadingComponent, errorComponent: errorComponent, delay = 200, timeout, // undefined = never times out
      suspensible = true, onError: userOnError } = source;
      // 1. TODO retry 封装
      let pendingRequest = null;
      let resolvedComp;
      let retries = 0;
      const retry = () => {
          retries++;
          pendingRequest = null;
          return load();
      };
      // 2. TODO 函数封装
      const load = () => {
          let thisRequest;
          return (pendingRequest ||
              (thisRequest = pendingRequest = loader()
                  .catch(err => {
                  err = err instanceof Error ? err : new Error(String(err));
                  if (userOnError) {
                      return new Promise((resolve, reject) => {
                          const userRetry = () => resolve(retry());
                          const userFail = () => reject(err);
                          userOnError(err, userRetry, userFail, retries + 1);
                      });
                  }
                  else {
                      throw err;
                  }
              })
                  .then((comp) => {
                  if (thisRequest !== pendingRequest && pendingRequest) {
                      return pendingRequest;
                  }
                  if ( !comp) {
                      warn(`Async component loader resolved to undefined. ` +
                          `If you are using retry(), make sure to return its return value.`);
                  }
                  // interop module default
                  if (comp &&
                      (comp.__esModule || comp[Symbol.toStringTag] === 'Module')) {
                      comp = comp.default;
                  }
                  if ( comp && !isObject(comp) && !isFunction(comp)) {
                      throw new Error(`Invalid async component load result: ${comp}`);
                  }
                  resolvedComp = comp;
                  return comp;
              })));
      };
      //
      // 3. TODO 返回组件
      return defineComponent({
          __asyncLoader: load,
          name: 'AsyncComponentWrapper',
          setup() {
              const instance = currentInstance;
              console.log('\n resolved comp before');
              // 异步组件已经完成了
              if (resolvedComp) {
                  console.log('\n resolved comp');
                  return createInnerComp(resolvedComp, instance);
              }
              const onError = (err) => {
                  pendingRequest = null;
                  handleError(err, instance, 13 /* ASYNC_COMPONENT_LOADER */, !errorComponent /* do not throw in dev if user provided error component */);
              };
              // suspense-controlled or SSR.
              if (( suspensible && instance.suspense) ||
                  (false )) {
                  return load()
                      .then(comp => {
                      return () => createInnerComp(comp, instance);
                  })
                      .catch(err => {
                      onError(err);
                      return () => errorComponent
                          ? createVNode(errorComponent, {
                              error: err
                          })
                          : null;
                  });
              }
              const loaded = ref(false);
              const error = ref();
              const delayed = ref(!!delay);
              if (delay) {
                  setTimeout(() => {
                      delayed.value = false;
                  }, delay);
              }
              if (timeout != null) {
                  setTimeout(() => {
                      if (!loaded.value && !error.value) {
                          const err = new Error(`Async component timed out after ${timeout}ms.`);
                          onError(err);
                          error.value = err;
                      }
                  }, timeout);
              }
              // 开始执行异步任务加载异步组件
              load()
                  .then(() => {
                  loaded.value = true;
              })
                  .catch(err => {
                  onError(err);
                  error.value = err;
              });
              return () => {
                  console.log('loaded.value = ', loaded.value);
                  if (loaded.value && resolvedComp) {
                      // 组件正常加载完成
                      return createInnerComp(resolvedComp, instance);
                  }
                  else if (error.value && errorComponent) {
                      return createVNode(errorComponent, {
                          error: error.value
                      });
                  }
                  else if (loadingComponent && !delayed.value) {
                      return createVNode(loadingComponent);
                  }
              };
          }
      });
  }
  function createInnerComp(comp, { vnode: { ref, props, children } }) {
      const vnode = createVNode(comp, props, children);
      // ensure inner component inherits the async wrapper's ref owner
      vnode.ref = ref;
      return vnode;
  }

  function createDevEffectOptions(instance) {
      return {
          scheduler: queueJob,
          allowRecurse: true,
          onTrack: instance.rtc ? e => invokeArrayFns(instance.rtc, e) : void 0,
          onTrigger: instance.rtg ? e => invokeArrayFns(instance.rtg, e) : void 0
      };
  }
  const queuePostRenderEffect =  queueEffectWithSuspense
      ;
  const setRef = (rawRef, oldRawRef, parentSuspense, vnode) => {
      if (isArray(rawRef)) {
          rawRef.forEach((r, i) => setRef(r, oldRawRef && (isArray(oldRawRef) ? oldRawRef[i] : oldRawRef), parentSuspense, vnode));
          return;
      }
      let value;
      if (!vnode || isAsyncWrapper(vnode)) {
          value = null;
      }
      else {
          if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
              value = vnode.component.exposed || vnode.component.proxy;
          }
          else {
              value = vnode.el;
          }
      }
      const { i: owner, r: ref } = rawRef;
      if ( !owner) {
          // warn 丢失 ref owner 上下文
          return;
      }
      const oldRef = oldRawRef && oldRawRef.r;
      const refs = owner.refs === EMPTY_OBJ ? (owner.refs = {}) : owner.refs;
      const setupState = owner.setupState;
      // unset old ref
      if (oldRef != null && oldRef !== ref) {
          if (isString(oldRef)) {
              refs[oldRef] = null;
              if (hasOwn(setupState, oldRef)) {
                  setupState[oldRef] = null;
              }
          }
          else if (isRef(oldRef)) {
              oldRef.value = null;
          }
      }
      if (isString(ref)) {
          const doSet = () => {
              refs[ref] = value;
              if (hasOwn(setupState, ref)) {
                  setupState[ref] = value;
              }
          };
          // #1789: 非空值，在 render 结束后设置
          // 控制意味着是 unmount，它不应该重写同key 的其他 ref
          if (value) {
              doSet.id = -1;
              queuePostRenderEffect(doSet, parentSuspense);
          }
          else {
              doSet();
          }
      }
      else if (isRef(ref)) {
          const doSet = () => {
              ref.value = value;
          };
          if (value) {
              doSet.id = -1;
              queuePostRenderEffect(doSet, parentSuspense);
          }
          else {
              doSet();
          }
      }
      else if (isFunction(ref)) {
          callWithErrorHandling(ref, owner, 12 /* FUNCTION_REF */, [value, refs]);
      }
      else ;
  };
  /**
   * The createRenderer function accepts two generic arguments:
   * HostNode and HostElement, corresponding to Node and Element types in the
   * host environment. For example, for runtime-dom, HostNode would be the DOM
   * `Node` interface and HostElement would be the DOM `Element` interface.
   *
   * Custom renderers can pass in the platform specific types like this:
   *
   * ``` js
   * const { render, createApp } = createRenderer<Node, Element>({
   *   patchProp,
   *   ...nodeOps
   * })
   * ```
   */
  function createRenderer(options) {
      return baseCreateRenderer(options);
  }
  // Separate API for creating hydration-enabled renderer.
  // Hydration logic is only used when calling this function, making it
  // tree-shakable.
  function createHydrationRenderer(options) {
      return baseCreateRenderer(options, createHydrationFunctions);
  }
  // overload 2: with hydration
  // function baseCreateRenderer(
  //   options: RendererOptions<Node, Element>,
  //   createHydrationFns: typeof createHydrationFunctions
  // ): HydrationRenderer
  // implementation
  function baseCreateRenderer(options, createHydrationFns) {
      // 1. 解构 options
      const { insert: hostInsert, remove: hostRemove, patchProp: hostPatchProp, forcePatchProp: hostForcePatchProp, createElement: hostCreateElement, createText: hostCreateText, createComment: hostCreateComment, setText: hostSetText, setElementText: hostSetElementText, parentNode: hostParentNode, nextSibling: hostNextSibling, setScopeId: hostSetScopeId = NOOP, cloneNode: hostCloneNode, insertStaticContent: hostInsertStaticContent } = options;
      // 2. patch 函数
      const patch = (n1, n2, container, anchor = null, parentComponent = null, parentSuspense = null, isSVG = false, optimized = false) => {
          // 不同类型节点，直接卸载老的🌲
          if (n1 && !isSameVNodeType(n1, n2)) {
              // 去下一个兄弟节点
              anchor = getNextHostNode(n1);
              unmount(n1, parentComponent, parentSuspense, true /* doRemove */);
              n1 = null;
          }
          if (n2.patchFlag === -2 /* BAIL */) {
              optimized = false;
              n2.dynamicChildren = null;
          }
          // 新节点处理
          const { type, ref, shapeFlag } = n2;
          switch (type) {
              case Text:
                  processText(n1, n2, container, anchor);
                  break;
              case Comment:
                  processCommentNode(n1, n2, container, anchor);
                  break;
              case Static:
                  if (n1 == null) {
                      mountStaticNode(n2, container, anchor, isSVG);
                  }
                  else {
                      patchStaticNode(n1, n2, container, isSVG);
                  }
                  break;
              case Fragment:
                  processFragment(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  break;
              default:
                  // ELEMENT/COMPONENT/TELEPORT/SUSPENSE
                  // 默认只支持这四种组件
                  if (shapeFlag & 1 /* ELEMENT */) {
                      processElement(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else if (shapeFlag & 6 /* COMPONENT */) {
                      processComponent(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else if (shapeFlag & 64 /* TELEPORT */) {
                      type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, internals);
                  }
                  else if ( shapeFlag & 128 /* SUSPENSE */) {
                      type.process(n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, internals);
                  }
                  break;
          }
          // set ref
          if (ref != null && parentComponent) {
              setRef(ref, n1 && n1.ref, parentSuspense, n2);
          }
      };
      // 3. processText 处理文本
      const processText = (n1, n2, container, anchor) => {
          if (n1 == null /* old */) {
              // 新节点，插入处理
              hostInsert((n2.el = hostCreateText(n2.children)), container, anchor);
          }
          else {
              // has old vnode, need to diff
              const el = (n2.el = n1.el);
              if (n2.children !== n1.children) {
                  hostSetText(el, n2.children);
              }
          }
      };
      // 4. processCommentNode 处理注释节点
      const processCommentNode = (n1, n2, container, anchor) => {
          if (n1 == null) {
              hostInsert((n2.el = hostCreateComment(n2.children || '')), container, anchor);
          }
          else {
              // there's no support for dynamic comments
              n2.el = n1.el;
          }
      };
      // 5. mountStaticNode 加载静态节点
      const mountStaticNode = (n2, container, anchor, isSVG) => {
          [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
      };
      // 6. patchStaticNode, Dev/HMR only
      const patchStaticNode = (n1, n2, container, isSVG) => {
          // static nodes are only patched during dev for HMR
          if (n2.children !== n1.children) {
              const anchor = hostNextSibling(n1.anchor);
              // remove existing
              removeStaticNode(n1);
              [n2.el, n2.anchor] = hostInsertStaticContent(n2.children, container, anchor, isSVG);
          }
          else {
              n2.el = n1.el;
              n2.anchor = n1.anchor;
          }
      };
      // 7. moveStaticNode，移动静态节点
      const moveStaticNode = ({ el, anchor }, container, nextSibling) => {
          let next;
          while (el && el !== anchor) {
              next = hostNextSibling(el);
              hostInsert(el, container, nextSibling);
              el = next;
          }
          hostInsert(anchor, container, nextSibling);
      };
      // 8. removeStaticNode, 删除静态节点
      const removeStaticNode = ({ el, anchor }) => {
          let next;
          while (el && el !== anchor) {
              next = hostNextSibling(el);
              hostRemove(el);
              el = next;
          }
          hostRemove(anchor);
      };
      // 9. processElement, 处理元素
      const processElement = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          isSVG = isSVG || n2.type === 'svg';
          if (n1 == null) {
              // no old
              mountElement(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
          }
          else {
              patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized);
          }
      };
      // 10. mountElement, 加载元素
      const mountElement = (vnode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          let el;
          let vnodeHook;
          const { type, props, shapeFlag, transition, scopeId, patchFlag, dirs } = vnode;
          {
              el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is);
              // 在处理 props 之前先 mount children ，因为
              // 有些 props 可能会依赖于 child 是否已经渲染出来
              // 比如： `<select value>`
              if (shapeFlag & 8 /* TEXT_CHILDREN */) {
                  // 文本节点处理(纯文本，插值)
                  hostSetElementText(el, vnode.children);
              }
              else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                  mountChildren(vnode.children, el, null, parentComponent, parentSuspense, isSVG && type !== 'foreignObject', optimized || !!vnode.dynamicChildren);
              }
              if (dirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'created');
              }
              if (props) {
                  for (const key in props) {
                      // vue 保留属性 ref/key/onVnodeXxx 生命周期
                      if (!isReservedProp(key)) {
                          hostPatchProp(el, key, null, props[key], isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                      }
                  }
                  if ((vnodeHook = props.onVnodeBeforeMount)) {
                      // 执行 before mount hook
                      invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  }
              }
              // scopeId
              setScopeId(el, scopeId, vnode, parentComponent);
          }
          {
              Object.defineProperty(el, '__vnode', {
                  value: vnode,
                  enumerable: false
              });
              Object.defineProperty(el, '__vueParentComponent', {
                  value: parentComponent,
                  enumerable: false
              });
          }
          if (dirs) {
              invokeDirectiveHook(vnode, null, parentComponent, 'beforeMount');
          }
          // #1583 For inside suspense + suspense not resolved case, enter hook should call when suspense resolved
          // #1689 For inside suspense + suspense resolved case, just call it
          const needCallTransitionHooks = (!parentSuspense || (parentSuspense && !parentSuspense.pendingBranch)) &&
              transition &&
              !transition.persisted;
          if (needCallTransitionHooks) {
              transition.beforeEnter(el);
          }
          hostInsert(el, container, anchor);
          if ((vnodeHook = props && props.onVnodeMounted) ||
              needCallTransitionHooks ||
              dirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  needCallTransitionHooks && transition.enter(el);
                  dirs && invokeDirectiveHook(vnode, null, parentComponent, 'mounted');
              }, parentSuspense);
          }
      };
      // 11. setScopeId, 设置 scope id
      const setScopeId = (el, scopeId, vnode, parentComponent) => {
          if (scopeId) {
              hostSetScopeId(el, scopeId);
          }
          if (parentComponent) {
              const treeOwnerId = parentComponent.type.__scopeId;
              // vnode's own scopeId and the current patched component's scopeId is
              // different - this is a slot content node.
              if (treeOwnerId && treeOwnerId !== scopeId) {
                  hostSetScopeId(el, treeOwnerId + '-s');
              }
              let subTree = parentComponent.subTree;
              if ( subTree.type === Fragment) {
                  subTree =
                      filterSingleRoot(subTree.children) || subTree;
              }
              if (vnode === subTree) {
                  setScopeId(el, parentComponent.vnode.scopeId, parentComponent.vnode, parentComponent.parent);
              }
          }
      };
      // 12. mountChildren, 加载孩子节点
      const mountChildren = (children, container, anchor, parentComponent, parentSuspense, isSVG, optimized, start = 0) => {
          for (let i = start; i < children.length; i++) {
              const child = (children[i] = optimized
                  ? // 这里是检测 child.el 是不是存在，如果存在则是可服用的 vnode
                      // 即需要提升的静态节点，则需要进行 cloneVNode 之后返回
                      // 新的 vnode 对象
                      cloneIfMounted(children[i])
                  : // 根据 child 的类型进行拆分处理
                      // 1. boolean, 创建一个空的 Comment
                      // 2. array, 使用 Fragment 将 child 包起来
                      // 3. object, 如果是对象，child.el 存在与否进行 clone
                      // 4. 其他情况，字符串或数字，当做 Text 类型处理
                      normalizeVNode(children[i]));
              // 然后进入 patch 递归处理 children
              patch(null, child, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
          }
      };
      // 13. patchElement
      const patchElement = (n1, n2, parentComponent, parentSuspense, isSVG, optimized) => {
          // 旧的 el 替换掉新的 el ?
          const el = (n2.el = n1.el);
          let { patchFlag, dynamicChildren, dirs } = n2;
          // #1426 take the old vnode's patch flag into account since user may clone a
          // compiler-generated vnode, which de-opts to FULL_PROPS
          patchFlag |= n1.patchFlag & 16 /* FULL_PROPS */;
          const oldProps = n1.props || EMPTY_OBJ;
          const newProps = n2.props || EMPTY_OBJ;
          let vnodeHook;
          // before update hooks
          if ((vnodeHook = newProps.onVnodeBeforeUpdate)) {
              invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
          }
          // dirs, 指令处理
          if (dirs) {
              invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate');
          }
          // TODO HRM updating
          // patch props 处理
          if (patchFlag > 0) {
              // 这个标记的意义是表示该元素的 render 函数代码是由 compiler 生成
              // 的并且可以进行快速寻址(fast path)的
              // 在这个路径中，old node 和 new node 可以确认是同一Shape的节点
              // 例如：在源模板中确定同一位置
              if (patchFlag & 16 /* FULL_PROPS */) {
                  // 元素属性包含动态 keys ，进行 full-diff
                  patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
              }
              else {
                  // class 属性
                  // 当元素有绑定动态 class 时
                  if (patchFlag & 2 /* CLASS */) {
                      if (oldProps.class !== newProps.class) {
                          hostPatchProp(el, 'class', null, newProps.class, isSVG);
                      }
                  }
                  // style, 标记含义：元素包含动态 style 属性
                  if (patchFlag & 4 /* STYLE */) {
                      hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG);
                  }
                  // props
                  // 该标记含义：元素有绑定动态的 prop/attr 绑定了非 class&style 的属性
                  // 动态属性的 keys 属性会保存起来，方便将来能快速的进行迭代。
                  // 例如： `:[foo]="bar"` 这里 foo 是 v-bind 绑定的动态属性，这会
                  // 导致放弃优化，而选择 full-diff ，因为我们需要重新设置 old key
                  if (patchFlag & 8 /* PROPS */) {
                      // 到这里的话 dynamicProps 必须不能为空，即必须要有动态属性
                      const propsToUpdate = n2.dynamicProps;
                      for (let i = 0; i < propsToUpdate.length; i++) {
                          const key = propsToUpdate[i];
                          const prev = oldProps[key];
                          const next = newProps[key];
                          if (next !== prev ||
                              (hostForcePatchProp && hostForcePatchProp(el, key))) {
                              hostPatchProp(el, key, prev, next, isSVG, n1.children, parentComponent, parentSuspense, unmountChildren);
                          }
                      }
                  }
              }
              // text
              // This flag is matched when the element has only dynamic text children.
              if (patchFlag & 1 /* TEXT */) {
                  if (n1.children !== n2.children) {
                      hostSetElementText(el, n2.children);
                  }
              }
          }
          else if (!optimized && dynamicChildren == null) {
              // 未优化的，需要 full diff
              patchProps(el, n2, oldProps, newProps, parentComponent, parentSuspense, isSVG);
          }
          const areChildrenSVG = isSVG && n2.type !== 'foreignObject';
          // patch children
          if (dynamicChildren) {
              patchBlockChildren(n1.dynamicChildren, dynamicChildren, el, parentComponent, parentSuspense, areChildrenSVG);
              if ( parentComponent && parentComponent.type.__hmrId) {
                  traverseStaticChildren(n1, n2);
              }
          }
          else if (!optimized) {
              // full diff
              patchChildren(n1, n2, el, null, parentComponent, parentSuspense, areChildrenSVG);
          }
          // vnode hook or dirs 处理
          if ((vnodeHook = newProps.onVnodeUpdated) || dirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, n2, n1);
                  dirs && invokeDirectiveHook(n2, n1, parentComponent, 'updated');
              }, parentSuspense);
          }
      };
      // 14. patchBlockChildren
      // The fast path for blocks.
      const patchBlockChildren = (oldChildren, newChildren, fallbackContainer, parentComponent, parentSuspense, isSVG) => {
          for (let i = 0; i < newChildren.length; i++) {
              const oldVNode = oldChildren[i];
              const newVNode = newChildren[i];
              // Determine the container (parent element) for the patch.
              const container = 
              // - In the case of a Fragment, we need to provide the actual parent
              // of the Fragment itself so it can move its children.
              oldVNode.type === Fragment ||
                  // - In the case of different nodes, there is going to be a replacement
                  // which also requires the correct parent container
                  !isSameVNodeType(oldVNode, newVNode) ||
                  // - In the case of a component, it could contain anything.
                  oldVNode.shapeFlag & 6 /* COMPONENT */ ||
                  oldVNode.shapeFlag & 64 /* TELEPORT */
                  ? hostParentNode(oldVNode.el)
                  : // In other cases, the parent container is not actually used so we
                      // just pass the block element here to avoid a DOM parentNode call.
                      fallbackContainer;
              patch(oldVNode, newVNode, container, null, parentComponent, parentSuspense, isSVG, true);
          }
      };
      // 15. patchProps
      const patchProps = (el, vnode, oldProps, newProps, parentComponent, parentSuspense, isSVG) => {
          // 属性变化了才执行 patch 操作
          if (oldProps !== newProps) {
              for (const key in newProps) {
                  // 空字符串不是有效的属性
                  if (isReservedProp(key))
                      continue;
                  const next = newProps[key];
                  const prev = oldProps[key];
                  if (next !== prev ||
                      (hostForcePatchProp && hostForcePatchProp(el, key))) {
                      hostPatchProp(el, key, prev, next, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                  }
              }
              if (oldProps !== EMPTY_OBJ) {
                  for (const key in oldProps) {
                      if (!isReservedProp(key) && !(key in newProps)) {
                          // 删除 old prop
                          hostPatchProp(el, key, oldProps[key], null, isSVG, vnode.children, parentComponent, parentSuspense, unmountChildren);
                      }
                  }
              }
          }
      };
      // 16. processFragment
      const processFragment = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          const fragmentStartAnchor = (n2.el = n1 ? n1.el : hostCreateText(''));
          const fragmentEndAnchor = (n2.anchor = n1 ? n1.anchor : hostCreateText(''));
          let { patchFlag, dynamicChildren } = n2;
          if (patchFlag > 0) {
              optimized = true;
          }
          if ( isHmrUpdating) {
              // HMR updated, force full diff
              patchFlag = 0;
              optimized = false;
              dynamicChildren = null;
          }
          if (n1 == null) {
              hostInsert(fragmentStartAnchor, container, anchor);
              hostInsert(fragmentEndAnchor, container, anchor);
              // fragment 的 children 只会是 array children
              // 因为他们要么是通过 compiler 生成的，要么是由数组创建的
              mountChildren(n2.children, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, optimized);
          }
          else {
              if (patchFlag > 0 &&
                  patchFlag & 64 /* STABLE_FRAGMENT */ &&
                  dynamicChildren &&
                  // #2715 the previous fragment could've been a BAILed one as a result
                  // of renderSlot() with no valid children
                  n1.dynamicChildren) {
                  // a stable fragment (template root or <template v-for>) doesn't need to
                  // patch children order, but it may contain dynamicChildren.
                  patchBlockChildren(n1.dynamicChildren, dynamicChildren, container, parentComponent, parentSuspense, isSVG);
                  if ( parentComponent && parentComponent.type.__hmrId) {
                      traverseStaticChildren(n1, n2);
                  }
                  else if (
                  // #2080 if the stable fragment has a key, it's a <template v-for> that may
                  //  get moved around. Make sure all root level vnodes inherit el.
                  // #2134 or if it's a component root, it may also get moved around
                  // as the component is being moved.
                  n2.key != null ||
                      (parentComponent && n2 === parentComponent.subTree)) {
                      traverseStaticChildren(n1, n2, true /* shallow */);
                  }
              }
              else {
                  // keyed / unkeyed, or manual fragments.
                  // for keyed & unkeyed, since they are compiler generated from v-for,
                  // each child is guaranteed to be a block so the fragment will never
                  // have dynamicChildren.
                  patchChildren(n1, n2, container, fragmentEndAnchor, parentComponent, parentSuspense, isSVG, optimized);
              }
          }
      };
      // 17. processComponent
      const processComponent = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          if (n1 == null) {
              // mount
              if (n2.shapeFlag & 512 /* COMPONENT_KEPT_ALIVE */) {
                  parentComponent.ctx.activate(n2, container, anchor, isSVG, optimized);
              }
              else {
                  mountComponent(n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
              }
          }
          else {
              updateComponent(n1, n2, optimized);
          }
      };
      // 18. mountComponent
      const mountComponent = (initialVNode, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          const instance = (initialVNode.component = createComponentInstance(initialVNode, parentComponent, parentSuspense));
          if (isKeepAlive(initialVNode)) {
              instance.ctx.renderer = internals;
          }
          setupComponent(instance);
          // setup() 是个异步函数，返回了 promise ，在 setupComponent
          // 中会将 setup 执行结果赋值给 instance.asyncDep，即 SUSPENSE 处理
          if ( instance.asyncDep) {
              // 将 setupRenderEffect 注册到 parent deps 这里的 deps 执行由一定的规则
              // 如果 parent suspense 没有结束，child deps 不会立即执行，而是将它们
              // 合并到 parent suspense deps 中等待 parent 状态完成了才会执行，对于
              // parent deps 也遵循这个规则，直到没有未完成的 parent suspense 为止
              parentSuspense && parentSuspense.registerDep(instance, setupRenderEffect);
              // 这里等于是说先用一个注释节点占位，等异步完成之后替换
              if (!initialVNode.el) {
                  const placeholder = (instance.subTree = createVNode(Comment));
                  processCommentNode(null, placeholder, container, anchor);
              }
              return;
          }
          setupRenderEffect(instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized);
      };
      // 19. updateComponent
      const updateComponent = (n1, n2, optimized) => {
          const instance = (n2.component = n1.component);
          if (shouldUpdateComponent(n1, n2, optimized)) {
              if (
                  instance.asyncDep && // async setup
                  instance.asyncResolved) {
                  // async & still pending - just update props and slots
                  // since the component's reactive effect for render isn't set-up yet
                  updateComponentPreRender(instance, n2, optimized);
                  return;
              }
              else {
                  // 正常更新
                  instance.next = n2;
                  // 考虑到 child 组件可能正在队列中排队，移除它避免
                  // 在同一个 flush tick 重复更新同一个子组件
                  // 当下一次更新来到时，之前的一次更新取消？
                  invalidateJob(instance.update);
                  // instance.update 是在 setupRenderEffect 中
                  // 定义的一个 reactive effect runner
                  // 主动触发更新
                  instance.update();
              }
              return;
          }
          else {
              // 没有更新，仅用 old child 的属性覆盖 new child
              n2.component = n1.component;
              n2.el = n1.el;
              instance.vnode = n2;
          }
      };
      // 20. setupRenderEffect
      const setupRenderEffect = (instance, initialVNode, container, anchor, parentSuspense, isSVG, optimized) => {
          instance.update = effect(function componentEffect() {
              // 监听更新
              if (!instance.isMounted) {
                  // 还没加载完成，可能是第一次 mount 操作
                  let vnodeHook;
                  const { el, props } = initialVNode;
                  const { bm, m, parent } = instance;
                  // 1. beforeMount hook
                  if (bm) {
                      invokeArrayFns(bm);
                  }
                  // 2. onVnodeBeforeMount
                  if ((vnodeHook = props && props.onVnodeBeforeMount)) {
                      invokeVNodeHook(vnodeHook, parent, initialVNode);
                  }
                  // 3. render
                  // TODO start, end measure
                  const subTree = (instance.subTree = renderComponentRoot(instance));
                  if (el && hydrateNode) ;
                  else {
                      patch(null, subTree, container, anchor, instance, parentSuspense, isSVG);
                      initialVNode.el = subTree.el;
                  }
                  // mounted hook
                  if (m) {
                      queuePostRenderEffect(m, parentSuspense);
                  }
                  // onVnodemounted
                  if ((vnodeHook = props && props.onVnodeMounted)) {
                      const scopedInitialVNode = initialVNode;
                      queuePostRenderEffect(() => {
                          invokeVNodeHook(vnodeHook, parent, scopedInitialVNode);
                      }, parentSuspense);
                  }
                  // activated hook for keep-alive roots.
                  // #1742 activated hook must be accessed after first render
                  // since the hook may be injected by a child keep-alive
                  const { a } = instance;
                  if (a &&
                      initialVNode.shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
                      queuePostRenderEffect(a, parentSuspense);
                  }
                  instance.isMounted = true;
                  // #2458: deference mount-only object parameters to prevent memleaks
                  // 释放资源
                  initialVNode = container = anchor = null;
              }
              else {
                  // updateComponent
                  // 当组件自身的状态或父组件调用 processComponent 时触发
                  let { next, bu, u, parent, vnode } = instance;
                  let originNext = next;
                  let vnodeHook;
                  if (next) {
                      next.el = vnode.el;
                      updateComponentPreRender(instance, next, optimized);
                  }
                  else {
                      next = vnode;
                  }
                  // beforeUpdate hook
                  if (bu) {
                      invokeArrayFns(bu);
                  }
                  // onVnodeBeforeUpdate
                  if ((vnodeHook = next.props && next.props.onVnodeBeforeUpdate)) {
                      invokeVNodeHook(vnodeHook, parent, next, vnode);
                  }
                  //render
                  const nextTree = renderComponentRoot(instance);
                  const prevTree = instance.subTree;
                  instance.subTree = nextTree;
                  patch(prevTree, nextTree, 
                  // 如果在 teleport 中，parent 可能会发生改变
                  hostParentNode(prevTree.el), 
                  // anchor may have changed if it's in a fragment
                  getNextHostNode(prevTree), instance, parentSuspense, isSVG);
                  next.el = nextTree.el;
                  if (originNext === null) {
                      // self-triggered update. In case of HOC, update parent component
                      // vnode el. HOC is indicated by parent instance's subTree pointing
                      // to child component's vnode
                      updateHOCHostEl(instance, nextTree.el);
                  }
                  // updated hook
                  if (u) {
                      queuePostRenderEffect(u, parentSuspense);
                  }
                  // onVnodeUpdated
                  if ((vnodeHook = next.props && next.props.onVnodeUpdated)) {
                      queuePostRenderEffect(() => {
                          invokeVNodeHook(vnodeHook, parent, next, vnode);
                      }, parentSuspense);
                  }
              }
          },  // 提供 onTrack/onTrigger 选项执行 rtc&rtg 两个周期函数
                  createDevEffectOptions(instance)
              );
      };
      // 21. updateComponentPreRender
      const updateComponentPreRender = (instance, nextVNode, optimized) => {
          nextVNode.component = instance;
          const prevProps = instance.vnode.props;
          instance.vnode = nextVNode;
          instance.next = null;
          // update props
          updateProps(instance, nextVNode.props, prevProps, optimized);
          updateSlots(instance, nextVNode.children);
          // props update may have triggered pre-flush watchers.
          // flush them before the render update.
          flushPreFlushCbs(undefined, instance.update);
      };
      // 22. patchChildren
      const patchChildren = (n1, n2, container, anchor, parentComponent, parentSuspense, isSVG, optimized = false) => {
          const c1 = n1 && n1.children;
          const prevShapeFlag = n1 ? n1.shapeFlag : 0;
          const c2 = n2.children;
          const { patchFlag, shapeFlag } = n2;
          // fast path
          if (patchFlag > 0) {
              if (patchFlag & 128 /* KEYED_FRAGMENT */) {
                  // this could be either fully-keyed or mixed (some keyed some not)
                  // presence of patchFlag means children are guaranteed to be arrays
                  patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  return;
              }
              else if (patchFlag & 256 /* UNKEYED_FRAGMENT */) {
                  patchUnkeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  return;
              }
          }
          // children 有三种可能： text, array, 或没有 children
          if (shapeFlag & 8 /* TEXT_CHILDREN */) {
              // text children fast path
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  unmountChildren(c1, parentComponent, parentSuspense);
              }
              if (c2 !== c1) {
                  hostSetElementText(container, c2);
              }
          }
          else {
              if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      patchKeyedChildren(c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
                  else {
                      // new null, old array 直接卸载 old
                      unmountChildren(c1, parentComponent, parentSuspense, true /* doRemove */);
                  }
              }
              else {
                  // prev children was text or null
                  // new children is array or null
                  // 老的 children 是 text，新的又是数组情况
                  if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                      // 先清空？
                      hostSetElementText(container, '');
                  }
                  // 然后直接重新加载新的 array children -> c2
                  // old children 是 array
                  if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                      mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized);
                  }
              }
          }
      };
      // 23. patchUnkeyedChildren
      const patchUnkeyedChildren = (c1, c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized) => {
          c1 = c1 || EMPTY_ARR;
          c2 = c2 || EMPTY_ARR;
          const oldLength = c1.length;
          const newLength = c2.length;
          const commonLength = Math.min(oldLength, newLength);
          let i;
          for (i = 0; i < commonLength; i++) {
              const nextChild = (c2[i] = optimized
                  ? cloneIfMounted(c2[i])
                  : normalizeVNode(c2[i]));
              patch(c1[i], nextChild, container, null, parentComponent, parentSuspense, isSVG, optimized);
          }
          if (oldLength > newLength) {
              // remove old
              unmountChildren(c1, parentComponent, parentSuspense, true, false, commonLength);
          }
          else {
              // mount new
              mountChildren(c2, container, anchor, parentComponent, parentSuspense, isSVG, optimized, commonLength);
          }
      };
      // 24. 可能所有都是 keyed 也可能部分
      const patchKeyedChildren = (c1, c2, container, parentAnchor, parentComponent, parentSuspense, isSVG, optimized) => {
          let i = 0;
          const l2 = c2.length;
          let e1 = c1.length - 1; // 上一个结束索引
          let e2 = l2 - 1; // 下一个结束索引
          // 1. sync from start
          // (a b) c
          // (a b) d e
          // 这里结束之后 i 就会定位到第一个不同类型的位置，即 2
          while (i <= e1 && i <= e2) {
              const n1 = c1[i];
              const n2 = (c2[i] = optimized // 静态节点
                  ? cloneIfMounted(c2[i])
                  : normalizeVNode(c2[i]));
              // type & key 相同
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, optimized);
              }
              else {
                  break;
              }
              i++;
          }
          // 2. sync from end
          // a (b c)
          // d e (b c)
          // 这里结束之后，后面相同的节点就被处理掉了，此时 e1 = 0, e2 = 1
          while (i <= e1 && i <= e2) {
              const n1 = c1[e1];
              const n2 = (c2[e2] = optimized
                  ? cloneIfMounted(c2[e2])
                  : normalizeVNode(c2[e2]));
              if (isSameVNodeType(n1, n2)) {
                  patch(n1, n2, container, null, parentComponent, parentSuspense, isSVG, optimized);
              }
              else {
                  break;
              }
              e1--;
              e2--;
          }
          // 3. common sequence + mount
          // (a b)
          // (a b) c
          // i = 2, e1 = 1, e2 = 2
          // (a b)
          // c (a b)
          // i = 0, e1 = -1, e2 = 0
          if (i > e1) {
              if (i <= e2) {
                  const nextPos = e2 + 1;
                  const anchor = nextPos < l2 ? c2[nextPos].el : parentAnchor;
                  while (i <= e2) {
                      patch(null, (c2[i] = optimized
                          ? cloneIfMounted(c2[i])
                          : normalizeVNode(c2[i])), container, anchor, parentComponent, parentSuspense, isSVG);
                      i++;
                  }
              }
          }
          // 4. common sequence + unmount
          // (a b) c
          // (a b)
          // i = 2, e1 = 2, e2 = 1
          // a (b c)
          // (b c)
          // i = 0, e1 = 0, e2 = -1
          else if (i > e2) {
              while (i <= e1) {
                  unmount(c1[i], parentComponent, parentSuspense, true /* doRemove */);
                  i++;
              }
          }
          // 5. unknown sequence, 未知序列
          // [i ... e1 + 1]: a b [c d e] f g
          // [i ... e2 + 1]: a b [e d c h] f g
          // i = 2, e1 = 4, e2 = 5
          else {
              const s1 = i; // prev starting index
              const s2 = i; // next starting index
              // 5.1 build key:index map for newChildren
              // 给新的 children 创建新的 key
              const keyToNewIndexMap = new Map();
              // 从 new nodes 开始，可处理删除和新增操作
              // 这里目的是保存 new nodes 中 child 的 key 和索引的对应关系
              for (i = s2; i <= e2; i++) {
                  const nextChild = (c2[i] = optimized
                      ? cloneIfMounted(c2[i])
                      : normalizeVNode(c2[i]));
                  if (nextChild.key != null) {
                      // 新的 child 有自己的 Key
                      // TODO warn 重复 key
                      keyToNewIndexMap.set(nextChild.key, i);
                  }
              }
              // 5.2 遍历 old children，执行 patch 或 remove 操作
              let j;
              let patched = 0;
              // 需要被 patch 的 old child 数
              // 如：
              // old: (a b) c
              // new: (a b) d e
              // 那么需要处理的数为 2(d,e 位置)
              const toBePatched = e2 - s2 + 1;
              let moved = false;
              // 用来跟踪有多少节点被移除了
              let maxNewIndexSoFar = 0;
              // works as Map<newIndex, oldIndex>
              // Note that oldIndex is offset by +1
              // and oldIndex = 0 is a special value indicating the new node has
              // no corresponding old node.
              // used for determining longest stable subsequence
              const newIndexToOldIndexMap = new Array(toBePatched);
              for (i = 0; i < toBePatched; i++) {
                  // 初始化
                  newIndexToOldIndexMap[i] = 0;
              }
              // 遍历 old children 剩余的不同节点
              for (i = s1; i <= e1; i++) {
                  const prevChild = c1[i];
                  if (patched >= toBePatched) {
                      // 移除 old child
                      unmount(prevChild, parentComponent, parentSuspense, true);
                      continue;
                  }
                  let newIndex;
                  // old child 也有自己的 key
                  if (prevChild.key != null) {
                      // 用 old child 的 key 从 new children key map 里面
                      // 找到相同 key 的 new child，所以替换不是按照顺序来替换的
                      // (a b) c -> (a b) d e 很有可能 c 会被 e 给替换了
                      newIndex = keyToNewIndexMap.get(prevChild.key);
                  }
                  else {
                      // 没有 key 的 old child，尝试将一个同类型的无 key 的 new child
                      // 放进来，遍历 new children
                      for (j = s2; j <= e2; j++) {
                          // 从 d 位置开始搜索，同类型无 key 的 new child
                          if (newIndexToOldIndexMap[j - s2] === 0 &&
                              isSameVNodeType(prevChild, c2[j])) {
                              newIndex = j;
                              break;
                          }
                      }
                  }
                  // 这个 newIndex 是可以用来替换当前的 old child 的那个节点
                  if (newIndex === undefined) {
                      // 没有找到可替换的节点，直接删除 old child
                      unmount(prevChild, parentComponent, parentSuspense, true);
                  }
                  else {
                      // 找到可用来替换的，将这个标识位填充为当前 old child index + 1
                      // 此处的 i 即 for old children 时的索引，说明这个 new child
                      // 已经用来替换过了，下次循环不能再用了
                      newIndexToOldIndexMap[newIndex - s2] = i + 1;
                      if (newIndex >= maxNewIndexSoFar) {
                          maxNewIndexSoFar = newIndex;
                      }
                      else {
                          moved = true;
                      }
                      patch(prevChild, c2[newIndex], container, null, parentComponent, parentSuspense, isSVG, optimized);
                      patched++;
                  }
              }
              // 5.3 move and mount
              // generate longest stable subsequence only when nodes have moved
              // 最长有序递增序列，从一串数字中找到最长的有序数列，结果序列中的数字顺序
              // 必须符合原序列中的先后顺序
              // 首先 newIndexToOldIndexMap 这个是用来保存 new children 中曾经
              // 用来替换 old child 的那个 new child 的索引，上面在替换的时候
              // 会赋值给 i + 1 给当前 newIndex - s2 索引位置值
              // 如： (a b) c 和 (a b) d e 假如 e 符合替换 c 的条件
              // 那么 newIndexToOldIndexMap[3 - 2] = 3 + 1
              const increasingNewIndexSequence = moved
                  ? getSequence(newIndexToOldIndexMap)
                  : EMPTY_ARR;
              j = increasingNewIndexSequence.length - 1;
              for (i = toBePatched - 1; i >= 0; i--) {
                  const nextIndex = s2 + i;
                  const nextChild = c2[nextIndex];
                  const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : parentAnchor;
                  if (newIndexToOldIndexMap[i] === 0) {
                      // mount new，这个 old children 位置没有 new child 替换
                      // 所以执行 mount new child
                      patch(null, nextChild, container, anchor, parentComponent, parentSuspense, isSVG);
                  }
                  else if (moved) {
                      // move if:
                      // There is no stable subsequence (e.g. a reverse)
                      // OR current node is not among the stable sequence
                      if (j < 0 || i !== increasingNewIndexSequence[j]) {
                          move(nextChild, container, anchor, 2 /* REORDER */);
                      }
                      else {
                          j--;
                      }
                  }
              }
          }
      };
      // 25. move， 交换操作
      const move = (vnode, container, anchor, moveType, parentSuspense = null) => {
          const { el, type, transition, children, shapeFlag } = vnode;
          if (shapeFlag & 6 /* COMPONENT */) {
              move(vnode.component.subTree, container, anchor, moveType);
              return;
          }
          // SUSPENSE
          if ( shapeFlag & 128 /* SUSPENSE */) {
              vnode.suspense.move(container, anchor, moveType);
              return;
          }
          if (shapeFlag & 64 /* TELEPORT */) {
              type.move(vnode, container, anchor, internals);
              return;
          }
          if (type === Fragment) {
              hostInsert(el, container, anchor);
              for (let i = 0; i < children.length; i++) {
                  move(children[i], container, anchor, moveType);
              }
              hostInsert(vnode.anchor, container, anchor);
              return;
          }
          if (type === Static) {
              moveStaticNode(vnode, container, anchor);
          }
          // single nodes
          const needTransition = moveType !== 2 /* REORDER */ &&
              shapeFlag & 1 /* ELEMENT */ &&
              transition;
          if (needTransition) {
              if (moveType === 0 /* ENTER */) {
                  transition.beforeEnter(el);
                  hostInsert(el, container, anchor);
                  queuePostRenderEffect(() => transition.enter(el), parentSuspense);
              }
              else {
                  const { leave, delayLeave, afterLeave } = transition;
                  const remove = () => hostInsert(el, container, anchor);
                  const performLeave = () => {
                      leave(el, () => {
                          remove();
                          afterLeave && afterLeave();
                      });
                  };
                  if (delayLeave) {
                      delayLeave(el, remove, performLeave);
                  }
                  else {
                      performLeave();
                  }
              }
          }
          else {
              // 目前只实现普通元素的逻辑
              hostInsert(el, container, anchor);
          }
      };
      // 26. unmount
      const unmount = (vnode, parentComponent, parentSuspense, doRemove = false, optimized = false) => {
          const { type, props, ref, children, dynamicChildren, shapeFlag, patchFlag, dirs } = vnode;
          // unset ref
          if (ref != null) {
              setRef(ref, null, parentSuspense, null);
          }
          // keep-alive
          if (shapeFlag & 256 /* COMPONENT_SHOULD_KEEP_ALIVE */) {
              parentComponent.ctx.deactivate(vnode);
              return;
          }
          const shouldInvokeDirs = shapeFlag & 1 /* ELEMENT */ && dirs;
          let vnodeHook;
          // 执行 onVnodeBeforeUnmount hook
          if ((vnodeHook = props && props.onVnodeBeforeUnmount)) {
              invokeVNodeHook(vnodeHook, parentComponent, vnode);
          }
          if (shapeFlag & 6 /* COMPONENT */) {
              // unmount component
              unmountComponent(vnode.component, parentSuspense, doRemove);
          }
          else {
              //  SUSPENSE
              if ( shapeFlag & 128 /* SUSPENSE */) {
                  vnode.suspense.unmount(parentSuspense, doRemove);
                  return;
              }
              // should invoke dirs
              if (shouldInvokeDirs) {
                  invokeDirectiveHook(vnode, null, parentComponent, 'beforeUnmount');
              }
              if (dynamicChildren &&
                  // #1153: fast path should not be taken for non-stable (v-for) fragments
                  (type !== Fragment ||
                      (patchFlag > 0 &&
                          patchFlag & 64 /* STABLE_FRAGMENT */)) /* dyanmic children */) {
                  // fast path for block nodes: only need to unmount dynamic children.
                  unmountChildren(dynamicChildren, parentComponent, parentSuspense, false, true);
              }
              else if ((type === Fragment &&
                  (patchFlag & 128 /* KEYED_FRAGMENT */ ||
                      patchFlag & 256 /* UNKEYED_FRAGMENT */)) ||
                  (!optimized && shapeFlag & 16 /* ARRAY_CHILDREN */)) {
                  unmountChildren(children, parentComponent, parentSuspense);
              }
              // TELEPORT
              // an unmounted teleport should always remove its children if not disabled
              if (shapeFlag & 64 /* TELEPORT */ &&
                  (doRemove || !isTeleportDisabled(vnode.props))) {
                  vnode.type.remove(vnode, internals);
              }
              if (doRemove) {
                  remove(vnode);
              }
          }
          // 执行 onVnodeUnmounted hook
          if ((vnodeHook = props && props.onVnodeUnmounted) || shouldInvokeDirs) {
              queuePostRenderEffect(() => {
                  vnodeHook && invokeVNodeHook(vnodeHook, parentComponent, vnode);
                  shouldInvokeDirs &&
                      invokeDirectiveHook(vnode, null, parentComponent, 'unmounted');
              }, parentSuspense);
          }
      };
      // 27. remove
      const remove = vnode => {
          const { type, el, anchor, transition } = vnode;
          if (type === Fragment) {
              removeFragment(el, anchor);
              return;
          }
          if (type === Static) {
              removeStaticNode(vnode);
              return;
          }
          const performRemove = () => {
              // 将 el 从它的 parenNode.children 中删除
              hostRemove(el);
              if (transition && !transition.persisted && transition.afterLeave) {
                  transition.afterLeave();
              }
          };
          if (vnode.shapeFlag & 1 /* ELEMENT */ &&
              transition &&
              !transition.persisted) {
              const { leave, delayLeave } = transition;
              const performLeave = () => leave(el, performRemove);
              if (delayLeave) {
                  delayLeave(vnode.el, performRemove, performLeave);
              }
              else {
                  performLeave();
              }
          }
          else {
              performRemove();
          }
      };
      const removeFragment = (cur, end) => {
          // For fragments, directly remove all contained DOM nodes.
          // (fragment child nodes cannot have transition)
          let next;
          while (cur !== end) {
              next = hostNextSibling(cur);
              hostRemove(cur);
              cur = next;
          }
          hostRemove(end);
      };
      const unmountComponent = (instance, parentSuspense, doRemove) => {
          const { bum, effects, update, subTree, um } = instance;
          // beforeUnmount hook
          if (bum) {
              invokeArrayFns(bum);
          }
          if (effects) {
              for (let i = 0; i < effects.length; i++) {
                  stop(effects[i]);
              }
          }
          // update may be null if a component is unmounted before its async
          // setup has resolved.
          if (update) {
              stop(update);
              unmount(subTree, instance, parentSuspense, doRemove);
          }
          // unmounted hook
          if (um) {
              queuePostRenderEffect(um, parentSuspense);
          }
          queuePostRenderEffect(() => {
              instance.isUnmounted = true;
          }, parentSuspense);
          // A component with async dep inside a pending suspense is unmounted before
          // its async dep resolves. This should remove the dep from the suspense, and
          // cause the suspense to resolve immediately if that was the last dep.
          if (
              parentSuspense &&
              parentSuspense.pendingBranch &&
              !parentSuspense.isUnmounted &&
              instance.asyncDep &&
              !instance.asyncResolved &&
              instance.suspenseId === parentSuspense.pendingId) {
              parentSuspense.deps--;
              if (parentSuspense.deps === 0) {
                  parentSuspense.resolve();
              }
          }
          {
              devtoolsComponentRemoved(instance);
          }
      };
      // 30. unmountChildren
      const unmountChildren = (children, parentComponent, parentSuspense, doRemove = false, optimized = false, start = 0) => {
          for (let i = start; i < children.length; i++) {
              unmount(children[i], parentComponent, parentSuspense, doRemove, optimized);
          }
      };
      // 31. getNextHostNode
      const getNextHostNode = vnode => {
          // COMPONENT
          if (vnode.shapeFlag & 6 /* COMPONENT */) {
              return getNextHostNode(vnode.component.subTree);
          }
          if ( vnode.shapeFlag & 128 /* SUSPENSE */) {
              return vnode.suspense.next();
          }
          return hostNextSibling((vnode.anchor || vnode.el));
      };
      // 32. render
      const render = (vnode, container) => {
          // render(h('div'), root)
          if (vnode == null) {
              if (container._vnode) {
                  unmount(container._vnode, null, null, true);
              }
          }
          else {
              patch(container._vnode || null, vnode, container);
          }
          // 执行所有 post 异步任务
          flushPostFlushCbs();
          container._vnode = vnode;
      };
      // 33. internals object, 函数别名
      const internals = {
          p: patch,
          um: unmount,
          m: move,
          r: remove,
          mt: mountComponent,
          mc: mountChildren,
          pc: patchChildren,
          pbc: patchBlockChildren,
          n: getNextHostNode,
          o: options
      };
      // 34. createHydrationFns
      let hydrate;
      let hydrateNode;
      if (createHydrationFns) {
          [hydrate, hydrateNode] = createHydrationFns(internals);
      }
      // 35. return { render, hydrate, createApp }
      return {
          render,
          hydrate,
          createApp: createAppAPI(render, hydrate)
      };
  }
  function invokeVNodeHook(hook, instance, vnode, prevVNode = null) {
      callWithAsyncErrorHandling(hook, instance, 7 /* VNODE_HOOK */, [
          vnode,
          prevVNode
      ]);
  }
  /**
   * #1156
   * When a component is HMR-enabled, we need to make sure that all static nodes
   * inside a block also inherit the DOM element from the previous tree so that
   * HMR updates (which are full updates) can retrieve the element for patching.
   *
   * #2080
   * Inside keyed `template` fragment static children, if a fragment is moved,
   * the children will always moved so that need inherit el form previous nodes
   * to ensure correct moved position.
   */
  function traverseStaticChildren(n1, n2, shallow = false) {
      const ch1 = n1.children;
      const ch2 = n2.children;
      if (isArray(ch1) && isArray(ch2)) {
          for (let i = 0; i < ch1.length; i++) {
              // this is only called in the optimized path so array children are
              // guaranteed to be vnodes
              const c1 = ch1[i];
              let c2 = ch2[i];
              if (c2.shapeFlag & 1 /* ELEMENT */ && !c2.dynamicChildren) {
                  if (c2.patchFlag <= 0 || c2.patchFlag === 32 /* HYDRATE_EVENTS */) {
                      c2 = ch2[i] = cloneIfMounted(ch2[i]);
                      c2.el = c1.el;
                  }
                  if (!shallow)
                      traverseStaticChildren(c1, c2);
              }
              // also inherit for comment nodes, but not placeholders (e.g. v-if which
              // would have received .el during block patch)
              if ( c2.type === Comment && !c2.el) {
                  c2.el = c1.el;
              }
          }
      }
  }
  // https://en.wikipedia.org/wiki/Longest_increasing_subsequence
  function getSequence(arr) {
      const p = arr.slice();
      const result = [0];
      let i, j, u, v, c;
      const len = arr.length;
      for (i = 0; i < len; i++) {
          const arrI = arr[i];
          if (arrI !== 0) {
              j = result[result.length - 1];
              if (arr[j] < arrI) {
                  p[i] = j;
                  result.push(i);
                  continue;
              }
              u = 0;
              v = result.length - 1;
              while (u < v) {
                  c = ((u + v) / 2) | 0;
                  if (arr[result[c]] < arrI) {
                      u = c + 1;
                  }
                  else {
                      v = c;
                  }
              }
              if (arrI < arr[result[u]]) {
                  if (u > 0) {
                      p[i] = result[u - 1];
                  }
                  result[u] = i;
              }
          }
      }
      u = result.length;
      v = result[u - 1];
      while (u-- > 0) {
          result[u] = v;
          v = p[v];
      }
      return result;
  }

  // simple effect
  function watchEffect(effect, options) {
      return doWatch(effect, null, options);
  }
  // initial value for watchers to trigger on undefined initial values
  const INITIAL_WATCHER_VALUE = {};
  // implementation
  function watch(source, cb, options) {
      if ( !isFunction(cb)) {
          warn(`\`watch(fn, options?)\` signature has been moved to a separate API. ` +
              `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` +
              `supports \`watch(source, cb, options?) signature.`);
      }
      return doWatch(source, cb, options);
  }
  function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ, instance = currentInstance) {
      // 1. cb, immediate, deep 检测
      if ( !cb) {
          if (immediate !== undefined) {
              warn(`watch() "immediate" option is only respected when using the ` +
                  `watch(source, callback, options?) signature.`);
          }
          if (deep !== undefined) {
              warn(`watch() "deep" option is only respected when using the ` +
                  `watch(source, callback, options?) signature.`);
          }
      }
      const warnInvalidSource = (s) => {
          warn(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, ` +
              `a reactive object, or an array of these types.`);
      };
      // 2. getter 函数，根据不同类型生成对应的 getter
      let getter;
      let forceTrigger = false;
      // 2.1 source is ref
      if (isRef(source)) {
          getter = () => source.value;
          forceTrigger = !!source._shallow;
      }
      // 2.2 source is reactive
      else if (isReactive(source)) {
          getter = () => source;
          deep = true;
      }
      // 2.3 source is array
      else if (isArray(source)) {
          getter = () => source.map(s => {
              if (isRef(s)) {
                  return s.value;
              }
              else if (isReactive(s)) {
                  return traverse(s);
              }
              else if (isFunction(s)) {
                  return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */);
              }
              else {
                   warnInvalidSource(s);
              }
          });
      }
      // 2.4 source is function
      else if (isFunction(source)) {
          // 如果是函数，直接执行取得函数执行结果
          if (cb) {
              // getter with cb
              getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */);
          }
          else {
              // no cb -> simple effect
              getter = () => {
                  if (instance && instance.isUnmounted) {
                      // 组件已经卸载了
                      return;
                  }
                  if (cleanup)
                      cleanup();
                  return callWithErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]);
              };
          }
      }
      // 2.5 其他情况
      else {
          getter = NOOP;
           warnInvalidSource(source);
      }
      //
      // 3. cb + deep: true
      if (cb && deep) {
          const baseGetter = getter;
          // a. deep: true
          // b. source is reactive
          getter = () => traverse(baseGetter());
      }
      let cleanup;
      const onInvalidate = (fn) => {
          cleanup = runner.options.onStop = () => {
              callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */);
          };
      };
      let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE;
      const job = () => {
          if (!runner.active) {
              return;
          }
          if (cb) {
              // watch(source, cb)
              const newValue = runner();
              if (deep || forceTrigger || hasChanged(newValue, oldValue)) {
                  // cleanup
                  if (cleanup)
                      cleanup();
                  callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [
                      newValue,
                      // pass undefined as the old value when it's changed for the first time
                      // 第一次的时候 oldValue 为 undefined
                      oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue,
                      onInvalidate
                  ]);
                  oldValue = newValue;
              }
          }
          else {
              // watchEffect, no cb
              runner();
          }
      };
      //
      // 6. scheduler 设置
      // it is allowed to self-trigger (#1727)
      job.allowRecurse = !!cb;
      let scheduler;
      // 6.1 flush is 'sync'，让依赖同步执行，即当值发生改变之后
      // 立即就会体现出来，因为依赖在赋值之后被立即执行了
      if (flush === 'sync') {
          scheduler = job;
      }
      // 6.2 flush is 'post'
      else if (flush === 'post') {
          scheduler = () => queuePostRenderEffect(job, instance && instance.suspense);
      }
      // 6.3 flush is 'pre'(default)
      else {
          // default: 'pre'
          scheduler = () => {
              if (!instance || instance.isMounted) {
                  queuePreFlushCb(job);
              }
              else {
                  // 带 { pre: true } 选项，第一次调用必须发生在组件 mounted 之前
                  // 从而使他被同步调用，立即执行一次
                  job();
              }
          };
      }
      //
      // 7. get runner
      const runner = effect(getter, {
          lazy: true,
          onTrack,
          onTrigger,
          scheduler
      });
      // 将 effect->runner 加入到 instance.effects 中
      // 以致于在组件 unmount 时他们可以被 stop
      recordInstanceBoundEffect(runner, instance);
      // 8. runner 如何执行？
      if (cb) {
          if (immediate) {
              job();
          }
          else {
              oldValue = runner();
          }
      }
      else if (flush === 'post') {
          queuePostRenderEffect(runner, instance && instance.suspense);
      }
      else {
          runner();
      }
      //
      // 9. return runner->stop, remove runner from instance.effects
      return () => {
          stop(runner);
          if (instance) {
              remove(instance.effects, runner);
          }
      };
  }
  // this.$watch
  function instanceWatch(source, cb, options) {
      const publicThis = this.proxy;
      const getter = isString(source)
          ? () => publicThis[source]
          : source.bind(publicThis);
      return doWatch(getter, cb.bind(publicThis), options, this);
  }
  function traverse(value, seen = new Set()) {
      if (!isObject(value) || seen.has(value)) {
          return value;
      }
      seen.add(value);
      if (isRef(value)) {
          traverse(value.value, seen);
      }
      else if (isArray(value)) {
          for (let i = 0; i < value.length; i++) {
              traverse(value[i], seen);
          }
      }
      else if (isSet(value) || isMap(value)) {
          value.forEach((v) => {
              traverse(v, seen);
          });
      }
      else {
          for (const key in value) {
              traverse(value[key], seen);
          }
      }
      return value;
  }

  function provide(key, value) {
      if (!currentInstance) {
          {
              warn(`provide() can only be used inside setup().`);
          }
      }
      else {
          let provides = currentInstance.provides;
          // 默认情况实例会继承它父亲的 provides 对象
          // 但是当它需要 provide 自己的 values 时候，那么使用它
          // 父亲的 provides 作为原型创建一个新的对象出来变成自己的 provides
          // 这样在 `inject` 里面可以简便的从原型链中查找 injections
          // 简单说就是：
          // 1. 需要自己的就创建个新的对象继承自 Parent provides
          // 2. 这样在查找的时候就可以含方便的通过原型链查找 injections
          const parentProvides = currentInstance.parent && currentInstance.parent.provides;
          // 当父组件和当前实例相同的时候，从父组件的 provides 创建一个备份出来
          if (parentProvides === provides) {
              provides = currentInstance.provides = Object.create(parentProvides);
          }
          // TS doesn't allow symbol as index type
          provides[key] = value;
      }
  }
  function inject(key, defaultValue, treatDefaultAsFactory = false) {
      // currentRenderingInstance 兼容函数式组件
      const instance = currentInstance || currentRenderingInstance;
      if (instance) {
          // #2400
          // to support `app.use` plugins,
          // fallback to appContext's `provides` if the intance is at root
          const provides = instance.parent == null // root
              ? instance.vnode.appContext && instance.vnode.appContext.provides
              : instance.parent.provides;
          if (provides && key in provides) {
              // TS doesn't allow symbol as index type
              return provides[key];
          }
          else if (arguments.length > 1) {
              return treatDefaultAsFactory && isFunction(defaultValue)
                  ? defaultValue()
                  : defaultValue;
          }
          else {
              warn(`injection "${String(key)}" not found.`);
          }
      }
      else {
          warn(`inject() can only be used inside setup() or functional components.`);
      }
  }

  function createDuplicateChecker() {
      const cache = Object.create(null);
      return (type, key) => {
          if (cache[key]) {
              warn(`${type} property "${key}" is already defined in ${cache[key]}.`);
          }
          else {
              cache[key] = type;
          }
      };
  }
  let isInBeforeCreate = false;
  function applyOptions(instance, options, deferredData = [], deferredWatch = [], deferredProvide = [], asMixin = false) {
      const { 
      // composition
      mixins, extends: extendsOptions, 
      // state
      data: dataOptions, computed: computedOptions, methods, watch: watchOptions, provide: provideOptions, inject: injectOptions, 
      // assets
      components, directives, 
      // lifecycle
      beforeMount, mounted, beforeUpdate, updated, activated, deactivated, beforeDestroy, beforeUnmount, destroyed, unmounted, render, renderTracked, renderTriggered, errorCaptured, 
      // public API
      expose } = options;
      const publicThis = instance.proxy;
      const ctx = instance.ctx;
      const globalMixins = instance.appContext.mixins;
      if (asMixin && render && instance.render === NOOP) {
          instance.render = render;
      }
      // applyOptions is called non-as-mixin once per instance
      if (!asMixin) {
          isInBeforeCreate = true;
          callSyncHook('beforeCreate', "bc" /* BEFORE_CREATE */, options, instance, globalMixins);
          isInBeforeCreate = false;
          // global mixins are applied first
          applyMixins(instance, globalMixins, deferredData, deferredWatch, deferredProvide);
      }
      // extending a base component...
      if (extendsOptions) {
          applyOptions(instance, extendsOptions, deferredData, deferredWatch, deferredProvide, true);
      }
      // local mixins
      if (mixins) {
          applyMixins(instance, mixins, deferredData, deferredWatch, deferredProvide);
      }
      const checkDuplicateProperties =  createDuplicateChecker() ;
      {
          const [propsOptions] = instance.propsOptions;
          if (propsOptions) {
              for (const key in propsOptions) {
                  checkDuplicateProperties("Props" /* PROPS */, key);
              }
          }
      }
      // options initialization order (to be consistent with Vue 2):
      // - props (already done outside of this function)
      // - inject
      // - methods
      // - data (deferred since it relies on `this` access)
      // - computed
      // - watch (deferred since it relies on `this` access)
      if (injectOptions) {
          if (isArray(injectOptions)) {
              for (let i = 0; i < injectOptions.length; i++) {
                  const key = injectOptions[i];
                  ctx[key] = inject(key);
                  {
                      checkDuplicateProperties("Inject" /* INJECT */, key);
                  }
              }
          }
          else {
              for (const key in injectOptions) {
                  const opt = injectOptions[key];
                  if (isObject(opt)) {
                      ctx[key] = inject(opt.from || key, opt.default, true /* treat default function as factory */);
                  }
                  else {
                      ctx[key] = inject(opt);
                  }
                  {
                      checkDuplicateProperties("Inject" /* INJECT */, key);
                  }
              }
          }
      }
      if (methods) {
          for (const key in methods) {
              const methodHandler = methods[key];
              if (isFunction(methodHandler)) {
                  ctx[key] = methodHandler.bind(publicThis);
                  {
                      checkDuplicateProperties("Methods" /* METHODS */, key);
                  }
              }
              else {
                  warn(`Method "${key}" has type "${typeof methodHandler}" in the component definition. ` +
                      `Did you reference the function correctly?`);
              }
          }
      }
      if (!asMixin) {
          if (deferredData.length) {
              deferredData.forEach(dataFn => resolveData(instance, dataFn, publicThis));
          }
          if (dataOptions) {
              // @ts-ignore dataOptions is not fully type safe
              resolveData(instance, dataOptions, publicThis);
          }
          {
              const rawData = toRaw(instance.data);
              for (const key in rawData) {
                  checkDuplicateProperties("Data" /* DATA */, key);
                  // expose data on ctx during dev
                  if (key[0] !== '$' && key[0] !== '_') {
                      Object.defineProperty(ctx, key, {
                          configurable: true,
                          enumerable: true,
                          get: () => rawData[key],
                          set: NOOP
                      });
                  }
              }
          }
      }
      else if (dataOptions) {
          deferredData.push(dataOptions);
      }
      if (computedOptions) {
          for (const key in computedOptions) {
              const opt = computedOptions[key];
              const get = isFunction(opt)
                  ? opt.bind(publicThis, publicThis)
                  : isFunction(opt.get)
                      ? opt.get.bind(publicThis, publicThis)
                      : NOOP;
              if ( get === NOOP) {
                  warn(`Computed property "${key}" has no getter.`);
              }
              const set = !isFunction(opt) && isFunction(opt.set)
                  ? opt.set.bind(publicThis)
                  :  () => {
                          warn(`Write operation failed: computed property "${key}" is readonly.`);
                      }
                      ;
              const c = computed$1({
                  get,
                  set
              });
              Object.defineProperty(ctx, key, {
                  enumerable: true,
                  configurable: true,
                  get: () => c.value,
                  set: v => (c.value = v)
              });
              {
                  checkDuplicateProperties("Computed" /* COMPUTED */, key);
              }
          }
      }
      if (watchOptions) {
          deferredWatch.push(watchOptions);
      }
      if (!asMixin && deferredWatch.length) {
          deferredWatch.forEach(watchOptions => {
              for (const key in watchOptions) {
                  createWatcher(watchOptions[key], ctx, publicThis, key);
              }
          });
      }
      if (provideOptions) {
          deferredProvide.push(provideOptions);
      }
      if (!asMixin && deferredProvide.length) {
          deferredProvide.forEach(provideOptions => {
              const provides = isFunction(provideOptions)
                  ? provideOptions.call(publicThis)
                  : provideOptions;
              Reflect.ownKeys(provides).forEach(key => {
                  provide(key, provides[key]);
              });
          });
      }
      // asset options.
      // To reduce memory usage, only components with mixins or extends will have
      // resolved asset registry attached to instance.
      if (asMixin) {
          if (components) {
              extend(instance.components ||
                  (instance.components = extend({}, instance.type.components)), components);
          }
          if (directives) {
              extend(instance.directives ||
                  (instance.directives = extend({}, instance.type.directives)), directives);
          }
      }
      // lifecycle options
      if (!asMixin) {
          callSyncHook('created', "c" /* CREATED */, options, instance, globalMixins);
      }
      if (beforeMount) {
          onBeforeMount(beforeMount.bind(publicThis));
      }
      if (mounted) {
          onMounted(mounted.bind(publicThis));
      }
      if (beforeUpdate) {
          onBeforeUpdate(beforeUpdate.bind(publicThis));
      }
      if (updated) {
          onUpdated(updated.bind(publicThis));
      }
      if (activated) {
          onActivated(activated.bind(publicThis));
      }
      if (deactivated) {
          onDeactivated(deactivated.bind(publicThis));
      }
      if (errorCaptured) {
          onErrorCaptured(errorCaptured.bind(publicThis));
      }
      if (renderTracked) {
          onRenderTracked(renderTracked.bind(publicThis));
      }
      if (renderTriggered) {
          onRenderTriggered(renderTriggered.bind(publicThis));
      }
      if ( beforeDestroy) {
          warn(`\`beforeDestroy\` has been renamed to \`beforeUnmount\`.`);
      }
      if (beforeUnmount) {
          onBeforeUnmount(beforeUnmount.bind(publicThis));
      }
      if ( destroyed) {
          warn(`\`destroyed\` has been renamed to \`unmounted\`.`);
      }
      if (unmounted) {
          onUnmounted(unmounted.bind(publicThis));
      }
      if (isArray(expose)) {
          if (!asMixin) {
              if (expose.length) {
                  const exposed = instance.exposed || (instance.exposed = proxyRefs({}));
                  expose.forEach(key => {
                      exposed[key] = toRef(publicThis, key);
                  });
              }
              else if (!instance.exposed) {
                  instance.exposed = EMPTY_OBJ;
              }
          }
          else {
              warn(`The \`expose\` option is ignored when used in mixins.`);
          }
      }
  }
  function callSyncHook(name, type, options, instance, globalMixins) {
      callHookFromMixins(name, type, globalMixins, instance);
      const { extends: base, mixins } = options;
      if (base) {
          callHookFromExtends(name, type, base, instance);
      }
      if (mixins) {
          callHookFromMixins(name, type, mixins, instance);
      }
      const selfHook = options[name];
      if (selfHook) {
          callWithAsyncErrorHandling(selfHook.bind(instance.proxy), instance, type);
      }
  }
  function callHookFromExtends(name, type, base, instance) {
      if (base.extends) {
          callHookFromExtends(name, type, base.extends, instance);
      }
      const baseHook = base[name];
      if (baseHook) {
          callWithAsyncErrorHandling(baseHook.bind(instance.proxy), instance, type);
      }
  }
  function callHookFromMixins(name, type, mixins, instance) {
      for (let i = 0; i < mixins.length; i++) {
          const chainedMixins = mixins[i].mixins;
          if (chainedMixins) {
              callHookFromMixins(name, type, chainedMixins, instance);
          }
          const fn = mixins[i][name];
          if (fn) {
              callWithAsyncErrorHandling(fn.bind(instance.proxy), instance, type);
          }
      }
  }
  function applyMixins(instance, mixins, deferredData, deferredWatch, deferredProvide) {
      for (let i = 0; i < mixins.length; i++) {
          applyOptions(instance, mixins[i], deferredData, deferredWatch, deferredProvide, true);
      }
  }
  function resolveData(instance, dataFn, publicThis) {
      if ( !isFunction(dataFn)) {
          warn(`The data option must be a function. ` +
              `Plain object usage is no longer supported.`);
      }
      const data = dataFn.call(publicThis, publicThis);
      if ( isPromise(data)) {
          warn(`data() returned a Promise - note data() cannot be async; If you ` +
              `intend to perform data fetching before component renders, use ` +
              `async setup() + <Suspense>.`);
      }
      if (!isObject(data)) {
           warn(`data() should return an object.`);
      }
      else if (instance.data === EMPTY_OBJ) {
          instance.data = reactive(data);
      }
      else {
          // existing data: this is a mixin or extends.
          extend(instance.data, data);
      }
  }
  function createWatcher(raw, ctx, publicThis, key) {
      const getter = key.includes('.')
          ? createPathGetter(publicThis, key)
          : () => publicThis[key];
      if (isString(raw)) {
          const handler = ctx[raw];
          if (isFunction(handler)) {
              watch(getter, handler);
          }
          else {
              warn(`Invalid watch handler specified by key "${raw}"`, handler);
          }
      }
      else if (isFunction(raw)) {
          watch(getter, raw.bind(publicThis));
      }
      else if (isObject(raw)) {
          if (isArray(raw)) {
              raw.forEach(r => createWatcher(r, ctx, publicThis, key));
          }
          else {
              const handler = isFunction(raw.handler)
                  ? raw.handler.bind(publicThis)
                  : ctx[raw.handler];
              if (isFunction(handler)) {
                  watch(getter, handler, raw);
              }
              else {
                  warn(`Invalid watch handler specified by key "${raw.handler}"`, handler);
              }
          }
      }
      else {
          warn(`Invalid watch option: "${key}"`, raw);
      }
  }
  function createPathGetter(ctx, path) {
      const segments = path.split('.');
      return () => {
          let cur = ctx;
          for (let i = 0; i < segments.length && cur; i++) {
              cur = cur[segments[i]];
          }
          return cur;
      };
  }
  function resolveMergedOptions(instance) {
      const raw = instance.type;
      const { __merged, mixins, extends: extendsOptions } = raw;
      if (__merged)
          return __merged;
      const globalMixins = instance.appContext.mixins;
      if (!globalMixins.length && !mixins && !extendsOptions)
          return raw;
      const options = {};
      globalMixins.forEach(m => mergeOptions(options, m, instance));
      mergeOptions(options, raw, instance);
      return (raw.__merged = options);
  }
  function mergeOptions(to, from, instance) {
      const strats = instance.appContext.config.optionMergeStrategies;
      const { mixins, extends: extendsOptions } = from;
      extendsOptions && mergeOptions(to, extendsOptions, instance);
      mixins &&
          mixins.forEach((m) => mergeOptions(to, m, instance));
      for (const key in from) {
          if (strats && hasOwn(strats, key)) {
              to[key] = strats[key](to[key], from[key], instance.proxy, key);
          }
          else {
              to[key] = from[key];
          }
      }
  }

  /**
   * #2437 In Vue 3, functional components do not have a public instance proxy but
   * they exist in the internal parent chain. For code that relies on traversing
   * public $parent chains, skip functional ones and go to the parent instead.
   */
  const getPublicInstance = (i) => i && (i.proxy ? i.proxy : getPublicInstance(i.parent));
  const publicPropertiesMap = extend(Object.create(null), {
      $: i => i,
      $el: i => i.vnode.el,
      $data: i => i.data,
      $props: i => ( shallowReadonly(i.props) ),
      $attrs: i => ( shallowReadonly(i.attrs) ),
      $slots: i => ( shallowReadonly(i.slots) ),
      $refs: i => ( shallowReadonly(i.refs) ),
      $parent: i => getPublicInstance(i.parent),
      $root: i => i.root && i.root.proxy,
      $emit: i => i.emit,
      $options: i => ( resolveMergedOptions(i) ),
      $forceUpdate: i => () => queueJob(i.update),
      $nextTick: i => nextTick.bind(i.proxy),
      $watch: i => ( instanceWatch.bind(i) )
  });
  const PublicInstanceProxyHandlers = {
      get({ _: instance }, key) {
          const { ctx, setupState, data, props, accessCache, type, appContext } = instance;
          // let @vue/reactivity know it should never observe Vue public instances.
          if (key === "__v_skip" /* SKIP */) {
              return true;
          }
          // for internal formatters to know that this is a Vue instance
          if ( key === '__isVue') {
              return true;
          }
          // data / props / ctx
          // This getter gets called for every property access on the render context
          // during render and is a major hotspot. The most expensive part of this
          // is the multiple hasOwn() calls. It's much faster to do a simple property
          // access on a plain object, so we use an accessCache object (with null
          // prototype) to memoize what access type a key corresponds to.
          let normalizedProps;
          if (key[0] !== '$') {
              const n = accessCache[key];
              if (n !== undefined) {
                  switch (n) {
                      case 0 /* SETUP */:
                          return setupState[key];
                      case 1 /* DATA */:
                          return data[key];
                      case 3 /* CONTEXT */:
                          return ctx[key];
                      case 2 /* PROPS */:
                          return props[key];
                      // default: just fallthrough
                  }
              }
              else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
                  accessCache[key] = 0 /* SETUP */;
                  return setupState[key];
              }
              else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
                  accessCache[key] = 1 /* DATA */;
                  return data[key];
              }
              else if (
              // only cache other properties when instance has declared (thus stable)
              // props
              (normalizedProps = instance.propsOptions[0]) &&
                  hasOwn(normalizedProps, key)) {
                  accessCache[key] = 2 /* PROPS */;
                  return props[key];
              }
              else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
                  accessCache[key] = 3 /* CONTEXT */;
                  return ctx[key];
              }
              else if ( !isInBeforeCreate) {
                  accessCache[key] = 4 /* OTHER */;
              }
          }
          const publicGetter = publicPropertiesMap[key];
          let cssModule, globalProperties;
          // public $xxx properties
          if (publicGetter) {
              if (key === '$attrs') {
                  track(instance, "get" /* GET */, key);
                   markAttrsAccessed();
              }
              return publicGetter(instance);
          }
          else if (
          // css module (injected by vue-loader)
          (cssModule = type.__cssModules) &&
              (cssModule = cssModule[key])) {
              return cssModule;
          }
          else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
              // user may set custom properties to `this` that start with `$`
              accessCache[key] = 3 /* CONTEXT */;
              return ctx[key];
          }
          else if (
          // global properties
          ((globalProperties = appContext.config.globalProperties),
              hasOwn(globalProperties, key))) {
              return globalProperties[key];
          }
          else if (
              currentRenderingInstance &&
              (!isString(key) ||
                  // #1091 avoid internal isRef/isVNode checks on component instance leading
                  // to infinite warning loop
                  key.indexOf('__v') !== 0)) {
              if (data !== EMPTY_OBJ &&
                  (key[0] === '$' || key[0] === '_') &&
                  hasOwn(data, key)) {
                  warn(`Property ${JSON.stringify(key)} must be accessed via $data because it starts with a reserved ` +
                      `character ("$" or "_") and is not proxied on the render context.`);
              }
              else {
                  warn(`Property ${JSON.stringify(key)} was accessed during render ` +
                      `but is not defined on instance.`);
              }
          }
      },
      set({ _: instance }, key, value) {
          const { data, setupState, ctx } = instance;
          if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
              setupState[key] = value;
          }
          else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
              data[key] = value;
          }
          else if (key in instance.props) {
              
                  warn(`Attempting to mutate prop "${key}". Props are readonly.`, instance);
              return false;
          }
          if (key[0] === '$' && key.slice(1) in instance) {
              
                  warn(`Attempting to mutate public property "${key}". ` +
                      `Properties starting with $ are reserved and readonly.`, instance);
              return false;
          }
          else {
              if ( key in instance.appContext.config.globalProperties) {
                  Object.defineProperty(ctx, key, {
                      enumerable: true,
                      configurable: true,
                      value
                  });
              }
              else {
                  ctx[key] = value;
              }
          }
          return true;
      },
      has({ _: { data, setupState, accessCache, ctx, appContext, propsOptions } }, key) {
          let normalizedProps;
          return (accessCache[key] !== undefined ||
              (data !== EMPTY_OBJ && hasOwn(data, key)) ||
              (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) ||
              ((normalizedProps = propsOptions[0]) && hasOwn(normalizedProps, key)) ||
              hasOwn(ctx, key) ||
              hasOwn(publicPropertiesMap, key) ||
              hasOwn(appContext.config.globalProperties, key));
      }
  };
  {
      PublicInstanceProxyHandlers.ownKeys = (target) => {
          warn(`Avoid app logic that relies on enumerating keys on a component instance. ` +
              `The keys will be empty in production mode to avoid performance overhead.`);
          return Reflect.ownKeys(target);
      };
  }
  const RuntimeCompiledPublicInstanceProxyHandlers = extend({}, PublicInstanceProxyHandlers, {
      get(target, key) {
          // fast path for unscopables when using `with` block
          if (key === Symbol.unscopables) {
              return;
          }
          return PublicInstanceProxyHandlers.get(target, key, target);
      },
      has(_, key) {
          const has = key[0] !== '_' && !isGloballyWhitelisted(key);
          if ( !has && PublicInstanceProxyHandlers.has(_, key)) {
              warn(`Property ${JSON.stringify(key)} should not start with _ which is a reserved prefix for Vue internals.`);
          }
          return has;
      }
  });
  // In dev mode, the proxy target exposes the same properties as seen on `this`
  // for easier console inspection. In prod mode it will be an empty object so
  // these properties definitions can be skipped.
  function createRenderContext(instance) {
      const target = {};
      // expose internal instance for proxy handlers
      Object.defineProperty(target, `_`, {
          configurable: true,
          enumerable: false,
          get: () => instance
      });
      // expose public properties
      Object.keys(publicPropertiesMap).forEach(key => {
          Object.defineProperty(target, key, {
              configurable: true,
              enumerable: false,
              get: () => publicPropertiesMap[key](instance),
              // intercepted by the proxy so no need for implementation,
              // but needed to prevent set errors
              set: NOOP
          });
      });
      // expose global properties
      const { globalProperties } = instance.appContext.config;
      Object.keys(globalProperties).forEach(key => {
          Object.defineProperty(target, key, {
              configurable: true,
              enumerable: false,
              get: () => globalProperties[key],
              set: NOOP
          });
      });
      return target;
  }

  const emptyAppContext = createAppContext();
  let uid$2 = 0;
  function createComponentInstance(vnode, parent, suspense) {
      const type = vnode.type;
      // inherit parent app context - or - if root, adopt from root vnode
      const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext;
      const instance = {
          uid: uid$2++,
          vnode,
          type,
          parent,
          appContext,
          root: null,
          next: null,
          subTree: null,
          update: null,
          render: null,
          proxy: null,
          exposed: null,
          withProxy: null,
          effects: null,
          provides: parent ? parent.provides : Object.create(appContext.provides),
          accessCache: null,
          renderCache: [],
          // local resovled assets
          components: null,
          directives: null,
          // resolved props and emits options
          propsOptions: normalizePropsOptions(type, appContext),
          emitsOptions: normalizeEmitsOptions(type, appContext),
          // emit
          emit: null,
          emitted: null,
          // state
          ctx: EMPTY_OBJ,
          data: EMPTY_OBJ,
          props: EMPTY_OBJ,
          attrs: EMPTY_OBJ,
          slots: EMPTY_OBJ,
          refs: EMPTY_OBJ,
          setupState: EMPTY_OBJ,
          setupContext: null,
          // suspense related
          suspense,
          suspenseId: suspense ? suspense.pendingId : 0,
          asyncDep: null,
          asyncResolved: false,
          // lifecycle hooks
          // not using enums here because it results in computed properties
          isMounted: false,
          isUnmounted: false,
          isDeactivated: false,
          bc: null,
          c: null,
          bm: null,
          m: null,
          bu: null,
          u: null,
          um: null,
          bum: null,
          da: null,
          a: null,
          rtg: null,
          rtc: null,
          ec: null
      };
      {
          instance.ctx = createRenderContext(instance);
      }
      instance.root = parent ? parent.root : instance;
      instance.emit = emit.bind(null, instance);
      return instance;
  }
  let currentInstance = null;
  const getCurrentInstance = () => currentInstance || currentRenderingInstance;
  const setCurrentInstance = (instance) => {
      currentInstance = instance;
  };
  const isBuiltInTag = /*#__PURE__*/ makeMap('slot,component');
  function validateComponentName(name, config) {
      const appIsNativeTag = config.isNativeTag || NO;
      if (isBuiltInTag(name) || appIsNativeTag(name)) {
          warn('Do not use built-in or reserved HTML elements as component id: ' + name);
      }
  }
  let isInSSRComponentSetup = false;
  function setupComponent(instance, isSSR = false) {
      isInSSRComponentSetup = isSSR;
      const { props, children, shapeFlag } = instance.vnode;
      const isStateful = shapeFlag & 4 /* STATEFUL_COMPONENT */;
      // init props & slots
      initProps(instance, props, isStateful, isSSR);
      initSlots(instance, children);
      console.log('component stateful ? ' + isStateful);
      const setupResult = isStateful
          ? setupStatefulComponent(instance, isSSR)
          : undefined;
      isInSSRComponentSetup = false;
      return setupResult;
  }
  function setupStatefulComponent(instance, isSSR) {
      const Component = instance.type;
      // 0. create render proxy property access cache
      instance.accessCache = Object.create(null);
      // 1. create public instance / render proxy
      // also mark it raw so it's never observed
      instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers);
      console.log('call setup');
      // 2. call setup()
      const { setup } = Component;
      if (setup) {
          const setupContext = (instance.setupContext =
              setup.length > 1 ? createSetupContext(instance) : null);
          currentInstance = instance;
          pauseTracking();
          const setupResult = callWithErrorHandling(setup, instance, 0 /* SETUP_FUNCTION */, [ shallowReadonly(instance.props) , setupContext]);
          resetTracking();
          currentInstance = null;
          if (isPromise(setupResult)) {
              if (isSSR) {
                  // return the promise so server-renderer can wait on it
                  return setupResult.then((resolvedResult) => {
                      handleSetupResult(instance, resolvedResult);
                  });
              }
              else {
                  // async setup returned Promise.
                  // bail here and wait for re-entry.
                  instance.asyncDep = setupResult;
              }
          }
          else {
              handleSetupResult(instance, setupResult);
          }
      }
      else {
          console.log('no setup');
          finishComponentSetup(instance);
      }
  }
  function handleSetupResult(instance, setupResult, isSSR) {
      // 1. 如果是函数当做render函数处理
      // 2. 如果是对象
      if (isFunction(setupResult)) {
          // 返回内联 render 函数
          {
              instance.render = setupResult;
          }
      }
      else if (isObject(setupResult)) {
          // 返回 bindings，这些变量可以直接在模板中使用
          instance.setupState = proxyRefs(setupResult);
      }
      else ;
      finishComponentSetup(instance);
  }
  let compile;
  /**
   * For runtime-dom to register the compiler.
   * Note the exported method uses any to avoid d.ts relying on the compiler types.
   */
  function registerRuntimeCompiler(_compile) {
      compile = _compile;
  }
  function finishComponentSetup(instance, isSSR) {
      const Component = instance.type;
      // template / render function normalization
      if (!instance.render) {
          // 没有 render 函数？
          if (compile && Component.template && !Component.render) {
              // 有 template 无 render ? 将模板编译成 render 函数
              Component.render = compile(Component.template, {
                  isCustomElement: instance.appContext.config.isCustomElement,
                  delimiters: Component.delimiters
              });
          }
          instance.render = (Component.render || NOOP);
          if (instance.render._rc) {
              instance.withProxy = new Proxy(instance.ctx, RuntimeCompiledPublicInstanceProxyHandlers);
          }
      }
      // support for 2.x options
      {
          currentInstance = instance;
          pauseTracking();
          applyOptions(instance, Component);
          resetTracking();
          currentInstance = null;
      }
      if ( !Component.render && instance.render === NOOP) {
          if (!compile && Component.template) ;
      }
  }
  const attrHandlers = {
      get: (target, key) => {
          {
              markAttrsAccessed();
          }
          return target[key];
      },
      set: () => {
          warn(`setupContext.attrs is readonly.`);
          return false;
      },
      deleteProperty: () => {
          warn(`setupContext.attrs is readonly.`);
          return false;
      }
  };
  function createSetupContext(instance) {
      const expose = exposed => {
          if ( instance.exposed) {
              warn(`expose() should be called only once per setup().`);
          }
          // ref 类型值，通过代理实现对 value 的 get/set
          instance.exposed = proxyRefs(exposed);
      };
      {
          // We use getters in dev in case libs like test-utils overwrite instance
          // properties (overwrites should not be done in prod)
          // 防止覆盖属性
          return Object.freeze({
              get props() {
                  return instance.props;
              },
              get attrs() {
                  return new Proxy(instance.attrs, attrHandlers);
              },
              get slots() {
                  return shallowReadonly(instance.slots);
              },
              get emit() {
                  return (event, ...args) => instance.emit(event, ...args);
              },
              expose
          });
      }
  }
  // record effects created during a component's setup() so that they can be
  // stopped when the component unmounts
  // 记录在组件 setup() 期间绑定了哪些 effects，方便当组件卸载的时候去停掉他们
  function recordInstanceBoundEffect(effect, instance = currentInstance) {
      if (instance) {
          (instance.effects || (instance.effects = [])).push(effect);
      }
  }
  const classifyRE = /(?:^|[-_])(\w)/g;
  const classify = (str) => str.replace(classifyRE, c => c.toUpperCase()).replace(/[-_]/g, '');
  function getComponentName(Component) {
      return isFunction(Component)
          ? Component.displayName || Component.name
          : Component.name;
  }
  /* istanbul ignore next */
  function formatComponentName(instance, Component, isRoot = false) {
      let name = getComponentName(Component);
      if (!name && Component.__file) {
          const match = Component.__file.match(/([^/\\]+)\.\w+$/);
          if (match) {
              name = match[1];
          }
      }
      if (!name && instance && instance.parent) {
          // try to infer the name based on reverse resolution
          const inferFromRegistry = (registry) => {
              for (const key in registry) {
                  if (registry[key] === Component) {
                      return key;
                  }
              }
          };
          name =
              inferFromRegistry(instance.components ||
                  instance.parent.type.components) || inferFromRegistry(instance.appContext.components);
      }
      return name ? classify(name) : isRoot ? `App` : `Anonymous`;
  }
  function isClassComponent(value) {
      return isFunction(value) && '__vccOpts' in value;
  }

  function computed$1(getterOrOptions) {
      const c = computed(getterOrOptions);
      recordInstanceBoundEffect(c.effect);
      return c;
  }

  // implementation
  function defineProps() {
      {
          warn(`defineProps() is a compiler-hint helper that is only usable inside ` +
              `<script setup> of a single file component. Its arguments should be ` +
              `compiled away and passing it at runtime has no effect.`);
      }
      return null;
  }
  // implementation
  function defineEmit() {
      {
          warn(`defineEmit() is a compiler-hint helper that is only usable inside ` +
              `<script setup> of a single file component. Its arguments should be ` +
              `compiled away and passing it at runtime has no effect.`);
      }
      return null;
  }
  function useContext() {
      const i = getCurrentInstance();
      if ( !i) {
          warn(`useContext() called without active instance.`);
      }
      return i.setupContext || (i.setupContext = createSetupContext(i));
  }

  // Actual implementation
  function h(type, propsOrChildren, children) {
      const l = arguments.length;
      if (l === 2) {
          if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
              // 没有 props 的 单节点(single vnode)
              if (isVNode(propsOrChildren)) {
                  return createVNode(type, null, [propsOrChildren]);
              }
              // 有 props 没有 children
              return createVNode(type, propsOrChildren);
          }
          else {
              // omit props
              return createVNode(type, null, propsOrChildren);
          }
      }
      else {
          // 从第三个参数开始全当做孩子节点处理
          if (l > 3) {
              children = Array.prototype.slice.call(arguments, 2);
          }
          else if (l === 3 && isVNode(children)) {
              children = [children];
          }
          return createVNode(type, propsOrChildren, children);
      }
  }

  const ssrContextKey = Symbol( `ssrContext` );
  const useSSRContext = () => {
      {
          warn(`useSsrContext() is not supported in the global build.`);
      }
  };

  function initCustomFormatter() {
      /* eslint-disable no-restricted-globals */
      if ( typeof window === 'undefined') {
          return;
      }
      const vueStyle = { style: 'color:#3ba776' };
      const numberStyle = { style: 'color:#0b1bc9' };
      const stringStyle = { style: 'color:#b62e24' };
      const keywordStyle = { style: 'color:#9d288c' };
      // custom formatter for Chrome
      // https://www.mattzeunert.com/2016/02/19/custom-chrome-devtools-object-formatters.html
      const formatter = {
          header(obj) {
              // TODO also format ComponentPublicInstance & ctx.slots/attrs in setup
              if (!isObject(obj)) {
                  return null;
              }
              if (obj.__isVue) {
                  return ['div', vueStyle, `VueInstance`];
              }
              else if (isRef(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, genRefFlag(obj)],
                      '<',
                      formatValue(obj.value),
                      `>`
                  ];
              }
              else if (isReactive(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, 'Reactive'],
                      '<',
                      formatValue(obj),
                      `>${isReadonly(obj) ? ` (readonly)` : ``}`
                  ];
              }
              else if (isReadonly(obj)) {
                  return [
                      'div',
                      {},
                      ['span', vueStyle, 'Readonly'],
                      '<',
                      formatValue(obj),
                      '>'
                  ];
              }
              return null;
          },
          hasBody(obj) {
              return obj && obj.__isVue;
          },
          body(obj) {
              if (obj && obj.__isVue) {
                  return [
                      'div',
                      {},
                      ...formatInstance(obj.$)
                  ];
              }
          }
      };
      function formatInstance(instance) {
          const blocks = [];
          if (instance.type.props && instance.props) {
              blocks.push(createInstanceBlock('props', toRaw(instance.props)));
          }
          if (instance.setupState !== EMPTY_OBJ) {
              blocks.push(createInstanceBlock('setup', instance.setupState));
          }
          if (instance.data !== EMPTY_OBJ) {
              blocks.push(createInstanceBlock('data', toRaw(instance.data)));
          }
          const computed = extractKeys(instance, 'computed');
          if (computed) {
              blocks.push(createInstanceBlock('computed', computed));
          }
          const injected = extractKeys(instance, 'inject');
          if (injected) {
              blocks.push(createInstanceBlock('injected', injected));
          }
          blocks.push([
              'div',
              {},
              [
                  'span',
                  {
                      style: keywordStyle.style + ';opacity:0.66'
                  },
                  '$ (internal): '
              ],
              ['object', { object: instance }]
          ]);
          return blocks;
      }
      function createInstanceBlock(type, target) {
          target = extend({}, target);
          if (!Object.keys(target).length) {
              return ['span', {}];
          }
          return [
              'div',
              { style: 'line-height:1.25em;margin-bottom:0.6em' },
              [
                  'div',
                  {
                      style: 'color:#476582'
                  },
                  type
              ],
              [
                  'div',
                  {
                      style: 'padding-left:1.25em'
                  },
                  ...Object.keys(target).map(key => {
                      return [
                          'div',
                          {},
                          ['span', keywordStyle, key + ': '],
                          formatValue(target[key], false)
                      ];
                  })
              ]
          ];
      }
      function formatValue(v, asRaw = true) {
          if (typeof v === 'number') {
              return ['span', numberStyle, v];
          }
          else if (typeof v === 'string') {
              return ['span', stringStyle, JSON.stringify(v)];
          }
          else if (typeof v === 'boolean') {
              return ['span', keywordStyle, v];
          }
          else if (isObject(v)) {
              return ['object', { object: asRaw ? toRaw(v) : v }];
          }
          else {
              return ['span', stringStyle, String(v)];
          }
      }
      function extractKeys(instance, type) {
          const Comp = instance.type;
          if (isFunction(Comp)) {
              return;
          }
          const extracted = {};
          for (const key in instance.ctx) {
              if (isKeyOfType(Comp, key, type)) {
                  extracted[key] = instance.ctx[key];
              }
          }
          return extracted;
      }
      function isKeyOfType(Comp, key, type) {
          const opts = Comp[type];
          if ((isArray(opts) && opts.includes(key)) ||
              (isObject(opts) && key in opts)) {
              return true;
          }
          if (Comp.extends && isKeyOfType(Comp.extends, key, type)) {
              return true;
          }
          if (Comp.mixins && Comp.mixins.some(m => isKeyOfType(m, key, type))) {
              return true;
          }
      }
      function genRefFlag(v) {
          if (v._shallow) {
              return `ShallowRef`;
          }
          if (v.effect) {
              return `ComputedRef`;
          }
          return `Ref`;
      }
      if (window.devtoolsFormatters) {
          window.devtoolsFormatters.push(formatter);
      }
      else {
          window.devtoolsFormatters = [formatter];
      }
  }

  /**
   * Actual implementation
   */
  function renderList(source, renderItem) {
      let ret;
      if (isArray(source) || isString(source)) {
          ret = new Array(source.length);
          for (let i = 0, l = source.length; i < l; i++) {
              ret[i] = renderItem(source[i], i);
          }
      }
      else if (typeof source === 'number') {
          if ( !Number.isInteger(source)) {
              warn(`The v-for range expect an integer value but got ${source}.`);
              return [];
          }
          ret = new Array(source);
          for (let i = 0; i < source; i++) {
              ret[i] = renderItem(i + 1, i);
          }
      }
      else if (isObject(source)) {
          if (source[Symbol.iterator]) {
              ret = Array.from(source, renderItem);
          }
          else {
              const keys = Object.keys(source);
              ret = new Array(keys.length);
              for (let i = 0, l = keys.length; i < l; i++) {
                  const key = keys[i];
                  ret[i] = renderItem(source[key], key, i);
              }
          }
      }
      else {
          ret = [];
      }
      return ret;
  }

  /**
   * For prefixing keys in v-on="obj" with "on"
   * @private
   */
  function toHandlers(obj) {
      const ret = {};
      if ( !isObject(obj)) {
          warn(`v-on with no argument expects an object value.`);
          return ret;
      }
      for (const key in obj) {
          ret[toHandlerKey(key)] = obj[key];
      }
      return ret;
  }

  /**
   * Compiler runtime helper for creating dynamic slots object
   * @private
   */
  function createSlots(slots, dynamicSlots) {
      for (let i = 0; i < dynamicSlots.length; i++) {
          const slot = dynamicSlots[i];
          // 数组动态插槽由  <template v-for="..." #[...]> 生成
          // 经过编译后的 slots: [{ name:'default', fn: ... }]
          if (isArray(slot)) {
              for (let j = 0; j < slot.length; j++) {
                  slots[slot[j].name] = slot[j].fn;
              }
          }
          else if (slot) {
              // 条件语句生成的 slot 如 <template v-if="..." #foo>
              slots[slot.name] = slot.fn;
          }
      }
      return slots;
  }

  // Core API ------------------------------------------------------------------
  const version = "3.0.4";
  /**
   * SSR utils for \@vue/server-renderer. Only exposed in cjs builds.
   * @internal
   */
  const ssrUtils = ( null);

  let nodeId = 0;
  let recordedNodeOps = [];
  function logNodeOp(op) {
      recordedNodeOps.push(op);
  }
  function resetOps() {
      recordedNodeOps = [];
  }
  function dumpOps() {
      const ops = recordedNodeOps.slice();
      resetOps();
      return ops;
  }
  function createElement(tag) {
      const node = {
          id: nodeId++,
          type: "element" /* ELEMENT */,
          tag,
          children: [],
          props: {},
          parentNode: null,
          eventListeners: null
      };
      logNodeOp({
          type: "create" /* CREATE */,
          nodeType: "element" /* ELEMENT */,
          targetNode: node,
          tag
      });
      // avoid test nodes from being observed
      markRaw(node);
      return node;
  }
  function createText(text) {
      const node = {
          id: nodeId++,
          type: "text" /* TEXT */,
          text,
          parentNode: null
      };
      logNodeOp({
          type: "create" /* CREATE */,
          nodeType: "text" /* TEXT */,
          targetNode: node,
          text
      });
      // avoid test nodes from being observed
      markRaw(node);
      return node;
  }
  function createComment(text) {
      const node = {
          id: nodeId++,
          type: "comment" /* COMMENT */,
          text,
          parentNode: null
      };
      logNodeOp({
          type: "create" /* CREATE */,
          nodeType: "comment" /* COMMENT */,
          targetNode: node,
          text
      });
      // avoid test nodes from being observed
      markRaw(node);
      return node;
  }
  function setText(node, text) {
      logNodeOp({
          type: "setText" /* SET_TEXT */,
          targetNode: node,
          text
      });
      node.text = text;
  }
  function insert(child, parent, ref) {
      let refIndex;
      if (ref) {
          refIndex = parent.children.indexOf(ref);
          if (refIndex === -1) {
              console.error('ref: ', ref);
              console.error('parent: ', parent);
              throw new Error('ref is not a child of parent');
          }
      }
      logNodeOp({
          type: "insert" /* INSERT */,
          targetNode: child,
          parentNode: parent,
          refNode: ref
      });
      // remove the node first, but don't log it as a REMOVE op
      remove$1(child, false);
      // re-calculate the ref index because the child's removal may have affected it
      refIndex = ref ? parent.children.indexOf(ref) : -1;
      if (refIndex === -1) {
          parent.children.push(child);
          child.parentNode = parent;
      }
      else {
          parent.children.splice(refIndex, 0, child);
          child.parentNode = parent;
      }
  }
  function remove$1(child, logOp = true) {
      const parent = child.parentNode;
      if (parent) {
          if (logOp) {
              logNodeOp({
                  type: "remove" /* REMOVE */,
                  targetNode: child,
                  parentNode: parent
              });
          }
          const i = parent.children.indexOf(child);
          if (i > -1) {
              parent.children.splice(i, 1);
          }
          else {
              console.error('target: ', child);
              console.error('parent: ', parent);
              throw Error('target is not a childNode of parent');
          }
          child.parentNode = null;
      }
  }
  function setElementText(el, text) {
      logNodeOp({
          type: "setElementText" /* SET_ELEMENT_TEXT */,
          targetNode: el,
          text
      });
      el.children.forEach(c => {
          c.parentNode = null;
      });
      if (!text) {
          el.children = [];
      }
      else {
          el.children = [
              {
                  id: nodeId++,
                  type: "text" /* TEXT */,
                  text,
                  parentNode: el
              }
          ];
      }
  }
  function parentNode(node) {
      return node.parentNode;
  }
  function nextSibling(node) {
      const parent = node.parentNode;
      if (!parent) {
          return null;
      }
      const i = parent.children.indexOf(node);
      return parent.children[i + 1] || null;
  }
  function querySelector() {
      throw new Error('querySelector not supported in test renderer.');
  }
  function setScopeId(el, id) {
      el.props[id] = '';
  }
  const nodeOps = {
      insert,
      remove: remove$1,
      createElement,
      createText,
      createComment,
      setText,
      setElementText,
      parentNode,
      nextSibling,
      querySelector,
      setScopeId
  };

  function patchProp(el, key, prevValue, nextValue) {
      logNodeOp({
          type: "patch" /* PATCH */,
          targetNode: el,
          propKey: key,
          propPrevValue: prevValue,
          propNextValue: nextValue
      });
      el.props[key] = nextValue;
      if (isOn(key)) {
          const event = key.slice(2).toLowerCase();
          (el.eventListeners || (el.eventListeners = {}))[event] = nextValue;
      }
  }

  function serialize(node, indent = 0, depth = 0) {
      if (node.type === "element" /* ELEMENT */) {
          return serializeElement(node, indent, depth);
      }
      else {
          return serializeText(node, indent, depth);
      }
  }
  function serializeInner(node, indent = 0, depth = 0) {
      const newLine = indent ? `\n` : ``;
      return node.children.length
          ? newLine +
              node.children.map(c => serialize(c, indent, depth + 1)).join(newLine) +
              newLine
          : ``;
  }
  function serializeElement(node, indent, depth) {
      const props = Object.keys(node.props)
          .map(key => {
          const value = node.props[key];
          return isOn(key) || value == null
              ? ``
              : value === ``
                  ? key
                  : `${key}=${JSON.stringify(value)}`;
      })
          .filter(Boolean)
          .join(' ');
      const padding = indent ? ` `.repeat(indent).repeat(depth) : ``;
      return (`${padding}<${node.tag}${props ? ` ${props}` : ``}>` +
          `${serializeInner(node, indent, depth)}` +
          `${padding}</${node.tag}>`);
  }
  function serializeText(node, indent, depth) {
      const padding = indent ? ` `.repeat(indent).repeat(depth) : ``;
      return (padding +
          (node.type === "comment" /* COMMENT */ ? `<!--${node.text}-->` : node.text));
  }

  function triggerEvent(el, event, payload = []) {
      const { eventListeners } = el;
      if (eventListeners) {
          const listener = eventListeners[event];
          if (listener) {
              if (isArray(listener)) {
                  for (let i = 0; i < listener.length; i++) {
                      listener[i](...payload);
                  }
              }
              else {
                  listener(...payload);
              }
          }
      }
  }

  const { render: baseRender, createApp: baseCreateApp } = createRenderer(extend({ patchProp }, nodeOps));
  const render = baseRender;
  const createApp = baseCreateApp;
  // convenience for one-off render validations
  function renderToString(vnode) {
      const root = nodeOps.createElement('div');
      render(vnode, root);
      return serializeInner(root);
  }

  exports.BaseTransition = BaseTransition;
  exports.Comment = Comment;
  exports.Fragment = Fragment;
  exports.KeepAlive = KeepAlive;
  exports.Static = Static;
  exports.Suspense = Suspense;
  exports.Teleport = Teleport;
  exports.Text = Text;
  exports.callWithAsyncErrorHandling = callWithAsyncErrorHandling;
  exports.callWithErrorHandling = callWithErrorHandling;
  exports.camelize = camelize;
  exports.capitalize = capitalize;
  exports.cloneVNode = cloneVNode;
  exports.computed = computed$1;
  exports.createApp = createApp;
  exports.createBlock = createBlock;
  exports.createCommentVNode = createCommentVNode;
  exports.createHydrationRenderer = createHydrationRenderer;
  exports.createRenderer = createRenderer;
  exports.createSlots = createSlots;
  exports.createStaticVNode = createStaticVNode;
  exports.createTextVNode = createTextVNode;
  exports.createVNode = createVNode;
  exports.customRef = customRef;
  exports.defineAsyncComponent = defineAsyncComponent;
  exports.defineComponent = defineComponent;
  exports.defineEmit = defineEmit;
  exports.defineProps = defineProps;
  exports.dumpOps = dumpOps;
  exports.getCurrentInstance = getCurrentInstance;
  exports.getTransitionRawChildren = getTransitionRawChildren;
  exports.h = h;
  exports.handleError = handleError;
  exports.initCustomFormatter = initCustomFormatter;
  exports.inject = inject;
  exports.isProxy = isProxy;
  exports.isReactive = isReactive;
  exports.isReadonly = isReadonly;
  exports.isRef = isRef;
  exports.isVNode = isVNode;
  exports.logNodeOp = logNodeOp;
  exports.markRaw = markRaw;
  exports.mergeProps = mergeProps;
  exports.nextTick = nextTick;
  exports.nodeOps = nodeOps;
  exports.onActivated = onActivated;
  exports.onBeforeMount = onBeforeMount;
  exports.onBeforeUnmount = onBeforeUnmount;
  exports.onBeforeUpdate = onBeforeUpdate;
  exports.onDeactivated = onDeactivated;
  exports.onErrorCaptured = onErrorCaptured;
  exports.onMounted = onMounted;
  exports.onRenderTracked = onRenderTracked;
  exports.onRenderTriggered = onRenderTriggered;
  exports.onUnmounted = onUnmounted;
  exports.onUpdated = onUpdated;
  exports.openBlock = openBlock;
  exports.popScopeId = popScopeId;
  exports.provide = provide;
  exports.proxyRefs = proxyRefs;
  exports.pushScopeId = pushScopeId;
  exports.queuePostFlushCb = queuePostFlushCb;
  exports.reactive = reactive;
  exports.readonly = readonly;
  exports.ref = ref;
  exports.registerRuntimeCompiler = registerRuntimeCompiler;
  exports.render = render;
  exports.renderList = renderList;
  exports.renderSlot = renderSlot;
  exports.renderToString = renderToString;
  exports.resetOps = resetOps;
  exports.resolveComponent = resolveComponent;
  exports.resolveDirective = resolveDirective;
  exports.resolveDynamicComponent = resolveDynamicComponent;
  exports.resolveTransitionHooks = resolveTransitionHooks;
  exports.serialize = serialize;
  exports.serializeInner = serializeInner;
  exports.setBlockTracking = setBlockTracking;
  exports.setDevtoolsHook = setDevtoolsHook;
  exports.setTransitionHooks = setTransitionHooks;
  exports.shallowReactive = shallowReactive;
  exports.shallowReadonly = shallowReadonly;
  exports.shallowRef = shallowRef;
  exports.ssrContextKey = ssrContextKey;
  exports.ssrUtils = ssrUtils;
  exports.toDisplayString = toDisplayString;
  exports.toHandlerKey = toHandlerKey;
  exports.toHandlers = toHandlers;
  exports.toRaw = toRaw;
  exports.toRef = toRef;
  exports.toRefs = toRefs;
  exports.transformVNodeArgs = transformVNodeArgs;
  exports.triggerEvent = triggerEvent;
  exports.triggerRef = triggerRef;
  exports.unref = unref;
  exports.useContext = useContext;
  exports.useSSRContext = useSSRContext;
  exports.useTransitionState = useTransitionState;
  exports.version = version;
  exports.warn = warn;
  exports.watch = watch;
  exports.watchEffect = watchEffect;
  exports.withCtx = withCtx;
  exports.withDirectives = withDirectives;
  exports.withScopeId = withScopeId;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));

try {
  if (module) {
    module.exports = VueRuntimeTest;
  }
} catch (e) {}
 
