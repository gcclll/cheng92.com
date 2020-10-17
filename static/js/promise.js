var PID = Math.random().toString(36).substring(2);
var PENDING = 0;
var FULFILL = 1;
var REJECT = 2;
var i = 0;
var noop = function () {};

let originalThen = then;
function MyPromise(resolver) {
  this[PID] = i++;
  this._state = PENDING;
  this._result = undefined;
  this._subs = [];

  if (!this instanceof Promise) {
    throw new TypeError("只能通过new 构造 Promise 实例。");
  }

  var _this = this;
  try {
    resolver(
      function resolvePromise(value) {
        resolve(_this, value);
      },
      function rejectPromise(reason) {
        reject(_this, reason);
      }
    );
  } catch (e) {
    reject(this, e);
  }
}
function originalResolve(value) {
  const ctor = this;

  // resolve 结果就是一个 Promise 实例
  if (typeof value === "object" && value.constructor === ctor) {
    return value;
  }

  const ins = new ctor(noop);
  resolve(ins, value);

  return ins;
}
function originalReject(reason) {
  const ctor = this;

  if (typeof value === "object" && value.constructor === ctor) {
    return value;
  }

  const ins = new ctor(noop);
  reject(promise, reason);
  return ins;
}
function originalFinally(callback) {
  const promise = this;
  const ctor = promise.constructor;
  // 1. 保证 callback 总是执行，即相当于在最后又挂了个 then，
  //   这样就能保证之前有多少 then 且这些 then 结果是 fulfilled 还是 rejected
  //   这个都会被执行
  // 2. 回调 callback 要被执行且要保证 callback 的执行结果
  //   也能符合 promise then 链规则
  if (typeof callback === "function") {
    return promise.then(
      (value) => ctor.resolve(callback()).then(() => value),
      (reason) =>
        ctor.resolve(callback()).then(() => {
          throw reason;
        })
    );
  }

  return promise.then(callback, callback);
}

MyPromise.prototype.then = then;
MyPromise.prototype.finally = originalFinally;
MyPromise.prototype.catch = function (onRejection) {
  // 因为如果有异常，异常会随着链式调用链中一直往后流，知道被处理掉
  // 所以这里只要挂一个 then 去接受错误并处理就可以了
  return this.then(null, onRejection);
};
MyPromise.resolve = originalResolve;
MyPromise.reject = originalReject;
MyPromise.race = function (entries) {
  const ctor = this;

  if (!Array.isArray(entries)) {
    return new ctor((_, reject) =>
      reject(new TypeError("race 参数必须是一个数组"))
    );
  } else {
    return new ctor((resolve, reject) => {
      // 遍历所有任务
      const len = entries.length;
      for (let i = 0; i < len; i++) {
        // 直接调用 resolve 去执行任务，然后挂一个 then
        // 因为 resolve 和 reject 只会被执行一次，所以一旦只要有个 entry
        // 结束了就会执行后面的 then 去调用 resolve 或 reject，
        // 后面的就算执行到了也 settled 了，也不会重复执行 resolve 和 reject
        ctor.resolve(entries[i]).then(resolve, reject);
      }
    });
  }
};

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, Util.error.returnSelfPromise());
  } else if (Util.isObjectOrFunction(value)) {
    let then;

    try {
      then = value.then;
    } catch (e) {
      // value 可能是 undefined 或 null，或其他非法类型(如：数字)
      reject(promise, e);
      return;
    }
    handleMaybeThenable(promise, value, then);
  } else {
    fulfill(promise, value);
  }
}

function handleForeignThenable(promise, thenable, then) {
  asap(() =>
    ((promise) => {
      let sealed = false; // 保证只会执行一次
      try {
        then.call(
          thenable,
          (value) => {
            if (sealed) return;
            sealed = true;

            resolve(promise, value);

            // if (value !== thenable) {
            //   resolve(promise, value);
            // } else {
            //   fulfill(promise, value);
            // }
          },
          (reason) => {
            if (sealed) return;
            sealed = true;

            reject(promise, reason);
          }
        );
      } catch (e) {
        sealed = true;
        reject(promise, e);
      }
    })(promise)
  );
}

function handleMaybeThenable(promise, thenable, then) {
  // originalThen 实现的 then 函数，即 MyPromise.prototype.then
  // 这能确保 thenable 的确是我们的 MyPromise 实例
  if (
    thenable.constructor === promise.constructor &&
    // 因为 originalResolve 是直接挂到构造函数上的
    thenable.constructor.resolve === originalResolve &&
    thenable.then === originalThen
  ) {
    // 这里要做的处理是直接针对 thenable 状态做出判断
    if (thenable._state === FULFILL) {
      fulfill(promise, thenable._result);
    } else if (thenable._state === REJECT) {
      reject(promise, thenable._result);
    } else {
      // 直接构造 resolver 和 rejection
      subscribe(
        thenable,
        undefined,
        (val) => resolve(promise, val),
        (reason) => reject(promise, reason)
      );
    }
  } else {
    if (then === undefined) {
      fulfill(promise, thenable);
    } else if (typeof then === "function") {
      handleForeignThenable(promise, thenable, then);
    } else {
      // 普通类型对象
      fulfill(promise, thenable);
    }
  }
}

