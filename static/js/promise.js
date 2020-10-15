var PID = Math.random().toString(36).substring(2);
var PENDING = 0;
var FULFILL = 1;
var REJECT = 2;
var i = 0;
var proto = MyPromise.prototype;
var noop = function () {};

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
MyPromise.prototype.then = then;

function resolve(promise, value) {
  if (promise === value) {
    reject(promise, Util.error.returnSelfPromise());
  } else if (Util.isObjectOrFunction(value)) {
    // TODO
  } else {
    fulfill(promise, value);
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
    setTimeout(flush());
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
