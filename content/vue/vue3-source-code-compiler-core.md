---
title: "Vue3.0 源码系列（二）编译器核心 - Compiler core"
date: 2020-08-28T15:54:23+08:00
tags: ["vue", "vue3", "vuenext", "compiler"]
categories: ["vue"]
---

> 该系列文章，均以测试用例通过为基准一步步实现一个 vue3 源码副本(学习)。

<font color="#fc02ff">**可能感兴趣列表：**</font>

1. [各种流程图(函数/功能/实现/...)无图无真相系列](#flowchart-list) 🛬 🛬 🛬 🛬 🛬
2. [源码相关的疑问/问题列表及其解答](#issues) 🛳 🛳 🛳 🛳 🛳
3. [阶段性的代码备份(比如能pass某个用例)](#stage-codes) 🚘 🚘 🚘 🚘 🚘



# 测试用例分析

原本是想直接根据源码去了解这部分的实现原理的，但是发现纯粹的代码分析有点困难，这部分不像 reactivity 模块那么直观，并且感觉这块比 reactivity 复杂的多，因此先探究如何使用，从如何使用到怎么实现去逐步实现，分析源代码。



compiler-core 模块的测试用例包含以下部分，将依次进行分析：

1. parse.spec.ts
2. compile.spec.ts
3. codegen.spec.ts
4. scopeId.spec.ts
5. transform.spec.ts
6. transforms/
   1. hoistStatic.spec.ts
   2. noopDirectiveTransform.spec.ts
   3. transformElement.spec.ts
   4. transformExpressions.spec.ts
   5. transformSlotOutlet.spec.ts
   6. transformText.spec.ts
   7. vBind.spec.ts
   8. vFor.spec.ts
   9. vIf.spec.ts
   10. vModel.spec.ts
   11. vOn.spec.ts
   12. vOnce.spec.ts
   13. vSlot.spec.ts
7. utils.spec.ts
8. testUtils.ts

## parse.spec.ts

测试用例结构：compiler: parse

### Element 元素标签解析

#### 05-template element with directives

<span id="test-element-05"></span>

这个用例开始模板的解析。

```js
test('template element with directives', () => {
  const ast = baseParse('<template v-if="ok"></template>')
  const element = ast.children[0]
  expect(element).toMatchObject({
    type: NodeTypes.ELEMENT,
    tagType: ElementTypes.TEMPLATE
  })
}
```

`baseParse('<template v-if="ok"></template>')` 解析之后的结构：

```json
{
    "type":0,
    "children":[
        { // <template> 节点
            "type":1,
            "ns":0,
            "tag":"template",
            "tagType":3,
            "props":[
                {
                    "type":7, // DIRECTIVE
                    "name":"if",
                    "exp":{
                        "type":4, // SIMPLE_EXPRESSION
                        "content":"ok",
                        "isStatic":false,
                        "isConstant":false,
                        "loc":{
                            // ... 省略
                        }
                    },
                    "modifiers":[
											 // 修饰符
                    ],
                    "loc":{
                        // 省略
                        "source":"v-if="ok""
                    }
                }
            ],
            // ... 省略
        }
    ],
    // ... 省去
}
```

为了能解析出 `v-if="ok"` 我们需要去实现 [parseAttributes(context, type)](#parse-parseattributes) -> [parseAttribute](#parse-parseattribute) -> [parseAttributeValue](#parse-parseattributevalue)

该用例考察的其实并不是 `<template>` 模板标签解析，而是标签上的属性解析，对普通的 `<div>` 标签依然可以解析出属性 props[]。

#### 04-void element

<span id="test-element-04"></span>

空标签解析，如：`<img>` 

前提是提供了 `isVoidTag()` 选项。

```js
test('void element', () => {
  const ast = baseParse('<img>after', {
    isVoidTag: (tag) => tag === 'img'
  })
  const element = ast.children[0]

  expect(element).toStrictEqual({
    type: NodeTypes.ELEMENT,
    ns: Namespaces.HTML,
    tag: 'img',
    tagType: ElementTypes.ELEMENT,
    codegenNode: undefined,
    props: [],

    isSelfClosing: false,
    children: [],
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 5, line: 1, column: 6 },
      source: '<img>'
    }
  })
}
```

该用例和[自闭标签](#test-element-03)类似都是在 [parseTag](#parse-parsetag) 解析完之后在 [parseElement](#parse-parseelement) 中结束解析，不同点在于调用 [baseParse](#parse-baseparse) 的时候需要传递一个包含 `isVoidTag()` 的选项 `{ isVoidTag: tag => tag === 'img'}` 用来告诉解析器什么样的标签属于空标签，即不是 `<img/>` 也不是 `<div></div>` 类型。

[parseElement](#parse-parseelement) 中解析条件：

```js
parseElement(context, ancestors) {
  // ... parseTag 中解析 <img ...>
  // 自闭合的到这里就可以结束了
  if (element.isSelfClosing || context.options.isVoidTag?.(element.tag)) {
    return element
  }
  // ...
}
```



#### 03-self closing

<span id="test-element-03"></span>

```js
test('self closing', () => {
  const ast = baseParse('<div/>after')
  const element = ast.children[0]

  expect(element).toStrictEqual({
    type: NodeTypes.ELEMENT,
    ns: Namespaces.HTML,
    tag: 'div',
    tagType: ElementTypes.ELEMENT,
    codegenNode: undefined,
    props: [],

    isSelfClosing: true,
    children: [],
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 6, line: 1, column: 7 },
      source: '<div/>'
    }
  })
}
```



#### 02-empty div

<span id="test-element-02"></span>

和 [01-simple div](#test-element-01) 一样，无非就是没有 `children[]` 子节点了。在 [parseElement](#parse-parseelement) -> [parseTag](#parse-parsetag) 解析就结束了。

```js
test('empty div', () => {
  const ast = baseParse('<div></div>')
  const element = ast.children[0]

  expect(element).toStrictEqual({
    type: NodeTypes.ELEMENT,
    ns: Namespaces.HTML,
    tag: 'div',
    tagType: ElementTypes.ELEMENT,
    codegenNode: undefined,
    props: [],
    isSelfClosing: false,
    children: [],
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 11, line: 1, column: 12 },
      source: '<div></div>'
    }
  })
}
```



#### 01-simple div

<span id="test-element-01"></span>

解析结果流程图(xmind 画流程图真实low的不行，😅)：

![](http://qiniu.ii6g.com/parse-test-element--01.png?imageMogr2/thumbnail/!100p)

drawer.io 流程图：

![](http://qiniu.ii6g.com/test-parse-simple-tag.png?imageMogr2/thumbnail/!100p)





因为 [parseElement](#parse-parseelement) 已经实现，因此这个顺利通过，`parseElement` 解析先检测 `</div>` 结束标签位置，如果没有则为非法无结束标签触发 `ErrorCodes.EOF_IN_TAG` 异常。

```js
test('simple div', () => {
  const ast = baseParse('<div>hello</div>')
  const element = ast.children[0]

  expect(element).toStrictEqual({
    type: NodeTypes.ELEMENT,
    ns: Namespaces.HTML,
    tag: 'div',
    tagType: ElementTypes.ELEMENT,
    codegenNode: undefined,
    props: [],
    isSelfClosing: false, // <div 后为 > 为非自闭合标签
    children: [
      {
        type: NodeTypes.TEXT,
        content: 'hello',
        loc: {
          start: { offset: 5, line: 1, column: 6 }, // h 位置索引
          end: { offset: 10, line: 1, column: 11 }, // o 位置索引
          source: 'hello'
        }
      }
    ],
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 16, line: 1, column: 17 },
      // 遇到<div> 会直接判断是否有 </div> 然后截取`<div>...</div>
      source: '<div>hello</div>' 
    }
  })
})
```

标签的解析在 [parseTag](#parse-parsetag) 中完成， 如果是自闭合标签，会置标志位 `isSelfClosing = true`。

并且解析标签只会解析到 `<div>` 中的 `<div` 部分就结束，是因为需要检测后面是 `>` 还是 `/>` 如果是 `/>` 则为自闭合标签需要区分处理，因此这里会有个判断来决定 `advanceBy` 1 或 2 个指针位置。

```js
// parseTag
let isSelfClosing = false
if (context.source.length === 0) {
  emitError(context, ErrorCodes.EOF_IN_TAG)
} else {
  // some <div> ... </div> 到这里的 source = > ... </div>
  // 所以可以检测是不是以 /> 开头的
  isSelfClosing = context.source.startsWith('/>')
  if (type === TagType.End && isSelfClosing) {
    emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
  }
  // 如果是自闭合指针移动两位(/>)，否则只移动一位(>)
  // 到这里 source = ... </div>
  advanceBy(context, isSelfClosing ? 2 : 1)
}
```



### Comment 注释解析

注释风格：`<!-- ... -->`，[阶段5](#link-05) 及之前还不支持注释解析，因为还没实现 [parseComment](#parse-parsecomment)。

注释测试用例不存在阶段性的实现，只要实现了 [parseComment](#parse-parsecomment) 就饿都可以通过了，因此这里放在一起通过记录。

1. **empty comment** 空注释节点
2. **simple comment** 正常注释节点
3. **two comments** 多个注释节点

```js
describe('Comment', () => {
  test('empty comment', () => {
    const ast = baseParse('<!---->')
    const comment = ast.children[0]

    expect(comment).toStrictEqual({
      type: NodeTypes.COMMENT,
      content: '',
      loc: {
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 7, line: 1, column: 8 },
        source: '<!---->'
      }
    })
  }) // empty comment

  test('simple comment', () => {
    const ast = baseParse('<!--abc-->')
    const comment = ast.children[0]

    expect(comment).toStrictEqual({
      type: NodeTypes.COMMENT,
      content: 'abc',
      loc: {
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 10, line: 1, column: 11 },
        source: '<!--abc-->'
      }
    })
  }) // simple comment

  test('two comments', () => {
    const ast = baseParse('<!--abc--><!--def-->')
    const comment1 = ast.children[0]
    const comment2 = ast.children[1]

    expect(comment1).toStrictEqual({
      type: NodeTypes.COMMENT,
      content: 'abc',
      loc: {
        start: { offset: 0, line: 1, column: 1 },
        end: { offset: 10, line: 1, column: 11 },
        source: '<!--abc-->'
      }
    })
    expect(comment2).toStrictEqual({
      type: NodeTypes.COMMENT,
      content: 'def',
      loc: {
        start: { offset: 10, line: 1, column: 11 },
        end: { offset: 20, line: 1, column: 21 },
        source: '<!--def-->'
      }
    })
  }) // two comments
})
```

这里总共有三个用例，一开始测试并不能通过，是因为实现 [pushNode](#parse-pushnode) 的时候忘记加上 `__DEV__` 环境检测了，因为生产环境是不需要保存注释节点的，开发环境为了测试需要有这个信息。

```js
function pushNode(nodes, node) {
  // 这里加上 __DEV__ 检测，开发的时候还是需要的
  // 不然用例会通不过，因为这里直接返回 Undefined 了，导致
  // parent.children[] 里面并不存在这个注释节点
  // 加上就好了
  if (!__DEV__ && node.type === NodeTypes.COMMENT) {
    // 注释节点不处理
    return
  }

 // ... 省略
}
```



### Interpolation 插值解析

#### 05-custom delimiters

<span id="test-interpolation-05"></span>

自定义插值分隔符，其实处理流程和插值处理一样，所以没啥好讲的，[阶段代码4](#link-04) 就支持该用例通过。

```js
test('custom delimiters', () => {
  const ast = baseParse('<p>{msg}</p>', {
    delimiters: ['{', '}']
  })
  const element = ast.children[0]
  const interpolation = element.children[0]

  expect(interpolation).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: `msg`,
      isStatic: false,
      isConstant: false,
      loc: {
        start: { offset: 4, line: 1, column: 5 },
        end: { offset: 7, line: 1, column: 8 },
        source: 'msg'
      }
    },
    loc: {
      start: { offset: 3, line: 1, column: 4 },
      end: { offset: 8, line: 1, column: 9 },
      source: '{msg}'
    }
  })
})
```



#### 04-it can have tag-like notation (3)

<span id="test-interpolation-04"></span>

前面的两个用例已经解释过了，插值里面的内容会在 [parseInterpolation](#parse-parseinterpolation) 中直接处理成插值的模板(source)，不会进入到 while 循环触发异常。

```ts
test('it can have tag-like notation (3)', () => {
  const ast = baseParse('<div>{{ "</div>" }}</div>')
  // 这里解析出来的是 <div></div> 这个元素节点
  const element = ast.children[0] as ElementNode 
  // 标签内部的所有内容在解析之后会被当做子节点存放到 children[] 数组中
  // 因此这里第一个子节点是个插值模板
  const interpolation = element.children[0] as InterpolationNode

  expect(interpolation).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      // The `isConstant` is the default value and will be determined in `transformExpression`.
      isConstant: false,
      content: '"</div>"',
      loc: {
        start: { offset: 8, line: 1, column: 9 },
        end: { offset: 16, line: 1, column: 17 },
        source: '"</div>"'
      }
    },
    loc: {
      start: { offset: 5, line: 1, column: 6 },
      end: { offset: 19, line: 1, column: 20 },
      source: '{{ "</div>" }}'
    }
  })
})
```



#### 03-it can have tag-like notation(2)

<span id="test-interpolation-03"></span>

这个用例其实和 [用例2](#test-interpolation-02) 是一样的，只不过是解析了两个插值而已，先解析 `{{ a<b }}` ，最后剩下的 `{{ c>d }}` 会在退出 [parseInterpolation](#parse-parseinterpolation) 之后剩余的 context.source 为 `{{ c>d }}`在 [parseChildren](#parse-parsechildren) 里面继续进行 while 循环处理，随又检测到是插值再次调用 `parseInterpolation` 进行处理得到第二个插值节点。

```ts
test('it can have tag-like notation (2)', () => {
  const ast = baseParse('{{ a<b }}{{ c>d }}')
  const interpolation1 = ast.children[0] as InterpolationNode
  const interpolation2 = ast.children[1] as InterpolationNode

  expect(interpolation1).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: `a<b`,
      isStatic: false,
      isConstant: false,
      loc: {
        start: { offset: 3, line: 1, column: 4 },
        end: { offset: 6, line: 1, column: 7 },
        source: 'a<b'
      }
    },
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 9, line: 1, column: 10 },
      source: '{{ a<b }}'
    }
  })

  expect(interpolation2).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      isConstant: false,
      content: 'c>d',
      loc: {
        start: { offset: 12, line: 1, column: 13 },
        end: { offset: 15, line: 1, column: 16 },
        source: 'c>d'
      }
    },
    loc: {
      start: { offset: 9, line: 1, column: 10 },
      end: { offset: 18, line: 1, column: 19 },
      source: '{{ c>d }}'
    }
  })
}
```

[支持该用例代码链接🛬](#link-04)

#### 02-it can have tag-like notation(1)

<span id="test-interpolation-02"></span>

该用例里面虽然有 `<` 符号，但是由于是在插值内部，会进入 [parseInterpolation](#parse-parseinterpolation) 之后就被解析成插值的 source，并不会进入 while 里面的作为标签的开始 `<` 来解析。

```js
test('it can have tag-like notation', () => {
  const ast = baseParse('{{ a<b }}')
  const interpolation = ast.children[0]

  expect(interpolation).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: `a<b`, // content = preTrimContent.trim() 去掉前后空格
      isStatic: false,
      isConstant: false,
      loc: {
        start: { offset: 3, line: 1, column: 4 },
        end: { offset: 6, line: 1, column: 7 },
        source: 'a<b'
      }
    },
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 9, line: 1, column: 10 },
      source: '{{ a<b }}'
    }
  })
})
```

[通过该用例代码链接🛬](#link-04)



####  01- simple interpolation

<span id="test-interpolation-01"></span>

```js
test('simple interpolation', () => {
  const ast = baseParse('{{message}}')
  const interpolation = ast.children[0]

  expect(interpolation).toStrictEqual({
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: `message`,
      isStatic: false,
      isConstant: false,
      loc: {
        start: { offset: 2, line: 1, column: 3 }, // m 位置
        end: { offset: 9, line: 1, column: 10 }, // 最后一个 e 位置
        source: `message`
      }
    },
    loc: {
      start: { offset: 0, line: 1, column: 1 }, // 第一个 { 位置
      end: { offset: 11, line: 1, column: 12 }, // 最后一个 } 位置
      source: '{{message}}'
    }
  })
}
```



### Text 文本解析

####  07-lonly "{{" don\'t separate nodes

<span id="test-text-06"></span>

这个用例是用来检测插值不完整的情况，正常会爆出 `X_MISSING_INTERPOLATION_END` 异常，在该用例中重写了该异常处理，因此不会报错，用例会很顺利通过，因为没有异常， [parseInterpolation](#parse-parseinterpolation) 会退出，最后 `{{` 会被当做普通文本内容处理。

```js
test('lonly "{{" don\'t separate nodes', () => {
  const ast = baseParse('a {{ b', {
    onError: (error) => {
      if (error.code !== ErrorCodes.X_MISSING_INTERPOLATION_END) {
        throw error
      }
    }
  })
  const text = ast.children[0]

  expect(text).toStrictEqual({
    type: NodeTypes.TEXT,
    content: 'a {{ b',
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 6, line: 1, column: 7 },
      source: 'a {{ b'
    }
  })
}) // lonly "{{" don\'t separate nodes
```

[parseInterpolation](#parse-parseInterpolation) 该用例处理代码：

```js
function parseInterpolation(context, mode) {
  // 找出插值模板的开始和结束符号，默认是 {{ 和 }}
  const [open, close] = context.options.delimiters
  const closeIndex = context.source.indexOf(close, open.length)
  if (closeIndex === -1) {
    // 这里检测到没有 }} 退出，并且到这里 context 指针信息并没有改变
    // 因此退出之后，重新 while 最后进入文本解析 parseText
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END)
    return undefined
  }

  // ... 省略
}
```

test:

```
➜  packages git:(master) ✗ jest compiler-core
 PASS  compiler-core/__tests__/parse.spec.js (19.233 s)
  compiler: parse
    Text
      ✓ simple text (5 ms)
      ✓ simple text with invalid end tag (2 ms)
      ✓ text with interpolation (1 ms)
      ✓ text with interpolation which has `<` (1 ms)
      ✓ text with mix of tags and interpolations (1 ms)
      ✓ lonly "<" don't separate nodes (7 ms)
      ✓ lonly "{{" don't separate nodes

