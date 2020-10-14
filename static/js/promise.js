var PID = Math.random().toString(36).substring(2);
var PENDING = 0;
var FULFILL = 1;
var REJECT = 2;
var i = 0;
function Promise(resolver) {
  this[PID] = i++;
  this._state = PENDING;
  this._result = undefined;
  this._subs = [];
}