function reject(promise, reason) {
  if (promise._state !== PENDING) {
    return;
  }

  promise._state = REJECT;
  promise._result = reason;

  asap(function () {
    publish(promise);
  });
}

function fulfill(promise, result) {
  if (promise._state !== PENDING) {
    // 状态已经完成不能再改变状态
    return;
  }

  promise._state = FULFILL;
  promise._result = result;

  if (promise._subs.length > 0) {
    asap(function () {
      publish(promise);
    });
  }
}

function publish(promise) {
  var subs = promise._subs;

  var child,
    callback,
    result = promise._result;
  for (var i = 0; i < subs.length; i += 3) {
    child = subs[i];
    callback = subs[i + promise._state];

    if (child) {
      // 异步任务通过 child promise 来衔接下一个 thenable
      invokeCallback(promise._state, child, callback, result);
    } else {
      callback(result);
    }
  }

  subs.length = 0;
}

function invokeCallback(settled, promise, callback, detail) {
  var value; // 记录 callback 执行的结果
  var hasCallback = typeof callback === "function";
  var succeeded = true; // callback 可能执行失败
  var error;

  if (hasCallback) {
    // 开始执行 callback, 即 then(resolve, reject) 的 Resolve/Reject
    try {
      // 将上一个 promise 结果作为参数传递到 then 回调
      value = callback(detail);
    } catch (e) {
      // 回调执行失败，有错误或者异常
      error = e;
      succeeded = false;
    }

    if (promise === value) {
      reject(promise, Util.error.returnSelfPromise());
      return;
    }
  } else {
    // 没有回调的时候 then() ???
    value = detail;
  }

  // 这里要检测下一个新 new 的 promise 状态
  // 下面的动作都是为了下一个 then 做准备的，这里的promise
  // 是在上一个 then 里面的new 出来的 promise 衔接下一个 then 用
  if (promise._state !== PENDING) {
    // noop 状态完成了的 promise
  } else if (hasCallback && succeeded) {
    // 执行成功， resolve
    resolve(promise, value);
  } else if (succeeded === false) {
    // then 中的回调执行失败了
    reject(promise, error);
  } else if (settled === FULFILL) {
    fulfill(promise, value);
  } else if (settled === REJECT) {
    reject(promise, value);
  }
}

function then(onFulfillment, onRejection) {
  var parent = this;
  // 创建一个新的 promise，用来衔接后面的 then
  var child = new this.constructor(noop);
  var _state = this._state;
  // 根据状态决定执行哪个回调
  var callback = arguments[_state - 1];

  if (_state) {
    // 状态已经改变，任务已经完成了，直接执行回调
    invokeCallback(_state, child, callback, parent._result);
  } else {
    // 订阅所有回调
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var subs = parent._subs;
  var len = subs.length;
  // PENDING
  subs[len] = child;
  subs[len + FULFILL] = onFulfillment;
  subs[len + REJECT] = onRejection;

  // parent promise 状态如果完成了，立即触发当前 child 的 promise
  // 可能执行到这里的时候任务刚好完成了???
  if (len === 0 && parent._state) {
    asap(function () {
      publish(parent);
    });
  }
}

function Util() {}
Util.delay = function (fn, timeout) {
  setTimeout(fn, timeout);
};
Util.log = function (val, desc) {
  // console.log("\n");
  console.log(val, desc);
};
Util.error = {
  returnSelfPromise: function () {
    return new TypeError("不能返回自身。");
  },
};
Util.isObjectOrFunction = function (val) {
  return typeof val === "object" || typeof val === "function";
};

// 将所有任务添加到一个队列，根据平台决定调用那个异步函数
var queue = new Array(1000);
var qlen = 0;
function asap(callback) {
  queue[qlen] = callback;

  qlen++;

  if (qlen === 1) {
    // 这里是通过第一次入列操作来触发 flush 队列操作
    // 因为 flush 是异步执行，所以在它还没之前之前有可能有新的任务入列
    // 这个时候 qlen > 1 ，直到 flush 执行，通过 qlen 遍 queue 确保在执行的时刻
    // 可以将这之前的所有入列的任务都得到执行
    setTimeout(flush);
  }
}

function flush() {
  for (var i = 0; i < qlen; i++) {
    var callback = queue[i];
    if (callback) callback();

    // 清空已执行的任务
    queue[i] = undefined;
  }

  // 在此刻至 Flush之前入列的任务都得到了执行，重置重新接受新的任务
  qlen = 0;
}

try {
  // org src block 环境使用
  if (module) {
    module.exports = { MyPromise, Util };
  }
} catch (e) {
  console.log("no module env.");
}
