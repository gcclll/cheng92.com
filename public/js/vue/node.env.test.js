/**
 * 基于 node 环境测试的模板和数据
 * @fileOverview
 * @name node.env.test.js
 * @author Zhicheng Lee <gccll.love@gmail.com>
 * @license MIT
 */

var result = [];

// compiler test
result.push({
  head: "compiler testing",
  title: "compiler 较完整示例测试",
  path: "/packages/compiler-core/__nests__/compile.nest.js",
  template: `<div id="foo" :class="bar.baz">
  {{ world.burn() }}
  <div v-if="ok">yes</div>
  <template v-else>no</template>
  <div v-for="(value, index) in list"><span>{{ value + index }}</span></div>
</div>`,
  code: ` const { toDisplayString: _toDisplayString, createVNode: _createVNode, openBlock: _openBlock, createBlock: _createBlock, createCommentVNode: _createCommentVNode, createTextVNode: _createTextVNode, Fragment: _Fragment, renderList: _renderList } = Vue

const _hoisted_1 = { key: 0 }
const _hoisted_2 = /*#__PURE__*/_createTextVNode("no")

return function render(_ctx, _cache) {
  return (_openBlock(), _createBlock("div", {
    id: "foo",
    class: _ctx.bar.baz
  }, [
    _createTextVNode(_toDisplayString(_ctx.world.burn()) + " ", 1 /* TEXT */),
    ok
      ? (_openBlock(), _createBlock("div", _hoisted_1, "yes"))
      : (_openBlock(), _createBlock(_Fragment, { key: 1 }, [
          _hoisted_2
        ], 64 /* STABLE_FRAGMENT */)),
    (_openBlock(true), _createBlock(_Fragment, null, _renderList(_ctx.list, (value, index) => {
      return (_openBlock(), _createBlock("div", null, [
        _createVNode("span", null, _toDisplayString(value + index), 1 /* TEXT */)
      ]))
    )), 256 /* UNKEYED_FRAGMENT */))
  ], 2 /* CLASS */))`,
});

result.push(
  {
    head: "scopedId testing...",
    path: "/packages/compiler-core/__nests__/scopeId.nest.js",
    title: "should wrap default slot",
    template: `<Child><div/></Child>`,
    code: `import { createVNode as _createVNode, openBlock as _openBlock, createBlock as _createBlock, withScopeId as _withScopeId } from "vue"
const _withId = /*#__PURE__*/_withScopeId("test")

export const render = /*#__PURE__*/_withId((_ctx, _cache) => {
  return (_openBlock(), _createBlock("div"))
})`,
  },
  {
    path: "/packages/compiler-core/__nests__/scopeId.nest.js",
    title: "should wrap named slots",
    template: `<Child>
        <template #foo="{ msg }">{{ msg }}</template>
        <template #bar><div/></template>
      </Child>
      `,
    code: `import { toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, openBlock as _openBlock, createBlock as _createBlock, withScopeId as _withScopeId, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"
const _withId = /*#__PURE__*/_withScopeId("test")

_pushScopeId("test")
const _hoisted_1 = /*#__PURE__*/_createVNode("div", null, null, -1 /* HOISTED */)
_popScopeId()

export const render = /*#__PURE__*/_withId((_ctx, _cache) => {
  const _component_Child = _resolveComponent("Child")

  return (_openBlock(), _createBlock(_component_Child, null, {
    foo: _withId(({ msg }) => [
      _createTextVNode(_toDisplayString(msg), 1 /* TEXT */)
    ]),
    bar: _withId(() => [
      _hoisted_1
    ]),
    _: 1 /* STABLE */
  }))
})`,
  },
  {
    path: "/packages/compiler-core/__nests__/scopeId.nest.js",
    title: "should wrap dynamic slots",
    template: `<Child>
        <template #foo v-if="ok"><div/></template>
        <template v-for="i in list" #[i]><div/></template>
      </Child>
      `,
    code: `import { createVNode as _createVNode, resolveComponent as _resolveComponent, withCtx as _withCtx, renderList as _renderList, createSlots as _createSlots, openBlock as _openBlock, createBlock as _createBlock, withScopeId as _withScopeId, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"
const _withId = /*#__PURE__*/_withScopeId("test")

_pushScopeId("test")
const _hoisted_1 = /*#__PURE__*/_createVNode("div", null, null, -1 /* HOISTED */)
const _hoisted_2 = /*#__PURE__*/_createVNode("div", null, null, -1 /* HOISTED */)
_popScopeId()

export const render = /*#__PURE__*/_withId((_ctx, _cache) => {
  const _component_Child = _resolveComponent("Child")

  return (_openBlock(), _createBlock(_component_Child, null, _createSlots({ _: 2 /* DYNAMIC */ }, [
    (_ctx.ok)
      ? {
          name: "foo",
          fn: _withId(() => [
            _hoisted_1
          ])
        }
      : undefined,
    _renderList(_ctx.list, (i) => {
      return {
        name: i,
        fn: _withId(() => [
          _hoisted_2
        ])
      }
    ))
  ]), 1024 /* DYNAMIC_SLOTS */))
})
`,
  },
  {
    path: "/packages/compiler-core/__nests__/scopeId.nest.js",
    title: "should push scopeId for hoisted nodes",
    template: `<div><div>hello</div>{{ foo }}<div>world</div></div>`,
    code: `import { createVNode as _createVNode, toDisplayString as _toDisplayString, createTextVNode as _createTextVNode, openBlock as _openBlock, createBlock as _createBlock, withScopeId as _withScopeId, pushScopeId as _pushScopeId, popScopeId as _popScopeId } from "vue"
const _withId = /*#__PURE__*/_withScopeId("test")

_pushScopeId("test")
const _hoisted_1 = /*#__PURE__*/_createVNode("div", null, "hello", -1 /* HOISTED */)
const _hoisted_2 = /*#__PURE__*/_createVNode("div", null, "world", -1 /* HOISTED */)
_popScopeId()

export const render = /*#__PURE__*/_withId((_ctx, _cache) => {
  return (_openBlock(), _createBlock("div", null, [
    _hoisted_1,
    _createTextVNode(_toDisplayString(_ctx.foo), 1 /* TEXT */),
    _hoisted_2
  ]))
})`,
  }
);

l1(
  `以下均为 node 环境, 非浏览器环境测试结果`,
  "color:white;background:red;font-size:18px;"
);
result.forEach((res) => {
  let { title, template, code, path, head } = res;

  if (Array.isArray(res)) {
    [path, title, template, code, head] = res;
  }

  head && l1(head);
  l2(title);
  log.grey(path);
  log.grey(template);
  log.black(code);
});
