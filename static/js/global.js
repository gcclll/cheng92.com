$(function () {
  $("span.todo").each(function () {
    var node = $(this);
    if (node.text() === "DONE") {
      node.addClass("done");
    }
  });
});
