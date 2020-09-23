(function anonymous() {
  const _Vue = Vue;
  const {
    createVNode: _createVNode,
    createCommentVNode: _createCommentVNode,
    createTextVNode: _createTextVNode,
  } = _Vue;

  const _hoisted_1 = { key: 0 };

  return function render(_ctx, _cache) {
    with (_ctx) {
      const {
        toDisplayString: _toDisplayString,
        createVNode: _createVNode,
        openBlock: _openBlock,
        createBlock: _createBlock,
        createCommentVNode: _createCommentVNode,
        createTextVNode: _createTextVNode,
      } = _Vue;

      return (
        _openBlock(),
        _createBlock(
          "div",
          {
            id: "foo",
            class: bar.baz,
          },
          [
            _createTextVNode(_toDisplayString(world.burn()), 1 /* TEXT */),
            ok
              ? (_openBlock(), _createBlock("div", _hoisted_1, "yes"))
              : _createCommentVNode("v-if", true),
          ],
          2 /* CLASS */
        )
      );
    }
  };
});
