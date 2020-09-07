$(function () {
  $("span.todo").each(function () {
    var node = $(this);
    if (node.text() === "DONE") {
      node.addClass("done");
    }
  });

  $("ol>li>p").each(function () {
    var node = $(this);
    var html = node.html();
    if (/^TODO/.test(html)) {
      node.html(html.replace(/^TODO/, `<span class="todo">TODO</span>`));
    } else if (/^DONE/.test(html)) {
      node.html(html.replace(/^DONE/, `<span class="done">DONE</span>`));
    }
  });
});