Test Suites: 1 passed, 1 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        23.277 s
Ran all test suites matching /compiler-core/i
```



####  06-lonly "<" don\'t separate nodes

<span id="test-text-05"></span>

```js
test('lonly "<" don\'t separate nodes', () => {
  const ast = baseParse('a < b', {
    onError: (err) => {
      if (err.code !== ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME) {
        throw err
      }
    }
  })
  const text = ast.children[0]

  expect(text).toStrictEqual({
    type: NodeTypes.TEXT,
    content: 'a < b',
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 5, line: 1, column: 6 },
      source: 'a < b'
    }
  }) // lonly "<" don\'t separate nodes
}
```

这个用例在实现的 [test-05](#test-text-05) 之后就可以通过，因为 `a < b` 并不是插值一部分，会被当做纯文本处理，而为了避免报错用例中重写了 `onError`，因为 while 循环里在检测到 `<` 开头的 if 条件分支中，第二个字符为空格的情况会进入最后的 else 分支处理，即触发 `INVALID_FIRST_CHARACTER_OF_TAG_NAME` 异常。

```js
} else if (mode === TextModes.DATA && s[0] === '<') {
  // ... 标签开头 <...
  if (s.length === 1) {
    emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 1)
  } else if (s[1] === '!') {
    // TODO 注释处理，<!-- ...
  } else if (s[1] === '/') {
    // ...
  } else if (/[a-z]/i.test(s[1])) {
   // ...
  } else if (s[1] === '?') {
   // ...
  } else {
    // 会进入到这里，触发异常，但是由于 options 里提供了 onError 重写了它
    // 因此这里不会触发异常，而是退出该分支进入 纯文本处理，合并文本 pushnode 操作
    emitError(context, ErrorCodes.INVALID_FIRST_CHARACTER_OF_TAG_NAME, 1)
  }
}
```

####  05-text with mix of tags and interpolations

<span id="test-text-05"></span>

```ts
test('text with mix of tags and interpolations', () => {
  const ast = baseParse('some <span>{{ foo < bar + foo }} text</span>')
  const text1 = ast.children[0] as TextNode
  const text2 = (ast.children[1] as ElementNode).children![1] as TextNode

  expect(text1).toStrictEqual({
    type: NodeTypes.TEXT,
    content: 'some ',
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 5, line: 1, column: 6 },
      source: 'some '
    }
  })
  expect(text2).toStrictEqual({
    type: NodeTypes.TEXT,
    content: ' text',
    loc: {
      start: { offset: 32, line: 1, column: 33 },
      end: { offset: 37, line: 1, column: 38 },
      source: ' text'
    }
  })
}
```

这是个标签+插值混合模板，现阶段的代码是通不过该测试的，因为它会进入到下面这个分支：

```js
else if (/[a-z]/i.test(s[2])) {
  // 这里都出错了，为啥后面还有个 parseTag ???
  // 到这里就会报错
  emitError(context, ErrorCodes.X_INVALID_END_TAG)
  parseTag(context, TagType.End, parent)
  continue
} else {
```

如控制台输出：

![](http://qiniu.ii6g.com/1596638044.png?imageMogr2/thumbnail/!100p)

错误上面的输出其实是 }} 和 {{ 的解析位置信息，并且 `<div>` 并没有解析是因为我们还没实现 [parseElement](#parse-parseelement) 分支逻辑，所以直接过滤掉当成文本处理了。

1. <font color="blue">右边： offset=14 刚好是 `some <span>{{ ` 字符串长度 + 1 即插值内第一个空格的位置</font>

2. <font color="blue">左边：offset=29 刚好是 14 + `foo < bar + foo` 长度位置(slice 不包含 endIdx)， 即插值内最后一个空格的位置</font>

接下来我们得看下怎么不报错能解析 `</div>` 。

<font color="green">*大概的猜想是在解析 `<div>`的时候发现是标签，可能会重写 `onError` ，避免在解析 `</div>` 触发异常，而是进入 [parseTag](#parse-parsetag) 解析结束标签。但很可惜不是这样，而是在 [parseElement](#parse-parselement) 中递归调用 [parseChildren](#parse-parsechildren) 解析标签内部的模板，解析完成之后检测结束标签，无结束标签，非法异常，具体实现请看 [parseElement源码实现](#parse-parseelement)。*</font>

在实现了 [parseElement](#parse-parseelement) 和部分 [parseTag](#parse-parsetag) 之后用例通过：

```
➜  packages git:(master) ✗ jest compiler-core
 PASS  compiler-core/__tests__/parse.spec.js (14.492 s)
  compiler: parse
    Text
      ✓ simple text (5 ms)
      ✓ simple text with invalid end tag (2 ms)
      ✓ text with interpolation (2 ms)
      ✓ text with interpolation which has `<` (1 ms)
      ✓ text with mix of tags and interpolations (2 ms)

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
Snapshots:   0 total
Time:        15.743 s
Ran all test suites matching /compiler-core/i.
```

期间碰到个问题：

> Cannot find module 'core-js/modules/es6.string.iterator' from 'packages/compiler-core/parse.js'

解决方案：[是 core-js 降级到 2](https://github.com/babel/babel/issues/9796)

#### 04-text with interpolation which has `<`

<span id="test-text-04"></span>

```ts
test('text with interpolation which has `<`', () => {
  const ast = baseParse('some {{ a<b && c>d }} text')
  const text1 = ast.children[0] as TextNode
  const text2 = ast.children[2] as TextNode

  expect(text1).toStrictEqual({
    type: NodeTypes.TEXT,
    content: 'some ',
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 5, line: 1, column: 6 },
      source: 'some '
    }
  })
  expect(text2).toStrictEqual({
    type: NodeTypes.TEXT,
    content: ' text',
    loc: {
      start: { offset: 21, line: 1, column: 22 },
      end: { offset: 26, line: 1, column: 27 },
      source: ' text'
    }
  })
})
```



这个用例其实和 [03-text with interpolation](#test-text-03) 用例原理一样，虽然插值里面有特殊字符 `<`，但是由于在 [parseInterpolation](#parse-parseInterpolation) 函数解析过程中是通过截取 {{ 到 }} 直接的全部字符串去解析的。

```ts
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {
  // ... 省略
  
  // 也就是这两行，将 {{ ... }} 内的所有内容一次性取出来解析了，因此并不会
  // 进入到 parseChildren 的 while 循环中处理，也就不会出现异常情况
  const rawContentLength = closeIndex - open.length
  const rawContent = context.source.slice(0, rawContentLength)
  
  // ... 省略
}
```

所以这个用例会很顺利的通过(在 03 用例通过的前提下)。

```
 PASS  packages/compiler-core/__tests__/parse.spec.js (5.375 s)
  compiler: parse
    Text
      ✓ simple text (5 ms)
      ✓ simple text with invalid end tag (3 ms)
      ✓ text with interpolation (41 ms)
      ✓ text with interpolation which has `<` (3 ms)

```



#### 03-text with interpolation

<span id="test-text-03"></span>

[该用例代码链接 ->](#link-04)

该用例检验的差值的处理。

```ts
test("text with interpolation", () => {
  const ast = baseParse("some {{ foo + bar }} text");
  const text1 = ast.children[0],
        text2 = ast.children[2];

  expect(text1).toStrictEqual({
    type: NodeTypes.TEXT,
    content: "some ",
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      source: "some ",
      end: { offset: 5, line: 1, column: 6 },
    },
  });

  expect(text2).toStrictEqual({
    type: NodeTypes.TEXT,
    content: " text",
    loc: {
      start: { offset: 20, line: 1, column: 21 },
      source: " text",
      end: { offset: 25, line: 1, column: 26 },
    },
  });
}
```

差值的处理分支在 parseChildren 的 

```ts
if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
  // '{{'
  node = parseInterpolation(context, mode)
}
```

完成，因为需要 [parseInterpolation()](#parse-parseInterpolation) 的支持。

用例结果(<font color="green">OK</font>)：

```
➜  vue-next-code-read git:(master) ✗ jest parse.spec
 PASS  packages/compiler-core/__tests__/parse.spec.js
  compiler: parse
    Text
      ✓ simple text (4 ms)
      ✓ simple text with invalid end tag (2 ms)
      ✓ text with interpolation (47 ms)

  console.log
    { column: 18, line: 1, offset: 17 } { column: 9, line: 1, offset: 8 } 1

      at parseInterpolation (packages/compiler-core/parse.js:262:11)

