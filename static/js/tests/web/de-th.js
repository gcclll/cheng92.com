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

var dfn = _debounce(function () {
  $("#ArkXnY ._debounce").append("<span></span>");
}, 1000);
var tfn = _throttle(function () {
  $("#ArkXnY ._throttle").append("<span></span>");
}, 100);
$("#ArkXnY ._left").mousemove(function (e) {
  dfn();
  tfn();
});
$("#ArkXnY ._left").mouseout(function () {
  $("#ArkXnY ._debounce").html("");
  $("#ArkXnY ._throttle").html("");
});
