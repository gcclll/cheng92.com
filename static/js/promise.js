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

  publish(promise);
}

function fulfill(promise, result) {
  if (promise._state !== PENDING) {
    // 状态已经完成不能再改变状态
    return;
  }

  promise._state = FULFILL;
  promise._result = result;

  if (promise._subs.length > 0) {
    publish(promise);
  }
}

function publish(promise) {
  var subs = promise._subs;

  var child,
    callback,
    result = promise._result;
  console.log(promise._subs);
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

  if (settled !== PENDING) {
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

try {
  // org src block 环境使用
  if (module) {
    module.exports = { MyPromise, Util };
  }
} catch (e) {
  console.log("no module env.");
}