Test Suites: 1 passed, 1 total
Tests:       3 passed, 3 total
Snapshots:   0 total
Time:        8.776 s
Ran all test suites matching /parse.spec/i.
➜  vue-next-code-read git:(master) ✗
```



#### 02-simple text\<div>

<span id="test-text-02"></span>

[该用例代码链接->](#link-03)

在跑这个用例的时候出现内存溢出了，查了下原因是因为只是[增加了 while 里面的各种 if 分支](#link-02)，但是实际并没有实现，这个用例会走到 

```js
else if (mode === TextModes.DATA && s[0] === "<") {
  // ... 标签开头 <...
  if (s.length === 1) {
    emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 1);
  } else if (s[1] === "!") {
    // TODO 注释处理，<!-- ...
  } else if (s[1] === "/") {
    // </...
    if (s.length === 2) {
      emitError(context, ErrorCodes.EOF_BEFORE_TAG_NAME, 2);
    } else if (s[2] === ">") {
      // ...
    } else if (/[a-z]/i.test(s[2])) {
      // 会走到这个分支里面，但是由于下面的 parseTag 未实现，因此一直在这个分支里面循环
      // 加上用例里面重写了 onError 不会 throw err 终止，因此会出现死循环
      emitError(context, ErrorCodes.X_INVALID_END_TAG);
      // 但是上面都报错了，为什么这里还要加个 parseTag??? 正常理解应该是走不到这里啊
      // 除非有重写 onError 报错机制???
      // parseTag(context, TagType.End, parent);
      continue;
    } else {
      // ...
    }
```

因此要通过这个用例，就必须得实现 `parseTag(context, TagType.End, parent)` 函数解析标签。

```js
test("simple text with invalid end tag", () => {
  const onError = jest.fn();
  const ast = baseParse("some text</div>", {
    onError,
  });
  const text = ast.children[0];

  expect(onError).toBeCalled();
  expect(text).toStrictEqual({
    type: NodeTypes.TEXT,
    content: "some text",
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 9, line: 1, column: 10 },
      source: "some text",
    },
  });
}
```

因为 baseparse 调用的时候有传递 onError 覆盖报错代码，会进入到 parseTag 进行解析标签，如果不实现会导致死循环。因此这里要通过这个用例就必须实现 [parseTag()](#parse-parsetag):

```js
function parseTag(context, type, parent) {
  // 获取当前解析的起始位置，此时值应该是 some text 的长度
  const start = getCursor(context);
  // 匹配 </div 过滤掉空格字符，但是为什么要把 > 给忽略掉???
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  const tag = match[1];
  const ns = context.options.getNamespace(tag, parent);
  // log1: 改变位移，将 offset 定位到 </div> 的最有一个 > 上
  // 在这里 context.offset = 10, context.line = 1
  advanceBy(context, match[0].length);
  // 过滤掉空格
  advanceSpaces(context);
	// log2: 经过 advance之后 context.offset = 15, context.line = 1
  // 正好过滤 </div 5个字符
  const cursor = getCursor(context);
  const currSource = context.source;
}
```

parseTag 实现到这里就可以满足通过测试用例的条件了，这里面会去匹配 `</div` 然后将其过滤掉(通过advanceBy和 advanceSpaces 来改变 context 里面的 offset 和 line 值)，输出结果(log1 和 log2 位置 context 的输出)：

![](http://qiniu.ii6g.com/1595444610.png?imageMogr2/thumbnail/!100p)

#### <span id="test-text-01">01-simple text

这里用到的就一个 baseParse 函数，需要我们来实现其基本的功能以通过该用例。

用例源码：

```ts
test('simple text', () => {
  const ast = baseParse('some text')
  const text = ast.children[0] as TextNode

  expect(text).toStrictEqual({
    type: NodeTypes.TEXT,
    content: 'some text',
    loc: {
      start: { offset: 0, line: 1, column: 1 },
      end: { offset: 9, line: 1, column: 10 },
      source: 'some text'
    }
  })
})
```

[用例的基本功能，验证 baseParse 解析出来的文本节点对象是否满足基本要求](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/test-01-some-text)。	

支持该用例的重要部分代码：

1. createParseContext 构建被解析的内容的对象结构

   ```js
   function createParserContext(context, options) /*ParserContext*/ {
     return {
       options: {
         ...defaultParserOptions,
         ...options,
       },
       // 初始化以下内容
       column: 1,
       line: 1,
       offset: 0,
       originalSource: context,
       source: context,
       inPref: false,
       inVPref: false,
     };
   }
   ```

   

2. parseChildren

   ```js
   function parseChildren(
     context /* ParserContext*/,
     mode /*TextModes*/,
     ancesotrs /*ElementNode[]*/
   ) {
     // ...
     const nodes /*TemplateChildNode[]*/ = [];
   
     while (!isEnd(context, mode, ancesotrs)) {
       // do sth
   
       const s = context.source;
       let node = undefined;
   
       // 由于 baseparse里面传过来的是个 DATA 类型，因此会走到这个 if 里
       // 面去解析
       if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
         // 过略掉非文本的
         if (!context.inVPre && s.startsWith(context.options.delimiters[0])) {
           // ... 插值处理{{}}
         } else if (mode === TextModes.DATA && s[0] === "<") {
           // ... 标签开头 <...
         }
   
         // ... 到这里也就是说文本节点不会被这个 if 处理，而是直接到
         // !node 给 parseText 解析
       }
   
       if (!node) {
         // 纯文本重点在这里面处理，截取字符直到遇到 <, {{, ]]> 标志结束
         // 然后传入到 parseTextData() 判断是否是数据绑定的变量，在 
         // context.options.decodeEntities() 中处理
         node = parseText(context, mode);
       }
   
       if (Array.isArray(node)) {
         for (let i = 0; i < node.length; i++) {
           pushNode(nodes, node[i]);
         }
       } else {
         pushNode(nodes, node);
       }
     }
   
     let removedWhitespace = false;
   
     return removedWhitespace ? nodes.filter(Boolean) : nodes;
   }
   ```

3. parseText

   ```js
   function parseText(context, mode) {
     // 字符串解析直到遇到 <, {{, ]]> 为止
     const endTokens = ["<", context.options.delimiters[0]];
     if (mode === TextModes.CDATA) {
       endTokens.push("]]>");
     }
   
     let endIndex = context.source.length;
     for (let i = 0; i < endTokens.length; i++) {
       const index = context.source.indexOf(endTokens[i], 1);
       if (index !== -1 && endIndex > index) {
         endIndex = index;
       }
     }
   
     const start = getCursor(context);
     // 解析 & 开头的html语义的符号(>,<,&,',")
     const content = parseTextData(context, endIndex, mode);
     return {
       type: NodeTypes.TEXT,
       content,
       // loc:{ start, end, source}
       // start,end: { line, column, offset }
       loc: getSelection(context, start),
     };
   }
   ```

4. parseTextData

   ```js
   // 解析文本数据，纯文本内容
   function parseTextData(context, length, mode) {
     const rawText = context.source.slice(0, length);
     // 解析换行，更新 line, column, offset，返回换行之后的的 source
     advanceBy(context, length);
     if (
       mode === TextModes.RAWTEXT ||
       mode === TextModes.CDATA ||
       rawText.indexOf("&") === -1
     ) {
       return rawText;
     }
   
     return context.options.decodeEntities(
       rawText,
       mode === TextModes.ATTRIBUTE_VALUE
     );
   }
   ```

5. advancedBy 解析多个字符之后更新start,end(line,column,offset)，尤其是换行符的特殊处理。

   ```js
   function advanceBy(context, numberOfCharacters) {
     const { source } = context;
     advancePositionWithMutation(context, source, numberOfCharacters);
     context.source = source.slice(numberOfCharacters);
   }
   ```

6. advancePositionWithMutation

   ```js
   export function advancePositionWithMutation(
     pos,
     source,
     numberOfCharacters = source.length
   ) {
     let linesCount = 0;
     let lastNewLinePos = -1;
     for (let i = 0; i < numberOfCharacters; i++) {
       if (source.charCodeAt(i) === 10 /* newline char code */) {
         linesCount++;
         lastNewLinePos = i;
       }
     }
   
     pos.offset += numberOfCharacters;
     pos.line += linesCount;
     pos.column =
       lastNewLinePos === -1
         ? pos.column + numberOfCharacters
         : numberOfCharacters - lastNewLinePos;
   
     return pos;
   }
   
   ```

   



# parse.ts

<span id="file-parse"></span>

## baseParse(context, options)

<span id="parse-baseparse"></span>

```js
function baseParse(content, options /* ParserOptions */) /*RootNode*/ {
  const context = createParserContext(content, options);
  const start = getCursor(context);
  return createRoot(
    parseChildren(context, TextModes.DATA, []),
    getSelection(context, start)
  );
}
```

baseParse 内部实现基本就是调用其他方法，所以接下来我们得针对它使用的几个方法去逐一实现：

1. createParserContext，创建节点解析对象，包含解析过程中需要或需要保存的数据
2. getCursor，获取 context 中的 offset, line, column, start, end 等信息
3. [createRoot](#file-ast-createroot)，创建根节点
4. [parseChildren](#parse-parsechildren)，解析子节点
5. [getSelection](#parse-getselection)，获取选中的未解析的内容

<span id="pic-baseparse"></span>baseParse 函数大体结构和代码调用图示：

![](http://qiniu.ii6g.com/parse-ts-baseparse-0.png?imageMogr2/thumbnail/!100p)

## createParseContext(context, options)

<span id="parse-createparsecontext"></span>

函数作用：**创建解析器上下文对象(包含解析过程中的一些记录信息)**

函数声明：

`function createParserContext(context, options) /*ParserContext*/ {}`

参数没什么好讲的了，从 baseParse 继承而来，返回的是一个 [ParserContext](#td-parser-context) 类型。具体实现其实就是返回一个 ParserContext 类型的对象，里面包含了源码字符串被解析是的一些信息存储，比如：解析时指针的位置 offset，当前行列(line, column)，及其他信息。

```ts
function createParserContext(
  content: string,
  options: ParserOptions
): ParserContext {
  return {
    options: {
      // 解析器的默认选项给了些默认值，比如：isVoidTag: No, isPreTag: NO， 等等
      ...defaultParserOptions, 
      ...options
    },
    column: 1,
    line: 1,
    offset: 0,
    originalSource: content,
    source: content,
    inPre: false,
    inVPre: false
  }
}
```

## 

## parseChildren(context, mode, ancestors)

<span id="parse-parsechildren"></span>

```js
function parseChildren(
  context /* ParserContext*/,
  mode /*TextModes*/,
  ancesotrs /*ElementNode[]*/
) /* TemplateChildNode[] */{}
```

参数列表：

1. context，待解析的模板对象([ParserContext](#td-parser-context))
2. mode，文本模式([TextModes](#td-vars-textmodes))
3. ancestors，祖先元素([ElementNode[]](#td-ast-elementnode))

返回结果： [TemplateChildNode[]](#td-ast-tcn)

### 阶段一([test01 some text](test-01-sometext))

实现 [parseText()](#parse-parsetext) 之后的 [parseChildren()](#parse-parsechildren)代码：

```js
function parseChildren(
  context /* ParserContext*/,
  mode /*TextModes*/,
  ancesotrs /*ElementNode[]*/
) {
  // ...
  const nodes /*TemplateChildNode[]*/ = [];

  while (!isEnd(context, mode, ancesotrs)) {
    // do sth

    const s = context.source;
    let node = undefined;

    // 由于 baseparse里面传过来的是个 DATA 类型，因此会走到这个 if 里
    // 面去解析
    if (mode === TextModes.DATA || mode === TextModes.RCDATA) {
      // 过略掉非文本的
      if (!context.inVPre && s.startsWith(context.options.delimiters[0])) {
        // ... 插值处理{{}}
      } else if (mode === TextModes.DATA && s[0] === "<") {
        // ... 标签开头 <...
      }

      // ... 到这里也就是说文本节点不会被这个 if 处理，而是直接到
      // !node 给 parseText 解析
    }

    if (!node) {
      node = parseText(context, mode);
    }

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        pushNode(nodes, node[i]);
      }
    } else {
      pushNode(nodes, node);
    }
    console.log(context, "parse children");
  }

  let removedWhitespace = false;

  return removedWhitespace ? nodes.filter(Boolean) : nodes;
}
```

最后处理完之后文本节点对象内容如下：

```js
{
  options: {
    delimiters: [ '{{', '}}' ],
    getNamespace: [Function: getNamespace],
    getTextMode: [Function: getTextMode],
    isVoidTag: false,
    isPreTag: false,
    isCustomElement: false,
    decodeEntities: [Function: decodeEntities],
    onError: null
  },
  // 这里发生了变换
  // column: 定位到了字符串最后即 'simple text' 的长度 + 1，即结束位置
  // line: 因为只有一行，所以 line 并未发生改变，如果发生了改变会在 advancedBy 里面进行处理更新
  // offset: 类似文件处理时的指针偏移量，即字符串长度
  column: 12,
  line: 1,
  offset: 11,
  // 会发现处理完成之后，originalSource 维持原样
  originalSource: 'simple text',
  // source 变成了空字符串，因为处理完了
  source: '',
  inPref: false,
  inVPref: false
} // parse children
```

baseParse 之后的 ast 结构：

```js
// 这个结构的形成是经过 createRoot 处理之后的结果
// 经过 parseChildren 之后的结果会被存放到 root 的children 中，如下
{
  type: 0,
  children: [
    {
      type: 2,
      content: '\nsimple text 1\n simple text 2\n',
      loc: [Object]
    }
  ],
  loc: {
    start: { column: 1, line: 1, offset: 0 },
    end: { column: 1, line: 4, offset: 30 },
    source: '\nsimple text 1\n simple text 2\n'
  },
  helpers: [],
  components: [],
  directives: [],
  hoists: [],
  imports: [],
  cached: 0,
  temps: 0,
  codegenNode: undefined
} //// ast

