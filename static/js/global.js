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

  $(".post-content")
    .find("h2, h3, h4")
    .each(function () {
      var $node = $(this);
      $node.hover(
        function () {
          $(this).addClass("hover-rotate");
        },
        function () {
          $(this).removeClass("hover-rotate");
        }
      );
    });
});
