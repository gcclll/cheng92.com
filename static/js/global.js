$(function () {
  $("span.todo").each(function () {
    var node = $(this);
    if (node.text().toLowerCase() === "DONE") {
      node.addClass("done");
    }
  });
});
