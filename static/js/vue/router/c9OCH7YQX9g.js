runAsync(function () {
  var i = ".c9OCH7YQX9g";
  var log = (v) => g_log(i + " .debug", v);

  window.addEventListener("popstate", (event) => {
    log("trigger popstate -> " + JSON.stringify(event.state));
    log("history.state: " + JSON.stringify(history.state));
  });

  const push = (url, n, r = false) => {
    history[r ? "replaceState" : "pushState"]({ page: n }, "", url);
    log("location: " + location.href + ", len: " + history.length);
    log("history.state: " + JSON.stringify(history.state));
  };

  var state = {};
  $(i + " .clear").click(() => {
    push("");
    log(true);
  });
  $(i + " .pushq").click(() => push("?q=1", "q"));
  $(i + " .pushp").click(() => push("?p=2", "p"));
  $(i + " .replace").click(() => push("?r=3", "r", true));
  $(i + " .forward").click(() => {
    history.forward();
    log("forward: " + location.href + ", len: " + history.length);
  });
  $(i + " .go").click(() => {
    var n = Math.floor(Math.random() * 2 * history.length - history.length);
    history.go(n);
    log("go: " + location.href + ", n: " + n);
  });
  $(i + " .back").click(function () {
    log("back: " + location.href + ", len: " + history.length);
    history.back();
  });
});
