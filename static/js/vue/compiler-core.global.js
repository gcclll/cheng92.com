var VueCompilerCore = (function (exports) {
  "use strict";

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */
  function makeMap(str, expectsLowerCase) {
    const map = Object.create(null);
    const list = str.split(",");
    for (let i = 0; i < list.length; i++) {
      map[list[i]] = true;
    }
    return expectsLowerCase
      ? (val) => !!map[val.toLowerCase()]
      : (val) => !!map[val];
  }

  const EMPTY_OBJ = Object.freeze({});
  const EMPTY_ARR = Object.freeze([]);
  /**
   * Always return false.
   */
  const NO = () => false;
  const extend = Object.assign;
  const isArray = Array.isArray;
  const cacheStringFunction = (fn) => {
    const cache = Object.create(null);
    return (str) => {
      const hit = cache[str];
      return hit || (cache[str] = fn(str));
    };
  };
  const hyphenateRE = /\B([A-Z])/g;
  /**
   * @private
   */
  const hyphenate = cacheStringFunction((str) =>
    str.replace(hyphenateRE, "-$1").toLowerCase()
  );

  // AST Utilities ---------------------------------------------------------------
  // Some expressions, e.g. sequence and conditional expressions, are never
  // associated with template nodes, so their source locations are just a stub.
  // Container types like CompoundExpression also don't need a real location.
  const locStub = {
    source: "",
    start: { line: 1, column: 1, offset: 0 },
    end: { line: 1, column: 1, offset: 0 },
  };
  function createRoot(children, loc = locStub) {
    return {
      type: 0 /* ROOT */,
      children,
      helpers: [],
      components: [],
      directives: [],
      hoists: [],
      imports: [],
      cached: 0,
      temps: 0,
      codegenNode: undefined,
      loc,
    };
  }

  function defaultOnError(error) {
    throw error;
  }
  function createCompilerError(code, loc, messages, additionalMessage) {
    const msg = (messages || errorMessages)[code] + (additionalMessage || ``);
    const error = new SyntaxError(String(msg));
    error.code = code;
    error.loc = loc;
    return error;
  }
  const errorMessages = {
    // parse errors
    [0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */]: "Illegal comment.",
    [1 /* CDATA_IN_HTML_CONTENT */]: "CDATA section is allowed only in XML context.",
    [2 /* DUPLICATE_ATTRIBUTE */]: "Duplicate attribute.",
    [3 /* END_TAG_WITH_ATTRIBUTES */]: "End tag cannot have attributes.",
    [4 /* END_TAG_WITH_TRAILING_SOLIDUS */]: "Illegal '/' in tags.",
    [5 /* EOF_BEFORE_TAG_NAME */]: "Unexpected EOF in tag.",
    [6 /* EOF_IN_CDATA */]: "Unexpected EOF in CDATA section.",
    [7 /* EOF_IN_COMMENT */]: "Unexpected EOF in comment.",
    [8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */]: "Unexpected EOF in script.",
    [9 /* EOF_IN_TAG */]: "Unexpected EOF in tag.",
    [10 /* INCORRECTLY_CLOSED_COMMENT */]: "Incorrectly closed comment.",
    [11 /* INCORRECTLY_OPENED_COMMENT */]: "Incorrectly opened comment.",
    [12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */]: "Illegal tag name. Use '&lt;' to print '<'.",
    [13 /* MISSING_ATTRIBUTE_VALUE */]: "Attribute value was expected.",
    [14 /* MISSING_END_TAG_NAME */]: "End tag name was expected.",
    [15 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */]: "Whitespace was expected.",
    [16 /* NESTED_COMMENT */]: "Unexpected '<!--' in comment.",
    [17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */]: "Attribute name cannot contain U+0022 (\"), U+0027 ('), and U+003C (<).",
    [18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */]: "Unquoted attribute value cannot contain U+0022 (\"), U+0027 ('), U+003C (<), U+003D (=), and U+0060 (`).",
    [19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */]: "Attribute name cannot start with '='.",
    [21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */]: "'<?' is allowed only in XML context.",
    [22 /* UNEXPECTED_SOLIDUS_IN_TAG */]: "Illegal '/' in tags.",
    // Vue-specific parse errors
    [23 /* X_INVALID_END_TAG */]: "Invalid end tag.",
    [24 /* X_MISSING_END_TAG */]: "Element is missing end tag.",
    [25 /* X_MISSING_INTERPOLATION_END */]: "Interpolation end sign was not found.",
    [26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */]:
      "End bracket for dynamic directive argument was not found. " +
      "Note that dynamic directive argument cannot contain spaces.",
    // transform errors
    [27 /* X_V_IF_NO_EXPRESSION */]: `v-if/v-else-if is missing expression.`,
    [28 /* X_V_IF_SAME_KEY */]: `v-if/else branches must use unique keys.`,
    [29 /* X_V_ELSE_NO_ADJACENT_IF */]: `v-else/v-else-if has no adjacent v-if.`,
    [30 /* X_V_FOR_NO_EXPRESSION */]: `v-for is missing expression.`,
    [31 /* X_V_FOR_MALFORMED_EXPRESSION */]: `v-for has invalid expression.`,
    [32 /* X_V_FOR_TEMPLATE_KEY_PLACEMENT */]: `<template v-for> key should be placed on the <template> tag.`,
    [33 /* X_V_BIND_NO_EXPRESSION */]: `v-bind is missing expression.`,
    [34 /* X_V_ON_NO_EXPRESSION */]: `v-on is missing expression.`,
    [35 /* X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */]: `Unexpected custom directive on <slot> outlet.`,
    [36 /* X_V_SLOT_MIXED_SLOT_USAGE */]:
      `Mixed v-slot usage on both the component and nested <template>.` +
      `When there are multiple named slots, all slots should use <template> ` +
      `syntax to avoid scope ambiguity.`,
    [37 /* X_V_SLOT_DUPLICATE_SLOT_NAMES */]: `Duplicate slot names found. `,
    [38 /* X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN */]:
      `Extraneous children found when component already has explicitly named ` +
      `default slot. These children will be ignored.`,
    [39 /* X_V_SLOT_MISPLACED */]: `v-slot can only be used on components or <template> tags.`,
    [40 /* X_V_MODEL_NO_EXPRESSION */]: `v-model is missing expression.`,
    [41 /* X_V_MODEL_MALFORMED_EXPRESSION */]: `v-model value must be a valid JavaScript member expression.`,
    [42 /* X_V_MODEL_ON_SCOPE_VARIABLE */]: `v-model cannot be used on v-for or v-slot scope variables because they are not writable.`,
    [43 /* X_INVALID_EXPRESSION */]: `Error parsing JavaScript expression: `,
    [44 /* X_KEEP_ALIVE_INVALID_CHILDREN */]: `<KeepAlive> expects exactly one child component.`,
    // generic errors
    [45 /* X_PREFIX_ID_NOT_SUPPORTED */]: `"prefixIdentifiers" option is not supported in this build of compiler.`,
    [46 /* X_MODULE_MODE_NOT_SUPPORTED */]: `ES module mode is not supported in this build of compiler.`,
    [47 /* X_CACHE_HANDLER_NOT_SUPPORTED */]: `"cacheHandlers" option is only supported when the "prefixIdentifiers" option is enabled.`,
    [48 /* X_SCOPE_ID_NOT_SUPPORTED */]: `"scopeId" option is only supported in module mode.`,
  };

  const TELEPORT = Symbol(`Teleport`);
  const SUSPENSE = Symbol(`Suspense`);
  const KEEP_ALIVE = Symbol(`KeepAlive`);
  const BASE_TRANSITION = Symbol(`BaseTransition`);

  const isBuiltInType = (tag, expected) =>
    tag === expected || tag === hyphenate(expected);
  function isCoreComponent(tag) {
    if (isBuiltInType(tag, "Teleport")) {
      return TELEPORT;
    } else if (isBuiltInType(tag, "Suspense")) {
      return SUSPENSE;
    } else if (isBuiltInType(tag, "KeepAlive")) {
      return KEEP_ALIVE;
    } else if (isBuiltInType(tag, "BaseTransition")) {
      return BASE_TRANSITION;
    }
  }
  function advancePositionWithClone(
    pos,
    source,
    numberOfCharacters = source.length
  ) {
    return advancePositionWithMutation(
      extend({}, pos),
      source,
      numberOfCharacters
    );
  }
  // advance by mutation without cloning (for performance reasons), since this
  // gets called a lot in the parser
  function advancePositionWithMutation(
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

  // The default decoder only provides escapes for characters reserved as part of
  // the template syntax, and is only used if the custom renderer did not provide
  // a platform-specific decoder.
  const decodeRE = /&(gt|lt|amp|apos|quot);/g;
  const decodeMap = {
    gt: ">",
    lt: "<",
    amp: "&",
    apos: "'",
    quot: '"',
  };
  const defaultParserOptions = {
    delimiters: [`{{`, `}}`],
    getNamespace: () => 0 /* HTML */,
    getTextMode: () => 0 /* DATA */,
    isVoidTag: NO,
    isPreTag: NO,
    isCustomElement: NO,
    decodeEntities: (rawText) =>
      rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
    onError: defaultOnError,
    comments: false,
  };
  function baseParse(content, options) {
    const context = createParserContext(content, options);
    const start = getCursor(context);
    return createRoot(
      parseChildren(context, 0 /* DATA */, []),
      getSelection(context, start)
    );
  }
  function createParserContext(content, rawOptions) {
    const options = extend({}, defaultParserOptions);
    for (const key in rawOptions) {
      // @ts-ignore
      options[key] = rawOptions[key] || defaultParserOptions[key];
    }
    return {
      options,
      column: 1,
      line: 1,
      offset: 0,
      originalSource: content,
      source: content,
      inPre: false,
      inVPre: false,
    };
  }
  function parseChildren(context, mode, ancestors) {
    const parent = last(ancestors);
    const ns = parent ? parent.ns : 0; /* HTML */
    const nodes = [];
    while (!isEnd(context, mode, ancestors)) {
      const s = context.source;
      let node = undefined;
      if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
        if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
          // '{{'
          node = parseInterpolation(context, mode);
        } else if (mode === 0 /* DATA */ && s[0] === "<") {
          // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
          if (s.length === 1) {
            emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1);
          } else if (s[1] === "!") {
            // <!
            if (startsWith(s, "<!--")) {
              // 注释
              node = parseComment(context);
            } else if (startsWith(s, "<!DOCTYPE")) {
              node = parseBogusComment(context);
            } else if (startsWith(s, "<![CDATA[")) {
              if (ns !== 0 /* HTML */) {
                node = parseCDATA(context, ancestors);
              } else {
                emitError(context, 1 /* CDATA_IN_HTML_CONTENT */);
                node = parseBogusComment(context);
              }
            } else {
              emitError(context, 11 /* INCORRECTLY_OPENED_COMMENT */);
              node = parseBogusComment(context);
            }
          } else if (s[1] === "/") {
            // end tag, </
            if (s.length === 2) {
              emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 2);
            } else if (s[2] === ">") {
              // </>
              emitError(context, 14 /* MISSING_END_TAG_NAME */, 2);
              advanceBy(context, 3);
              continue;
            } else if (/[a-z]/i.test(s[2])) {
              // 非法结束标签，因为结束标签会直接在 parseElement 解析完成
              emitError(context, 23 /* X_INVALID_END_TAG */);
              parseTag(context, 1 /* End */, parent);
              continue;
            } else {
              // 无效的标签名称
              emitError(
                context,
                12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */,
                2
              );
              node = parseBogusComment(context);
            }
          } else if (/[a-z]/i.test(s[1])) {
            // 开始标签
            node = parseElement(context, ancestors);
          } else if (s[1] === "?") {
            emitError(
              context,
              21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */,
              1
            );
            node = parseBogusComment(context);
          } else {
            emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 1);
          }
        }
      }
      // 纯文本节点
      if (!node) {
        node = parseText(context, mode);
      }
      if (isArray(node)) {
        for (let i = 0; i < node.length; i++) {
          pushNode(nodes, node[i]);
        }
      } else {
        pushNode(nodes, node);
      }
    }
    let removedWhitespace = false;
    // 空格和空字符串节点合并
    if (mode !== 2 /* RAWTEXT */) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!context.inPre && node.type === 2 /* TEXT */) {
          if (!/[^\t\r\n\f ]/.test(node.content)) {
            const prev = nodes[i - 1];
            const next = nodes[i + 1];
            // If:
            // - the whitespace is the first or last node, or:
            // - the whitespace is adjacent to a comment, or:
            // - the whitespace is between two elements AND contains newline
            // Then the whitespace is ignored.
            if (
              !prev ||
              !next ||
              prev.type === 3 /* COMMENT */ ||
              next.type === 3 /* COMMENT */ ||
              (prev.type === 1 /* ELEMENT */ &&
                next.type === 1 /* ELEMENT */ &&
                /[\r\n]/.test(node.content))
            ) {
              removedWhitespace = true;
              nodes[i] = null;
            } else {
              // Otherwise, condensed consecutive whitespace inside the text
              // down to a single space
              node.content = " ";
            }
          } else {
            // 空格合并从一个
            node.content = node.content.replace(/[\t\r\n\f ]+/g, " ");
          }
        }
      }
      if (context.inPre && parent && context.options.isPreTag(parent.tag)) {
        // 删除首行空行
        // remove leading newline per html spec
        // https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
        const first = nodes[0];
        if (first && first.type === 2 /* TEXT */) {
          first.content = first.content.replace(/^\r?\n/, "");
        }
      }
    }
    return removedWhitespace ? nodes.filter(Boolean) : nodes;
  }
  function pushNode(nodes, node) {
    if (node.type === 2 /* TEXT */) {
      // 合并两个相邻的文本内容
      const prev = last(nodes);
      // Merge if both this and the previous node are text and those are
      // consecutive. This happens for cases like "a < b".
      if (
        prev &&
        prev.type === 2 /* TEXT */ &&
        prev.loc.end.offset === node.loc.start.offset
      ) {
        prev.content += node.content;
        prev.loc.end = node.loc.end;
        prev.loc.source += node.loc.source;
        return;
      }
    }
    nodes.push(node);
  }
  function parseCDATA(context, ancestors) {
    advanceBy(context, 9);
    const nodes = parseChildren(context, 3 /* CDATA */, ancestors);
    if (context.source.length === 0) {
      emitError(context, 6 /* EOF_IN_CDATA */);
    } else {
      advanceBy(context, 3);
    }
    return nodes;
  }
  function parseComment(context) {
    const start = getCursor(context);
    let content;
    const match = /--(\!)?>/.exec(context.source);
    if (!match) {
      // 非法注释
      content = context.source.slice(4);
      advanceBy(context, context.source.length);
      emitError(context, 7 /* EOF_IN_COMMENT */);
    } else {
      if (match.index <= 3) {
        // 不满足 <!-- -->
        emitError(context, 0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */);
      }
      if (match[1]) {
        // 非法结束 <!-- --!>
        emitError(context, 10 /* INCORRECTLY_CLOSED_COMMENT */);
      }
      // 注释内容
      content = context.source.slice(4, match.index);
      // 嵌套注释
      const s = context.source.slice(0, match.index);
      let prevIndex = 1,
        nestedIndex = 0;
      while ((nestedIndex = s.indexOf("<!--", prevIndex)) !== -1) {
        advanceBy(context, nestedIndex - prevIndex + 1);
        if (nestedIndex + 4 < s.length) {
          emitError(context, 16 /* NESTED_COMMENT */);
        }
        prevIndex = nestedIndex + 1;
      }
      advanceBy(context, match.index + match[0].length - prevIndex + 1);
    }
    return {
      type: 3 /* COMMENT */,
      content,
      loc: getSelection(context, start),
    };
  }
  function parseBogusComment(context) {
    const start = getCursor(context);
    const contentStart = context.source[1] === "?" ? 1 : 2;
    let content;
    // 结束
    const closeIndex = context.source.indexOf(">");
    if (closeIndex === -1) {
      content = context.source.slice(contentStart);
      advanceBy(context, context.source.length);
    } else {
      content = context.source.slice(contentStart, closeIndex);
      advanceBy(context, closeIndex + 1);
    }
    return {
      type: 3 /* COMMENT */,
      content,
      loc: getSelection(context, start),
    };
  }
  function parseElement(context, ancestors) {
    const wasInPre = context.inPre;
    const wasInVPre = context.inVPre;
    const parent = last(ancestors);
    // 解析出开始标签
    const element = parseTag(context, 0 /* Start */, parent);
    const isPreBoundray = context.inPre && !wasInPre;
    const isVPreBoundray = context.inVPre && !wasInVPre;
    if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {
      return element;
    }
    ancestors.push(element);
    const mode = context.options.getTextMode(element, parent);
    const children = parseChildren(context, mode, ancestors);
    // 要将孩子节点解析完成的 parent element pop 掉，待处理下一个 parent 的 children
    ancestors.pop();
    element.children = children;
    if (startsWithEndTagOpen(context.source, element.tag)) {
      // 结束标签
      parseTag(context, 1 /* End */, parent);
    } else {
      emitError(context, 24 /* X_MISSING_END_TAG */, 0, element.loc.start);
      if (
        context.source.length === 0 &&
        element.tag.toLowerCase() === "script"
      ) {
        const first = children[0];
        if (first && startsWith(first.loc.source, "<!--")) {
          emitError(context, 8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */);
        }
      }
    }
    element.loc = getSelection(context, element.loc.start);
    if (isPreBoundray) {
      context.inPre = false;
    }
    if (isVPreBoundray) {
      context.inVPre = false;
    }
    return element;
  }
  const isSpecialTemplateDirective = /*#__PURE__*/ makeMap(
    `if,else,else-if,for,slot`
  );
  function parseTag(context, type, parent) {
    // 开始标签
    const start = getCursor(context);
    const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);
    const tag = match[1];
    const ns = context.options.getNamespace(tag, parent);
    advanceBy(context, match[0].length);
    advanceSpaces(context);
    // 保存当前状态，待会需要回过头来解析属性
    const cursor = getCursor(context);
    const currentSource = context.source;
    // 解析属性
    let props = parseAttributes(context, type);
    if (context.options.isPreTag(tag)) {
      context.inPre = true;
    }
    // v-pre 指令, 需要有上面的属性解析步骤
    if (
      !context.inVPre &&
      props.some((p) => p.type === 7 /* DIRECTIVE */ && p.name === "pre")
    ) {
      context.inVPre = true;
      extend(context, cursor);
      context.source = currentSource;
      // 重新解析属性并且将 v-pre 过滤出来
      props = parseAttributes(context, type).filter((p) => p.name !== "v-pre");
    }
    // 结束标签
    let isSelfClosing = false;
    if (context.source.length === 0) {
      emitError(context, 9 /* EOF_IN_TAG */);
    } else {
      // <div ... />
      isSelfClosing = startsWith(context.source, "/>");
      // 到这里不应该是 End 标签
      if (type === 1 /* End */ && isSelfClosing) {
        emitError(context, 4 /* END_TAG_WITH_TRAILING_SOLIDUS */);
      }
      advanceBy(context, isSelfClosing ? 2 : 1);
    }
    let tagType = 0; /* ELEMENT */
    const options = context.options;
    // 标签类型解析，非 v-pre 元素且不是自定义类型
    if (!context.inVPre && !options.isCustomElement(tag)) {
      // v-is
      const hasVIs = props.some(
        (p) => p.type === 7 /* DIRECTIVE */ && p.name === "is"
      );
      if (options.isNativeTag && !hasVIs) {
        if (!options.isNativeTag(tag)) {
          tagType = 1 /* COMPONENT */;
        }
      } else if (
        hasVIs ||
        isCoreComponent(tag) ||
        (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
        /^[A-Z]/.test(tag) ||
        tag === "component"
      ) {
        tagType = 1 /* COMPONENT */;
      }
      if (tag === "slot") {
        tagType = 2 /* SLOT */;
      } else if (
        tag === "template" &&
        props.some((p) => {
          return (
            p.type === 7 /* DIRECTIVE */ && isSpecialTemplateDirective(p.name)
          );
        })
      ) {
        tagType = 3 /* TEMPLATE */;
      }
    }
    return {
      type: 1 /* ELEMENT */,
      ns,
      tag,
      tagType,
      props,
      isSelfClosing,
      children: [],
      loc: getSelection(context, start),
      codegenNode: undefined,
    };
  }
  function parseAttributes(context, type) {
    const props = [];
    const attributeNames = new Set();
    while (
      context.source.length > 0 &&
      !startsWith(context.source, ">") &&
      !startsWith(context.source, "/>")
    ) {
      if (startsWith(context.source, "/")) {
        emitError(context, 22 /* UNEXPECTED_SOLIDUS_IN_TAG */);
        advanceBy(context, 1);
        advanceSpaces(context);
        continue;
      }
      if (type === 1 /* End */) {
        emitError(context, 3 /* END_TAG_WITH_ATTRIBUTES */);
      }
      const attr = parseAttribute(context, attributeNames);
      if (type === 0 /* Start */) {
        props.push(attr);
      }
      // 必须有空格分割属性
      if (/^[^\t\r\n\f />]/.test(context.source)) {
        emitError(context, 15 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */);
      }
      advanceSpaces(context);
    }
    return props;
  }
  function parseAttribute(context, nameSet) {
    // 属性名
    const start = getCursor(context);
    // 匹配等号前的内容，属性名
    const match = /^[^\t\r\n\f />][^\t\r\n\f />=]*/.exec(context.source);
    const name = match[0];
    if (nameSet.has(name)) {
      emitError(context, 2 /* DUPLICATE_ATTRIBUTE */);
    }
    nameSet.add(name);
    if (name[0] === "=") {
      // 不能用 `=` 做属性名
      emitError(context, 19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */);
    }
    {
      const pattern = /["'<]/g;
      let m;
      // 属性名中不能有 ", ', <
      while ((m = pattern.exec(name))) {
        emitError(
          context,
          17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */,
          m.index
        );
      }
    }
    advanceBy(context, name.length);
    let value = undefined;
    if (/^[\t\r\n\f ]*=/.test(context.source)) {
      advanceSpaces(context);
      advanceBy(context, 1); // =
      advanceSpaces(context); // = 后面的空格
      // 解析出属性值
      value = parseAttributeValue(context);
      if (!value) {
        emitError(context, 13 /* MISSING_ATTRIBUTE_VALUE */);
      }
    }
    const loc = getSelection(context, start);
    if (!context.inVPre && /^(v-|:|@|#)/.test(name)) {
      // 指令匹配，四个捕获组含义
      // 1. v-bind,v-for,v-if
      // 2. :, @, # 指令缩写
      // 3. [name] 动态属性名
      // 4. name.modifier 修饰符
      const match = /(?:^v-([a-z0-9]+))?(?:(?::|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(
        name
      );
      // 缩写指令替换成指令单词
      const dirName =
        match[1] ||
        (startsWith(name, ":")
          ? "bind"
          : startsWith(name, "@")
          ? "on"
          : "slot");
      let arg;
      if (match[2]) {
        const isSlot = dirName === "slot";
        const startOffset = name.indexOf(match[2]);
        const loc = getSelection(
          context,
          getNewPosition(context, start, startOffset),
          getNewPosition(
            context,
            start,
            startOffset + match[2].length + ((isSlot && match[3]) || "").length
          )
        );
        let content = match[2];
        let isStatic = true;
        if (content.startsWith("[")) {
          isStatic = false;
          if (!content.endsWith("]")) {
            emitError(
              context,
              26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */
            );
          }
          content = content.substr(1, content.length - 2);
        } else if (isSlot) {
          // #1241 special case for v-slot: vuetify relies extensively on slot
          // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
          // supports such usage so we are keeping it consistent with 2.x.
          content += match[3] || "";
        }
        arg = {
          type: 4 /* SIMPLE_EXPRESSION */,
          content,
          isStatic,
          isConstant: isStatic,
          loc,
        };
      }
      if (value && value.isQuoted) {
        const valueLoc = value.loc;
        valueLoc.start.offset++;
        valueLoc.start.column++;
        valueLoc.end = advancePositionWithClone(valueLoc.start, value.content);
        valueLoc.source = valueLoc.source.slice(1, -1);
      }
      return {
        type: 7 /* DIRECTIVE */,
        name: dirName,
        exp: value && {
          type: 4 /* SIMPLE_EXPRESSION */,
          content: value.content,
          isStatic: false,
          // Treat as non-constant by default. This can be potentially set to
          // true by `transformExpression` to make it eligible for hoisting.
          isConstant: false,
          loc: value.loc,
        },
        arg,
        modifiers: match[3] ? match[3].substr(1).split(".") : [],
        loc,
      };
    }
    return {
      type: 6 /* ATTRIBUTE */,
      name,
      value: value && {
        type: 2 /* TEXT */,
        content: value.content,
        loc: value.loc,
      },
      loc,
    };
  }
  function parseAttributeValue(context) {
    const start = getCursor(context);
    let content;
    const quote = context.source[0];
    const isQuoted = quote === `"` || quote === `'`;
    if (isQuoted) {
      // Quoted value.
      advanceBy(context, 1);
      const endIndex = context.source.indexOf(quote);
      if (endIndex === -1) {
        content = parseTextData(
          context,
          context.source.length,
          4 /* ATTRIBUTE_VALUE */
        );
      } else {
        content = parseTextData(context, endIndex, 4 /* ATTRIBUTE_VALUE */);
        advanceBy(context, 1);
      }
    } else {
      // Unquoted
      const match = /^[^\t\r\n\f >]+/.exec(context.source);
      if (!match) {
        return undefined;
      }
      const unexpectedChars = /["'<=`]/g;
      let m;
      while ((m = unexpectedChars.exec(match[0]))) {
        emitError(
          context,
          18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */,
          m.index
        );
      }
      content = parseTextData(
        context,
        match[0].length,
        4 /* ATTRIBUTE_VALUE */
      );
    }
    return { content, isQuoted, loc: getSelection(context, start) };
  }
  function parseInterpolation(context, mode) {
    const [open, close] = context.options.delimiters;
    const closeIndex = context.source.indexOf(close, open.length);
    if (closeIndex === -1) {
      emitError(context, 25 /* X_MISSING_INTERPOLATION_END */);
      return undefined;
    }
    const start = getCursor(context);
    advanceBy(context, open.length);
    const innerStart = getCursor(context);
    const innerEnd = getCursor(context);
    // 插值内容长度
    const rawContentLength = closeIndex - open.length;
    const rawContent = context.source.slice(0, rawContentLength);
    // html 语义化符号替换
    const preTrimContent = parseTextData(context, rawContentLength, mode);
    // 去掉前后空格
    const content = preTrimContent.trim();
    // 去掉空格后的内容所在的索引位置
    const startOffset = preTrimContent.indexOf(content);
    if (startOffset > 0) {
      advancePositionWithMutation(innerStart, rawContent, startOffset);
    }
    const endOffset =
      rawContentLength - (preTrimContent.length - content.length - startOffset);
    advancePositionWithMutation(innerEnd, rawContent, endOffset);
    advanceBy(context, close.length);
    return {
      type: 5 /* INTERPOLATION */,
      content: {
        type: 4 /* SIMPLE_EXPRESSION */,
        isStatic: false,
        isConstant: false,
        content,
        loc: getSelection(context, innerStart, innerEnd),
      },
      loc: getSelection(context, start),
    };
  }
  function parseText(context, mode) {
    const endTokens = ["<", context.options.delimiters[0]];
    if (mode === 3 /* CDATA */) {
      endTokens.push("]]>");
    }
    let endIndex = context.source.length;
    // 找到遇到的第一个结束符 }}, <
    for (let i = 0; i < endTokens.length; i++) {
      const index = context.source.indexOf(endTokens[i], 1);
      if (index !== -1 && endIndex > index) {
        endIndex = index;
      }
    }
    const start = getCursor(context);
    const content = parseTextData(context, endIndex, mode);
    return {
      type: 2 /* TEXT */,
      content,
      loc: getSelection(context, start),
    };
  }
  /**
   * Get text data with a given length from the current location.
   * This translates HTML entities in the text data.
   */
  function parseTextData(context, length, mode) {
    const rawText = context.source.slice(0, length);
    advanceBy(context, length);
    if (
      mode === 2 /* RAWTEXT */ ||
      mode === 3 /* CDATA */ ||
      rawText.indexOf("&") === -1
    ) {
      return rawText;
    } else {
      // DATA or RCDATA containing "&"". Entity decoding required.
      return context.options.decodeEntities(
        rawText,
        mode === 4 /* ATTRIBUTE_VALUE */
      );
    }
  }
  function getCursor(context) {
    const { column, line, offset } = context;
    return { column, line, offset };
  }
  function getSelection(context, start, end) {
    end = end || getCursor(context);
    return {
      start,
      end,
      source: context.originalSource.slice(start.offset, end.offset),
    };
  }
  function last(xs) {
    return xs[xs.length - 1];
  }
  function startsWith(source, searchString) {
    return source.startsWith(searchString);
  }
  function advanceBy(context, numberOfCharacters) {
    const { source } = context;
    advancePositionWithMutation(context, source, numberOfCharacters);
    context.source = source.slice(numberOfCharacters);
  }
  function advanceSpaces(context) {
    const match = /^[\t\r\n\f ]+/.exec(context.source);
    if (match) {
      advanceBy(context, match[0].length);
    }
  }
  function getNewPosition(context, start, numberOfCharacters) {
    return advancePositionWithClone(
      start,
      context.originalSource.slice(start.offset, numberOfCharacters),
      numberOfCharacters
    );
  }
  function emitError(context, code, offset, loc = getCursor(context)) {
    if (offset) {
      loc.offset += offset;
      loc.column += offset;
    }
    context.options.onError(
      createCompilerError(code, {
        start: loc,
        end: loc,
        source: "",
      })
    );
  }
  function isEnd(context, mode, ancestors) {
    const s = context.source;
    switch (mode) {
      case 0 /* DATA */:
        if (startsWith(s, "</")) {
          //TODO: probably bad performance
          for (let i = ancestors.length - 1; i >= 0; --i) {
            if (startsWithEndTagOpen(s, ancestors[i].tag)) {
              return true;
            }
          }
        }
        break;
      case 1 /* RCDATA */:
      case 2 /* RAWTEXT */: {
        const parent = last(ancestors);
        if (parent && startsWithEndTagOpen(s, parent.tag)) {
          return true;
        }
        break;
      }
      case 3 /* CDATA */:
        if (startsWith(s, "]]>")) {
          return true;
        }
        break;
    }
    return !s;
  }
  function startsWithEndTagOpen(source, tag) {
    return (
      startsWith(source, "</") &&
      source.substr(2, tag.length).toLowerCase() === tag.toLowerCase() &&
      /[\t\r\n\f />]/.test(source[2 + tag.length] || ">")
    );
  }

  exports.baseParse = baseParse;

  Object.defineProperty(exports, "__esModule", { value: true });

  return exports;
})({});

try {
  if (module) {
    module.exports = VueCompilerCode;
  }
} catch (e) {}
