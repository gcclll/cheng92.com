var VueCompilerCore = (function (exports) {
  "use strict";

  const EMPTY_OBJ = Object.freeze({});
  const EMPTY_ARR = Object.freeze([]);
  /**
   * Always return false.
   */
  const NO = () => false;
  const extend = Object.assign;
  const isArray = Array.isArray;

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
    // const parent = last(ancestors)
    // const ns = parent ? parent.ns : Namespaces.HTML
    const nodes = [];
    // TODO while is end
    while (!isEnd(context, mode, ancestors)) {
      const s = context.source;
      let node = undefined;
      if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
        if (!context.inVPre && startsWith(s, context.options.delimiters[0]));
        else if (mode === 0 /* DATA */ && s[0] === "<") {
          if (s.length === 1) {
            emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1);
          } else if (s[1] === "!") {
            // <!
            if (startsWith(s, "<!--")) {
              // 注释
              node = parseComment(context);
            }
          }
        }
        // TODO
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
    // TODO 空格和空字符串节点合并
    return nodes;
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
    module.exports = VueCompilerCore;
  }
} catch (e) {}