// 第一个 children 结构：
{
  type: 2,
  content: '\nsimple text 1\n simple text 2\n',
  loc: {
    start: { column: 1, line: 1, offset: 0 },
    end: { column: 1, line: 4, offset: 30 },
    source: '\nsimple text 1\n simple text 2\n'
  }
} //// ast
```

阶段代码：[test-01-some-text 测试用例通过](#link-01)

图示：文本解析

![parseChildren-支持纯文本解析](http://qiniu.ii6g.com/parse-ts-parsechildren-text-part.png?imageMogr2/thumbnail/!100p)

## parseComment(context)

<span id="parse-parsecomment"></span>

注释处理函数，解析原则是匹配 `<!--` 开头和 `-->` 结尾，中间部分统统视为注释，中间需要考虑嵌套注释问题。

```js
function parseComment(context) /* CommentNode */ {
  const start = getCursor(context)
  let content

  const match = /--(\!)?>/.exec(context.source)
  if (!match) {
    // 没有闭合注释，后面的所有都会被当做注释处理
    content = context.source.slice(4)
    advanceBy(context, context.source.length) // 后面所有的都成为注释
    emitError(context, ErrorCodes.EOF_IN_COMMENT)
  } else {
    console.log(match)
    if (match.index <= 3) {
      // 空注释也报错
      emitError(context, ErrorCodes.ABRUPT_CLOSING_OF_EMPTY_COMMENT)
    }

    // 非法结束，比如： <!-xx--!>，正则里面有个 (\!)? 捕获组
    // match[1] 就是指这个匹配
    if (match[1]) {
      emitError(context, ErrorCodes.INCORRECTLY_CLOSED_COMMENT)
    }

    // 取注释内容，match.index 即 /--(\!)?>/ 正则匹配的开始索引位置
    content = context.source.slice(4, match.index)

    // 嵌套注释??? 这里slice 之后的 s 不包含结束 -->
    const s = context.source.slice(0, match.index)
    let prevIndex = 1,
      nestedIndex = 0

    console.log({ s })
    // 首先能进入 parseComment，说明 source 是以 <!-- 开头的，且是包含 --> 的
    // 否则前面就会出现异常，因此如果嵌套那可能情况只有<!--x<!--y-->注释中间
    // 出现过 <!--
    while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
      console.log({ nestedIndex, prevIndex, s, len: s.length })
      advanceBy(context, nestedIndex - prevIndex + 1)
      // + 4 值是 `<!--`.length，如果小于 s.length，说明嵌套了注释
      if (nestedIndex + 4 < s.length) {
        // 非法嵌套, 如：<!--<!--x-->
        emitError(context, ErrorCodes.NESTED_COMMENT)
      }

      /// 然后定位到嵌套的第一个 <!-- 的 ! 索引上，进入下一轮处理，直
      // 到找到最后一个合法的 <!--
      prevIndex = nestedIndex + 1
    }

    // 这里应该是没嵌套的情况？？？
    advanceBy(context, match.index + match[0].length - prevIndex + 1)
  }

  return {
    type: NodeTypes.COMMENT,
    content,
    loc: getSelection(context, start)
  }
}
```



## parseElement(context, mode)

<span id="parse-parseelement"></span>

这个解析函数，用来解析 `<div>` 标签。

### 阶段一([test-05](#test-text-05))

[some \<span>{{ foo < bar + foo }} text\</span>](#test-text-05)

此阶段只实现对 `<div>...</div>` 的解析，不包含属性等等其他复杂情况，因为只需要能通过用例5就行。

```js
function parseElement(context, ancestors) {
  // assert context.source 是以 <[a-z] 开头的

  const wasInPre = context.inPre
  const wasInVPre = context.inVPre
  // 取 ancestors 最后一个节点 node
  const parent = last(ancestors)
  const element = parseTag(context, TagType.Start, parent)

  // pre or v-pre
  const isPreBoundary = context.inPre && !wasInVPre
  const isVPreBoundary = context.inVPre && !wasInVPre

  // 自闭合的到这里就可以结束了
  if (element.isSelfClosing || context.options.isVoidTag?.(element.tag)) {
    return element
  }
  
  // 子元素 children，被漏掉的代码，会进入递归调用 parseChildren 去解析
	// <span>...</span> 标签内的模板
  ancestors.push(element)
	const mode = context.options.getTextMode(element, parent)
	const children = parseChildren(context, mode, ancestors)
 
	ancestors.pop()
	element.children = children
  // P1.... 解析之后 children 里面应该包含两个 node
  // node1: 插值内容 `foo < bar + foo`
  // node2: 文本节点 ` text`
  console.log(element)

  // 结束标签？ <span></span> 这种类型？
  // 上面会解析标签内的模板，解析完之后 source 正常应该会是 `</span> ....`
  // 进入 if 解析结束标签
  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End, parent)
  } else {
    // 会进入到这里出现报错
    emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
      const first = children[0]
      if (first && first.loc.source.startsWith('<!--')) {
        emitError(context, ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT)
      }
    }
  }

  element.loc = getSelection(context, element.loc.start)
  console.log(element, 'after')

  if (isPreBoundary) {
    context.inPre = false
  }

  if (isVPreBoundary) {
    context.inVPre = false
  }

  return element
}
```

实现到这里是为了想看下经过 [parseTag](#parse-parsetag) 之后的 element 是什么？parseTag 里面有个正则是用来匹配开始或结束标签的，即： `/^<\/?([a-z][^\t\r\n\f />]*)/i` 这个既可以匹配开始标签，也可以匹配结束标签，并且考虑了 `<div   >` 有空格的情况，忽略大小写。

正则匹配测试结果：

```
/^<\/?([a-z][^\t\r\n\f />]*)/i.exec('<span>')
(2) ["<span", "span", index: 0, input: "<span>", groups: undefined]
```

所以这里首先匹配解析的是开始标签 `<div>` 。

```json
// some <span>{{ foo < bar + foo }} text</span>
// parseTag 之后的 element
{
    "type":1, // 节点类型是 NodeTypes.ELEMENT
    "ns":0, // 命名空间就是 HTML
    "tag":"span", 
    "tagType":0, // 标签类型 ElementTypes.ELEMENT
    "props":[ // 标签属性，这里没有
    ],
    "isSelfClosing":false, // 是不是自闭合标签，如：<img/>
    "children":[],
    "loc":{
        "start":{
            "column":6, // column 不换行的情况下为 offset + 1，从 1 开始计数
            "line":1, // 没换行符
            "offset":5 // <span> 的 < 开始位置索引 `some `.length = 5
        },
        "end":{
            "column":12,
            "line":1,
          	// 这里值的变化分两步
          	// parseTag:start 的时候
						// 1. 解析出 <span ，这个时候 offset 其实是 10
						// 2. 检测是不是自闭合标签，决定 advancedBy 
            // 移动指针位置数(自闭合：2，非自闭合：1)，到这里 offset = 11
            "offset":11 
        },
        "source":"<span>" // 为什么不是 `<span>` ??? 漏了自闭合标签检测指针移位
    }
}
```

解析之后 context 内容变化：

```json
{
    "options":{
        // 忽略选项，目前对我们没啥用
    },
    "column":12,
    "line":1,
    "offset":11, // <span> 后面的 > 索引
    "originalSource":"some <span>{{ foo < bar + foo }} text</span>",
  	// 解析之后的模板，为何 > 没被去掉???，见 问题1
    "source":"{{ foo < bar + foo }} text</span>",
    "inPref":false,
    "inVPref":false
}
```

到此我们已经解析除了 `<span>` 开始标签，这个时候的 `node.childrens = []`，下一步解析标签里面的内容。

在实现完整的 parseElement 之后发现执行会报错，因为这个用例并不是 `<span></span>` 标签内没东西，所以会进入 else 触发 `emitError()`，那不是没法往下走了？？？

```js
// 子元素 children，被漏掉的代码，会进入递归调用 parseChildren 去解析
// <span>...</span> 标签内的模板
ancestors.push(element)
const mode = context.options.getTextMode(element, parent)
const children = parseChildren(context, mode, ancestors)
ancestors.pop()
element.children = children
// ...........☝🏻.☝🏻.☝🏻.☝🏻.☝🏻，加回去

