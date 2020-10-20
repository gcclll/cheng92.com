function _debounce(fn, time) {
  var timer = null;
  return function () {
    clearTimeout(timer);
    timer = setTimeout(function () {
      fn.apply(this, arguments);
    }, time);
  };
}

function _throttle(fn, duration) {
  var last = 0;
  return function () {
    var current = Date.now();
    if (current - last <= duration) return;
    fn.apply(this, arguments);
    last = current;
  };
}

var dcount = 0,
  tcount = 0,
  max = 80;
var dfn = _debounce(function () {
  $("#ArkXnY ._debounce").append("<span></span>");
  if (dcount++ > max) clearDebounce();
}, 500);
var tfn = _throttle(function () {
  $("#ArkXnY ._throttle").append("<span></span>");
  if (tcount++ > max) clearThrottle();
}, 500);
$("#ArkXnY ._left").mousemove(function (e) {
  dfn();
  tfn();
});
function clearDebounce() {
  $("#ArkXnY ._debounce").html("");
  dcount = 0;
}
function clearThrottle() {
  $("#ArkXnY ._throttle").html("");
  tcount = 0;
}
