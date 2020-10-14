var PID = Math.random().toString(36).substring(2);
var PENDING = 0;
var FULFILL = 1;
var REJECT = 2;
var i = 0;
var proto = MyPromise.prototype;

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
  Util.log(reason, "reject");
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
    result = promise.result;
  for (var i = 0; i < subs.length; i += 3) {
    child = subs[i];
    callback = subs[i + promise._state];

    if (child) {
      // TODO 异步任务
    } else {
      callback(result);
    }
  }

  subs.length = 0;
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
    // invokeCallback(_state, child, callback, parent._result);
  } else {
    // 订阅所有回调
    subscribe(parent, child, onFulfillment, onRejection);
  }

  return child;
}

function subscribe(parent, child, onFulfillment, onRejection) {
  var len = parent._subs.length;
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

try {
  // org src block 环境使用
  if (module) {
    module.exports = { MyPromise, Util };
  }
} catch (e) {
  console.log("no module env.");
}
