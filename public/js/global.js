window._config = {
  fold: 0, // 代码折叠，默认不折叠
};

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

  function onHoverRotate($node) {
    $node.hover(
      function () {
        $(this).addClass("hover-rotate");
      },
      function () {
        $(this).removeClass("hover-rotate");
      }
    );
  }

  var $header = $("#header");

  onHoverRotate($header.find("a.logo"));

  $(".post-content")
    .find("h2, h3, h4")
    .each(function () {
      onHoverRotate($(this));
    });

  // search input
  var $search = $("#search"),
    $searchInput = $search.find(".docsearch-input");

  var inputShowed = false;
  $search.find(">img.icon").on("click", function () {
    if (inputShowed) {
      $searchInput.hide();
    } else {
      $searchInput.show();
    }
    inputShowed = !inputShowed;
  });
});