if (startsWithEndTagOpen(context.source, element.tag)) {
  parseTag(context, TagType.End, parent)
} else {
  emitError(context, ErrorCodes.X_MISSING_END_TAG, 0, element.loc.start)
  if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
    const first = children[0]
    if (first && first.loc.source.startsWith('<!--')) {
      emitError(context, ErrorCodes.EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT)
    }
  }
}
```

那是因为前面漏了一段代码。

代码加上之后最后代码 P1 出的输出 ancestors 里面会有一个子节点(element)：

```json
// ancestors[{...}]，ancestors 第一个节点是 <span> 这个节点
// 重点我们要看的是这个节点的 children 因为其内部有 `{{ foo < bar + foo }} text`
// 所以它 的 element 应该有两个节点：`foo < bar + foo` 和 ` text`
{
    // <span> 节点本身的属性，我们重点需要关注的是 children
    "children":[
        { // 第一个 child 是 {{ ... }} 检测到插值进入 parseInterpolation 分支
          // 处理，得到下面的节点结构，插值解析在 parseInterpolation 一章有分析过了
            "type":5,
            "content":{
                "type":4,
                "isStatic":false,
                "isConstant":false,
                "content":"foo < bar + foo",
                "loc":{
                    "start":{
                        "column":15,
                        "line":1,
                        "offset":14
                    },
                    "end":{
                        "column":30,
                        "line":1,
                        "offset":29
                    },
                    "source":"foo < bar + foo"
                }
            },
            "loc":{
                "start":{
                    "column":12,
                    "line":1,
                    "offset":11
                },
                "end":{
                    "column":33,
                    "line":1,
                    "offset":32
                },
                "source":"{{ foo < bar + foo }}"
            }
        },
        {
            "type":2,
            "content":" text",
            "loc":{
                "start":{
                    "column":33,
                    "line":1,
                    "offset":32
                },
                "end":{
                    "column":38,
                    "line":1,
                    "offset":37
                },
                "source":" text"
            }
        }
    ],
    // <span> 本身节点的 loc
}
```

这里也没什么好解释的，插值在 [parseInterpolation](#parse-parseinterpolation) 处分析过了，文本解析在 [parseText](#parse-parsetext) 处分析了。

## parseInterpolation(context, mode)

<span id="parse-parseinterpolation"></span>

函数声明：

```ts
function parseInterpolation(
  context: ParserContext,
  mode: TextModes
): InterpolationNode | undefined {}
```

**context**: 将被解析的上下文，此时这里的 source 应该是以差值 (`{{`)开始的字符串。

**mode**: 文本模式。

```js
function parseInterpolation(context, mode) {
  // 找出插值模板的开始和结束符号，默认是 {{ 和 }}
  const [open, close] = context.options.delimiters;
  const closeIndex = context.source.indexOf(close, open.length);
  if (closeIndex === -1) {
    emitError(context, ErrorCodes.X_MISSING_INTERPOLATION_END);
    return undefined;
  }

  const start = getCursor(context);
  advanceBy(context, open.length);

  // 下面是从 {{ 之后的字符串开始解析
  const innerStart = getCursor(context),
    innerEnd = getCursor(context),
    // 插值里面的字符串长度
    rawContentLength = closeIndex - open.length,
    // 插值里面的字符串内容
    rawContent = context.source.slice(0, rawContentLength),
    preTrimContent = parseTextData(context, rawContentLength, mode),
    content = preTrimContent.trim(),
    startOffset = preTrimContent.indexOf(content);
  if (startOffset > 0) {
    advancePositionWithMutation(innerStart, rawContent, startOffset);
  }

  // {{ foo + bar }} ->
  // res = (' foo + bar '.length - 'foo + bar'.length - ' '.length)
  // 插值里面字符串的长度 - 去掉空格后的长度 - 起始空格的长度，得到的
  // 就是结束位置的 offset
  const endOffset =
    rawContentLength - (preTrimContent.length - content.length - startOffset);
  advancePositionWithMutation(innerEnd, rawContent, endOffset);
  // 定位到 }} 位置
  advanceBy(context, close.length);

  console.log(innerEnd, innerStart, "1");
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      isStatic: false,
      isConstant: false,
      content,
      loc: getSelection(context, innerStart, innerEnd),
    },
    loc: getSelection(context, start),
  };
}
```

![](http://qiniu.ii6g.com/1595570127.png?imageMogr2/thumbnail/!100p)

图中我们看到在经过解析之后 innerStart 和 innerEnd 都数据都正确定位到了相应位置，innerStart 是解析后插值字符串的开始位置(第一个 `{` offset = 8(<font color="purple">'some {{ '的长度</font>))，innerEnd是解析后插值字符串的结束位置(最后一个 `}` offset = 17(<font color="purple">'some {{ foo + bar '的长度))</font>。

![](http://qiniu.ii6g.com/parse-ts-parseinterpolation.png?imageMogr2/thumbnail/!100p)

解析之后得到的 `ast.children` 将会有三个节点：

```json
(3) [{…}, {…}, {…}]
0: {type: 2, content: "some ", loc: {…}} // 左侧文本
1: {type: 5, content: {…}, loc: {…}} // 插值部分
2: {type: 2, content: " text", loc: {…}} // 右侧文本
length: 3
__proto__: Array(0)
```

解析回顾(分别解析出了三个节点对象)：

1. `0: {type: 2, content: "some ", loc: {…}}`
   详细结构<span id="x-1"></span>：

   ```json
   0:
     content: "some " // 解析出的文本内容
     loc: // 位置信息
     	end: {column: 6, line: 1, offset: 5} // 该节点在模板中的位置信息
     	source: "some " // 文本源内容
     	start: {column: 1, line: 1, offset: 0} // 该节点在模板中的结束信息
     __proto__: Object
   	type: 2 // 节点类型
   	__proto__: Object
   ```

   那么是如何得到上面的结果的呢？？？那得从 [parseChildren](#parse-parsechildren) 说起了，模板：

   --->> "some {{ foo + bar }} text"

   `(!context.inVPre && s.startsWith(context.options.delimiters[0]))` <font color="red">检测失败</font>

   `mode === TextModes.DATA && s[0] === "<"` <font color="red">检测失败</font>

   即一开始并不会进入插值和标签解析代码，而是直接进入 [parseText(context, mode)](#parse-parsetext) 中解析文本，解析时候直到遇到 `{{` 之前都一直会当做文本解析，而之前的文本中又不包含 `decodeMap` 中的字符，因此知道遇到 `{` 之前会一直执行 while 里面的：

   ```js
   if (!node) {
     node = parseText(context, mode);
   }
   
   if (Array.isArray(node)) {
     for (let i = 0; i < node.length; i++) {
       pushNode(nodes, node[i]);
     }
   } else {
     pushNode(nodes, node);
   }
   ```

   这段代码，而由于 "some " 都是普通字符，每个字符串会对应一个 node ，然后又都是普通文本节点，会经过 [pushNode(nodes, node[i])](#parse-pushnode) 处理掉，进行合并最后成为上面的一个完整的 "some " 对应[文本节点结构](#x-1)。

2. `1: {type: 5, content: {…}, loc: {…}}`

   节点结构<span id="x-2"></span>：

   ```json
   1:
     content: // 这里的数据是经过插值解析之后的模板对象
       content: "foo + bar" // trim 之后的插值字符串，没有 }} ???
       isConstant: false // 非常量类型
       isStatic: false // 非静态节点
       loc:  // 解析之后的该节点在整个模板中的位置信息
   			// 17 -> r 所在的位置
         end: {column: 18, line: 1, offset: 17}
         source: "foo + bar"
   			// 8 -> f 所在的位置，即 start -> end => 'f <-> r'
         start: {column: 9, line: 1, offset: 8}
       __proto__: Object
       type: 4 // 插值表达式类型
       __proto__: Object
   	loc: // 这里是没经过去尾部空格的位置信息
   		// 20 -> 'some {{ foo + bar ' 最后一个空格位置
       end: {column: 21, line: 1, offset: 20} 
       source: "{{ foo + bar }}"
   		// 5 -> 'some ' 第一个 { 位置
       start: {column: 6, line: 1, offset: 5} 
       __proto__: Object
     type: 5 // 插值类型
     __proto__: Object
   ```

   ​	如上所注释的，第一级的 loc 是通过解析 "{{ foo + bar}}" 在整个模板中的位置信息，content 里面包含的是插值内部的信息，即真正的表达式结构信息。

3. `{type: 2, content: " text", loc: {…}}`
   和第一步中一样，只会经过 parseText(context, mode) 解析出纯文本内容：" text"，最后的结构：

   ```json
   {
     type: 2,
     content: " text",
     loc: {
       // 从 text 前面的空格开始记录，"some {{ foo + bar }}" 长度为 20
       start: { column: 21, line: 1, offset: 20 },
       source: " text",
       end: { column: 26, line: 1, offset: 25}
     }
   }
   ```

三步分析完之后，到现在我们应该具备脱离代码就可以直接根据模板得到解析后对应的 children 结构。分析的重点是要得到一个 `{ type, content, loc: { start, source, end }}` 结构的对象。

```json
// start/end: 
{ 
  column/*该节点起始结束的列，从1开始计数的值*/, 
  line/*该节点模板所在的行，从1开始计数的值*/, 
  offset/*该节点起始结束的索引，从0开始计数的值*/ 
}
```



<font color="blue">PS: 对于 foo 和 bar 变量数据解析执行结果这块暂时不讨论，也不知道如何做到的，现阶段只关心模板的解析。</font>

## parseTag(context, type, parent)

<span id="parse-parsetag"></span>

### 阶段一([simple text<\/div>](#test-text-02))

<span id="parse-parsetag-01"></span>

1. 为什么只匹配 `</div` 而忽略掉最后一个 `>`???

参数: 

```ts
function parseTag(
  context: ParserContext, // 要继续解析的模板对象 simple text</div> 里面的 </div> 
  type: TagType, // Start(<div>), End(</div>)开始结束标签
  parent: ElementNode | undefined // 该标签的父级
): ElementNode
```

具体实现：

```js
function parseTag(context, type, parent) {
  // 获取当前解析的起始位置，此时值应该是 simple text 的长度
  const start = getCursor(context);
  // 匹配 </div 过滤掉空格字符，但是为什么要把 > 给忽略掉???
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
  const tag = match[1];
  const ns = context.options.getNamespace(tag, parent);
  // 改变位移，将 offset 定位到 </div> 的最有一个 > 上
  advanceBy(context, match[0].length);
  // 过滤掉空格
  advanceSpaces(context);

  const cursor = getCursor(context);
  const currSource = context.source;
}
```

### 阶段二([test-text-05](#test-text-05))

<span id="parse-parsetag-02"></span>

满足用例 5(`some <span>{{ foo < bar + foo }} text</span>`) 的代码实现，这里只需要能解析 `<span> ... </span>` 标签就可以，没有 `pre`,`v-pre`,`<span/>自闭合标签`，因此下面省略这几部分检测代码。

```js
function parseTag(context, type, parent) {
  // 获取当前解析的起始位置，此时值应该是 some text 的长度
  const start = getCursor(context)
  // 匹配 </div 过滤掉空格字符，但是为什么要把 > 给忽略掉???
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]
  const ns = context.options.getNamespace(tag, parent)
  // log1: 改变位移，将 offset 定位到 </div> 的最有一个 > 上
  // 在这里 context.offset = 10, context.line = 1
  advanceBy(context, match[0].length)
  // 过滤掉空格
  advanceSpaces(context)
  // log2: 经过 advance之后 context.offset = 15, context.line = 1
  // 正好过滤 </div 5个字符
  const cursor = getCursor(context)
  const currSource = context.source

  // TODO-1 解析标签元素的属性

  // TODO-2 in pre ...

  // TODO-3 v-pre 指令

  // TODO-3 <div/> 自闭标签
  // 这里要实现，不然最后解析完成之后 source 会是：>...</span>
  // 需要检测下是不是自闭合标签来移动指针位置
  let isSelfClosing = false
  if (context.source.length === 0) {
    emitError(context, ErrorCodes.EOF_IN_TAG)
  } else {
    // some <div> ... </div> 到这里的 source = > ... </div>
    // 所以可以检测是不是以 /> 开头的
    isSelfClosing = context.source.startsWith('/>')
    if (type === TagType.End && isSelfClosing) {
      emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
    }
    // 如果是自闭合指针移动两位(/>)，否则只移动一位(>)
    // 到这里 source = ... </div>
    advanceBy(context, isSelfClosing ? 2 : 1)
  }

  let tagType = ElementTypes.ELEMENT
  const options = context.options
  // 不是 v-pre，且不是自定义组件，这个 if 目的是为了检测并改变
  // tagType 标签类型
  if (!context.inVPre && !options.isCustomElement(tag)) {
    // TODO-4 检测 tagType
  }

  return {
    type: NodeTypes.ELEMENT,
    ns,
    tag,
    tagType,
    props,
    isSelfClosing: false, // TODO
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined
  }
}
```

要能通过[用例5](#test-text-05) 必须搭配 [parseElement(context, ancestors) ](#parse-parseelement) 才行，并且重点在 parseElement 中，因为有了开始标签才会有结束标签的解析，不然会触发结束标签解析分支里面的 error: 

```js
else if (/[a-z]/i.test(s[2])) {
  // 这里都出错了，为啥后面还有个 parseTag ???
  emitError(context, ErrorCodes.X_INVALID_END_TAG)
  parseTag(context, TagType.End, parent)
  continue
}
```

因此如果这里不会触发 X_INVALID_END_TAG 那必定是 parseElement 里面做了什么处理，这个实现了 parseElement 才得以知晓(目前只是猜测~~~)，[传送门 🚪>>>](#parse-parseelement)

### 阶段三([test-element-03](#test-element-03))

<span id="parse-parsetag-03"></span>

支持自闭标签解析，实现了阶段二之后，这里其实很简单，在上一阶段中的实现在 parseTag 中返回的时候 `isSelfClosing` 写死成了 `false` ，要支持这个用例，只要将它的值赋值为实际的 `isSelfClosing` 就可以了。

```js
parseTag() {
  // ...
  let isSelfClosing = false
  if (context.source.length === 0) {
    emitError(context, ErrorCodes.EOF_IN_TAG)
  } else {
    // some <div> ... </div> 到这里的 source = > ... </div>
    // 所以可以检测是不是以 /> 开头的
    isSelfClosing = context.source.startsWith('/>')
    if (type === TagType.End && isSelfClosing) {
      emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
    }
    // 如果是自闭合指针移动两位(/>)，否则只移动一位(>)
    // 到这里 source = ... </div>
    advanceBy(context, isSelfClosing ? 2 : 1)
  }
  // ...
}
```

### 阶段四(支持template + v-if)

<span id="parse-parsetag-04"></span>

```js
function parseTag(context, type, parent) {
  // 获取当前解析的起始位置，此时值应该是 some text 的长度
  const start = getCursor(context)
  // 匹配 <div 或 </div 过滤掉空格字符，但是为什么要把 > 给忽略掉???
  // 其实不是忽略掉 > 而是因为如果是 <div 开头，那么后面有可能是 < 或
  // /> 后面需要处理闭合和非闭合问题
  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source)
  const tag = match[1]
  const ns = context.options.getNamespace(tag, parent)
  // log1: 改变位移，将 offset 定位到 </div> 的最有一个 > 上
  // 在这里 context.offset = 10, context.line = 1
  advanceBy(context, match[0].length)
  // 过滤掉空格
  advanceSpaces(context)
  // log2: 经过 advance之后 context.offset = 15, context.line = 1
  // 正好过滤 </div 5个字符
  const cursor = getCursor(context)
  const currSource = context.source

  // 解析标签元素的属性
  let props = parseAttributes(context, type)

  // TODO-2 in pre ...

  // TODO-3 v-pre 指令

 // ....

  let tagType = ElementTypes.ELEMENT
  const options = context.options
  // 不是 v-pre，且不是自定义组件，这个 if 目的是为了检测并改变
  // tagType 标签类型
  // TODO-4 检测 tagType
  if (!context.inVPre && !options.isCustomElement(tag)) {
    // 是否有 is 指令？
    const hasVIs = props.some(
      (p) => p.type === NodeTypes.DIRECTIVE && p.name === 'is'
    )

    if (options.isNativeTag && !hasVIs) {
      // 没有 is 指令，且不是原生标签，那就是自定义的组件了
      if (!options.isNativeTag(tag)) tagType = ElementTypes.COMPONENT
    } else if (
      hasVIs ||
      isCoreComponent(tag) ||
      options.isBuiltInComponent?.(tag) ||
      /^[A-Z]/.test(tag) ||
      tag === 'component'
    ) {
      // 有 is 指令 || vue 核心组件(keep-alive...) || 内置组件
      // || 标签名大写开头
      tagType === ElementTypes.COMPONENT
    }

    if (tag === 'slot') {
      tagType === ElementTypes.SLOT
    } else if (
      tag === 'template' &&
      props.some(
        (p) =>
          p.type === NodeTypes.DIRECTIVE && isSpecialTemplateDirective(p.name)
      )
    ) {
      // 是模板的前提是有指令，并且是特殊的模板指令
      tagType = ElementTypes.TEMPLATE
    }
  }

  const val = {
    type: NodeTypes.ELEMENT,
    ns,
    tag,
    tagType,
    props: [], // TODO
    isSelfClosing,
    children: [],
    loc: getSelection(context, start),
    codegenNode: undefined
  }
  return val
}
```

这里的实现涉及到几个新的函数：

1. `options.isCustomElement(tag)` 默认在 options 里面是 `NO`

2. `options.isNativeTag(tag)` 作为可选 `OptionalOptions` 选项类型，并没默认值

3. `isCoreComponent(tag)` vue 内部作为核心组件的标签

   ```json
   { // 主要就这四个
     Teleport: TELEPORT,
     Suspense: SUSPENSE,
     KeepAlive: KEEP_ALIVE,
     BaseTransition: BASE_TRANSITION
   }
   ```

4. `options.isBuiltInComponent?.(tag) `  和 `isNativeTag` 一样作为可选选项，无默认值

5. `isSpecialTemplateDirective(p.name)` 特殊的模板指令

   ```ts
   const isSpecialTemplateDirective = /*#__PURE__*/ makeMap(
     `if,else,else-if,for,slot`
   )
   ```

从上面的代码可以看出，如果要被定义为是 `<template>` 类型必须包含 `if,else,else-if,for,slot` 这其中的任一个指令属性，判断条件：

```js
if (
  tag === 'template' &&
  props.some(
    (p) =>
    // isSpecialTemplateDirective 是使用 makeMap 创建的函数
    // 即 key => true/false 的一些函数
    p.type === NodeTypes.DIRECTIVE && isSpecialTemplateDirective(p.name)
  )
) {
  // 是模板的前提是有指令，并且是特殊的模板指令(if, else, else-if, slot, for)
  tagType = ElementTypes.TEMPLATE
}
```



## parseText(context, mode)

<span id="parse-parsetext"></span>

解析文本节点，直到遇到结束标记(`<`,`{{`,`]]>`)。

```ts
function parseText(context: ParserContext, mode: TextModes): TextNode {
  __TEST__ && assert(context.source.length > 0)

  const endTokens = ['<', context.options.delimiters[0]]
  if (mode === TextModes.CDATA) {
    endTokens.push(']]>')
  }

  let endIndex = context.source.length
  for (let i = 0; i < endTokens.length; i++) {
    const index = context.source.indexOf(endTokens[i], 1)
    if (index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  __TEST__ && assert(endIndex > 0)

  const start = getCursor(context)
  // 文本内容可能包含 &gt; &lt; &amp; &apos; &quot; 等html符号，需要
  // 将他们替换成对应 >    <    &     '      "
  const content = parseTextData(context, endIndex, mode)

  return {
    type: NodeTypes.TEXT,
    content,
    loc: getSelection(context, start)
  }
}
```

导图：

![parse-text-导图](http://qiniu.ii6g.com/parse-ts-parsetext.png?imageMogr2/thumbnail/!100p)

## parseTextData(context, length, mode)

<span id="parse-parsetextdata"></span>

文本节点可能包含数据，通过 *context.options.decodeEntities(???)* 来解析。

一些字符的html书写格式，有 `/&(gt|lt|amp|apos|quot);/`，最终会被对应的字符替换掉。

`decodeEntities: (rawText: string): string => rawText.replace(decodeRE, (_, p1) => decodeMap[p1])`

字符集：

```ts
const decodeMap: Record<string, string> = {
  gt: '>',
  lt: '<',
  amp: '&',
  apos: "'",
  quot: '"'
}
```

代码：

```ts
/**
 * Get text data with a given length from the current location.
 * This translates HTML entities in the text data.
 */
function parseTextData(
  context: ParserContext,
  length: number,
  mode: TextModes
): string {
  const rawText = context.source.slice(0, length)
  advanceBy(context, length)
  if (
    mode === TextModes.RAWTEXT ||
    mode === TextModes.CDATA ||
    rawText.indexOf('&') === -1
  ) {
    return rawText // 如果不包含 &gt; &lt; 等html标记
  } else {
    // DATA or RCDATA containing "&"". Entity decoding required.
    // 如果字符串中包含这些字符，得去将他们替换成对应的明文字符。
    return context.options.decodeEntities(
      rawText,
      mode === TextModes.ATTRIBUTE_VALUE
    )
  }
}
```

导图：![parse-textd-ata](http://qiniu.ii6g.com/parse-ts-parsetextdata.png?imageMogr2/thumbnail/!100p)

## parseAttributes(context, type)

<span id="parse-parseattributes"></span>

这个是解析整个标签的所有属性，因此该属性只是做了一些非法情况的检测，实际真正解析属性的地方在 [parseAttribute](#parse-parseattribute) 里面。

```js
// 解析标签所有属性
function parseAttributes(context, type) {
  const props = []
  const attributeNames = new Set()
  while (
    context.source.length > 0 &&
    !context.source.startsWith('>') &&
    !context.source.startsWith('/>')
  ) {
    // 非法属性， <div /v-if="ok"></div>??
    if (context.source.startsWith('/')) {
      emitError(context, ErrorCodes.UNEXPECTED_SOLIDUS_IN_TAG)
      advanceBy(context, 1)
      advanceSpaces(context)
      continue
    }

    // </div> 结束标签，以属性结束的标签?
    if (type === TagType.End) {
      emitError(context, ErrorCodes.END_TAG_WITH_ATTRIBUTES)
    }

    // 逐个解析属性
    const attr = parseAttribute(context, attributeNames)
    if (type === TagType.Start) {
      props.push(attr)
    }

    if (/^[^\t\r\n\f />]/.test(context.source)) {
      emitError(context, ErrorCodes.MISSING_WHITESPACE_BETWEEN_ATTRIBUTES)
    }

    advanceSpaces(context)
  }

  return props
}
```

## parseAttribute(context, nameSet)

<span id="parse-parseattribute"></span>

解析标签属性或指令：

```js
function parseAttribute(context, nameSet) {
  const start = getCursor(context)
  const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source)
  const name = match[0]

  if (nameSet.has(name)) {
    // 重复属性名
    emitError(context, ErrorCodes.DUPLICATE_ATTRIBUTE)
  }
  nameSet.add(name)

  if (name[0] === '=') {
    // =name=value ?
    emitError(context, ErrorCodes.UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME)
  }

  {
    const pattern = /["'<]/g
    let m
    while ((m = pater.exec(name))) {
      // 不合法的属性名
      emitError(
        context,
        ErrorCodes.UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME,
        m.index
      )
    }
  }

  // 移动指针
  advanceBy(context, name.length)

  // type: { content, isQuoted, loc }
  let value

  // 去空格解析属性值
  if (/^[\t\r\n\f ]*=/.test(context.source)) {
    // 属性名与 = 之间存在空格的情况，去掉空格
    advanceSpaces(context)
    advanceBy(context, 1)
    advanceSpaces(context)
    // 去掉空格之后解析属性值
    value = parseAttributeValue(context)
    if (!value) {
      emitError(context, ErrorCodes.MISSING_ATTRIBUTE_VALUE)
    }
  }

  const loc = getSelection(context, start)

  // v-dir 或 缩写
  if (!context.inVPre && /^(v-|:|@|#)/.test(name)) {
    // ?: 非捕获组
    // 1. (?:^v-([a-z0-9]+))? -> 匹配 v-dir 指令，非贪婪匹配，捕获指令名
    //   称([a-z0=9]+)
    // 2. (?:(?::|^@|^#)([^\.]+))? -> 匹配 :,@,#
    // 3. (.+)?$ 匹配任意字符
    const match = /(?:^v-([a-z0-9]+))?(?:(?::|^@|^#)([^\.]+))?(.+)?$/i.exec(
      name
    )

    let arg

    // ([a-z0-9]+), ([^\.]+)
    if (match[2]) {
      const startOffset = name.indexOf(match[2])
      const loc = getSelection(
        context,
        getNewPosition(context, start, startOffset),
        getNewPosition(context, start, startOffset + match[2].length)
      )

      let content = match[2]
      let isStatic = true // 静态属性名

      // 动态属性名解析
      if (content.startsWith('[')) {
        isStatic = false

        if (!content.endsWith(']')) {
          // 如果是动态属性名，必须是 [varName] 形式
          emitError(
            context,
            ErrorCodes.X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END
          )
        }

        content = content.substr(1, content.length - 2)
      }

      arg = {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content,
        isStatic,
        isConstant: isStatic,
        loc
      }
    }

    // 属性是否被引号包起来
    if (value && value.isQuoted) {
      const valueLoc = value.loc
      valueLoc.start.offset++
      valueLoc.start.column++
      valueLoc.end = advancePositionWithClone(valueLoc.start, value.content)
      // 取引号内的所有内容
      valueLoc.source = valueLoc.source.slice(1, -1)
    }

    return {
      type: NodeTypes.DIRECTIVE,
      // : -> v-bind, @ -> v-on, # -> v-slot 的缩写
      name:
        match[1] ||
        (name.startsWith(':') ? 'bind' : name.startsWith('@') ? 'on' : 'slot'),
      exp: value && {
        type: NodeTypes.SIMPLE_EXPRESSION,
        content: value.content,
        isStatic: false,
        isConstant: false,
        loc: value.loc
      },
      arg,
      // 修饰符处理, v-bind.m1.m2 -> .m1.m2 -> ['m1', 'm2']
      modifiers: match[3] ? match[3].substr[1].split('.') : [],
      loc
    }
  }

  return {
    type: NodeTypes.ATTRIBUTE,
    name,
    value: value && {
      type: NodeTypes.TEXT,
      content: value.content,
      loc: value.loc
    },
    loc
  }
}
```

该函数实现主要有几部分(以 `<div v-bind:keyup.enter.prevent="ok"></div>` 为例)：

1. 匹配属性名，关键正则：`/^[^\t\r\n\f />][^\t\r\n\f />=]*/` 会将 `v-if="varname"` 中等号前面的`v-bind:keyup.enter.prevent`都匹配出来。
2. 将匹配到的属性名收集到 `nameSet[]` 中，检测重复性。
   <font color="purple">这里需要注意的是，属性名匹配的结果会将变量名，修饰符都匹配到，如：`<div v-bind:keyup.enter.prevent="ok">`，最后 add 到 nameSet 中的完整属性名为：`v-bind:keyup.enter.prevent`。</font>
3. 非法属性名检测(如：`=name=value`，或属性名中包含 `["'<]` 字符)，异常
4. 移动指针 `advanceBy(context, name.length)` 定位到属性名后的位置，目的是为了取属性值，剩下：`="ok"`。
5. 正则：`/^[\t\r\n\f ]*=/`，解析属性值，调用 [parseAttributeValue](#pars-parseattributevalue) 解析出属性值来
   1. 指针归位至开始位置，如： `v-bind:keyup.enter.prevent="ok"` 的开始位置为 `v` 位置，解析修饰符，得到 `modifiers: []`，这里的关键在于正则：`/(?:^v-([a-z0-9]+))?(?:(?::|^@|^#)([^\.]+))?(.+)?$/i`，会匹配 `v-if, :, @, #...` 指令和指令缩写以及修饰符。
   2. 解析指令后面的变量名称，如：`keyup`，有可能是动态值 `v-bind:[varname]`。
   3. 检测属性值有没被引号包起来，如果有，要更新 value.loc，只取引号内的内容 `content.source = valueLoc.source.slice(1, -1)`
   4. 返回指令节点类型对象
6. 否则返回普通属性类型节点

## parseAttributeValue(context)

<span id="parse-parseattributevalue"></span>

解析属性值。

```js
function parseAttributeValue(context) {
  // 保存模板字符串指针起点位置
  const start = getCursor(context)

  let content

  const quote = context.source[0]
  const isQuoted = quote === `"` || quote === `'`
  if (isQuoted) {
    // 有引号
    advanceBy(context, 1)
    const endIndex = context.source.indexOf(quote)
    // 没有结束引号??? 整个 source 当做文本数据处理???
    if ((endIndex = -1)) {
      content = parseTextData(
        context,
        context.source.length,
        TextModes.ATTRIBUTE_VALUE
      )
    } else {
      content = parseTextData(context, endIndex, TextModes.ATTRIBUTE_VALUE)
      advanceBy(context, 1)
    }
  } else {
    // 没有引号
    const match = /^[^\t\r\n\f >]+/.exec(context.source)
    if (!match) {
      // 无属性值
      return undefined
    }

    const unexpectedChars = /["'<=`]/g
    let m
    while ((m = unexpectedChars.exec(match[0]))) {
      // 无引号值中非法字符检测
      emitError(
        context,
        ErrorCodes.UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE
      )
    }

    // 解析文本数据
    content = parseTextData(context, match[0].length, TextModes.ATTRIBUTE_VALUE)
  }

  return { content, isQuoted, loc: getSelection(context, start) }
}
```



## pushNode(nodes, node)

<span id="parse-pushnode"></span>

1. 注释节点不处理
2. 合并文本节点(前提是prev, node 两个节点是紧挨着的，由 loc.end.offset 和 loc.start.offset判断)
3. 返回新增 node 的 nodes 节点数组

```ts
function pushNode(nodes: TemplateChildNode[], node: TemplateChildNode): void {
  // ignore comments in production
  /* istanbul ignore next */
  if (!__DEV__ && node.type === NodeTypes.COMMENT) {
    return
  }

  if (node.type === NodeTypes.TEXT) { // 两个连着的文本节点，拼凑到一起去
    const prev = last(nodes)
    // Merge if both this and the previous node are text and those are
    // consecutive. This happens for cases like "a < b".
    if (
      prev &&
      prev.type === NodeTypes.TEXT &&
      prev.loc.end.offset === node.loc.start.offset
    ) {
      prev.content += node.content
      prev.loc.end = node.loc.end
      prev.loc.source += node.loc.source
      return
    }
  }

  nodes.push(node)
}
```



## isEnd(context, mode, ancestors)

<span id="parse-isend"></span>

```ts
function isEnd(
  context: ParserContext,
  mode: TextModes,
  ancestors: ElementNode[]
): boolean {
  const s = context.source

  switch (mode) {
    case TextModes.DATA:
      if (startsWith(s, '</')) {
        //TODO: probably bad performance
        for (let i = ancestors.length - 1; i >= 0; --i) {
          if (startsWithEndTagOpen(s, ancestors[i].tag)) {
            return true
          }
        }
      }
      break

    case TextModes.RCDATA:
    case TextModes.RAWTEXT: {
      const parent = last(ancestors)
      if (parent && startsWithEndTagOpen(s, parent.tag)) {
        return true
      }
      break
    }

    case TextModes.CDATA:
      if (startsWith(s, ']]>')) {
        return true
      }
      break
  }

  return !s
}
```

## getCursor(context)

<span id="parse-getCursor"></span>

```ts
function getCursor(context: ParserContext): Position {
  const { column, line, offset } = context
  return { column, line, offset }
}
```



## getSelection(context, start, end?: Postion)

<span id="parse-getselection"></span>

取实时解析后的 source，start，end的值。

```ts
function getSelection(
  context: ParserContext,
  start: Position,
  end?: Position
): SourceLocation {
  end = end || getCursor(context)
  return {
    start,
    end,
    source: context.originalSource.slice(start.offset, end.offset)
  }
}
```



# ast.ts

<span id="file-ast"></span>

## createRoot(children, loc = locStub)

<span id="ast-createroot"></span>

创建根节点对象，返回一个 [RootNode](#td-ast-rootnode) 类型对象。

参数：

1. children 节点子孙节点，类型：[TemplateChildNode[]](#td-ast-tcn)

   ```ts
   export type TemplateChildNode =
     | ElementNode // 节元素点类型
     | InterpolationNode // 插值节点
     | CompoundExpressionNode // 混合表达式节点
     | TextNode // 文本节点
     | CommentNode // 注释节点
     | IfNode // v-if 节点
     | IfBranchNode // v-else, v-else-if 分支节点
     | ForNode // v-ofr 节点
     | TextCallNode // ???
   
   
   ```

   

2. loc 一个 SourceLoation 类型的结构，默认值为 `locStub`

   ```ts
   export const locStub: SourceLocation = {
     source: '',
     start: { line: 1, column: 1, offset: 0 },
     end: { line: 1, column: 1, offset: 0 }
   }
   ```

代码：

```ts
export function createRoot(
  children: TemplateChildNode[],
  loc = locStub
): RootNode {
  return {
    type: NodeTypes.ROOT,
    children,
    helpers: [],
    components: [],
    directives: [],
    hoists: [],
    imports: [],
    cached: 0,
    temps: 0,
    codegenNode: undefined,
    loc
  }
}
```

# utils.ts

## advancePositionWithMutation(pos,source, numberOfCharacters)

<span id="util-advancepositionwithmutation"></span>

更新context的 line，column，offset的值

```ts
// advance by mutation without cloning (for performance reasons), since this
// gets called a lot in the parser
export function advancePositionWithMutation(
  pos: Position,
  source: string,
  numberOfCharacters: number = source.length
): Position {
  let linesCount = 0
  let lastNewLinePos = -1
  for (let i = 0; i < numberOfCharacters; i++) {
    if (source.charCodeAt(i) === 10 /* newline char code */) {
      linesCount++
      lastNewLinePos = i
    }
  }

  pos.offset += numberOfCharacters
  pos.line += linesCount
  pos.column =
    lastNewLinePos === -1
      ? pos.column + numberOfCharacters
      : numberOfCharacters - lastNewLinePos

  return pos
}
```



# 变量声明

该模块相关的一些全局变量信息。

## 枚举类型

### <span id="td-vars-textmodes"></span>TextModes

```ts
export const enum TextModes {
  //          | Elements | Entities | End sign              | Inside of
  DATA, //    | ✔        | ✔        | End tags of ancestors |
  RCDATA, //  | ✘        | ✔        | End tag of the parent | <textarea>
  RAWTEXT, // | ✘        | ✘        | End tag of the parent | <style>,<script>
  CDATA,
  ATTRIBUTE_VALUE
}
```

转换成 javascript：

```js
export const TextModes = {
  //             | Elements | Entities | End sign              | Inside of
  DATA: 0, //    | ✔        | ✔        | End tags of ancestors |
  RCDATA: 1, //  | ✘        | ✔        | End tag of the parent | <textarea>
  RAWTEXT: 2, // | ✘        | ✘        | End tag of the parent | <style>,<script>
  CDATA: 3,
  ATTRIBUTE_VALUE: 4,
}
```



## parser

### defaultParserOptions

```ts
// 默认的解析器选项
export const defaultParserOptions: MergedParserOptions = {
  delimiters: [`{{`, `}}`],
  getNamespace: () => Namespaces.HTML, // 命名空间
  getTextMode: () => TextModes.DATA, // 文本类型
  isVoidTag: NO, // 自关闭标签???，如：<img>, <hr> ...
  isPreTag: NO, // <pre> 代码标签???，需要保留空格保证缩进的
  isCustomElement: NO, // 自定义标签，如：Transition
  decodeEntities: (rawText: string): string => 
  	// 解码实例，一些特殊符号表示，如：&gt;, &lt;, &amp;, &apos; &quot;
    rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
  onError: defaultOnError
}
```

使用到的其他全局变量：

```ts
const decodeRE = /&(gt|lt|amp|apos|quot);/g
const decodeMap: Record<string, string> = {
  gt: '>',
  lt: '<',
  amp: '&',
  apos: "'",
  quot: '"'
}
```



# 类型声明

该模块所有类型声明统一归类到此，顺序按照用例解析遇到的顺序为主。

## ast.ts

### ElementNode

<span id="td-ast-elementnode"></span>

```ts
export type ElementNode =
  | PlainElementNode
  | ComponentNode
  | SlotOutletNode
  | TemplateNode


```



### TemplateChildNode

<span id="td-ast-tcn"></span>

模板子孙节点的可能类型组合：

```ts
export type TemplateChildNode =
  | ElementNode // 节元素点类型
  | InterpolationNode // 插值节点
  | CompoundExpressionNode // 混合表达式节点
  | TextNode // 文本节点
  | CommentNode // 注释节点
  | IfNode // v-if 节点
  | IfBranchNode // v-else, v-else-if 分支节点
  | ForNode // v-ofr 节点
  | TextCallNode // ???

```



### RootNode

<span id="td-ast-rootnode"></span>

```ts
export interface RootNode extends Node {
  type: NodeTypes.ROOT
  children: TemplateChildNode[]
  helpers: symbol[]
  components: string[]
  directives: string[]
  hoists: (JSChildNode | null)[]
  imports: ImportItem[]
  cached: number
  temps: number
  ssrHelpers?: symbol[]
  codegenNode?: TemplateChildNode | JSChildNode | BlockStatement | undefined
}
```



## ParserOptions

<span id="td-parser-options"></span>

定义位置：*<font color="purple"> src/options.ts</font>*

接口内容：

```ts
export interface ParserOptions {
  /**
   * e.g. platform native elements, e.g. <div> for browsers
   */
  isNativeTag?: (tag: string) => boolean
  /**
   * e.g. native elements that can self-close, e.g. <img>, <br>, <hr>
   */
  isVoidTag?: (tag: string) => boolean
  /**
   * e.g. elements that should preserve whitespace inside, e.g. <pre>
   */
  isPreTag?: (tag: string) => boolean
  /**
   * Platform-specific built-in components e.g. <Transition>
   */
  isBuiltInComponent?: (tag: string) => symbol | void
  /**
   * Separate option for end users to extend the native elements list
   */
  isCustomElement?: (tag: string) => boolean
  /**
   * Get tag namespace
   */
  getNamespace?: (tag: string, parent: ElementNode | undefined) => Namespace
  /**
   * Get text parsing mode for this element
   */
  getTextMode?: (
    node: ElementNode,
    parent: ElementNode | undefined
  ) => TextModes
  /**
   * @default ['{{', '}}']
   */
  delimiters?: [string, string]
  /**
   * Only needed for DOM compilers
   */
  decodeEntities?: (rawText: string, asAttr: boolean) => string
  onError?: (error: CompilerError) => void
}
```

字段说明：

1. `isNativeTag?: (tag: string) => boolean` 一个函数，判断标签是否是原生标签(如：li, div)
2. `isVoidTag?: (tag: string) => boolean`,自关闭标签，如：img, br, hr
3. `isPreTag?: (tag: string) => boolean`，代码标签，需要空格缩进的，如：pre
4. `isBuiltInComponent?: (tag: string) => symbol | void`，平台相关的内置组件，如：Transition
5. `isCoustomElement?: (tag: string) => boolean`，用户自定的标签
6. `getNamespace?: (tag: string, parent: ElementNode | undefined) => N⁄amespace` ，获取标签命名空间
7. `getTextMode?: (node: ElementNode, parent: ElementNode|undefined) => TextModes`获取文本解析模式
8. `delimiters?: [string, string]`，插值分隔符，默认：`['{{', '}}']`
9. `decodeEntities?: (rawText: string, asAttr: boolean) => string`，仅用于 DOM compilers
10. `onError?: (error: CompilerError) => void `

## ParserContext

<span id="td-parser-context"></span>

定义位置：*<font color="purple"> src/parse.ts</font>*

接口内容：

```ts
export interface ParserContext {
  options: MergedParserOptions // 解析器选项，即合并之后的参数对象
  readonly originalSource: string // 最初的源码，即解析之前的最原始的字符串，只读版本
  source: string // 解析中的源码字符串，会发生变化的字符串
  offset: number // 解析的指针位置，类似文件读取是的指针偏移量
  line: number // 解析位置在源码中的当前行
  column: number // 解析位置在源码中的当前列
  inPre: boolean // 标识是不是 <pre> 标签，如果是需要保留空格保证缩进
  inVPre: boolean // v-pre 指令，不处理指令和插值(v-xxx, {{...}})
}
```

# 阶段代码记录

<span id="stage-codes"></span>

1. [text01: some text 的代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/text-test-01-some-text)<span id="link-01"></span>
2. [text02: some text \<div> 01 代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/text-test-02-some-text-div-01)<span id="link-02"></span>
3. [text02: some text \<div> 02 代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/text-test-02-some-text-div-02)<span id="link-03"></span>
4. [text03: some {{ foo + bar }} text 代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/text-test-03-interpolation)<span id="link-04"></span>
5. [text04: some {{ a<b && c>d }} text 代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/text-test-03-interpolation)<span id="link-05"></span>
6. [comment: <!--x-->注释解析代码备份](https://github.com/gcclll/vue-next-code-read/tree/master/bakups/compiler-core/comment-test)<span id="link-06"></span>



# 问题/疑问列表

<span id="issues"></span>

1. <font color="red">如何区分内置标签|内置组件|核心组件|自定义组件？[🛫](#parse-parsetag-04)</font>

2. <font color="red">为什么 [parseTag](#parse-parsetag) 解析 `<div>` 之后只会得到 `<div` 而不会将 `>` 解析进去？[🛫](#parse-parseelement)</font>
   答：是因为我们漏掉实现了一部分代码，自闭合标签的检测，移动指针(2/1位)

   ```js
   function parseTag(context, type) {
     // .... 省略
     
     
     // TODO-3 <div/> 自闭标签
     // 这里要实现，不然最后解析完成之后 source 会是：>...</span>
     // 需要检测下是不是自闭合标签来移动指针位置
     let isSelfClosing = false
     if (context.source.length === 0) {
       emitError(context, ErrorCodes.EOF_IN_TAG)
     } else {
       // some <div> ... </div> 到这里的 source = > ... </div>
       // 所以可以检测是不是以 /> 开头的
       isSelfClosing = context.source.startsWith('/>')
       if (type === TagType.End && isSelfClosing) {
         emitError(context, ErrorCodes.END_TAG_WITH_TRAILING_SOLIDUS)
       }
       // 如果是自闭合指针移动两位(/>)，否则只移动一位(>)
       // 到这里 source = ... </div>
       advanceBy(context, isSelfClosing ? 2 : 1)
     }
     
     // ... 省略
   }
   ```

3. <font color="red">为什么 [parseElement](#parse-parseelement) 解析 children 的时候先 ancestors.push(element) 解析之后又 pop() 掉？
   </font>
   答：要回到这个问题要从 parseChildren 和 parseElement 两个函数结合来看，如下代码分析

   ```ts
   // 解析流程(用例5)：
   // 1. 先 parseChildren(context, mode, ancestors) 
   // 解析 `some <span>{{ foo < bar + foo }} text</span>`
   //   1) 首先得到的是 `some ` 文本节点
   //   2) 检测到 <span> 进入标签解析 parseElement(context, ancestors) 注意这里的 		//				ancestors，是由 parseChildren 继承过来的
   // 2. 进入 parseElement 解析进程
   //   	1) 遇到 <span> 解析出标签节点 span
   //   	2) 在自身函数内检测到标签内还有内容，重新调用 parseChildren(..., ancestors) 
   //    3) 所以重点来了
   // ...
   // ...
   // ancestors 是 parseChildren 传递过来的，parseElement 里面将
   // push 的目的：让子节点有所依赖，知道自己的父级是谁，但好像 parseChildren 里面用到 
   // 		parent 也是为了获取命名空间去用了
   // pop 的目的：难道是为了不污染 ancestors ???
   ```

   好像还不是很明确为何要 push->pop。

# 流程图

<span id="flowchart-list"></span>

由于有些流程图挺大的，内容多，因此放到最后。

## 带指令的模板/标签解析

实例：

1. 用例：[05-template element with directives](#test-element-05)
2. more...

图片完整地址：http://qiniu.ii6g.com/test-element-directive.png?imageMogr2/thumbnail/!100p

![](http://qiniu.ii6g.com/test-element-directive.png?imageMogr2/thumbnail/!100p)














