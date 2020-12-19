var VueCompilerDOM = (function (exports) {
  'use strict';

  /**
   * Make a map and return a function for checking if a key
   * is in that map.
   * IMPORTANT: all calls of this function must be prefixed with
   * \/\*#\_\_PURE\_\_\*\/
   * So that rollup can tree-shake them if necessary.
   */
  function makeMap(str, expectsLowerCase) {
      const map = Object.create(null);
      const list = str.split(',');
      for (let i = 0; i < list.length; i++) {
          map[list[i]] = true;
      }
      return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
  }

  /**
   * dev only flag -> name mapping
   */
  const PatchFlagNames = {
      [1 /* TEXT */]: `TEXT`,
      [2 /* CLASS */]: `CLASS`,
      [4 /* STYLE */]: `STYLE`,
      [8 /* PROPS */]: `PROPS`,
      [16 /* FULL_PROPS */]: `FULL_PROPS`,
      [32 /* HYDRATE_EVENTS */]: `HYDRATE_EVENTS`,
      [64 /* STABLE_FRAGMENT */]: `STABLE_FRAGMENT`,
      [128 /* KEYED_FRAGMENT */]: `KEYED_FRAGMENT`,
      [256 /* UNKEYED_FRAGMENT */]: `UNKEYED_FRAGMENT`,
      [512 /* NEED_PATCH */]: `NEED_PATCH`,
      [1024 /* DYNAMIC_SLOTS */]: `DYNAMIC_SLOTS`,
      [2048 /* DEV_ROOT_FRAGMENT */]: `DEV_ROOT_FRAGMENT`,
      [-1 /* HOISTED */]: `HOISTED`,
      [-2 /* BAIL */]: `BAIL`
  };

  /**
   * Dev only
   */
  const slotFlagsText = {
      [1 /* STABLE */]: 'STABLE',
      [2 /* DYNAMIC */]: 'DYNAMIC',
      [3 /* FORWARDED */]: 'FORWARDED'
  };

  const range = 2;
  function generateCodeFrame(source, start = 0, end = source.length) {
      const lines = source.split(/\r?\n/);
      let count = 0;
      const res = [];
      for (let i = 0; i < lines.length; i++) {
          count += lines[i].length + 1;
          if (count >= start) {
              for (let j = i - range; j <= i + range || end > count; j++) {
                  if (j < 0 || j >= lines.length)
                      continue;
                  const line = j + 1;
                  res.push(`${line}${' '.repeat(Math.max(3 - String(line).length, 0))}|  ${lines[j]}`);
                  const lineLength = lines[j].length;
                  if (j === i) {
                      // push underline
                      const pad = start - (count - lineLength) + 1;
                      const length = Math.max(1, end > count ? lineLength - pad : end - start);
                      res.push(`   |  ` + ' '.repeat(pad) + '^'.repeat(length));
                  }
                  else if (j > i) {
                      if (end > count) {
                          const length = Math.max(Math.min(end - count, lineLength), 1);
                          res.push(`   |  ` + '^'.repeat(length));
                      }
                      count += lineLength + 1;
                  }
              }
              break;
          }
      }
      return res.join('\n');
  }

  const listDelimiterRE = /;(?![^(]*\))/g;
  const propertyDelimiterRE = /:(.+)/;
  function parseStringStyle(cssText) {
      const ret = {};
      cssText.split(listDelimiterRE).forEach(item => {
          if (item) {
              const tmp = item.split(propertyDelimiterRE);
              tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
          }
      });
      return ret;
  }

  // These tag configs are shared between compiler-dom and runtime-dom, so they
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element
  const HTML_TAGS = 'html,body,base,head,link,meta,style,title,address,article,aside,footer,' +
      'header,h1,h2,h3,h4,h5,h6,hgroup,nav,section,div,dd,dl,dt,figcaption,' +
      'figure,picture,hr,img,li,main,ol,p,pre,ul,a,b,abbr,bdi,bdo,br,cite,code,' +
      'data,dfn,em,i,kbd,mark,q,rp,rt,rtc,ruby,s,samp,small,span,strong,sub,sup,' +
      'time,u,var,wbr,area,audio,map,track,video,embed,object,param,source,' +
      'canvas,script,noscript,del,ins,caption,col,colgroup,table,thead,tbody,td,' +
      'th,tr,button,datalist,fieldset,form,input,label,legend,meter,optgroup,' +
      'option,output,progress,select,textarea,details,dialog,menu,' +
      'summary,template,blockquote,iframe,tfoot';
  // https://developer.mozilla.org/en-US/docs/Web/SVG/Element
  const SVG_TAGS = 'svg,animate,animateMotion,animateTransform,circle,clipPath,color-profile,' +
      'defs,desc,discard,ellipse,feBlend,feColorMatrix,feComponentTransfer,' +
      'feComposite,feConvolveMatrix,feDiffuseLighting,feDisplacementMap,' +
      'feDistanceLight,feDropShadow,feFlood,feFuncA,feFuncB,feFuncG,feFuncR,' +
      'feGaussianBlur,feImage,feMerge,feMergeNode,feMorphology,feOffset,' +
      'fePointLight,feSpecularLighting,feSpotLight,feTile,feTurbulence,filter,' +
      'foreignObject,g,hatch,hatchpath,image,line,linearGradient,marker,mask,' +
      'mesh,meshgradient,meshpatch,meshrow,metadata,mpath,path,pattern,' +
      'polygon,polyline,radialGradient,rect,set,solidcolor,stop,switch,symbol,' +
      'text,textPath,title,tspan,unknown,use,view';
  const VOID_TAGS = 'area,base,br,col,embed,hr,img,input,link,meta,param,source,track,wbr';
  const isHTMLTag = /*#__PURE__*/ makeMap(HTML_TAGS);
  const isSVGTag = /*#__PURE__*/ makeMap(SVG_TAGS);
  const isVoidTag = /*#__PURE__*/ makeMap(VOID_TAGS);

  const EMPTY_OBJ =  Object.freeze({})
      ;
  const EMPTY_ARR =  Object.freeze([]) ;
  const NOOP = () => { };
  /**
   * Always return false.
   */
  const NO = () => false;
  const onRE = /^on[^a-z]/;
  const isOn = (key) => onRE.test(key);
  const extend = Object.assign;
  const isArray = Array.isArray;
  const isString = (val) => typeof val === 'string';
  const isSymbol = (val) => typeof val === 'symbol';
  const isObject = (val) => val !== null && typeof val === 'object';
  const isReservedProp = /*#__PURE__*/ makeMap(
  // the leading comma is intentional so empty string "" is also included
  ',key,ref,' +
      'onVnodeBeforeMount,onVnodeMounted,' +
      'onVnodeBeforeUpdate,onVnodeUpdated,' +
      'onVnodeBeforeUnmount,onVnodeUnmounted');
  const cacheStringFunction = (fn) => {
      const cache = Object.create(null);
      return ((str) => {
          const hit = cache[str];
          return hit || (cache[str] = fn(str));
      });
  };
  const camelizeRE = /-(\w)/g;
  /**
   * @private
   */
  const camelize = cacheStringFunction((str) => {
      return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
  });
  const hyphenateRE = /\B([A-Z])/g;
  /**
   * @private
   */
  const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
  /**
   * @private
   */
  const capitalize = cacheStringFunction((str) => str.charAt(0).toUpperCase() + str.slice(1));
  /**
   * @private
   */
  const toHandlerKey = cacheStringFunction((str) => (str ? `on${capitalize(str)}` : ``));

  const FRAGMENT = Symbol( `Fragment` );
  const TELEPORT = Symbol( `Teleport` );
  const SUSPENSE = Symbol( `Suspense` );
  const KEEP_ALIVE = Symbol( `KeepAlive` );
  const BASE_TRANSITION = Symbol( `BaseTransition` );
  const OPEN_BLOCK = Symbol( `openBlock` );
  const CREATE_BLOCK = Symbol( `createBlock` );
  const CREATE_VNODE = Symbol( `createVNode` );
  const CREATE_COMMENT = Symbol( `createCommentVNode` );
  const CREATE_TEXT = Symbol( `createTextVNode` );
  const CREATE_STATIC = Symbol( `createStaticVNode` );
  const RESOLVE_COMPONENT = Symbol( `resolveComponent` );
  const RESOLVE_DYNAMIC_COMPONENT = Symbol( `resolveDynamicComponent` );
  const RESOLVE_DIRECTIVE = Symbol( `resolveDirective` );
  const WITH_DIRECTIVES = Symbol( `withDirectives` );
  const RENDER_LIST = Symbol( `renderList` );
  const RENDER_SLOT = Symbol( `renderSlot` );
  const CREATE_SLOTS = Symbol( `createSlots` );
  const TO_DISPLAY_STRING = Symbol( `toDisplayString` );
  const MERGE_PROPS = Symbol( `mergeProps` );
  const TO_HANDLERS = Symbol( `toHandlers` );
  const CAMELIZE = Symbol( `camelize` );
  const CAPITALIZE = Symbol( `capitalize` );
  const TO_HANDLER_KEY = Symbol( `toHandlerKey` );
  const SET_BLOCK_TRACKING = Symbol( `setBlockTracking` );
  const PUSH_SCOPE_ID = Symbol( `pushScopeId` );
  const POP_SCOPE_ID = Symbol( `popScopeId` );
  const WITH_SCOPE_ID = Symbol( `withScopeId` );
  const WITH_CTX = Symbol( `withCtx` );
  const UNREF = Symbol( `unref` );
  const IS_REF = Symbol( `isRef` );
  // Name mapping for runtime helpers that need to be imported from 'vue' in
  // generated code. Make sure these are correctly exported in the runtime!
  // Using `any` here because TS doesn't allow symbols as index type.
  const helperNameMap = {
      [FRAGMENT]: `Fragment`,
      [TELEPORT]: `Teleport`,
      [SUSPENSE]: `Suspense`,
      [KEEP_ALIVE]: `KeepAlive`,
      [BASE_TRANSITION]: `BaseTransition`,
      [OPEN_BLOCK]: `openBlock`,
      [CREATE_BLOCK]: `createBlock`,
      [CREATE_VNODE]: `createVNode`,
      [CREATE_COMMENT]: `createCommentVNode`,
      [CREATE_TEXT]: `createTextVNode`,
      [CREATE_STATIC]: `createStaticVNode`,
      [RESOLVE_COMPONENT]: `resolveComponent`,
      [RESOLVE_DYNAMIC_COMPONENT]: `resolveDynamicComponent`,
      [RESOLVE_DIRECTIVE]: `resolveDirective`,
      [WITH_DIRECTIVES]: `withDirectives`,
      [RENDER_LIST]: `renderList`,
      [RENDER_SLOT]: `renderSlot`,
      [CREATE_SLOTS]: `createSlots`,
      [TO_DISPLAY_STRING]: `toDisplayString`,
      [MERGE_PROPS]: `mergeProps`,
      [TO_HANDLERS]: `toHandlers`,
      [CAMELIZE]: `camelize`,
      [CAPITALIZE]: `capitalize`,
      [TO_HANDLER_KEY]: `toHandlerKey`,
      [SET_BLOCK_TRACKING]: `setBlockTracking`,
      [PUSH_SCOPE_ID]: `pushScopeId`,
      [POP_SCOPE_ID]: `popScopeId`,
      [WITH_SCOPE_ID]: `withScopeId`,
      [WITH_CTX]: `withCtx`,
      [UNREF]: `unref`,
      [IS_REF]: `isRef`
  };
  function registerRuntimeHelpers(helpers) {
      Object.getOwnPropertySymbols(helpers).forEach(s => {
          helperNameMap[s] = helpers[s];
      });
  }

  // AST Utilities ---------------------------------------------------------------
  // Some expressions, e.g. sequence and conditional expressions, are never
  // associated with template nodes, so their source locations are just a stub.
  // Container types like CompoundExpression also don't need a real location.
  const locStub = {
      source: '',
      start: { line: 1, column: 1, offset: 0 },
      end: { line: 1, column: 1, offset: 0 }
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
          loc
      };
  }
  function createVNodeCall(context, tag, props, children, patchFlag, dynamicProps, directives, isBlock = false, disableTracking = false, loc = locStub) {
      if (context) {
          if (isBlock) {
              context.helper(OPEN_BLOCK);
              context.helper(CREATE_BLOCK);
          }
          else {
              context.helper(CREATE_VNODE);
          }
          if (directives) {
              context.helper(WITH_DIRECTIVES);
          }
      }
      return {
          type: 13 /* VNODE_CALL */,
          tag,
          props,
          children,
          patchFlag,
          dynamicProps,
          directives,
          isBlock,
          disableTracking,
          loc
      };
  }
  function createArrayExpression(elements, loc = locStub) {
      return {
          type: 17 /* JS_ARRAY_EXPRESSION */,
          loc,
          elements
      };
  }
  function createObjectExpression(properties, loc = locStub) {
      return {
          type: 15 /* JS_OBJECT_EXPRESSION */,
          loc,
          properties
      };
  }
  function createObjectProperty(key, value) {
      return {
          type: 16 /* JS_PROPERTY */,
          loc: locStub,
          key: isString(key) ? createSimpleExpression(key, true) : key,
          value
      };
  }
  function createSimpleExpression(content, isStatic, loc = locStub, constType = 0 /* NOT_CONSTANT */) {
      return {
          type: 4 /* SIMPLE_EXPRESSION */,
          loc,
          content,
          isStatic,
          constType: isStatic ? 3 /* CAN_STRINGIFY */ : constType
      };
  }
  function createInterpolation(content, loc) {
      return {
          type: 5 /* INTERPOLATION */,
          loc,
          content: isString(content)
              ? createSimpleExpression(content, false, loc)
              : content
      };
  }
  function createCompoundExpression(children, loc = locStub) {
      return {
          type: 8 /* COMPOUND_EXPRESSION */,
          loc,
          children
      };
  }
  function createCallExpression(callee, args = [], loc = locStub) {
      return {
          type: 14 /* JS_CALL_EXPRESSION */,
          loc,
          callee,
          arguments: args
      };
  }
  function createFunctionExpression(params, returns = undefined, newline = false, isSlot = false, loc = locStub) {
      return {
          type: 18 /* JS_FUNCTION_EXPRESSION */,
          params,
          returns,
          newline,
          isSlot,
          loc
      };
  }
  function createConditionalExpression(test, consequent, alternate, newline = true) {
      return {
          type: 19 /* JS_CONDITIONAL_EXPRESSION */,
          test,
          consequent,
          alternate,
          newline,
          loc: locStub
      };
  }
  function createCacheExpression(index, value, isVNode = false) {
      return {
          type: 20 /* JS_CACHE_EXPRESSION */,
          index,
          value,
          isVNode,
          loc: locStub
      };
  }
  function createBlockStatement(body) {
      return {
          type: 21 /* JS_BLOCK_STATEMENT */,
          body,
          loc: locStub
      };
  }
  function createTemplateLiteral(elements) {
      return {
          type: 22 /* JS_TEMPLATE_LITERAL */,
          elements,
          loc: locStub
      };
  }
  function createIfStatement(test, consequent, alternate) {
      return {
          type: 23 /* JS_IF_STATEMENT */,
          test,
          consequent,
          alternate,
          loc: locStub
      };
  }
  function createAssignmentExpression(left, right) {
      return {
          type: 24 /* JS_ASSIGNMENT_EXPRESSION */,
          left,
          right,
          loc: locStub
      };
  }
  function createSequenceExpression(expressions) {
      return {
          type: 25 /* JS_SEQUENCE_EXPRESSION */,
          expressions,
          loc: locStub
      };
  }
  function createReturnStatement(returns) {
      return {
          type: 26 /* JS_RETURN_STATEMENT */,
          returns,
          loc: locStub
      };
  }

  function defaultOnError(error) {
      throw error;
  }
  function createCompilerError(code, loc, messages, additionalMessage) {
      const msg =  (messages || errorMessages)[code] + (additionalMessage || ``)
          ;
      const error = new SyntaxError(String(msg));
      error.code = code;
      error.loc = loc;
      return error;
  }
  const errorMessages = {
      // parse errors
      [0 /* ABRUPT_CLOSING_OF_EMPTY_COMMENT */]: 'Illegal comment.',
      [1 /* CDATA_IN_HTML_CONTENT */]: 'CDATA section is allowed only in XML context.',
      [2 /* DUPLICATE_ATTRIBUTE */]: 'Duplicate attribute.',
      [3 /* END_TAG_WITH_ATTRIBUTES */]: 'End tag cannot have attributes.',
      [4 /* END_TAG_WITH_TRAILING_SOLIDUS */]: "Illegal '/' in tags.",
      [5 /* EOF_BEFORE_TAG_NAME */]: 'Unexpected EOF in tag.',
      [6 /* EOF_IN_CDATA */]: 'Unexpected EOF in CDATA section.',
      [7 /* EOF_IN_COMMENT */]: 'Unexpected EOF in comment.',
      [8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */]: 'Unexpected EOF in script.',
      [9 /* EOF_IN_TAG */]: 'Unexpected EOF in tag.',
      [10 /* INCORRECTLY_CLOSED_COMMENT */]: 'Incorrectly closed comment.',
      [11 /* INCORRECTLY_OPENED_COMMENT */]: 'Incorrectly opened comment.',
      [12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */]: "Illegal tag name. Use '&lt;' to print '<'.",
      [13 /* MISSING_ATTRIBUTE_VALUE */]: 'Attribute value was expected.',
      [14 /* MISSING_END_TAG_NAME */]: 'End tag name was expected.',
      [15 /* MISSING_WHITESPACE_BETWEEN_ATTRIBUTES */]: 'Whitespace was expected.',
      [16 /* NESTED_COMMENT */]: "Unexpected '<!--' in comment.",
      [17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */]: 'Attribute name cannot contain U+0022 ("), U+0027 (\'), and U+003C (<).',
      [18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */]: 'Unquoted attribute value cannot contain U+0022 ("), U+0027 (\'), U+003C (<), U+003D (=), and U+0060 (`).',
      [19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */]: "Attribute name cannot start with '='.",
      [21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */]: "'<?' is allowed only in XML context.",
      [22 /* UNEXPECTED_SOLIDUS_IN_TAG */]: "Illegal '/' in tags.",
      // Vue-specific parse errors
      [23 /* X_INVALID_END_TAG */]: 'Invalid end tag.',
      [24 /* X_MISSING_END_TAG */]: 'Element is missing end tag.',
      [25 /* X_MISSING_INTERPOLATION_END */]: 'Interpolation end sign was not found.',
      [26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */]: 'End bracket for dynamic directive argument was not found. ' +
          'Note that dynamic directive argument cannot contain spaces.',
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
      [36 /* X_V_SLOT_MIXED_SLOT_USAGE */]: `Mixed v-slot usage on both the component and nested <template>.` +
          `When there are multiple named slots, all slots should use <template> ` +
          `syntax to avoid scope ambiguity.`,
      [37 /* X_V_SLOT_DUPLICATE_SLOT_NAMES */]: `Duplicate slot names found. `,
      [38 /* X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN */]: `Extraneous children found when component already has explicitly named ` +
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
      [48 /* X_SCOPE_ID_NOT_SUPPORTED */]: `"scopeId" option is only supported in module mode.`
  };

  const isStaticExp = (p) => p.type === 4 /* SIMPLE_EXPRESSION */ && p.isStatic;
  const isBuiltInType = (tag, expected) => tag === expected || tag === hyphenate(expected);
  function isCoreComponent(tag) {
      if (isBuiltInType(tag, 'Teleport')) {
          return TELEPORT;
      }
      else if (isBuiltInType(tag, 'Suspense')) {
          return SUSPENSE;
      }
      else if (isBuiltInType(tag, 'KeepAlive')) {
          return KEEP_ALIVE;
      }
      else if (isBuiltInType(tag, 'BaseTransition')) {
          return BASE_TRANSITION;
      }
  }
  const nonIdentifierRE = /^\d|[^\$\w]/;
  const isSimpleIdentifier = (name) => !nonIdentifierRE.test(name);
  const memberExpRE = /^[A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*|\[[^\]]+\])*$/;
  const isMemberExpression = (path) => {
      if (!path)
          return false;
      return memberExpRE.test(path.trim());
  };
  function getInnerRange(loc, offset, length) {
      const source = loc.source.substr(offset, length);
      const newLoc = {
          source,
          start: advancePositionWithClone(loc.start, loc.source, offset),
          end: loc.end
      };
      if (length != null) {
          newLoc.end = advancePositionWithClone(loc.start, loc.source, offset + length);
      }
      return newLoc;
  }
  function advancePositionWithClone(pos, source, numberOfCharacters = source.length) {
      return advancePositionWithMutation(extend({}, pos), source, numberOfCharacters);
  }
  // advance by mutation without cloning (for performance reasons), since this
  // gets called a lot in the parser
  function advancePositionWithMutation(pos, source, numberOfCharacters = source.length) {
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
  function assert(condition, msg) {
      /* istanbul ignore if */
      if (!condition) {
          throw new Error(msg || `unexpected compiler condition`);
      }
  }
  function findDir(node, name, allowEmpty = false) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 7 /* DIRECTIVE */ &&
              (allowEmpty || p.exp) &&
              (isString(name) ? p.name === name : name.test(p.name))) {
              return p;
          }
      }
  }
  function findProp(node, name, dynamicOnly = false, allowEmpty = false) {
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 6 /* ATTRIBUTE */) {
              if (dynamicOnly)
                  continue;
              if (p.name === name && (p.value || allowEmpty)) {
                  return p;
              }
          }
          else if (p.name === 'bind' &&
              (p.exp || allowEmpty) &&
              isBindKey(p.arg, name)) {
              return p;
          }
      }
  }
  function isBindKey(arg, name) {
      return !!(arg && isStaticExp(arg) && arg.content === name);
  }
  function hasDynamicKeyVBind(node) {
      return node.props.some(p => p.type === 7 /* DIRECTIVE */ &&
          p.name === 'bind' &&
          (!p.arg || // v-bind="obj"
              p.arg.type !== 4 /* SIMPLE_EXPRESSION */ || // v-bind:[_ctx.foo]
              !p.arg.isStatic) // v-bind:[foo]
      );
  }
  function isText(node) {
      return node.type === 5 /* INTERPOLATION */ || node.type === 2 /* TEXT */;
  }
  function isVSlot(p) {
      return p.type === 7 /* DIRECTIVE */ && p.name === 'slot';
  }
  function isTemplateNode(node) {
      return (node.type === 1 /* ELEMENT */ && node.tagType === 3 /* TEMPLATE */);
  }
  function isSlotOutlet(node) {
      return node.type === 1 /* ELEMENT */ && node.tagType === 2 /* SLOT */;
  }
  function injectProp(node, prop, context) {
      let propsWithInjection;
      const props = node.type === 13 /* VNODE_CALL */ ? node.props : node.arguments[2];
      if (props == null || isString(props)) {
          propsWithInjection = createObjectExpression([prop]);
      }
      else if (props.type === 14 /* JS_CALL_EXPRESSION */) {
          // merged props... add ours
          // only inject key to object literal if it's the first argument so that
          // if doesn't override user provided keys
          const first = props.arguments[0];
          if (!isString(first) && first.type === 15 /* JS_OBJECT_EXPRESSION */) {
              first.properties.unshift(prop);
          }
          else {
              if (props.callee === TO_HANDLERS) {
                  // #2366
                  propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
                      createObjectExpression([prop]),
                      props
                  ]);
              }
              else {
                  props.arguments.unshift(createObjectExpression([prop]));
              }
          }
          !propsWithInjection && (propsWithInjection = props);
      }
      else if (props.type === 15 /* JS_OBJECT_EXPRESSION */) {
          let alreadyExists = false;
          // check existing key to avoid overriding user provided keys
          if (prop.key.type === 4 /* SIMPLE_EXPRESSION */) {
              const propKeyName = prop.key.content;
              alreadyExists = props.properties.some(p => p.key.type === 4 /* SIMPLE_EXPRESSION */ &&
                  p.key.content === propKeyName);
          }
          if (!alreadyExists) {
              props.properties.unshift(prop);
          }
          propsWithInjection = props;
      }
      else {
          // single v-bind with expression, return a merged replacement
          propsWithInjection = createCallExpression(context.helper(MERGE_PROPS), [
              createObjectExpression([prop]),
              props
          ]);
      }
      if (node.type === 13 /* VNODE_CALL */) {
          node.props = propsWithInjection;
      }
      else {
          node.arguments[2] = propsWithInjection;
      }
  }
  function toValidAssetId(name, type) {
      return `_${type}_${name.replace(/[^\w]/g, '_')}`;
  }
  // Check if a node contains expressions that reference current context scope ids
  function hasScopeRef(node, ids) {
      if (!node || Object.keys(ids).length === 0) {
          return false;
      }
      switch (node.type) {
          case 1 /* ELEMENT */:
              for (let i = 0; i < node.props.length; i++) {
                  const p = node.props[i];
                  if (p.type === 7 /* DIRECTIVE */ &&
                      (hasScopeRef(p.arg, ids) || hasScopeRef(p.exp, ids))) {
                      return true;
                  }
              }
              return node.children.some(c => hasScopeRef(c, ids));
          case 11 /* FOR */:
              if (hasScopeRef(node.source, ids)) {
                  return true;
              }
              return node.children.some(c => hasScopeRef(c, ids));
          case 9 /* IF */:
              return node.branches.some(b => hasScopeRef(b, ids));
          case 10 /* IF_BRANCH */:
              if (hasScopeRef(node.condition, ids)) {
                  return true;
              }
              return node.children.some(c => hasScopeRef(c, ids));
          case 4 /* SIMPLE_EXPRESSION */:
              return (!node.isStatic &&
                  isSimpleIdentifier(node.content) &&
                  !!ids[node.content]);
          case 8 /* COMPOUND_EXPRESSION */:
              return node.children.some(c => isObject(c) && hasScopeRef(c, ids));
          case 5 /* INTERPOLATION */:
          case 12 /* TEXT_CALL */:
              return hasScopeRef(node.content, ids);
          case 2 /* TEXT */:
          case 3 /* COMMENT */:
              return false;
          default:
              return false;
      }
  }

  // The default decoder only provides escapes for characters reserved as part of
  // the template syntax, and is only used if the custom renderer did not provide
  // a platform-specific decoder.
  const decodeRE = /&(gt|lt|amp|apos|quot);/g;
  const decodeMap = {
      gt: '>',
      lt: '<',
      amp: '&',
      apos: "'",
      quot: '"'
  };
  const defaultParserOptions = {
      delimiters: [`{{`, `}}`],
      getNamespace: () => 0 /* HTML */,
      getTextMode: () => 0 /* DATA */,
      isVoidTag: NO,
      isPreTag: NO,
      isCustomElement: NO,
      decodeEntities: (rawText) => rawText.replace(decodeRE, (_, p1) => decodeMap[p1]),
      onError: defaultOnError,
      comments: false
  };
  function baseParse(content, options = {}) {
      const context = createParserContext(content, options);
      const start = getCursor(context);
      return createRoot(parseChildren(context, 0 /* DATA */, []), getSelection(context, start));
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
          inVPre: false
      };
  }
  function parseChildren(context, mode, ancestors) {
      const parent = last(ancestors);
      const ns = parent ? parent.ns : 0 /* HTML */;
      const nodes = [];
      while (!isEnd(context, mode, ancestors)) {
          const s = context.source;
          let node = undefined;
          if (mode === 0 /* DATA */ || mode === 1 /* RCDATA */) {
              if (!context.inVPre && startsWith(s, context.options.delimiters[0])) {
                  // '{{'
                  node = parseInterpolation(context, mode);
              }
              else if (mode === 0 /* DATA */ && s[0] === '<') {
                  // https://html.spec.whatwg.org/multipage/parsing.html#tag-open-state
                  if (s.length === 1) {
                      emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 1);
                  }
                  else if (s[1] === '!') {
                      // <!
                      if (startsWith(s, '<!--')) {
                          // 注释
                          node = parseComment(context);
                      }
                      else if (startsWith(s, '<!DOCTYPE')) {
                          node = parseBogusComment(context);
                      }
                      else if (startsWith(s, '<![CDATA[')) {
                          if (ns !== 0 /* HTML */) {
                              node = parseCDATA(context, ancestors);
                          }
                          else {
                              emitError(context, 1 /* CDATA_IN_HTML_CONTENT */);
                              node = parseBogusComment(context);
                          }
                      }
                      else {
                          emitError(context, 11 /* INCORRECTLY_OPENED_COMMENT */);
                          node = parseBogusComment(context);
                      }
                  }
                  else if (s[1] === '/') {
                      // end tag, </
                      if (s.length === 2) {
                          emitError(context, 5 /* EOF_BEFORE_TAG_NAME */, 2);
                      }
                      else if (s[2] === '>') {
                          // </>
                          emitError(context, 14 /* MISSING_END_TAG_NAME */, 2);
                          advanceBy(context, 3);
                          continue;
                      }
                      else if (/[a-z]/i.test(s[2])) {
                          // 非法结束标签，因为结束标签会直接在 parseElement 解析完成
                          emitError(context, 23 /* X_INVALID_END_TAG */);
                          parseTag(context, 1 /* End */, parent);
                          continue;
                      }
                      else {
                          // 无效的标签名称
                          emitError(context, 12 /* INVALID_FIRST_CHARACTER_OF_TAG_NAME */, 2);
                          node = parseBogusComment(context);
                      }
                  }
                  else if (/[a-z]/i.test(s[1])) {
                      // 开始标签
                      node = parseElement(context, ancestors);
                  }
                  else if (s[1] === '?') {
                      emitError(context, 21 /* UNEXPECTED_QUESTION_MARK_INSTEAD_OF_TAG_NAME */, 1);
                      node = parseBogusComment(context);
                  }
                  else {
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
          }
          else {
              pushNode(nodes, node);
          }
      }
      // Whitespace management for more efficient output
      // (same as v2 whitespace: 'condense')
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
                      if (!prev ||
                          !next ||
                          prev.type === 3 /* COMMENT */ ||
                          next.type === 3 /* COMMENT */ ||
                          (prev.type === 1 /* ELEMENT */ &&
                              next.type === 1 /* ELEMENT */ &&
                              /[\r\n]/.test(node.content))) {
                          removedWhitespace = true;
                          nodes[i] = null;
                      }
                      else {
                          // Otherwise, condensed consecutive whitespace inside the text
                          // down to a single space
                          node.content = ' ';
                      }
                  }
                  else {
                      // 空格合并从一个
                      node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ');
                  }
              }
          }
          if (context.inPre && parent && context.options.isPreTag(parent.tag)) {
              // 删除首行空行
              // remove leading newline per html spec
              // https://html.spec.whatwg.org/multipage/grouping-content.html#the-pre-element
              const first = nodes[0];
              if (first && first.type === 2 /* TEXT */) {
                  first.content = first.content.replace(/^\r?\n/, '');
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
          if (prev &&
              prev.type === 2 /* TEXT */ &&
              prev.loc.end.offset === node.loc.start.offset) {
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
      }
      else {
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
      }
      else {
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
          let prevIndex = 1, nestedIndex = 0;
          while ((nestedIndex = s.indexOf('<!--', prevIndex)) !== -1) {
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
          loc: getSelection(context, start)
      };
  }
  function parseBogusComment(context) {
      const start = getCursor(context);
      const contentStart = context.source[1] === '?' ? 1 : 2;
      let content;
      // 结束
      const closeIndex = context.source.indexOf('>');
      if (closeIndex === -1) {
          content = context.source.slice(contentStart);
          advanceBy(context, context.source.length);
      }
      else {
          content = context.source.slice(contentStart, closeIndex);
          advanceBy(context, closeIndex + 1);
      }
      return {
          type: 3 /* COMMENT */,
          content,
          loc: getSelection(context, start)
      };
  }
  function parseElement(context, ancestors) {
      const wasInPre = context.inPre;
      const wasInVPre = context.inVPre;
      const parent = last(ancestors);
      // 解析出开始标签
      const element = parseTag(context, 0 /* Start */, parent);
      const isPreBoundary = context.inPre && !wasInPre;
      const isVPreBoundary = context.inVPre && !wasInVPre;
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
      }
      else {
          emitError(context, 24 /* X_MISSING_END_TAG */, 0, element.loc.start);
          if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {
              const first = children[0];
              if (first && startsWith(first.loc.source, '<!--')) {
                  emitError(context, 8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */);
              }
          }
      }
      element.loc = getSelection(context, element.loc.start);
      if (isPreBoundary) {
          context.inPre = false;
      }
      if (isVPreBoundary) {
          context.inVPre = false;
      }
      return element;
  }
  const isSpecialTemplateDirective = /*#__PURE__*/ makeMap(`if,else,else-if,for,slot`);
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
      if (!context.inVPre &&
          props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'pre')) {
          context.inVPre = true;
          extend(context, cursor);
          context.source = currentSource;
          // 重新解析属性并且将 v-pre 过滤出来
          props = parseAttributes(context, type).filter(p => p.name !== 'v-pre');
      }
      // 结束标签
      let isSelfClosing = false;
      if (context.source.length === 0) {
          emitError(context, 9 /* EOF_IN_TAG */);
      }
      else {
          // <div ... />
          isSelfClosing = startsWith(context.source, '/>');
          // 到这里不应该是 End 标签
          if (type === 1 /* End */ && isSelfClosing) {
              emitError(context, 4 /* END_TAG_WITH_TRAILING_SOLIDUS */);
          }
          advanceBy(context, isSelfClosing ? 2 : 1);
      }
      let tagType = 0 /* ELEMENT */;
      const options = context.options;
      // 标签类型解析，非 v-pre 元素且不是自定义类型
      if (!context.inVPre && !options.isCustomElement(tag)) {
          // v-is
          const hasVIs = props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'is');
          if (options.isNativeTag && !hasVIs) {
              if (!options.isNativeTag(tag)) {
                  tagType = 1 /* COMPONENT */;
              }
          }
          else if (hasVIs ||
              isCoreComponent(tag) ||
              (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||
              /^[A-Z]/.test(tag) ||
              tag === 'component') {
              tagType = 1 /* COMPONENT */;
          }
          if (tag === 'slot') {
              tagType = 2 /* SLOT */;
          }
          else if (tag === 'template' &&
              props.some(p => {
                  return (p.type === 7 /* DIRECTIVE */ && isSpecialTemplateDirective(p.name));
              })) {
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
          codegenNode: undefined
      };
  }
  function parseAttributes(context, type) {
      const props = [];
      const attributeNames = new Set();
      while (context.source.length > 0 &&
          !startsWith(context.source, '>') &&
          !startsWith(context.source, '/>')) {
          if (startsWith(context.source, '/')) {
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
      if (name[0] === '=') {
          // 不能用 `=` 做属性名
          emitError(context, 19 /* UNEXPECTED_EQUALS_SIGN_BEFORE_ATTRIBUTE_NAME */);
      }
      {
          const pattern = /["'<]/g;
          let m;
          // 属性名中不能有 ", ', <
          while ((m = pattern.exec(name))) {
              emitError(context, 17 /* UNEXPECTED_CHARACTER_IN_ATTRIBUTE_NAME */, m.index);
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
          const match = /(?:^v-([a-z0-9-]+))?(?:(?::|^@|^#)(\[[^\]]+\]|[^\.]+))?(.+)?$/i.exec(name);
          // 缩写指令替换成指令单词
          const dirName = match[1] ||
              (startsWith(name, ':') ? 'bind' : startsWith(name, '@') ? 'on' : 'slot');
          let arg;
          if (match[2]) {
              const isSlot = dirName === 'slot';
              const startOffset = name.indexOf(match[2]);
              const loc = getSelection(context, getNewPosition(context, start, startOffset), getNewPosition(context, start, startOffset + match[2].length + ((isSlot && match[3]) || '').length));
              let content = match[2];
              let isStatic = true;
              if (content.startsWith('[')) {
                  isStatic = false;
                  if (!content.endsWith(']')) {
                      emitError(context, 26 /* X_MISSING_DYNAMIC_DIRECTIVE_ARGUMENT_END */);
                  }
                  content = content.substr(1, content.length - 2);
              }
              else if (isSlot) {
                  // #1241 special case for v-slot: vuetify relies extensively on slot
                  // names containing dots. v-slot doesn't have any modifiers and Vue 2.x
                  // supports such usage so we are keeping it consistent with 2.x.
                  content += match[3] || '';
              }
              arg = {
                  type: 4 /* SIMPLE_EXPRESSION */,
                  content,
                  isStatic,
                  constType: isStatic
                      ? 3 /* CAN_STRINGIFY */
                      : 0 /* NOT_CONSTANT */,
                  loc
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
                  // other values by `transformExpression` to make it eligible for hoisting.
                  constType: 0 /* NOT_CONSTANT */,
                  loc: value.loc
              },
              arg,
              modifiers: match[3] ? match[3].substr(1).split('.') : [],
              loc
          };
      }
      return {
          type: 6 /* ATTRIBUTE */,
          name,
          value: value && {
              type: 2 /* TEXT */,
              content: value.content,
              loc: value.loc
          },
          loc
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
              content = parseTextData(context, context.source.length, 4 /* ATTRIBUTE_VALUE */);
          }
          else {
              content = parseTextData(context, endIndex, 4 /* ATTRIBUTE_VALUE */);
              advanceBy(context, 1);
          }
      }
      else {
          // Unquoted
          const match = /^[^\t\r\n\f >]+/.exec(context.source);
          if (!match) {
              return undefined;
          }
          const unexpectedChars = /["'<=`]/g;
          let m;
          while ((m = unexpectedChars.exec(match[0]))) {
              emitError(context, 18 /* UNEXPECTED_CHARACTER_IN_UNQUOTED_ATTRIBUTE_VALUE */, m.index);
          }
          content = parseTextData(context, match[0].length, 4 /* ATTRIBUTE_VALUE */);
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
      const endOffset = rawContentLength - (preTrimContent.length - content.length - startOffset);
      advancePositionWithMutation(innerEnd, rawContent, endOffset);
      advanceBy(context, close.length);
      return {
          type: 5 /* INTERPOLATION */,
          content: {
              type: 4 /* SIMPLE_EXPRESSION */,
              isStatic: false,
              // Set `isConstant` to false by default and will decide in transformExpression
              constType: 0 /* NOT_CONSTANT */,
              content,
              loc: getSelection(context, innerStart, innerEnd)
          },
          loc: getSelection(context, start)
      };
  }
  function parseText(context, mode) {
      const endTokens = ['<', context.options.delimiters[0]];
      if (mode === 3 /* CDATA */) {
          endTokens.push(']]>');
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
          loc: getSelection(context, start)
      };
  }
  /**
   * Get text data with a given length from the current location.
   * This translates HTML entities in the text data.
   */
  function parseTextData(context, length, mode) {
      const rawText = context.source.slice(0, length);
      advanceBy(context, length);
      if (mode === 2 /* RAWTEXT */ ||
          mode === 3 /* CDATA */ ||
          rawText.indexOf('&') === -1) {
          return rawText;
      }
      else {
          // DATA or RCDATA containing "&"". Entity decoding required.
          return context.options.decodeEntities(rawText, mode === 4 /* ATTRIBUTE_VALUE */);
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
          source: context.originalSource.slice(start.offset, end.offset)
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
      return advancePositionWithClone(start, context.originalSource.slice(start.offset, numberOfCharacters), numberOfCharacters);
  }
  function emitError(context, code, offset, loc = getCursor(context)) {
      if (offset) {
          loc.offset += offset;
          loc.column += offset;
      }
      context.options.onError(createCompilerError(code, {
          start: loc,
          end: loc,
          source: ''
      }));
  }
  function isEnd(context, mode, ancestors) {
      const s = context.source;
      switch (mode) {
          case 0 /* DATA */:
              if (startsWith(s, '</')) {
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
              if (startsWith(s, ']]>')) {
                  return true;
              }
              break;
      }
      return !s;
  }
  function startsWithEndTagOpen(source, tag) {
      return (startsWith(source, '</') &&
          source.substr(2, tag.length).toLowerCase() === tag.toLowerCase() &&
          /[\t\r\n\f />]/.test(source[2 + tag.length] || '>'));
  }

  function hoistStatic(root, context) {
      walk(root, context, 
      // Root node is unfortunately non-hoistable due to potential parent
      // fallthrough attributes.
      isSingleElementRoot(root, root.children[0]));
  }
  function isSingleElementRoot(root, child) {
      const { children } = root;
      return (children.length === 1 &&
          child.type === 1 /* ELEMENT */ &&
          !isSlotOutlet(child));
  }
  function walk(node, context, doNotHoistNode = false) {
      let hasHoistedNode = false;
      // Some transforms, e.g. transformAssetUrls from @vue/compiler-sfc, replaces
      // static bindings with expressions. These expressions are guaranteed to be
      // constant so they are still eligible for hoisting, but they are only
      // available at runtime and therefore cannot be evaluated ahead of time.
      // This is only a concern for pre-stringification (via transformHoist by
      // @vue/compiler-dom), but doing it here allows us to perform only one full
      // walk of the AST and allow `stringifyStatic` to stop walking as soon as its
      // stringficiation threshold is met.
      let canStringify = true;
      const { children } = node;
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // only plain elements & text calls are eligible for hoisting.
          if (child.type === 1 /* ELEMENT */ &&
              child.tagType === 0 /* ELEMENT */) {
              const constantType = doNotHoistNode
                  ? 0 /* NOT_CONSTANT */
                  : getConstantType(child, context);
              if (constantType > 0 /* NOT_CONSTANT */) {
                  if (constantType < 3 /* CAN_STRINGIFY */) {
                      canStringify = false;
                  }
                  if (constantType >= 2 /* CAN_HOIST */) {
                      child.codegenNode.patchFlag =
                          -1 /* HOISTED */ + ( ` /* HOISTED */` );
                      child.codegenNode = context.hoist(child.codegenNode);
                      hasHoistedNode = true;
                      continue;
                  }
              }
              else {
                  // node may contain dynamic children, but its props may be eligible for
                  // hoisting.
                  const codegenNode = child.codegenNode;
                  if (codegenNode.type === 13 /* VNODE_CALL */) {
                      const flag = getPatchFlag(codegenNode);
                      if ((!flag ||
                          flag === 512 /* NEED_PATCH */ ||
                          flag === 1 /* TEXT */) &&
                          getGeneratedPropsConstantType(child, context) >=
                              2 /* CAN_HOIST */) {
                          const props = getNodeProps(child);
                          if (props) {
                              codegenNode.props = context.hoist(props);
                          }
                      }
                  }
              }
          }
          else if (child.type === 12 /* TEXT_CALL */) {
              const contentType = getConstantType(child.content, context);
              if (contentType > 0) {
                  if (contentType < 3 /* CAN_STRINGIFY */) {
                      canStringify = false;
                  }
                  if (contentType >= 2 /* CAN_HOIST */) {
                      child.codegenNode = context.hoist(child.codegenNode);
                      hasHoistedNode = true;
                  }
              }
          }
          // walk further
          if (child.type === 1 /* ELEMENT */) {
              walk(child, context);
          }
          else if (child.type === 11 /* FOR */) {
              // Do not hoist v-for single child because it has to be a block
              walk(child, context, child.children.length === 1);
          }
          else if (child.type === 9 /* IF */) {
              for (let i = 0; i < child.branches.length; i++) {
                  // Do not hoist v-if single child because it has to be a block
                  walk(child.branches[i], context, child.branches[i].children.length === 1);
              }
          }
      }
      if (canStringify && hasHoistedNode && context.transformHoist) {
          context.transformHoist(children, context, node);
      }
  }
  function getConstantType(node, context) {
      const { constantCache } = context;
      switch (node.type) {
          case 1 /* ELEMENT */:
              if (node.tagType !== 0 /* ELEMENT */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const cached = constantCache.get(node);
              if (cached !== undefined) {
                  return cached;
              }
              const codegenNode = node.codegenNode;
              if (codegenNode.type !== 13 /* VNODE_CALL */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const flag = getPatchFlag(codegenNode);
              if (!flag) {
                  let returnType = 3 /* CAN_STRINGIFY */;
                  // Element itself has no patch flag. However we still need to check:
                  // 1. Even for a node with no patch flag, it is possible for it to contain
                  // non-hoistable expressions that refers to scope variables, e.g. compiler
                  // injected keys or cached event handlers. Therefore we need to always
                  // check the codegenNode's props to be sure.
                  const generatedPropsType = getGeneratedPropsConstantType(node, context);
                  if (generatedPropsType === 0 /* NOT_CONSTANT */) {
                      constantCache.set(node, 0 /* NOT_CONSTANT */);
                      return 0 /* NOT_CONSTANT */;
                  }
                  if (generatedPropsType < returnType) {
                      returnType = generatedPropsType;
                  }
                  // 2. its children.
                  for (let i = 0; i < node.children.length; i++) {
                      const childType = getConstantType(node.children[i], context);
                      if (childType === 0 /* NOT_CONSTANT */) {
                          constantCache.set(node, 0 /* NOT_CONSTANT */);
                          return 0 /* NOT_CONSTANT */;
                      }
                      if (childType < returnType) {
                          returnType = childType;
                      }
                  }
                  // 3. if the type is not already CAN_SKIP_PATCH which is the lowest non-0
                  // type, check if any of the props can cause the type to be lowered
                  // we can skip can_patch because it's guaranteed by the absence of a
                  // patchFlag.
                  if (returnType > 1 /* CAN_SKIP_PATCH */) {
                      for (let i = 0; i < node.props.length; i++) {
                          const p = node.props[i];
                          if (p.type === 7 /* DIRECTIVE */ && p.name === 'bind' && p.exp) {
                              const expType = getConstantType(p.exp, context);
                              if (expType === 0 /* NOT_CONSTANT */) {
                                  constantCache.set(node, 0 /* NOT_CONSTANT */);
                                  return 0 /* NOT_CONSTANT */;
                              }
                              if (expType < returnType) {
                                  returnType = expType;
                              }
                          }
                      }
                  }
                  // only svg/foreignObject could be block here, however if they are
                  // static then they don't need to be blocks since there will be no
                  // nested updates.
                  if (codegenNode.isBlock) {
                      codegenNode.isBlock = false;
                      context.helper(CREATE_VNODE);
                  }
                  constantCache.set(node, returnType);
                  return returnType;
              }
              else {
                  constantCache.set(node, 0 /* NOT_CONSTANT */);
                  return 0 /* NOT_CONSTANT */;
              }
          case 2 /* TEXT */:
          case 3 /* COMMENT */:
              return 3 /* CAN_STRINGIFY */;
          case 9 /* IF */:
          case 11 /* FOR */:
          case 10 /* IF_BRANCH */:
              return 0 /* NOT_CONSTANT */;
          case 5 /* INTERPOLATION */:
          case 12 /* TEXT_CALL */:
              return getConstantType(node.content, context);
          case 4 /* SIMPLE_EXPRESSION */:
              return node.constType;
          case 8 /* COMPOUND_EXPRESSION */:
              let returnType = 3 /* CAN_STRINGIFY */;
              for (let i = 0; i < node.children.length; i++) {
                  const child = node.children[i];
                  if (isString(child) || isSymbol(child)) {
                      continue;
                  }
                  const childType = getConstantType(child, context);
                  if (childType === 0 /* NOT_CONSTANT */) {
                      return 0 /* NOT_CONSTANT */;
                  }
                  else if (childType < returnType) {
                      returnType = childType;
                  }
              }
              return returnType;
          default:
              return 0 /* NOT_CONSTANT */;
      }
  }
  function getGeneratedPropsConstantType(node, context) {
      let returnType = 3 /* CAN_STRINGIFY */;
      const props = getNodeProps(node);
      if (props && props.type === 15 /* JS_OBJECT_EXPRESSION */) {
          const { properties } = props;
          for (let i = 0; i < properties.length; i++) {
              const { key, value } = properties[i];
              const keyType = getConstantType(key, context);
              if (keyType === 0 /* NOT_CONSTANT */) {
                  return keyType;
              }
              if (keyType < returnType) {
                  returnType = keyType;
              }
              if (value.type !== 4 /* SIMPLE_EXPRESSION */) {
                  return 0 /* NOT_CONSTANT */;
              }
              const valueType = getConstantType(value, context);
              if (valueType === 0 /* NOT_CONSTANT */) {
                  return valueType;
              }
              if (valueType < returnType) {
                  returnType = valueType;
              }
          }
      }
      return returnType;
  }
  function getNodeProps(node) {
      const codegenNode = node.codegenNode;
      if (codegenNode.type === 13 /* VNODE_CALL */) {
          return codegenNode.props;
      }
  }
  function getPatchFlag(node) {
      const flag = node.patchFlag;
      return flag ? parseInt(flag, 10) : undefined;
  }

  function createTransformContext(root, { filename = '', prefixIdentifiers = false, hoistStatic = false, cacheHandlers = false, nodeTransforms = [], directiveTransforms = {}, transformHoist = null, isBuiltInComponent = NOOP, isCustomElement = NOOP, expressionPlugins = [], scopeId = null, ssr = false, ssrCssVars = ``, bindingMetadata = EMPTY_OBJ, inline = false, isTS = false, onError = defaultOnError }) {
      const nameMatch = filename.replace(/\?.*$/, '').match(/([^/\\]+)\.\w+$/);
      const context = {
          // options
          selfName: nameMatch && capitalize(camelize(nameMatch[1])),
          prefixIdentifiers,
          hoistStatic,
          cacheHandlers,
          nodeTransforms,
          directiveTransforms,
          transformHoist,
          isBuiltInComponent,
          isCustomElement,
          expressionPlugins,
          scopeId,
          ssr,
          ssrCssVars,
          bindingMetadata,
          inline,
          isTS,
          onError,
          // state
          root,
          helpers: new Set(),
          components: new Set(),
          directives: new Set(),
          hoists: [],
          imports: new Set(),
          constantCache: new Map(),
          temps: 0,
          cached: 0,
          identifiers: Object.create(null),
          scopes: {
              vFor: 0,
              vSlot: 0,
              vPre: 0,
              vOnce: 0
          },
          parent: null,
          currentNode: root,
          childIndex: 0,
          // methods
          helper(name) {
              context.helpers.add(name);
              return name;
          },
          helperString(name) {
              return `_${helperNameMap[context.helper(name)]}`;
          },
          replaceNode(node) {
              /* istanbul ignore if */
              {
                  if (!context.currentNode) {
                      throw new Error(`Node being replaced is already removed.`);
                  }
                  if (!context.parent) {
                      throw new Error(`Cannot replace root node.`);
                  }
              }
              // 替换原来 ast 🌲中的节点，并且重置 currentNode 为最新的节点
              context.parent.children[context.childIndex] = context.currentNode = node;
          },
          removeNode(node) {
              if ( !context.parent) {
                  throw new Error(`Cannot remove root node.`);
              }
              const list = context.parent.children;
              // traverseChildren 里面会用 childIndex 记录下当前被 traverse 的节点
              const removalIndex = node
                  ? list.indexOf(node)
                  : context.currentNode
                      ? context.childIndex
                      : -1;
              /* istanbul ignore if */
              if ( removalIndex < 0) {
                  throw new Error(`node being removed is not a child of current parent`);
              }
              if (!node || node === context.currentNode) {
                  // current node removed
                  context.currentNode = null;
                  context.onNodeRemoved();
              }
              else {
                  // sibling node removed
                  if (context.childIndex > removalIndex) {
                      context.childIndex--;
                      context.onNodeRemoved();
                  }
              }
              context.parent.children.splice(removalIndex, 1);
          },
          onNodeRemoved: () => { },
          addIdentifiers(exp) {
          },
          removeIdentifiers(exp) {
          },
          hoist(exp) {
              context.hoists.push(exp);
              const identifier = createSimpleExpression(`_hoisted_${context.hoists.length}`, false, exp.loc, 2 /* CAN_HOIST */);
              identifier.hoisted = exp;
              return identifier;
          },
          cache(exp, isVNode = false) {
              return createCacheExpression(++context.cached, exp, isVNode);
          }
      };
      return context;
  }
  function transform(root, options) {
      const context = createTransformContext(root, options);
      traverseNode(root, context);
      if (options.hoistStatic) {
          hoistStatic(root, context);
      }
      if (!options.ssr) {
          createRootCodegen(root, context);
      }
      root.helpers = [...context.helpers];
      root.components = [...context.components];
      root.directives = [...context.directives];
      root.imports = [...context.imports];
      root.hoists = context.hoists;
      root.temps = context.temps;
      root.cached = context.cached;
  }
  function createRootCodegen(root, context) {
      const { helper } = context;
      const { children } = root;
      if (children.length === 1) {
          // 只有一个孩子节点，直接取该孩子节点 的 codegenNode
          const child = children[0];
          if (isSingleElementRoot(root, child) && child.codegenNode) {
              // 当 root 节点下只有一个 element 元素的孩子节点时，不进行提升
              const codegenNode = child.codegenNode;
              if (codegenNode.type === 13 /* VNODE_CALL */) {
                  codegenNode.isBlock = true;
                  helper(OPEN_BLOCK);
                  helper(CREATE_BLOCK);
              }
              root.codegenNode = codegenNode;
          }
          else {
              // - single <slot/>, IfNode, ForNode: already blocks.
              // - single text node: always patched.
              // root codegen falls through via genNode()
              root.codegenNode = child;
          }
      }
      else if (children.length > 1) {
          // root has multiple nodes - return a fragment block.
          let patchFlag = 64 /* STABLE_FRAGMENT */;
          let patchFlagText = PatchFlagNames[64 /* STABLE_FRAGMENT */];
          // check if the fragment actually contains a single valid child with
          // the rest being comments
          if (
              children.filter(c => c.type !== 3 /* COMMENT */).length === 1) {
              patchFlag |= 2048 /* DEV_ROOT_FRAGMENT */;
              patchFlagText += `, ${PatchFlagNames[2048 /* DEV_ROOT_FRAGMENT */]}`;
          }
          root.codegenNode = createVNodeCall(context, helper(FRAGMENT), undefined, root.children, patchFlag + ( ` /* ${patchFlagText} */` ), undefined, undefined, true);
      }
      else ;
  }
  function traverseChildren(parent, context) {
      let i = 0;
      const nodeRemoved = () => {
          i--;
      };
      for (; i < parent.children.length; i++) {
          const child = parent.children[i];
          if (isString(child))
              continue;
          context.parent = parent;
          context.childIndex = i;
          context.onNodeRemoved = nodeRemoved;
          traverseNode(child, context);
      }
  }
  function traverseNode(node, context) {
      // 保存当前被处理的 节点
      context.currentNode = node;
      // 应用 transform 插件
      const { nodeTransforms } = context;
      // 针对每个节点会收集到一个或多个 transformXxx 函数，用来解析它的 ast
      // 得到 codegenNode ，这些函数会在当前的节点树被递归遍历完之后调用
      const exitFns = [];
      for (let i = 0; i < nodeTransforms.length; i++) {
          const onExit = nodeTransforms[i](node, context);
          if (onExit) {
              if (isArray(onExit)) {
                  exitFns.push(...onExit);
              }
              else {
                  exitFns.push(onExit);
              }
          }
          if (!context.currentNode) {
              // 节点可能被删除了，比如： v-else-if, v-else 会合并到 v-if 的 branches[] 中
              return;
          }
          else {
              // 节点可能会替换了，需要更新
              node = context.currentNode;
          }
      }
      switch (node.type) {
          // TODO
          case 3 /* COMMENT */:
              if (!context.ssr) {
                  // inject import for the Comment symbol, which is needed for creating
                  // comment nodes with `createVNode`
                  context.helper(CREATE_COMMENT);
              }
              break;
          case 5 /* INTERPOLATION */:
              // no need to traverse, but we need to inject toString helper
              if (!context.ssr) {
                  context.helper(TO_DISPLAY_STRING);
              }
              break;
          // for container types, further traverse downwards
          case 9 /* IF */:
              for (let i = 0; i < node.branches.length; i++) {
                  traverseNode(node.branches[i], context);
              }
              break;
          case 10 /* IF_BRANCH */:
          case 11 /* FOR */:
          case 1 /* ELEMENT */:
          case 0 /* ROOT */:
              traverseChildren(node, context);
              break;
      }
      context.currentNode = node;
      let i = exitFns.length;
      while (i--) {
          exitFns[i]();
      }
  }
  function createStructuralDirectiveTransform(name, fn) {
      const matches = isString(name)
          ? (n) => n === name
          : (n) => name.test(n);
      return (node, context) => {
          if (node.type === 1 /* ELEMENT */) {
              const { props } = node;
              // structural directive transforms are not concerned with slots
              // as they are handled separately in vSlot.ts
              // 过滤掉 v-slot 它在 vSlot.ts 中处理
              if (node.tagType === 3 /* TEMPLATE */ && props.some(isVSlot)) {
                  return;
              }
              const exitFns = [];
              for (let i = 0; i < props.length; i++) {
                  const prop = props[i];
                  if (prop.type === 7 /* DIRECTIVE */ && matches(prop.name)) {
                      // structural directives are removed to avoid infinite recursion
                      // also we remove them *before* applying so that it can further
                      // traverse itself in case it moves the node around
                      props.splice(i, 1);
                      i--;
                      const onExit = fn(node, prop, context);
                      if (onExit)
                          exitFns.push(onExit);
                  }
              }
              return exitFns;
          }
      };
  }

  const PURE_ANNOTATION = `/*#__PURE__*/`;
  function createCodegenContext(ast, { mode = 'function', prefixIdentifiers = mode === 'module', sourceMap = false, filename = `template.vue.html`, scopeId = null, optimizeImports = false, runtimeGlobalName = `Vue`, runtimeModuleName = `vue`, ssr = false }) {
      const context = {
          mode,
          prefixIdentifiers,
          sourceMap,
          filename,
          scopeId,
          optimizeImports,
          runtimeGlobalName,
          runtimeModuleName,
          ssr,
          source: ast.loc.source,
          code: ``,
          column: 1,
          line: 1,
          offset: 0,
          indentLevel: 0,
          pure: false,
          map: undefined,
          helper(key) {
              return `_${helperNameMap[key]}`;
          },
          push(code, node) {
              context.code += code;
          },
          indent() {
              newline(++context.indentLevel);
          },
          deindent(withoutNewLine = false) {
              if (withoutNewLine) {
                  --context.indentLevel;
              }
              else {
                  newline(--context.indentLevel);
              }
          },
          newline() {
              newline(context.indentLevel);
          }
      };
      function newline(n) {
          context.push('\n' + `  `.repeat(n));
      }
      return context;
  }
  function generate(ast, options = {}) {
      const context = createCodegenContext(ast, options);
      // 上下文创建结束的钩子函数
      if (options.onContextCreated) {
          options.onContextCreated(context);
      }
      const { prefixIdentifiers, scopeId, push, ssr, mode, indent, deindent, newline } = context;
      const hasHelpers = ast.helpers.length > 0;
      const useWithBlock = !prefixIdentifiers && mode !== 'module';
      // preambles
      // in setup() inline mode, the preamble is generated in a sub context
      // and returned separately.
      const preambleContext =  context;
      {
          // -> `function ...`
          genFunctionPreamble(ast, preambleContext);
      }
      // enter render function
      const functionName = ssr ? `ssrRender` : `render`;
      const args = ssr ? ['_ctx', '_push', '_parent', '_attrs'] : ['_ctx', '_cache'];
      const signature =  args.join(', ');
      {
          push(`function ${functionName}(${signature}) {`);
      }
      indent();
      if (useWithBlock) {
          push(`with (_ctx) {`);
          indent();
          // function mode const declarations should be inside with block
          // also they should be renamed to avoid collision with user properties
          // 重命名引入的函数避免冲突
          if (hasHelpers) {
              push(`const { ${ast.helpers
                .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
                .join(', ')} } = _Vue`);
              push(`\n`);
              newline();
          }
      }
      // ast.components, generate asset resolution statements
      if (ast.components.length) {
          genAssets(ast.components, 'component', context);
          if (ast.directives.length || ast.temps > 0) {
              newline();
          }
      }
      // generate directives, ast.directives
      if (ast.directives.length) {
          genAssets(ast.directives, 'directive', context);
          if (ast.temps > 0) {
              newline();
          }
      }
      // 临时变量 ast.temps
      if (ast.temps > 0) {
          push(`let `);
          for (let i = 0; i < ast.temps; i++) {
              push(`${i > 0 ? `, ` : ``}_temp${i}`);
          }
      }
      if (ast.components.length || ast.directives.length || ast.temps) {
          push(`\n`);
          newline();
      }
      // 生成 VNode 树表达式
      if (!ssr) {
          // 这里是真正 render 函数核心，上面都是为了引入变量，函数，imports 等做的处理
          push(`return `);
      }
      if (ast.codegenNode) {
          // genNode 为 codegen 阶段最最最核心函数
          genNode(ast.codegenNode, context);
      }
      else {
          push(`null`);
      }
      if (useWithBlock) {
          deindent();
          push(`}`);
      }
      deindent();
      push(`}`);
      return {
          ast,
          code: context.code,
          preamble:  ``,
          // SourceMapGenerator does have toJSON() method but it's not in the types
          map: context.map ? context.map.toJSON() : undefined
      };
  }
  function genFunctionPreamble(ast, context) {
      const { push, newline, runtimeGlobalName, runtimeModuleName, prefixIdentifiers, ssr } = context;
      const VueBinding =  runtimeGlobalName;
      const aliasHelper = (s) => `${helperNameMap[s]}: _${helperNameMap[s]}`;
      // Generate const declaration for helpers
      // In prefix mode, we place the const declaration at top so it's done
      // only once; But if we not prefixing, we place the declaration inside the
      // with block so it doesn't incur the `in` check cost for every helper access.
      if (ast.helpers.length > 0) {
          {
              // "with" mode.
              // save Vue in a separate variable to avoid collision
              push(`const _Vue = ${VueBinding}\n`);
              // in "with" mode, helpers are declared inside the with block to avoid
              // has check cost, but hoists are lifted out of the function - we need
              // to provide the helper here.
              if (ast.hoists.length) {
                  const staticHelpers = [
                      CREATE_VNODE,
                      CREATE_COMMENT,
                      CREATE_TEXT,
                      CREATE_STATIC
                  ]
                      .filter(helper => ast.helpers.includes(helper))
                      .map(aliasHelper)
                      .join(', ');
                  push(`const { ${staticHelpers} } = _Vue\n`);
              }
          }
      }
      genHoists(ast.hoists, context);
      newline();
      push(`return `);
  }
  function genAssets(assets, type, { helper, push, newline }) {
      const resolver = helper(type === 'component' ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE);
      for (let i = 0; i < assets.length; i++) {
          const id = assets[i];
          push(`const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)})`);
          if (i < assets.length - 1) {
              newline();
          }
      }
  }
  function genHoists(hoists, context) {
      if (!hoists.length) {
          return;
      }
      context.pure = true;
      const { push, newline, helper, scopeId, mode } = context;
      newline();
      hoists.forEach((exp, i) => {
          if (exp) {
              push(`const _hoisted_${i + 1} = `);
              genNode(exp, context);
              newline();
          }
      });
      context.pure = false;
  }
  function isText$1(n) {
      return (isString(n) ||
          n.type === 4 /* SIMPLE_EXPRESSION */ ||
          n.type === 2 /* TEXT */ ||
          n.type === 5 /* INTERPOLATION */ ||
          n.type === 8 /* COMPOUND_EXPRESSION */);
  }
  function genNodeListAsArray(nodes, context) {
      const multilines = nodes.length > 3 ||
          ( nodes.some(n => isArray(n) || !isText$1(n)));
      context.push(`[`);
      multilines && context.indent();
      genNodeList(nodes, context, multilines);
      multilines && context.deindent();
      context.push(']');
  }
  // nodes: 对应 [tag, props, children, patchFlag, dynamicProps]
  // 遍历递归处理这些节点
  function genNodeList(nodes, context, multilines = false, comma = true) {
      const { push, newline } = context;
      for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          if (isString(node)) {
              // 节点是字符串，直接 code += node
              push(node);
          }
          else if (isArray(node)) {
              // 将节点生成数组类型
              genNodeListAsArray(node, context);
          }
          else {
              genNode(node, context);
          }
          if (i < nodes.length - 1) {
              // 最后一个不用加逗号
              if (multilines) {
                  comma && push(',');
                  newline();
              }
              else {
                  // 生成在一行，如： _createVnode("div", null, null, -1)
                  comma && push(', ');
              }
          }
      }
  }
  function genNode(node, context) {
      if (isString(node)) {
          // 节点是字符串，直接 code += node
          context.push(node);
          return;
      }
      if (isSymbol(node)) {
          context.push(context.helper(node));
          return;
      }
      switch (node.type) {
          case 1 /* ELEMENT */:
          case 9 /* IF */:
          case 11 /* FOR */:
              
                  assert(node.codegenNode != null, `Codegen node is missing for element/if/for node. ` +
                      `Apply appropriate transforms first.`);
              genNode(node.codegenNode, context);
              break;
          case 2 /* TEXT */:
              genText(node, context);
              break;
          case 4 /* SIMPLE_EXPRESSION */:
              genExpression(node, context);
              break;
          case 5 /* INTERPOLATION */:
              genInterpolation(node, context);
              break;
          case 12 /* TEXT_CALL */:
              genNode(node.codegenNode, context);
              break;
          case 8 /* COMPOUND_EXPRESSION */:
              genCompoundExpression(node, context);
              break;
          case 3 /* COMMENT */:
              genComment(node, context);
              break;
          case 13 /* VNODE_CALL */:
              genVNodeCall(node, context);
              break;
          case 14 /* JS_CALL_EXPRESSION */:
              genCallExpression(node, context);
              break;
          case 15 /* JS_OBJECT_EXPRESSION */:
              genObjectExpression(node, context);
              break;
          case 17 /* JS_ARRAY_EXPRESSION */:
              genArrayExpression(node, context);
              break;
          case 18 /* JS_FUNCTION_EXPRESSION */:
              genFunctionExpression(node, context);
              break;
          case 19 /* JS_CONDITIONAL_EXPRESSION */:
              genConditionalExpression(node, context);
              break;
          case 20 /* JS_CACHE_EXPRESSION */:
              genCacheExpression(node, context);
              break;
          // SSR only types
          case 21 /* JS_BLOCK_STATEMENT */:
              break;
          case 22 /* JS_TEMPLATE_LITERAL */:
              break;
          case 23 /* JS_IF_STATEMENT */:
              break;
          case 24 /* JS_ASSIGNMENT_EXPRESSION */:
              break;
          case 25 /* JS_SEQUENCE_EXPRESSION */:
              break;
          case 26 /* JS_RETURN_STATEMENT */:
              break;
          /* istanbul ignore next */
          case 10 /* IF_BRANCH */:
              // noop
              break;
          default:
              {
                  assert(false, `unhandled codegen node type: ${node.type}`);
                  // make sure we exhaust all possible types
                  const exhaustiveCheck = node;
                  return exhaustiveCheck;
              }
      }
  }
  function genText(node, context) {
      context.push(JSON.stringify(node.content), node);
  }
  function genExpression(node, context) {
      const { content, isStatic } = node;
      context.push(isStatic ? JSON.stringify(content) : content, node);
  }
  function genInterpolation(node, context) {
      const { push, helper, pure } = context;
      if (pure)
          push(PURE_ANNOTATION);
      push(`${helper(TO_DISPLAY_STRING)}(`);
      genNode(node.content, context);
      push(')');
  }
  // 如： v-model="model" -> "onUpdate:modelValue": $event => (model = $event)
  function genCompoundExpression(node, context) {
      for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i];
          if (isString(child)) {
              context.push(child);
          }
          else {
              genNode(child, context);
          }
      }
  }
  // 生成对象的属性 key (可能是静态，动态)
  function genExpressionAsPropertyKey(node, context) {
      const { push } = context;
      if (node.type === 8 /* COMPOUND_EXPRESSION */) {
          push(`[`);
          genCompoundExpression(node, context);
          push(`]`);
      }
      else if (node.isStatic) {
          // only quote key if necessary
          const text = isSimpleIdentifier(node.content)
              ? node.content
              : JSON.stringify(node.content);
          push(text, node);
      }
      else {
          push(`[${node.content}]`, node);
      }
  }
  function genComment(node, context) {
      {
          const { push, helper, pure } = context;
          if (pure) {
              push(PURE_ANNOTATION);
          }
          push(`${helper(CREATE_COMMENT)}(${JSON.stringify(node.content)})`, node);
      }
  }
  function genVNodeCall(node, context) {
      const { push, helper, pure } = context;
      const { tag, props, children, patchFlag, dynamicProps, directives, isBlock, disableTracking } = node;
      if (directives) {
          push(helper(WITH_DIRECTIVES) + `(`);
      }
      if (isBlock) {
          push(`(${helper(OPEN_BLOCK)}(${disableTracking ? `true` : ``}), `);
      }
      if (pure) {
          push(PURE_ANNOTATION);
      }
      push(helper(isBlock ? CREATE_BLOCK : CREATE_VNODE) + '(', node);
      genNodeList(
      // 过滤掉空值
      genNullableArgs([tag, props, children, patchFlag, dynamicProps]), context);
      push(`)`);
      if (isBlock) {
          push(`)`);
      }
      if (directives) {
          push(`, `);
          genNode(directives, context);
          push(`)`);
      }
  }
  function genNullableArgs(args) {
      let i = args.length;
      // 从末尾开始淘汰掉空值参数
      while (i--) {
          if (args[i] != null)
              break;
      }
      return args.slice(0, i + 1).map(arg => arg || `null`);
  }
  // JavaScript
  // 根据 node 中的 callee 和 arguments 生成 callee(arguments)
  function genCallExpression(node, context) {
      const { push, helper, pure } = context;
      const callee = isString(node.callee) ? node.callee : helper(node.callee);
      if (pure) {
          push(PURE_ANNOTATION);
      }
      push(callee + `(`, node);
      genNodeList(node.arguments, context);
      push(`)`);
  }
  // 将属性(attribute, prop, events, bindings, ...)生成对象
  function genObjectExpression(node, context) {
      const { push, indent, deindent, newline } = context;
      const { properties } = node;
      if (!properties.length) {
          push(`{}`, node);
          return;
      }
      const multilines = properties.length > 1 ||
          (
              properties.some(p => p.value.type !== 4 /* SIMPLE_EXPRESSION */));
      push(multilines ? `{` : `{ `);
      multilines && indent();
      for (let i = 0; i < properties.length; i++) {
          const { key, value } = properties[i];
          // key
          genExpressionAsPropertyKey(key, context);
          push(`: `);
          // value
          genNode(value, context);
          if (i < properties.length - 1) {
              push(`,`);
              newline();
          }
      }
      multilines && deindent();
      push(multilines ? `}` : ` }`);
  }
  function genArrayExpression(node, context) {
      genNodeListAsArray(node.elements, context);
  }
  function genFunctionExpression(node, context) {
      const { push, indent, deindent, scopeId, mode } = context;
      const { params, returns, body, newline, isSlot } = node;
      if (isSlot) {
          push(`_${helperNameMap[WITH_CTX]}(`);
      }
      push(`(`, node);
      // 解析函数参数
      if (isArray(params)) {
          genNodeList(params, context);
      }
      else if (params) {
          genNode(params, context);
      }
      push(`) => `);
      if (newline || body) {
          push(`{`);
          indent();
      }
      // 函数返回值
      if (returns) {
          if (newline) {
              push(`return `);
          }
          if (isArray(returns)) {
              genNodeListAsArray(returns, context);
          }
          else {
              genNode(returns, context);
          }
      }
      else if (body) {
          genNode(body, context);
      }
      if (newline || body) {
          deindent();
          push(`}`);
      }
      if ( isSlot) {
          push(`)`);
      }
  }
  function genConditionalExpression(node, context) {
      const { test, consequent, alternate, newline: needNewline } = node;
      const { push, indent, deindent, newline } = context;
      if (test.type === 4 /* SIMPLE_EXPRESSION */) {
          // 非简单的标识符需要用括号，可能是表达式，所以需要 (a + b) ? ... : ...
          const needsParens = !isSimpleIdentifier(test.content);
          needsParens && push(`(`);
          genExpression(test, context);
          needsParens && push(`)`);
      }
      else {
          push(`(`);
          genNode(test, context);
          push(`)`);
      }
      needNewline && indent();
      context.indentLevel++;
      needNewline || push(` `);
      push(`? `);
      genNode(consequent, context);
      context.indentLevel--;
      needNewline && newline();
      needNewline || push(` `);
      push(`: `);
      const isNested = alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */;
      if (!isNested) {
          // 不是嵌套
          context.indentLevel++;
      }
      genNode(alternate, context);
      if (!isNested) {
          context.indentLevel--;
      }
      needNewline && deindent(true /* without newline */);
  }
  function genCacheExpression(node, context) {
      const { push, helper, indent, deindent, newline } = context;
      push(`_cache[${node.index}] || (`);
      if (node.isVNode) {
          indent();
          push(`${helper(SET_BLOCK_TRACKING)}(-1),`);
          newline();
      }
      push(`_cache[${node.index}] = `);
      genNode(node.value, context);
      if (node.isVNode) {
          push(`,`);
          newline();
          push(`${helper(SET_BLOCK_TRACKING)}(1),`);
          newline();
          push(`_cache[${node.index}]`);
          deindent();
      }
      push(`)`);
  }

  // these keywords should not appear inside expressions, but operators like
  // typeof, instanceof and in are allowed
  const prohibitedKeywordRE = new RegExp('\\b' +
      ('do,if,for,let,new,try,var,case,else,with,await,break,catch,class,const,' +
          'super,throw,while,yield,delete,export,import,return,switch,default,' +
          'extends,finally,continue,debugger,function,arguments,typeof,void')
          .split(',')
          .join('\\b|\\b') +
      '\\b');
  // strip strings in expressions
  const stripStringRE = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*\$\{|\}(?:[^`\\]|\\.)*`|`(?:[^`\\]|\\.)*`/g;
  /**
   * Validate a non-prefixed expression.
   * This is only called when using the in-browser runtime compiler since it
   * doesn't prefix expressions.
   */
  function validateBrowserExpression(node, context, asParams = false, asRawStatements = false) {
      const exp = node.content;
      // empty expressions are validated per-directive since some directives
      // do allow empty expressions.
      if (!exp.trim()) {
          return;
      }
      try {
          new Function(asRawStatements
              ? ` ${exp} `
              : `return ${asParams ? `(${exp}) => {}` : `(${exp})`}`);
      }
      catch (e) {
          let message = e.message;
          const keywordMatch = exp
              .replace(stripStringRE, '')
              .match(prohibitedKeywordRE);
          if (keywordMatch) {
              message = `avoid using JavaScript keyword as property name: "${keywordMatch[0]}"`;
          }
          context.onError(createCompilerError(43 /* X_INVALID_EXPRESSION */, node.loc, undefined, message));
      }
  }

  const transformExpression = (node, context) => {
      if (node.type === 5 /* INTERPOLATION */) {
          node.content = processExpression(node.content, context);
      }
      else if (node.type === 1 /* ELEMENT */) {
          // handle directives on element
          for (let i = 0; i < node.props.length; i++) {
              const dir = node.props[i];
              // 不处理 v-on & v-for 它们由自己的 transformXxx 处理
              if (dir.type === 7 /* DIRECTIVE */ && dir.name !== 'for') {
                  const exp = dir.exp;
                  const arg = dir.arg;
                  // 不处理无表达式情况(v-on:arg)，应为对于内联表达式需要特殊处理
                  if (exp &&
                      exp.type === 4 /* SIMPLE_EXPRESSION */ &&
                      !(dir.name === 'on' && arg)) {
                      dir.exp = processExpression(exp, context, 
                      // slot args must be processed as function params
                      // slot 参数必须当做函数参数处理
                      dir.name === 'slot');
                  }
                  // 动态参数 v-bind:[arg]="exp"
                  if (arg && arg.type === 4 /* SIMPLE_EXPRESSION */ && !arg.isStatic) {
                      dir.arg = processExpression(arg, context);
                  }
              }
          }
      }
  };
  // Important: since this function uses Node.js only dependencies, it should
  // always be used with a leading !true check so that it can be
  // tree-shaken from the browser build.
  function processExpression(node, context, 
  // some expressions like v-slot props & v-for aliases should be parsed as
  // function params
  asParams = false, 
  // v-on handler values may contain multiple statements
  asRawStatements = false) {
      {
          {
              // simple in-browser validation (same logic in 2.x)
              validateBrowserExpression(node, context, asParams, asRawStatements);
          }
          return node;
      }
  }

  const transformIf = createStructuralDirectiveTransform(/^(if|else|else-if)$/, (node, dir, context) => {
      return processIf(node, dir, context, (ifNode, branch, isRoot) => {
          // #1587: We need to dynamically increment the key based on the current
          // node's sibling nodes, since chained v-if/else branches are
          // rendered at the same depth
          // 这里讲的是，必须给兄弟节点一个动态递增的 `key` 属性，因为 v-if/else 分支
          // 会在同一级渲染
          // 取出分支的所有兄弟，这里面包含它自己
          const siblings = context.parent.children;
          let i = siblings.indexOf(ifNode);
          let key = 0;
          while (i-- >= 0) {
              const sibling = siblings[i];
              if (sibling && sibling.type === 9 /* IF */) {
                  key += sibling.branches.length;
              }
          }
          // Exit callback. Complete the codegenNode when all children have been
          // transformed.
          // exitFns 中的 exitFn ，到这里的时候说明分支节点的所有 children 都被 traverse
          // 过了，因此这里就可以直接返回对应的 codegenNode 了
          return () => {
              if (isRoot) {
                  ifNode.codegenNode = createCodegenNodeForBranch(branch, key, context);
              }
              else {
                  // attach this branch's codegen node to the v-if root.
                  const parentCondition = getParentCondition(ifNode.codegenNode);
                  parentCondition.alternate = createCodegenNodeForBranch(branch, key + ifNode.branches.length - 1, context);
              }
          };
      });
  });
  // target-agnostic transform used for both Client and SSR
  function processIf(node, dir, context, processCodegen) {
      // 不是 v-else 且没有表达式的情况，非法的情况，如： <div v-if></div>
      if (dir.name !== 'else' &&
          (!dir.exp || !dir.exp.content.trim())) {
          const loc = dir.exp ? dir.exp.loc : node.loc;
          context.onError(createCompilerError(27 /* X_V_IF_NO_EXPRESSION */, dir.loc));
          // 默认表达式的值为 true -> <div v-if="true" ...
          dir.exp = createSimpleExpression(`true`, false, loc);
      }
      if ( dir.exp) {
          // 检测是不是有效的表达式，直接 new Function(code) 有没报错就知道对不对
          validateBrowserExpression(dir.exp, context);
      }
      if (dir.name === 'if') {
          // v-if 分支
          const branch = createIfBranch(node, dir);
          const ifNode = {
              type: 9 /* IF */,
              loc: node.loc,
              branches: [branch]
          };
          // 替换原来的节点
          context.replaceNode(ifNode);
          if (processCodegen) {
              return processCodegen(ifNode, branch, true);
          }
      }
      else {
          // v-else, v-else-if 分支
          // locate the adjacent v-if
          const siblings = context.parent.children;
          const comments = [];
          let i = siblings.indexOf(node);
          // 一直往回找到 v-if 节点
          while (i-- >= -1) {
              const sibling = siblings[i];
              // 开发模式忽略注释，但缓存将来需要回复，生产模式不需要注释
              if ( sibling && sibling.type === 3 /* COMMENT */) {
                  context.removeNode(sibling);
                  comments.unshift(sibling);
                  continue;
              }
              // 空文本内容，直接删除
              if (sibling &&
                  sibling.type === 2 /* TEXT */ &&
                  !sibling.content.trim().length) {
                  context.removeNode(sibling);
                  continue;
              }
              if (sibling && sibling.type === 9 /* IF */) {
                  // 找到目标节点
                  context.removeNode();
                  const branch = createIfBranch(node, dir);
                  if ( comments.length) {
                      branch.children = [...comments, ...branch.children];
                  }
                  // check if user is forcing same key on different branches
                  // 在不同分支上应用了同一个 `key`
                  {
                      const key = branch.userKey;
                      if (key) {
                          sibling.branches.forEach(({ userKey }) => {
                              if (isSameKey(userKey, key)) {
                                  context.onError(createCompilerError(28 /* X_V_IF_SAME_KEY */, branch.userKey.loc));
                              }
                          });
                      }
                  }
                  sibling.branches.push(branch);
                  const onExit = processCodegen && processCodegen(sibling, branch, false);
                  // since the branch was removed, it will not be traversed.
                  // make sure to traverse here.
                  // 分支节点被上面删除，所以要手动 traverse 该节点
                  traverseNode(branch, context);
                  // call on exit
                  if (onExit)
                      onExit();
                  // make sure to reset currentNode after traversal to indicate this
                  // node has been removed.
                  // 标识当前节点被删除了， traverseNode 中会用到
                  context.currentNode = null;
              }
              else {
                  context.onError(createCompilerError(29 /* X_V_ELSE_NO_ADJACENT_IF */, node.loc));
              }
              break;
          }
      }
  }
  function createIfBranch(node, dir) {
      return {
          type: 10 /* IF_BRANCH */,
          loc: node.loc,
          // condition ? v-if node : v-else node
          condition: dir.name === 'else' ? undefined : dir.exp,
          // 如果用的是 <template v-if="condition" ... 就需要 node.children
          // 因为 template 本身是不该被渲染的
          children: node.tagType === 3 /* TEMPLATE */ && !findDir(node, 'for')
              ? node.children
              : [node],
          // 对于 v-for, v-if/... 都应该给它个 key, 这里是用户编写是的提供的唯一 key
          // 如果没有解析器会默认生成一个全局唯一的 key
          userKey: findProp(node, `key`)
      };
  }
  function createCodegenNodeForBranch(branch, keyIndex, context) {
      if (branch.condition) {
          return createConditionalExpression(branch.condition, createChildrenCodegenNode(branch, keyIndex, context), 
          // make sure to pass in asBlock: true so that the comment node call
          // closes the current block.
          createCallExpression(context.helper(CREATE_COMMENT), [
               '"v-if"' ,
              'true'
          ]));
      }
      else {
          return createChildrenCodegenNode(branch, keyIndex, context);
      }
  }
  function createChildrenCodegenNode(branch, keyIndex, context) {
      const { helper } = context;
      // 给每个分支加一个 `key` 属性
      const keyProperty = createObjectProperty(`key`, createSimpleExpression(`${keyIndex}`, false, locStub, 2 /* CAN_HOIST */));
      const { children } = branch;
      const firstChild = children[0];
      // 是不是需要用 fragment 将所有 children 包起来
      const needFragmentWrapper = children.length !== 1 || firstChild.type !== 1 /* ELEMENT */;
      if (needFragmentWrapper) {
          if (children.length === 1 && firstChild.type === 11 /* FOR */) {
              // optimize away nested fragments when child is a ForNode
              const vnodeCall = firstChild.codegenNode;
              injectProp(vnodeCall, keyProperty, context);
              return vnodeCall;
          }
          else {
              return createVNodeCall(context, helper(FRAGMENT), createObjectExpression([keyProperty]), children, 64 /* STABLE_FRAGMENT */ +
                  ( ` /* ${PatchFlagNames[64 /* STABLE_FRAGMENT */]} */`
                      ), undefined, undefined, true, false, branch.loc);
          }
      }
      else {
          // children.length === 1 && firstChild.type === NodeTypes.ELEMENT
          // 正常的元素，直接用它来创建
          const vnodeCall = firstChild
              .codegenNode;
          // Change createVNode to createBlock.
          if (vnodeCall.type === 13 /* VNODE_CALL */) {
              vnodeCall.isBlock = true;
              helper(OPEN_BLOCK);
              helper(CREATE_BLOCK);
          }
          // inject branch key
          injectProp(vnodeCall, keyProperty, context);
          return vnodeCall;
      }
  }
  function isSameKey(a, b) {
      if (!a || a.type !== b.type) {
          return false;
      }
      if (a.type === 6 /* ATTRIBUTE */) {
          if (a.value.content !== b.value.content) {
              return false;
          }
      }
      else {
          // directive
          const exp = a.exp;
          const branchExp = b.exp;
          if (exp.type !== branchExp.type) {
              return false;
          }
          if (exp.type !== 4 /* SIMPLE_EXPRESSION */ ||
              (exp.isStatic !== branchExp.isStatic ||
                  exp.content !== branchExp.content)) {
              return false;
          }
      }
      return true;
  }
  function getParentCondition(node) {
      while (true) {
          if (node.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
              if (node.alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
                  node = node.alternate;
              }
              else {
                  return node;
              }
          }
          else if (node.type === 20 /* JS_CACHE_EXPRESSION */) {
              node = node.value;
          }
      }
  }

  const transformFor = createStructuralDirectiveTransform('for', (node, dir, context) => {
      const { helper } = context;
      return processFor(node, dir, context, forNode => {
          // create the loop render function expression now, and add the
          // iterator on exit after all children have been traversed
          const renderExp = createCallExpression(helper(RENDER_LIST), [
              forNode.source
          ]);
          const keyProp = findProp(node, `key`);
          const keyProperty = keyProp
              ? createObjectProperty(`key`, keyProp.type === 6 /* ATTRIBUTE */
                  ? createSimpleExpression(keyProp.value.content, true)
                  : keyProp.exp)
              : null;
          const isStableFragment = forNode.source.type === 4 /* SIMPLE_EXPRESSION */ &&
              forNode.source.constType > 0;
          const fragmentFlag = isStableFragment
              ? 64 /* STABLE_FRAGMENT */
              : keyProp
                  ? 128 /* KEYED_FRAGMENT */
                  : 256 /* UNKEYED_FRAGMENT */;
          forNode.codegenNode = createVNodeCall(context, helper(FRAGMENT), undefined, renderExp, fragmentFlag +
              ( ` /* ${PatchFlagNames[fragmentFlag]} */` ), undefined, undefined, true /* isBlock */, !isStableFragment /* disableTracking */, node.loc);
          return () => {
              // finish the codegen now that all children have been traversed
              let childBlock;
              const isTemplate = isTemplateNode(node);
              const { children } = forNode;
              // check <template v-for> key placement
              if ( isTemplate) {
                  node.children.some(c => {
                      if (c.type === 1 /* ELEMENT */) {
                          const key = findProp(c, `key`);
                          if (key) {
                              context.onError(createCompilerError(32 /* X_V_FOR_TEMPLATE_KEY_PLACEMENT */, key.loc));
                              return true;
                          }
                      }
                  });
              }
              const needFragmentWrapper = children.length !== 1 || children[0].type !== 1 /* ELEMENT */;
              const slotOutlet = isSlotOutlet(node)
                  ? node
                  : isTemplate &&
                      node.children.length === 1 &&
                      isSlotOutlet(node.children[0])
                      ? node.children[0] // api-extractor somehow fails to infer this
                      : null;
              if (slotOutlet) {
                  // <slot v-for="..."> or <template v-for="..."><slot/></template>
                  childBlock = slotOutlet.codegenNode;
                  if (isTemplate && keyProperty) {
                      // <template v-for="..." :key="..."><slot/></template>
                      // we need to inject the key to the renderSlot() call.
                      // the props for renderSlot is passed as the 3rd argument.
                      injectProp(childBlock, keyProperty, context);
                  }
              }
              else if (needFragmentWrapper) {
                  // <template v-for="..."> with text or multi-elements
                  // should generate a fragment block for each loop
                  childBlock = createVNodeCall(context, helper(FRAGMENT), keyProperty ? createObjectExpression([keyProperty]) : undefined, node.children, 64 /* STABLE_FRAGMENT */ +
                      ( ` /* ${PatchFlagNames[64 /* STABLE_FRAGMENT */]} */`
                          ), undefined, undefined, true);
              }
              else {
                  // Normal element v-for. Directly use the child's codegenNode
                  // but mark it as a block.
                  childBlock = children[0]
                      .codegenNode;
                  if (isTemplate && keyProperty) {
                      injectProp(childBlock, keyProperty, context);
                  }
                  childBlock.isBlock = !isStableFragment;
                  if (childBlock.isBlock) {
                      helper(OPEN_BLOCK);
                      helper(CREATE_BLOCK);
                  }
                  else {
                      helper(CREATE_VNODE);
                  }
              }
              renderExp.arguments.push(createFunctionExpression(createForLoopParams(forNode.parseResult), childBlock, true /* force newline */));
          };
      });
  });
  // target-agnostic transform used for both Client and SSR
  function processFor(node, dir, context, processCodegen) {
      if (!dir.exp) {
          context.onError(createCompilerError(30 /* X_V_FOR_NO_EXPRESSION */, dir.loc));
          return;
      }
      const parseResult = parseForExpression(
      // can only be simple expression because vFor transform is applied
      // before expression transform.
      dir.exp, context);
      if (!parseResult) {
          context.onError(createCompilerError(31 /* X_V_FOR_MALFORMED_EXPRESSION */, dir.loc));
          return;
      }
      const { addIdentifiers, removeIdentifiers, scopes } = context;
      const { source, value, key, index } = parseResult;
      const forNode = {
          type: 11 /* FOR */,
          loc: dir.loc,
          source,
          valueAlias: value,
          keyAlias: key,
          objectIndexAlias: index,
          parseResult,
          children: isTemplateNode(node) ? node.children : [node]
      };
      context.replaceNode(forNode);
      // bookkeeping
      scopes.vFor++;
      const onExit = processCodegen && processCodegen(forNode);
      return () => {
          scopes.vFor--;
          if (onExit)
              onExit();
      };
  }
  // for ... in/of ...
  const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
  // This regex doesn't cover the case if key or index aliases have destructuring,
  // but those do not make sense in the first place, so this works in practice.
  const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
  const stripParensRE = /^\(|\)$/g;
  function parseForExpression(input, context) {
      const loc = input.loc;
      const exp = input.content;
      const inMatch = exp.match(forAliasRE);
      if (!inMatch)
          return;
      // LHS in|of RHS
      const [, LHS, RHS] = inMatch;
      const result = {
          source: createAliasExpression(loc, RHS.trim(), exp.indexOf(RHS, LHS.length)),
          value: undefined,
          key: undefined,
          index: undefined
      };
      {
          validateBrowserExpression(result.source, context);
      }
      // 去掉前后的 (, ), 如： (value, key, index) -> `value, key, index`
      let valueContent = LHS.trim()
          .replace(stripParensRE, '')
          .trim();
      const trimmedOffset = LHS.indexOf(valueContent);
      // value, key, index -> 匹配出 ` key` 和 ` index`
      const iteratorMatch = valueContent.match(forIteratorRE);
      if (iteratorMatch) {
          valueContent = valueContent.replace(forIteratorRE, '').trim();
          // ` key` -> `key`
          const keyContent = iteratorMatch[1].trim();
          let keyOffset;
          if (keyContent) {
              keyOffset = exp.indexOf(keyContent, trimmedOffset + valueContent.length);
              result.key = createAliasExpression(loc, keyContent, keyOffset);
              {
                  validateBrowserExpression(result.key, context, true);
              }
          }
          // `index`
          if (iteratorMatch[2]) {
              const indexContent = iteratorMatch[2].trim();
              if (indexContent) {
                  result.index = createAliasExpression(loc, indexContent, exp.indexOf(indexContent, result.key
                      ? keyOffset + keyContent.length
                      : trimmedOffset + valueContent.length));
                  {
                      validateBrowserExpression(result.index, context, true);
                  }
              }
          }
      }
      if (valueContent) {
          result.value = createAliasExpression(loc, valueContent, trimmedOffset);
          {
              validateBrowserExpression(result.value, context, true);
          }
      }
      return result;
  }
  function createAliasExpression(range, content, offset) {
      return createSimpleExpression(content, false, getInnerRange(range, offset, content.length));
  }
  function createForLoopParams({ value, key, index }) {
      // function: (_, __, index) => ....
      const params = [];
      if (value) {
          params.push(value);
      }
      if (key) {
          if (!value) {
              params.push(createSimpleExpression(`_`, false));
          }
          params.push(key);
      }
      if (index) {
          if (!key) {
              if (!value) {
                  params.push(createSimpleExpression(`_`, false));
              }
              params.push(createSimpleExpression(`__`, false));
          }
          params.push(index);
      }
      return params;
  }

  const defaultFallback = createSimpleExpression(`undefined`, false);
  // A NodeTransform that:
  // 1. Tracks scope identifiers for scoped slots so that they don't get prefixed
  //    by transformExpression. This is only applied in non-browser builds with
  //    { prefixIdentifiers: true }.
  // 2. Track v-slot depths so that we know a slot is inside another slot.
  //    Note the exit callback is executed before buildSlots() on the same node,
  //    so only nested slots see positive numbers.
  const trackSlotScopes = (node, context) => {
      // <component> or <template>
      if (node.type === 1 /* ELEMENT */ &&
          (node.tagType === 1 /* COMPONENT */ ||
              node.tagType === 3 /* TEMPLATE */)) {
          // We are only checking non-empty v-slot here
          // since we only care about slots that introduce scope variables.
          const vSlot = findDir(node, 'slot');
          if (vSlot) {
              const slotProps = vSlot.exp;
              context.scopes.vSlot++;
              return () => {
                  context.scopes.vSlot--;
              };
          }
      }
  };
  // A NodeTransform that tracks scope identifiers for scoped slots with v-for.
  // This transform is only applied in non-browser builds with { prefixIdentifiers: true }
  const trackVForSlotScopes = (node, context) => {
      let vFor;
      // <template v-slot="slotProps" v-for="item in items"> 情况
      if (isTemplateNode(node) &&
          node.props.some(isVSlot) &&
          (vFor = findDir(node, 'for'))) {
          const result = (vFor.parseResult = parseForExpression(vFor.exp, context));
          if (result) {
              const { value, key, index } = result;
              const { addIdentifiers, removeIdentifiers } = context;
              // 添加作用域调用 item -> _ctx.item
              value && addIdentifiers(value);
              key && addIdentifiers(key);
              index && addIdentifiers(index);
              return () => {
                  value && removeIdentifiers(value);
                  key && removeIdentifiers(key);
                  index && removeIdentifiers(index);
              };
          }
      }
  };
  const buildClientSlotFn = (props, children, loc) => createFunctionExpression(props, children, false /* newline */, true /* isSlot */, children.length ? children[0].loc : loc);
  // Instead of being a DirectiveTransform, v-slot processing is called during
  // transformElement to build the slots object for a component.
  function buildSlots(node, context, buildSlotFn = buildClientSlotFn) {
      context.helper(WITH_CTX);
      const { children, loc } = node;
      const slotsProperties = [];
      const dynamicSlots = [];
      const buildDefaultSlotProperty = (props, children) => createObjectProperty(`default`, buildSlotFn(props, children, loc));
      // If the slot is inside a v-for or another v-slot, force it to be dynamic
      // since it likely uses a scope variable.
      // 如果 slot 是在 v-for 或另一个  v-slot 里面强制它成为一个动态的
      let hasDynamicSlots = context.scopes.vSlot > 0 || context.scopes.vFor > 0;
      // 1. <Comp v-slot="{ prop }"/> 检查 slot 和 slotProps 应用在组件自身
      const onComponentSlot = findDir(node, 'slot', true);
      if (onComponentSlot) {
          const { arg, exp } = onComponentSlot;
          if (arg && !isStaticExp(arg)) {
              hasDynamicSlots = true;
          }
          slotsProperties.push(createObjectProperty(arg || createSimpleExpression('default', true), buildSlotFn(exp, children, loc)));
      }
      // 2. 遍历所有 children 检查是否存在 <template v-slot:foo="{prop}">
      let hasTemplateSlots = false;
      let hasNamedDefaultSlot = false;
      const implicitDefaultChildren = [];
      const seenSlotNames = new Set();
      for (let i = 0; i < children.length; i++) {
          const slotElement = children[i];
          let slotDir;
          // 不是 <template> 或没有 v-slot
          if (!isTemplateNode(slotElement) ||
              !(slotDir = findDir(slotElement, 'slot', true))) {
              // 不是 <template v-slot> 跳过不处理
              if (slotElement.type !== 3 /* COMMENT */) {
                  implicitDefaultChildren.push(slotElement);
              }
              continue;
          }
          if (onComponentSlot) {
              // 组件上已经有v-slot 的时候，里面所有孩子都不能在使用 v-slot
              context.onError(createCompilerError(36 /* X_V_SLOT_MIXED_SLOT_USAGE */, slotDir.loc));
              break;
          }
          hasTemplateSlots = true;
          const { children: slotChildren, loc: slotLoc } = slotElement;
          const { arg: slotName = createSimpleExpression(`default`, true), exp: slotProps, loc: dirLoc } = slotDir;
          // check if name is dynamic
          let staticSlotName;
          if (isStaticExp(slotName)) {
              staticSlotName = slotName ? slotName.content : `default`;
          }
          else {
              // dynamic slot name, v-slot:[name]="slotProps"
              hasDynamicSlots = true;
          }
          const slotFunction = buildSlotFn(slotProps, slotChildren, slotLoc);
          // check if this slot is conditional (v-if/v-for)
          let vIf;
          let vElse;
          let vFor;
          if ((vIf = findDir(slotElement, 'if'))) {
              // v-slot with v-if
              hasDynamicSlots = true;
              dynamicSlots.push(createConditionalExpression(vIf.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback));
          }
          else if ((vElse = findDir(slotElement, /^else(-if)?$/, true /* allowEmpty */))) {
              // v-else/if on slot
              let j = i;
              let prev;
              while (j--) {
                  // 找到相邻的 v-if
                  prev = children[j];
                  if (prev.type !== 3 /* COMMENT */) {
                      break;
                  }
              }
              if (prev && isTemplateNode(prev) && findDir(prev, 'if')) {
                  // remove node
                  children.splice(i, 1);
                  i--;
                  // attach this slot to previous conditional
                  let conditional = dynamicSlots[dynamicSlots.length - 1];
                  while (conditional.alternate.type === 19 /* JS_CONDITIONAL_EXPRESSION */) {
                      conditional = conditional.alternate;
                  }
                  conditional.alternate = vElse.exp
                      ? createConditionalExpression(vElse.exp, buildDynamicSlot(slotName, slotFunction), defaultFallback)
                      : buildDynamicSlot(slotName, slotFunction);
              }
              else {
                  context.onError(createCompilerError(29 /* X_V_ELSE_NO_ADJACENT_IF */, vElse.loc));
              }
          }
          else if ((vFor = findDir(slotElement, 'for'))) {
              hasDynamicSlots = true;
              const parseResult = vFor.parseResult ||
                  parseForExpression(vFor.exp, context);
              if (parseResult) {
                  // Render the dynamic slots as an array and add it to the createSlot()
                  // args. The runtime knows how to handle it appropriately.
                  dynamicSlots.push(createCallExpression(context.helper(RENDER_LIST), [
                      parseResult.source,
                      createFunctionExpression(createForLoopParams(parseResult), buildDynamicSlot(slotName, slotFunction), true /* force newline */)
                  ]));
              }
              else {
                  context.onError(createCompilerError(31 /* X_V_FOR_MALFORMED_EXPRESSION */, vFor.loc));
              }
          }
          else {
              // 检查静态属性名是否有重复的
              if (staticSlotName) {
                  if (seenSlotNames.has(staticSlotName)) {
                      context.onError(createCompilerError(37 /* X_V_SLOT_DUPLICATE_SLOT_NAMES */, dirLoc));
                      continue;
                  }
                  seenSlotNames.add(staticSlotName);
                  if (staticSlotName === 'default') {
                      // 显式的使用了默认插槽名称
                      hasNamedDefaultSlot = true;
                  }
              }
              slotsProperties.push(createObjectProperty(slotName, slotFunction));
          }
      }
      if (!onComponentSlot) {
          if (!hasTemplateSlots) {
              // implicit default slot (on component)
              // <Comp><div/></Comp> 内的 <div/> 作为默认插槽
              slotsProperties.push(buildDefaultSlotProperty(undefined, children));
          }
          else if (implicitDefaultChildren.length) {
              // 1. 非 <Comp v-slot="slotProps">
              // 2. 存在 <template v-slot>
              // 3. 且存在其他非 template 类型的节点
              // 4. 如果有 <template v-slot:default="slotProps"> 时候视为非法
              // 因为其他非 template 类型的节点会被视为默认插槽内容
              if (hasNamedDefaultSlot) {
                  context.onError(createCompilerError(38 /* X_V_SLOT_EXTRANEOUS_DEFAULT_SLOT_CHILDREN */, implicitDefaultChildren[0].loc));
              }
              else {
                  slotsProperties.push(buildDefaultSlotProperty(undefined, implicitDefaultChildren));
              }
          }
      }
      const slotFlag = hasDynamicSlots
          ? 2 /* DYNAMIC */
          : hasForwardedSlots(node.children)
              ? 3 /* FORWARDED */
              : 1 /* STABLE */;
      // 增加 `_` 属性，标识该 slot 类型，1-stable,2-forwarded,3-dynamic
      let slots = createObjectExpression(slotsProperties.concat(createObjectProperty(`_`, 
      // 2 = compiled but dynamic = can skip normalization, but must run diff
      // 1 = compiled and static = can skip normalization AND diff as optimized
      createSimpleExpression(slotFlag + ( ` /* ${slotFlagsText[slotFlag]} */` ), false))), loc);
      // 动态插槽， v-slot:[name]="slotProps" 或在 v-if/v-for 指令中都是为动态
      if (dynamicSlots.length) {
          slots = createCallExpression(context.helper(CREATE_SLOTS), [
              slots,
              createArrayExpression(dynamicSlots)
          ]);
      }
      return { slots, hasDynamicSlots };
  }
  function buildDynamicSlot(name, fn) {
      return createObjectExpression([
          createObjectProperty(`name`, name),
          createObjectProperty(`fn`, fn)
      ]);
  }
  function hasForwardedSlots(children) {
      for (let i = 0; i < children.length; i++) {
          const child = children[i];
          // 满足条件的下面情况
          // 1. child 必须是 1,ELEMENT 类型
          // 2. <slot> 或 <element>且孩子节点下有满足 1&2情况
          if (child.type === 1 /* ELEMENT */) {
              if (child.tagType === 2 /* SLOT */ ||
                  (child.tagType === 0 /* ELEMENT */ &&
                      hasForwardedSlots(child.children))) {
                  return true;
              }
          }
      }
      return false;
  }

  // some directive transforms (e.g. v-model) may return a symbol for runtime
  // import, which should be used instead of a resolveDirective call.
  const directiveImportMap = new WeakMap();
  const transformElement = (node, context) => {
      if (!(node.type === 1 /* ELEMENT */ &&
          (node.tagType === 0 /* ELEMENT */ ||
              node.tagType === 1 /* COMPONENT */))) {
          return;
      }
      // perform the work on exit, after all child expressions have been
      // processed and merged.
      return function postTransformElement() {
          const { tag, props } = node;
          const isComponent = node.tagType === 1 /* COMPONENT */;
          // The goal of the transform is to create a codegenNode implementing the
          // VNodeCall interface.
          const vnodeTag = isComponent
              ? resolveComponentType(node, context)
              : `"${tag}"`;
          const isDynamicComponent = isObject(vnodeTag) && vnodeTag.callee === RESOLVE_DYNAMIC_COMPONENT;
          let vnodeProps;
          let vnodeChildren;
          let vnodePatchFlag;
          let patchFlag = 0;
          let vnodeDynamicProps;
          let dynamicPropNames;
          let vnodeDirectives;
          let shouldUseBlock = 
          // dynamic component may resolve to plain elements
          isDynamicComponent ||
              vnodeTag === TELEPORT ||
              vnodeTag === SUSPENSE ||
              (!isComponent &&
                  // <svg> and <foreignObject> must be forced into blocks so that block
                  // updates inside get proper isSVG flag at runtime. (#639, #643)
                  // This is technically web-specific, but splitting the logic out of core
                  // leads to too much unnecessary complexity.
                  (tag === 'svg' ||
                      tag === 'foreignObject' ||
                      // #938: elements with dynamic keys should be forced into blocks
                      findProp(node, 'key', true)));
          if (props.length > 0) {
              const propsBuildResult = buildProps(node, context);
              vnodeProps = propsBuildResult.props;
              patchFlag = propsBuildResult.patchFlag;
              dynamicPropNames = propsBuildResult.dynamicPropNames;
              const directives = propsBuildResult.directives;
              vnodeDirectives =
                  directives && directives.length
                      ? createArrayExpression(directives.map(dir => buildDirectiveArgs(dir, context)))
                      : undefined;
          }
          if (node.children.length > 0) {
              if (vnodeTag === KEEP_ALIVE) {
                  // Although a built-in component, we compile KeepAlive with raw children
                  // instead of slot functions so that it can be used inside Transition
                  // or other Transition-wrapping HOCs.
                  // To ensure correct updates with block optimizations, we need to:
                  // 1. Force keep-alive into a block. This avoids its children being
                  //    collected by a parent block.
                  shouldUseBlock = true;
                  // 2. Force keep-alive to always be updated, since it uses raw children.
                  patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  if ( node.children.length > 1) {
                      context.onError(createCompilerError(44 /* X_KEEP_ALIVE_INVALID_CHILDREN */, {
                          start: node.children[0].loc.start,
                          end: node.children[node.children.length - 1].loc.end,
                          source: ''
                      }));
                  }
              }
              const shouldBuildAsSlots = isComponent &&
                  // Teleport is not a real component and has dedicated runtime handling
                  vnodeTag !== TELEPORT &&
                  vnodeTag !== KEEP_ALIVE;
              if (shouldBuildAsSlots) {
                  const { slots, hasDynamicSlots } = buildSlots(node, context);
                  vnodeChildren = slots; // { type: 15,JS_OBJECT_EXPRESSION, properties: [...]}
                  if (hasDynamicSlots) {
                      // 动态插槽
                      patchFlag |= 1024 /* DYNAMIC_SLOTS */;
                  }
              }
              else if (node.children.length === 1 && vnodeTag !== TELEPORT) {
                  // 只有一个孩子节点的时候
                  const child = node.children[0];
                  const type = child.type;
                  // 动态文本节点检测, 插值或组合表达式
                  const hasDynamicTextChild = type === 5 /* INTERPOLATION */ ||
                      type === 8 /* COMPOUND_EXPRESSION */;
                  if (hasDynamicTextChild &&
                      getConstantType(child, context) === 0 /* NOT_CONSTANT */) {
                      patchFlag |= 1 /* TEXT */;
                  }
                  // 唯一的 child 是个文本节点(plain / interpolation / expression)
                  if (hasDynamicTextChild || type === 2 /* TEXT */) {
                      vnodeChildren = child;
                  }
                  else {
                      vnodeChildren = node.children;
                  }
              }
              else {
                  vnodeChildren = node.children;
              }
          }
          // patchFlag 处理
          if (patchFlag !== 0) {
              {
                  if (patchFlag < 0) {
                      // special flags (negative and mutually exclusive)
                      vnodePatchFlag = patchFlag + ` /* ${PatchFlagNames[patchFlag]} */`;
                  }
                  else {
                      const flagNames = Object.keys(PatchFlagNames)
                          .map(Number)
                          .filter(n => n > 0 && patchFlag & n)
                          .map(n => PatchFlagNames[n])
                          .join(', ');
                      vnodePatchFlag = patchFlag + ` /* ${flagNames} */`;
                  }
              }
              // 动态属性
              if (dynamicPropNames && dynamicPropNames.length) {
                  vnodeDynamicProps = stringifyDynamicPropNames(dynamicPropNames);
              }
          }
          // 开始构造 VNODE_CALL 类型 codegenNode
          node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren, vnodePatchFlag, vnodeDynamicProps, vnodeDirectives, !!shouldUseBlock, false /* disableTracking */, node.loc);
      };
  };
  function resolveComponentType(node, context, ssr = false) {
      const { tag } = node;
      // 1. 动态组件
      const isProp = node.tag === 'component' ? findProp(node, 'is') : findDir(node, 'is');
      if (isProp) {
          const exp = 
          // 静态属性
          isProp.type === 6 /* ATTRIBUTE */
              ? isProp.value && createSimpleExpression(isProp.value.content, true)
              : isProp.exp;
          if (exp) {
              return createCallExpression(context.helper(RESOLVE_DYNAMIC_COMPONENT), [
                  exp
              ]);
          }
      }
      // 2. 内置组件(Teleport, Transition, KeepAlive, Suspense)
      const builtIn = isCoreComponent(tag) || context.isBuiltInComponent(tag);
      if (builtIn) {
          // built-ins are simply fallthroughs / have special handling during ssr
          // no we don't need to import their runtime equivalents
          if (!ssr)
              context.helper(builtIn);
          return builtIn;
      }
      // 5. user component(resolve)
      context.helper(RESOLVE_COMPONENT);
      context.components.add(tag);
      return toValidAssetId(tag, `component`);
  }
  function buildProps(node, context, props = node.props, ssr = false) {
      const { tag, loc: elementLoc } = node;
      const isComponent = node.tagType === 1 /* COMPONENT */;
      let properties = [];
      const mergeArgs = [];
      const runtimeDirectives = [];
      let patchFlag = 0;
      let hasRef = false;
      // <div :class="..."
      let hasClassBinding = false;
      // <div :style="..."
      let hasStyleBinding = false;
      // <div @eventName="handler"
      let hasHydrationEventBinding = false;
      // <div :key="..."
      let hasDynamicKeys = false;
      let hasVnodeHook = false;
      const dynamicPropNames = [];
      const analyzePatchFlag = ({ key, value }) => {
          if (isStaticExp(key)) {
              const name = key.content;
              const isEventHandler = isOn(name);
              if (!isComponent &&
                  isEventHandler &&
                  // omit the flag for click handlers because hydration gives click
                  // dedicated fast path.
                  name.toLowerCase() !== 'onclick' &&
                  // omit v-model handlers
                  name !== 'onUpdate:modelValue' &&
                  // omit onVnodeXXX hooks
                  !isReservedProp(name)) {
                  hasHydrationEventBinding = true;
              }
              if (isEventHandler && isReservedProp(name)) {
                  hasVnodeHook = true;
              }
              if (value.type === 20 /* JS_CACHE_EXPRESSION */ ||
                  ((value.type === 4 /* SIMPLE_EXPRESSION */ ||
                      value.type === 8 /* COMPOUND_EXPRESSION */) &&
                      getConstantType(value, context) > 0)) {
                  // skip if the prop is a cached handler or has constant value
                  return;
              }
              if (name === 'ref') {
                  hasRef = true;
              }
              else if (name === 'class' && !isComponent) {
                  hasClassBinding = true;
              }
              else if (name === 'style' && !isComponent) {
                  hasStyleBinding = true;
              }
              else if (name !== 'key' && !dynamicPropNames.includes(name)) {
                  dynamicPropNames.push(name);
              }
          }
          else {
              hasDynamicKeys = true;
          }
      };
      for (let i = 0; i < props.length; i++) {
          // 静态属性
          const prop = props[i];
          if (prop.type === 6 /* ATTRIBUTE */) {
              const { loc, name, value } = prop;
              let isStatic = true;
              if (name === 'ref') {
                  hasRef = true;
              }
              // skip :is on <component>
              if (name === 'is' && tag === 'component') {
                  continue;
              }
              properties.push(createObjectProperty(createSimpleExpression(name, true, getInnerRange(loc, 0, name.length)), createSimpleExpression(value ? value.content : '', isStatic, value ? value.loc : loc)));
          }
          else {
              // directives, 指令属性
              const { name, arg, exp, loc } = prop;
              const isBind = name === 'bind';
              const isOn = name === 'on';
              // skip v-slot - it is handled by its dedicated transform.
              // v-slot 由 vSlot.ts 处理
              if (name === 'slot') {
                  if (!isComponent) {
                      context.onError(createCompilerError(39 /* X_V_SLOT_MISPLACED */, loc));
                  }
                  continue;
              }
              // skip v-once, 由 vOnce.ts 处理
              if (name === 'once') {
                  continue;
              }
              // skip v-is and :is on <component>
              if (name === 'is' ||
                  (isBind && tag === 'component' && isBindKey(arg, 'is'))) {
                  continue;
              }
              // skip v-on ins SSR compilation
              if (isOn && ssr) {
                  continue;
              }
              // v-bind, v-on 没有参数情况
              if (!arg && (isBind || isOn)) {
                  hasDynamicKeys = true;
                  if (exp) {
                      if (properties.length) {
                          mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
                          properties = [];
                      }
                      if (isBind) {
                          mergeArgs.push(exp);
                      }
                      else {
                          // v-on="obj" => toHandlers(obj)
                          mergeArgs.push({
                              type: 14 /* JS_CALL_EXPRESSION */,
                              loc,
                              callee: context.helper(TO_HANDLERS),
                              arguments: [exp]
                          });
                      }
                  }
                  else {
                      context.onError(createCompilerError(isBind
                          ? 33 /* X_V_BIND_NO_EXPRESSION */
                          : 34 /* X_V_ON_NO_EXPRESSION */, loc));
                  }
                  continue;
              }
              const directiveTransform = context.directiveTransforms[name];
              if (directiveTransform) {
                  // has built-in directive transform.
                  const { props, needRuntime } = directiveTransform(prop, node, context);
                  !ssr && props.forEach(analyzePatchFlag);
                  properties.push(...props);
                  if (needRuntime) {
                      runtimeDirectives.push(prop);
                      if (isSymbol(needRuntime)) {
                          directiveImportMap.set(prop, needRuntime);
                      }
                  }
              }
              else {
                  // no built-in transform, this is a user custom directive.
                  runtimeDirectives.push(prop);
              }
          }
      }
      let propsExpression = undefined;
      // has v-bind="object" or v-on="object", wrap with mergeProps
      if (mergeArgs.length) {
          if (properties.length) {
              mergeArgs.push(createObjectExpression(dedupeProperties(properties), elementLoc));
          }
          if (mergeArgs.length > 1) {
              propsExpression = createCallExpression(context.helper(MERGE_PROPS), mergeArgs, elementLoc);
          }
          else {
              // single v-bind with nothing else - no need for a mergeProps call
              propsExpression = mergeArgs[0];
          }
      }
      else if (properties.length) {
          propsExpression = createObjectExpression(dedupeProperties(properties), elementLoc);
      }
      // patchFlag analysis
      if (hasDynamicKeys) {
          patchFlag |= 16 /* FULL_PROPS */;
      }
      else {
          if (hasClassBinding) {
              patchFlag |= 2 /* CLASS */;
          }
          if (hasStyleBinding) {
              patchFlag |= 4 /* STYLE */;
          }
          if (dynamicPropNames.length) {
              patchFlag |= 8 /* PROPS */;
          }
          if (hasHydrationEventBinding) {
              patchFlag |= 32 /* HYDRATE_EVENTS */;
          }
      }
      if ((patchFlag === 0 || patchFlag === 32 /* HYDRATE_EVENTS */) &&
          (hasRef || hasVnodeHook || runtimeDirectives.length > 0)) {
          patchFlag |= 512 /* NEED_PATCH */;
      }
      return {
          props: propsExpression,
          directives: runtimeDirectives,
          patchFlag,
          dynamicPropNames
      };
  }
  // Dedupe props in an object literal.
  // Literal duplicated attributes would have been warned during the parse phase,
  // however, it's possible to encounter duplicated `onXXX` handlers with different
  // modifiers. We also need to merge static and dynamic class / style attributes.
  // - onXXX handlers / style: merge into array
  // - class: merge into single expression with concatenation
  function dedupeProperties(properties) {
      // 合并同类属性
      const knownProps = new Map();
      const deduped = [];
      for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          // 允许重复的动态属性
          if (prop.key.type === 8 /* COMPOUND_EXPRESSION */ || !prop.key.isStatic) {
              deduped.push(prop);
              continue;
          }
          const name = prop.key.content;
          const existing = knownProps.get(name);
          if (existing) {
              // 合并 style, class, onXxx
              if (name === 'style' || name === 'class' || name.startsWith('on')) {
                  mergeAsArray(existing, prop);
              }
              // unexpected duplicate, should have emitted error during parse
          }
          else {
              // cache
              knownProps.set(name, prop);
              deduped.push(prop);
          }
      }
      return deduped;
  }
  function mergeAsArray(existing, incoming) {
      if (existing.value.type === 17 /* JS_ARRAY_EXPRESSION */) {
          existing.value.elements.push(incoming.value);
      }
      else {
          existing.value = createArrayExpression([existing.value, incoming.value], existing.loc);
      }
  }
  function buildDirectiveArgs(dir, context) {
      const dirArgs = [];
      const runtime = directiveImportMap.get(dir);
      if (runtime) {
          // built-in directive with runtime
          dirArgs.push(context.helperString(runtime));
      }
      else {
          {
              // inject statement for resolving directive
              context.helper(RESOLVE_DIRECTIVE);
              context.directives.add(dir.name);
              dirArgs.push(toValidAssetId(dir.name, `directive`));
          }
      }
      const { loc } = dir;
      if (dir.exp)
          dirArgs.push(dir.exp);
      if (dir.arg) {
          if (!dir.exp) {
              dirArgs.push(`void 0`);
          }
          dirArgs.push(dir.arg);
      }
      if (Object.keys(dir.modifiers).length) {
          if (!dir.arg) {
              if (!dir.exp) {
                  dirArgs.push(`void 0`);
              }
              dirArgs.push(`void 0`);
          }
          const trueExpression = createSimpleExpression(`true`, false, loc);
          dirArgs.push(createObjectExpression(dir.modifiers.map(modifier => createObjectProperty(modifier, trueExpression)), loc));
      }
      return createArrayExpression(dirArgs, dir.loc);
  }
  function stringifyDynamicPropNames(props) {
      let propsNamesString = `[`;
      for (let i = 0, l = props.length; i < l; i++) {
          propsNamesString += JSON.stringify(props[i]);
          if (i < l - 1)
              propsNamesString += ', ';
      }
      return propsNamesString + `]`;
  }

  const transformSlotOutlet = (node, context) => {
      if (isSlotOutlet(node)) {
          const { children, loc } = node;
          const { slotName, slotProps } = processSlotOutlet(node, context);
          // 内容：
          // 1. $slots, 数据源
          // 2. slotName, 插槽名
          // 3. slotProps, 插槽属性
          // 4. children, 插槽的孩子节点
          const slotArgs = [
              context.prefixIdentifiers ? `_ctx.$slots` : `$slots`,
              slotName
          ];
          // slot 属性
          if (slotProps) {
              slotArgs.push(slotProps);
          }
          if (children.length) {
              if (!slotProps) {
                  slotArgs.push(`{}`);
              }
              slotArgs.push(createFunctionExpression([], children, false, false, loc));
          }
          node.codegenNode = createCallExpression(context.helper(RENDER_SLOT), slotArgs, loc);
      }
  };
  function processSlotOutlet(node, context) {
      let slotName = `"default"`;
      let slotProps = undefined;
      // 保存非 name="" 属性的其他属性
      const nonNameProps = [];
      for (let i = 0; i < node.props.length; i++) {
          const p = node.props[i];
          if (p.type === 6 /* ATTRIBUTE */) {
              // 静态属性
              if (p.value) {
                  if (p.name === 'name') {
                      slotName = JSON.stringify(p.value.content);
                  }
                  else {
                      p.name = camelize(p.name);
                      nonNameProps.push(p);
                  }
              }
          }
          else {
              // 动态属性
              if (p.name === 'bind' && isBindKey(p.arg, 'name')) {
                  // <slot :name="xx"></slot>
                  if (p.exp)
                      slotName = p.exp;
              }
              else {
                  // 非 name 的动态属性
                  if (p.name === 'bind' && p.arg && isStaticExp(p.arg)) {
                      p.arg.content = camelize(p.arg.content);
                  }
                  nonNameProps.push(p);
              }
          }
      }
      // 上面解析出 name 和非 name 的属性
      if (nonNameProps.length > 0) {
          const { props, directives } = buildProps(node, context, nonNameProps);
          slotProps = props;
          if (directives.length) {
              context.onError(createCompilerError(35 /* X_V_SLOT_UNEXPECTED_DIRECTIVE_ON_SLOT_OUTLET */, directives[0].loc));
          }
      }
      return {
          slotName,
          slotProps
      };
  }

  const fnExpRE = /^\s*([\w$_]+|\([^)]*?\))\s*=>|^\s*function(?:\s+[\w$]+)?\s*\(/;
  const transformOn = (dir, node, context, augmentor) => {
      const { loc, modifiers, arg } = dir;
      if (!dir.exp && !modifiers.length) {
          context.onError(createCompilerError(34 /* X_V_ON_NO_EXPRESSION */, loc));
      }
      let eventName;
      if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
          if (arg.isStatic) {
              // v-on:click
              const rawName = arg.content;
              // for all event listeners, auto convert it to camelCase. See issue #2249
              eventName = createSimpleExpression(toHandlerKey(camelize(rawName)), true, arg.loc);
          }
          else {
              // #2388
              // 动态事件参数 <div v-on:[eventName] ...
              eventName = createCompoundExpression([
                  `${context.helperString(TO_HANDLER_KEY)}(`,
                  arg,
                  `)`
              ]);
          }
      }
      else {
          // already a compound expression.
          eventName = arg;
          eventName.children.unshift(`${context.helperString(TO_HANDLER_KEY)}(`);
          eventName.children.push(`)`);
      }
      // handler processing
      let exp = dir.exp;
      if (exp && !exp.content.trim()) {
          exp = undefined;
      }
      let shouldCache = context.cacheHandlers && !exp;
      if (exp) {
          const isMemberExp = isMemberExpression(exp.content);
          const isInlineStatement = !(isMemberExp || fnExpRE.test(exp.content));
          // 含多个表达式
          const hasMultipleStatements = exp.content.includes(';');
          {
              validateBrowserExpression(exp, context, false, hasMultipleStatements);
          }
          if (isInlineStatement || (shouldCache && isMemberExp)) {
              // wrap inline statement in a function expression
              exp = createCompoundExpression([
                  `${isInlineStatement
                    ?  `$event`
                    : `${ ``}(...args)`} => ${hasMultipleStatements ? `{` : `(`}`,
                  exp,
                  hasMultipleStatements ? `}` : `)`
              ]);
          }
      }
      let ret = {
          props: [
              createObjectProperty(eventName, exp || createSimpleExpression(`() => {}`, false, loc))
          ]
      };
      // apply extended compiler augmentor
      if (augmentor) {
          ret = augmentor(ret);
      }
      if (shouldCache) {
          // cache handlers so that it's always the same handler being passed down.
          // this avoids unnecessary re-renders when users use inline handlers on
          // components.
          ret.props[0].value = context.cache(ret.props[0].value);
      }
      return ret;
  };

  // v-bind without arg is handled directly in ./transformElements.ts due to it affecting
  // codegen for the entire props object. This transform here is only for v-bind
  // *with* args.
  const transformBind = (dir, node, context) => {
      const { exp, modifiers, loc } = dir;
      const arg = dir.arg;
      if (arg.type !== 4 /* SIMPLE_EXPRESSION */) {
          arg.children.unshift(`(`);
          arg.children.push(`) || ""`);
      }
      else if (!arg.isStatic) {
          arg.content = `${arg.content} || ""`;
      }
      // .prop is no longer necessary due to new patch behavior
      // .sync is replaced by v-model:arg
      if (modifiers.includes('camel')) {
          if (arg.type === 4 /* SIMPLE_EXPRESSION */) {
              if (arg.isStatic) {
                  arg.content = camelize(arg.content);
              }
              else {
                  arg.content = `${context.helperString(CAMELIZE)}(${arg.content})`;
              }
          }
          else {
              arg.children.unshift(`${context.helperString(CAMELIZE)}(`);
              arg.children.push(`)`);
          }
      }
      if (!exp ||
          (exp.type === 4 /* SIMPLE_EXPRESSION */ && !exp.content.trim())) {
          context.onError(createCompilerError(33 /* X_V_BIND_NO_EXPRESSION */, loc));
          return {
              props: [createObjectProperty(arg, createSimpleExpression('', true, loc))]
          };
      }
      return {
          props: [createObjectProperty(arg, exp)]
      };
  };

  // 合并相邻的文本节点(包含插值)
  // Merge adjacent text nodes and expressions into a single expression
  // e.g. <div>abc {{ d }} {{ e }}</div> should have a single expression node as child.
  const transformText = (node, context) => {
      // 只有这四种类型才会收集这个函数
      if (node.type === 0 /* ROOT */ ||
          node.type === 1 /* ELEMENT */ ||
          node.type === 11 /* FOR */ ||
          node.type === 10 /* IF_BRANCH */) {
          // perform the transform on node exit so that all expressions have already
          // been processed.
          return () => {
              const children = node.children;
              let currentContainer = undefined;
              let hasText = false;
              // 遍历所有孩子节点，合并文本
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (isText(child)) {
                      hasText = true;
                      for (let j = i + 1; j < children.length; j++) {
                          const next = children[j];
                          if (isText(next)) {
                              if (!currentContainer) {
                                  currentContainer = children[i] = {
                                      type: 8 /* COMPOUND_EXPRESSION */,
                                      loc: child.loc,
                                      children: [child]
                                  };
                              }
                              // merge adjacent text node into current
                              currentContainer.children.push(` + `, next);
                              children.splice(j, 1);
                              j--;
                          }
                          else {
                              currentContainer = undefined;
                              break;
                          }
                      }
                  }
              }
              // 不处理的几种情况
              // 1. hasText = false ，压根没有文本节点
              // 2. 只有一个 child 且类型必须是 ROOT 或 type, tagType 都是 ELEMENT的标签
              if (!hasText ||
                  // if this is a plain element with a single text child, leave it
                  // as-is since the runtime has dedicated fast path for this by directly
                  // setting textContent of the element.
                  // for component root it's always normalized anyway.
                  (children.length === 1 &&
                      (node.type === 0 /* ROOT */ ||
                          (node.type === 1 /* ELEMENT */ &&
                              node.tagType === 0 /* ELEMENT */)))) {
                  return;
              }
              // 将文本节点转换成用 createTextVNode(text) 创建
              for (let i = 0; i < children.length; i++) {
                  const child = children[i];
                  if (isText(child) || child.type === 8 /* COMPOUND_EXPRESSION */) {
                      const callArgs = [];
                      // createTextVNode defaults to single whitespace, so if it is a
                      // single space the code could be an empty call to save bytes.
                      if (child.type !== 2 /* TEXT */ || child.content !== ' ') {
                          callArgs.push(child);
                      }
                      // mark dynamic text with flag so it gets patched inside a block
                      if (!context.ssr &&
                          getConstantType(child, context) === 0 /* NOT_CONSTANT */) {
                          callArgs.push(1 /* TEXT */ +
                              ( ` /* ${PatchFlagNames[1 /* TEXT */]} */` ));
                      }
                      children[i] = {
                          type: 12 /* TEXT_CALL */,
                          content: child,
                          loc: child.loc,
                          codegenNode: createCallExpression(context.helper(CREATE_TEXT), callArgs)
                      };
                  }
              }
          };
      }
  };

  const seen = new WeakSet();
  const transformOnce = (node, context) => {
      if (node.type === 1 /* ELEMENT */ && findDir(node, 'once', true)) {
          // 缓存实现 v-once，就算有数据更新也不会重新生成 render 函数
          if (seen.has(node)) {
              return;
          }
          seen.add(node);
          context.helper(SET_BLOCK_TRACKING);
          return () => {
              const cur = context.currentNode;
              if (cur.codegenNode) {
                  cur.codegenNode = context.cache(cur.codegenNode, true /* isVNode */);
              }
          };
      }
  };

  const transformModel = (dir, node, context) => {
      const { exp, arg } = dir;
      if (!exp) {
          context.onError(createCompilerError(40 /* X_V_MODEL_NO_EXPRESSION */, dir.loc));
          return createTransformProps();
      }
      const rawExp = exp.loc.source;
      const expString = exp.type === 4 /* SIMPLE_EXPRESSION */ ? exp.content : rawExp;
      // im SFC <script setup> inline mode, the exp may have been transformed into
      // _unref(exp)
      const bindingType = context.bindingMetadata[rawExp];
      const maybeRef = !true    /* SETUP_CONST */;
      if (!isMemberExpression(expString) && !maybeRef) {
          context.onError(createCompilerError(41 /* X_V_MODEL_MALFORMED_EXPRESSION */, exp.loc));
          return createTransformProps();
      }
      const propName = arg ? arg : createSimpleExpression('modelValue', true);
      const eventName = arg
          ? isStaticExp(arg)
              ? `onUpdate:${arg.content}`
              : createCompoundExpression(['"onUpdate:" + ', arg])
          : `onUpdate:modelValue`;
      let assignmentExp;
      const eventArg = context.isTS ? `($event: any)` : `$event`;
      {
          // -> $event => (value = $event)
          assignmentExp = createCompoundExpression([
              `${eventArg} => (`,
              exp,
              ` = $event)`
          ]);
      }
      const props = [
          // modelValue: foo
          createObjectProperty(propName, dir.exp),
          // "onUpdate:modelValue": $event => (foo = $event)
          createObjectProperty(eventName, assignmentExp)
      ];
      // modelModifiers: { foo: true, "bar-baz": true }
      if (dir.modifiers.length && node.tagType === 1 /* COMPONENT */) {
          const modifiers = dir.modifiers
              .map(m => (isSimpleIdentifier(m) ? m : JSON.stringify(m)) + `: true`)
              .join(`, `);
          const modifiersKey = arg
              ? isStaticExp(arg)
                  ? `${arg.content}Modifiers`
                  : createCompoundExpression([arg, ' + "Modifiers"'])
              : `modelModifiers`;
          props.push(createObjectProperty(modifiersKey, createSimpleExpression(`{ ${modifiers} }`, false, dir.loc, 2 /* CAN_HOIST */)));
      }
      return createTransformProps(props);
  };
  function createTransformProps(props = []) {
      return { props };
  }

  // 合并 transform 插件列表
  function getBaseTransformPreset(prefixIdentifiers) {
      return [
          [
              transformOnce,
              transformIf,
              transformFor,
              ...(  [transformExpression]
                      ),
              transformSlotOutlet,
              transformElement,
              trackSlotScopes,
              transformText
          ],
          {
              on: transformOn,
              bind: transformBind,
              model: transformModel
          }
      ];
  }
  function baseCompile(template, options = {}) {
      const onError = options.onError || defaultOnError;
      const isModuleMode = options.mode === 'module';
      /* istanbul ignore if */
      {
          if (options.prefixIdentifiers === true) {
              onError(createCompilerError(45 /* X_PREFIX_ID_NOT_SUPPORTED */));
          }
          else if (isModuleMode) {
              onError(createCompilerError(46 /* X_MODULE_MODE_NOT_SUPPORTED */));
          }
      }
      const prefixIdentifiers = !true ;
      if ( options.cacheHandlers) {
          onError(createCompilerError(47 /* X_CACHE_HANDLER_NOT_SUPPORTED */));
      }
      if (options.scopeId && !isModuleMode) {
          onError(createCompilerError(48 /* X_SCOPE_ID_NOT_SUPPORTED */));
      }
      const ast = isString(template) ? baseParse(template, options) : template;
      const [nodeTransforms, directiveTransforms] = getBaseTransformPreset();
      transform(ast, extend({}, options, {
          prefixIdentifiers,
          nodeTransforms: [
              ...nodeTransforms,
              ...(options.nodeTransforms || []) // user transforms
          ],
          directiveTransforms: extend({}, directiveTransforms, options.directiveTransforms || {})
      }));
      return generate(ast, extend({}, options, {
          prefixIdentifiers
      }));
  }

  const noopDirectiveTransform = () => ({ props: [] });

  // Parse inline CSS strings for static style attributes into an object.
  // This is a NodeTransform since it works on the static `style` attribute and
  // converts it into a dynamic equivalent:
  // style="color: red" -> :style='{ "color": "red" }'
  // It is then processed by `transformElement` and included in the generated
  // props.
  // 将内联 css 字符串解析成对象
  const transformStyle = node => {
      if (node.type === 1 /* ELEMENT */) {
          node.props.forEach((p, i) => {
              if (p.type === 6 /* ATTRIBUTE */ && p.name === 'style' && p.value) {
                  // replace p with an expression node
                  node.props[i] = {
                      type: 7 /* DIRECTIVE */,
                      name: `bind`,
                      arg: createSimpleExpression(`style`, true, p.loc),
                      exp: parseInlineCSS(p.value.content, p.loc),
                      modifiers: [],
                      loc: p.loc
                  };
              }
          });
      }
  };
  const parseInlineCSS = (cssText, loc) => {
      const normalized = parseStringStyle(cssText);
      return createSimpleExpression(JSON.stringify(normalized), false, loc, 3 /* CAN_STRINGIFY */);
  };

  function createDOMCompilerError(code, loc) {
      return createCompilerError(code, loc,  DOMErrorMessages );
  }
  const DOMErrorMessages = {
      [49 /* X_V_HTML_NO_EXPRESSION */]: `v-html is missing expression.`,
      [50 /* X_V_HTML_WITH_CHILDREN */]: `v-html will override element children.`,
      [51 /* X_V_TEXT_NO_EXPRESSION */]: `v-text is missing expression.`,
      [52 /* X_V_TEXT_WITH_CHILDREN */]: `v-text will override element children.`,
      [53 /* X_V_MODEL_ON_INVALID_ELEMENT */]: `v-model can only be used on <input>, <textarea> and <select> elements.`,
      [54 /* X_V_MODEL_ARG_ON_ELEMENT */]: `v-model argument is not supported on plain elements.`,
      [55 /* X_V_MODEL_ON_FILE_INPUT_ELEMENT */]: `v-model cannot be used on file inputs since they are read-only. Use a v-on:change listener instead.`,
      [56 /* X_V_MODEL_UNNECESSARY_VALUE */]: `Unnecessary value binding used alongside v-model. It will interfere with v-model's behavior.`,
      [57 /* X_V_SHOW_NO_EXPRESSION */]: `v-show is missing expression.`,
      [58 /* X_TRANSITION_INVALID_CHILDREN */]: `<Transition> expects exactly one child element or component.`,
      [59 /* X_IGNORED_SIDE_EFFECT_TAG */]: `Tags with side effect (<script> and <style>) are ignored in client component templates.`
  };

  const transformVHtml = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(49 /* X_V_HTML_NO_EXPRESSION */, loc));
      }
      if (node.children.length) {
          context.onError(createDOMCompilerError(50 /* X_V_HTML_WITH_CHILDREN */, loc));
          node.children.length = 0;
      }
      return {
          props: [
              createObjectProperty(createSimpleExpression(`innerHTML`, true, loc), exp || createSimpleExpression('', true))
          ]
      };
  };

  const transformVText = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(51 /* X_V_TEXT_NO_EXPRESSION */, loc));
      }
      if (node.children.length) {
          context.onError(createDOMCompilerError(52 /* X_V_TEXT_WITH_CHILDREN */, loc));
          node.children.length = 0;
      }
      return {
          props: [
              createObjectProperty(createSimpleExpression(`textContent`, true), exp
                  ? createCallExpression(context.helperString(TO_DISPLAY_STRING), [exp], loc)
                  : createSimpleExpression('', true))
          ]
      };
  };

  const V_MODEL_RADIO = Symbol( `vModelRadio` );
  const V_MODEL_CHECKBOX = Symbol( `vModelCheckbox` );
  const V_MODEL_TEXT = Symbol( `vModelText` );
  const V_MODEL_SELECT = Symbol( `vModelSelect` );
  const V_MODEL_DYNAMIC = Symbol( `vModelDynamic` );
  const V_ON_WITH_MODIFIERS = Symbol( `vOnModifiersGuard` );
  const V_ON_WITH_KEYS = Symbol( `vOnKeysGuard` );
  const V_SHOW = Symbol( `vShow` );
  const TRANSITION = Symbol( `Transition` );
  const TRANSITION_GROUP = Symbol( `TransitionGroup` );
  registerRuntimeHelpers({
      [V_MODEL_RADIO]: `vModelRadio`,
      [V_MODEL_CHECKBOX]: `vModelCheckbox`,
      [V_MODEL_TEXT]: `vModelText`,
      [V_MODEL_SELECT]: `vModelSelect`,
      [V_MODEL_DYNAMIC]: `vModelDynamic`,
      [V_ON_WITH_MODIFIERS]: `withModifiers`,
      [V_ON_WITH_KEYS]: `withKeys`,
      [V_SHOW]: `vShow`,
      [TRANSITION]: `Transition`,
      [TRANSITION_GROUP]: `TransitionGroup`
  });

  const transformModel$1 = (dir, node, context) => {
      const baseResult = transformModel(dir, node, context);
      // base transform has errors OR component v-model (only need props)
      // 没有 v-model指令，或应用在用户组件上了
      if (!baseResult.props.length || node.tagType === 1 /* COMPONENT */) {
          return baseResult;
      }
      // 不能有参数？
      if (dir.arg) {
          context.onError(createDOMCompilerError(54 /* X_V_MODEL_ARG_ON_ELEMENT */, dir.arg.loc));
      }
      // 不能有 value 属性，因为 input 绑定的就是 value 属性
      function checkDuplicateValue() {
          const value = findProp(node, 'value');
          if (value) {
              context.onError(createDOMCompilerError(56 /* X_V_MODEL_UNNECESSARY_VALUE */, value.loc));
          }
      }
      const { tag } = node;
      const isCustomElement = context.isCustomElement(tag);
      if (tag === 'input' ||
          tag === 'textarea' ||
          tag === 'select' ||
          isCustomElement) {
          let directiveToUse = V_MODEL_TEXT;
          let isInvalidType = false;
          if (tag === 'input' || isCustomElement) {
              const type = findProp(node, `type`);
              if (type) {
                  if (type.type === 7 /* DIRECTIVE */) {
                      // :type='foo'
                      directiveToUse = V_MODEL_DYNAMIC;
                  }
                  else if (type.value) {
                      switch (type.value.content) {
                          case 'radio':
                              directiveToUse = V_MODEL_RADIO;
                              break;
                          case 'checkbox':
                              directiveToUse = V_MODEL_CHECKBOX;
                              break;
                          case 'file':
                              isInvalidType = true;
                              context.onError(createDOMCompilerError(54 /* X_V_MODEL_ARG_ON_ELEMENT */, dir.loc));
                              break;
                          default:
                               checkDuplicateValue();
                              break;
                      }
                  }
              }
              else if (hasDynamicKeyVBind(node)) {
                  // element has bindings with dynamic keys, which can possibly contain
                  // "type".
                  directiveToUse = V_MODEL_DYNAMIC;
              }
              else {
                  // text type
                   checkDuplicateValue();
              }
          }
          else if (tag === 'select') {
              directiveToUse = V_MODEL_SELECT;
          }
          else {
              // textarea
               checkDuplicateValue();
          }
          // inject runtime directive
          // by returning the helper symbol via needRuntime
          // the import will replaced a resolveDirective call.
          if (!isInvalidType) {
              baseResult.needRuntime = context.helper(directiveToUse);
          }
      }
      else {
          context.onError(createDOMCompilerError(53 /* X_V_MODEL_ON_INVALID_ELEMENT */, dir.loc));
      }
      // native vmodel doesn't need the `modelValue` props since they are also
      // passed to the runtime as `binding.value`. removing it reduces code size.
      baseResult.props = baseResult.props.filter(p => !(p.key.type === 4 /* SIMPLE_EXPRESSION */ &&
          p.key.content === 'modelValue'));
      return baseResult;
  };

  const isEventOptionModifier = /*#__PURE__*/ makeMap(`passive,once,capture`);
  const isNonKeyModifier = /*#__PURE__*/ makeMap(
  // event propagation management
`stop,prevent,self,`   +
      // system modifiers + exact
      `ctrl,shift,alt,meta,exact,` +
      // mouse
      `middle`);
  // left & right could be mouse or key modifiers based on event type
  const maybeKeyModifier = /*#__PURE__*/ makeMap('left,right');
  const isKeyboardEvent = /*#__PURE__*/ makeMap(`onkeyup,onkeydown,onkeypress`, true);
  // 解析所有修饰符，区分出类型(key, nonKey, eventOption)
  const resolveModifiers = (key, modifiers) => {
      const keyModifiers = [];
      const nonKeyModifiers = [];
      const eventOptionModifiers = [];
      for (let i = 0; i < modifiers.length; i++) {
          const modifier = modifiers[i];
          if (isEventOptionModifier(modifier)) {
              // eventOptionModifiers: modifiers for addEventListener() options,
              // e.g. .passive & .capture
              // 作为 addEventListener() 事件的选项
              eventOptionModifiers.push(modifier);
          }
          else {
              // runtimeModifiers: modifiers that needs runtime guards
              if (maybeKeyModifier(modifier)) {
                  if (isStaticExp(key)) {
                      if (isKeyboardEvent(key.content)) {
                          keyModifiers.push(modifier);
                      }
                      else {
                          nonKeyModifiers.push(modifier);
                      }
                  }
                  else {
                      keyModifiers.push(modifier);
                      nonKeyModifiers.push(modifier);
                  }
              }
              else {
                  if (isNonKeyModifier(modifier)) {
                      nonKeyModifiers.push(modifier);
                  }
                  else {
                      keyModifiers.push(modifier);
                  }
              }
          }
      }
      return {
          keyModifiers,
          nonKeyModifiers,
          eventOptionModifiers
      };
  };
  const transformClick = (key, event) => {
      const isStaticClick = isStaticExp(key) && key.content.toLowerCase() === 'onclick';
      return isStaticClick
          ? createSimpleExpression(event, true)
          : key.type !== 4 /* SIMPLE_EXPRESSION */
              ? createCompoundExpression([
                  // (key) === "onClick" ? event : (key)
                  `(`,
                  key,
                  `) === "onClick" ? "${event}" : (`,
                  key,
                  `)`
              ])
              : key;
  };
  const transformOn$1 = (dir, node, context) => {
      return transformOn(dir, node, context, baseResult => {
          const { modifiers } = dir;
          // 所以 compiler-dom 只处理修饰符
          if (!modifiers.length)
              return baseResult;
          let { key, value: handlerExp } = baseResult.props[0];
          const { keyModifiers, nonKeyModifiers, eventOptionModifiers } = resolveModifiers(key, modifiers);
          // normalize click.right and click.middle since they don't actually fire
          if (nonKeyModifiers.includes('right')) {
              key = transformClick(key, `onContextmenu`);
          }
          // 中间滚轮点击，转换成mouse up 事件
          if (nonKeyModifiers.includes('middle')) {
              key = transformClick(key, `onMouseup`);
          }
          if (nonKeyModifiers.length) {
              handlerExp = createCallExpression(context.helper(V_ON_WITH_MODIFIERS), [
                  handlerExp,
                  JSON.stringify(nonKeyModifiers)
              ]);
          }
          if (keyModifiers.length &&
              // if event name is dynamic, always wrap with keys guard
              (!isStaticExp(key) || isKeyboardEvent(key.content))) {
              handlerExp = createCallExpression(context.helper(V_ON_WITH_KEYS), [
                  handlerExp,
                  JSON.stringify(keyModifiers)
              ]);
          }
          if (eventOptionModifiers.length) {
              const modifierPostFix = eventOptionModifiers.map(capitalize).join('');
              key = isStaticExp(key)
                  ? createSimpleExpression(`${key.content}${modifierPostFix}`, true)
                  : createCompoundExpression([`(`, key, `) + "${modifierPostFix}"`]);
          }
          return {
              props: [createObjectProperty(key, handlerExp)]
          };
      });
  };

  const transformShow = (dir, node, context) => {
      const { exp, loc } = dir;
      if (!exp) {
          context.onError(createDOMCompilerError(57 /* X_V_SHOW_NO_EXPRESSION */, loc));
      }
      return {
          props: [],
          needRuntime: context.helper(V_SHOW)
      };
  };

  const warnTransitionChildren = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          node.tagType === 1 /* COMPONENT */) {
          const component = context.isBuiltInComponent(node.tag);
          if (component === TRANSITION) {
              return () => {
                  if (node.children.length && hasMultipleChildren(node)) {
                      context.onError(createDOMCompilerError(58 /* X_TRANSITION_INVALID_CHILDREN */, {
                          start: node.children[0].loc.start,
                          end: node.children[node.children.length - 1].loc.end,
                          source: ''
                      }));
                  }
              };
          }
      }
  };
  function hasMultipleChildren(node) {
      // #1352 filter out potential comment nodes.
      const children = (node.children = node.children.filter(c => c.type !== 3 /* COMMENT */));
      const child = children[0];
      return (children.length !== 1 ||
          child.type === 11 /* FOR */ ||
          (child.type === 9 /* IF */ && child.branches.some(hasMultipleChildren)));
  }

  var namedCharacterReferences = {
  	GT: ">",
  	gt: ">",
  	LT: "<",
  	lt: "<",
  	"ac;": "∾",
  	"af;": "⁡",
  	AMP: "&",
  	amp: "&",
  	"ap;": "≈",
  	"DD;": "ⅅ",
  	"dd;": "ⅆ",
  	deg: "°",
  	"ee;": "ⅇ",
  	"eg;": "⪚",
  	"el;": "⪙",
  	ETH: "Ð",
  	eth: "ð",
  	"gE;": "≧",
  	"ge;": "≥",
  	"Gg;": "⋙",
  	"gg;": "≫",
  	"gl;": "≷",
  	"GT;": ">",
  	"Gt;": "≫",
  	"gt;": ">",
  	"ic;": "⁣",
  	"ii;": "ⅈ",
  	"Im;": "ℑ",
  	"in;": "∈",
  	"it;": "⁢",
  	"lE;": "≦",
  	"le;": "≤",
  	"lg;": "≶",
  	"Ll;": "⋘",
  	"ll;": "≪",
  	"LT;": "<",
  	"Lt;": "≪",
  	"lt;": "<",
  	"mp;": "∓",
  	"Mu;": "Μ",
  	"mu;": "μ",
  	"ne;": "≠",
  	"ni;": "∋",
  	not: "¬",
  	"Nu;": "Ν",
  	"nu;": "ν",
  	"Or;": "⩔",
  	"or;": "∨",
  	"oS;": "Ⓢ",
  	"Pi;": "Π",
  	"pi;": "π",
  	"pm;": "±",
  	"Pr;": "⪻",
  	"pr;": "≺",
  	"Re;": "ℜ",
  	REG: "®",
  	reg: "®",
  	"rx;": "℞",
  	"Sc;": "⪼",
  	"sc;": "≻",
  	shy: "­",
  	uml: "¨",
  	"wp;": "℘",
  	"wr;": "≀",
  	"Xi;": "Ξ",
  	"xi;": "ξ",
  	yen: "¥",
  	"acd;": "∿",
  	"acE;": "∾̳",
  	"Acy;": "А",
  	"acy;": "а",
  	"Afr;": "𝔄",
  	"afr;": "𝔞",
  	"AMP;": "&",
  	"amp;": "&",
  	"And;": "⩓",
  	"and;": "∧",
  	"ang;": "∠",
  	"apE;": "⩰",
  	"ape;": "≊",
  	"ast;": "*",
  	Auml: "Ä",
  	auml: "ä",
  	"Bcy;": "Б",
  	"bcy;": "б",
  	"Bfr;": "𝔅",
  	"bfr;": "𝔟",
  	"bne;": "=⃥",
  	"bot;": "⊥",
  	"Cap;": "⋒",
  	"cap;": "∩",
  	cent: "¢",
  	"Cfr;": "ℭ",
  	"cfr;": "𝔠",
  	"Chi;": "Χ",
  	"chi;": "χ",
  	"cir;": "○",
  	COPY: "©",
  	copy: "©",
  	"Cup;": "⋓",
  	"cup;": "∪",
  	"Dcy;": "Д",
  	"dcy;": "д",
  	"deg;": "°",
  	"Del;": "∇",
  	"Dfr;": "𝔇",
  	"dfr;": "𝔡",
  	"die;": "¨",
  	"div;": "÷",
  	"Dot;": "¨",
  	"dot;": "˙",
  	"Ecy;": "Э",
  	"ecy;": "э",
  	"Efr;": "𝔈",
  	"efr;": "𝔢",
  	"egs;": "⪖",
  	"ell;": "ℓ",
  	"els;": "⪕",
  	"ENG;": "Ŋ",
  	"eng;": "ŋ",
  	"Eta;": "Η",
  	"eta;": "η",
  	"ETH;": "Ð",
  	"eth;": "ð",
  	Euml: "Ë",
  	euml: "ë",
  	"Fcy;": "Ф",
  	"fcy;": "ф",
  	"Ffr;": "𝔉",
  	"ffr;": "𝔣",
  	"gap;": "⪆",
  	"Gcy;": "Г",
  	"gcy;": "г",
  	"gEl;": "⪌",
  	"gel;": "⋛",
  	"geq;": "≥",
  	"ges;": "⩾",
  	"Gfr;": "𝔊",
  	"gfr;": "𝔤",
  	"ggg;": "⋙",
  	"gla;": "⪥",
  	"glE;": "⪒",
  	"glj;": "⪤",
  	"gnE;": "≩",
  	"gne;": "⪈",
  	"Hat;": "^",
  	"Hfr;": "ℌ",
  	"hfr;": "𝔥",
  	"Icy;": "И",
  	"icy;": "и",
  	"iff;": "⇔",
  	"Ifr;": "ℑ",
  	"ifr;": "𝔦",
  	"Int;": "∬",
  	"int;": "∫",
  	Iuml: "Ï",
  	iuml: "ï",
  	"Jcy;": "Й",
  	"jcy;": "й",
  	"Jfr;": "𝔍",
  	"jfr;": "𝔧",
  	"Kcy;": "К",
  	"kcy;": "к",
  	"Kfr;": "𝔎",
  	"kfr;": "𝔨",
  	"lap;": "⪅",
  	"lat;": "⪫",
  	"Lcy;": "Л",
  	"lcy;": "л",
  	"lEg;": "⪋",
  	"leg;": "⋚",
  	"leq;": "≤",
  	"les;": "⩽",
  	"Lfr;": "𝔏",
  	"lfr;": "𝔩",
  	"lgE;": "⪑",
  	"lnE;": "≨",
  	"lne;": "⪇",
  	"loz;": "◊",
  	"lrm;": "‎",
  	"Lsh;": "↰",
  	"lsh;": "↰",
  	macr: "¯",
  	"Map;": "⤅",
  	"map;": "↦",
  	"Mcy;": "М",
  	"mcy;": "м",
  	"Mfr;": "𝔐",
  	"mfr;": "𝔪",
  	"mho;": "℧",
  	"mid;": "∣",
  	"nap;": "≉",
  	nbsp: " ",
  	"Ncy;": "Н",
  	"ncy;": "н",
  	"Nfr;": "𝔑",
  	"nfr;": "𝔫",
  	"ngE;": "≧̸",
  	"nge;": "≱",
  	"nGg;": "⋙̸",
  	"nGt;": "≫⃒",
  	"ngt;": "≯",
  	"nis;": "⋼",
  	"niv;": "∋",
  	"nlE;": "≦̸",
  	"nle;": "≰",
  	"nLl;": "⋘̸",
  	"nLt;": "≪⃒",
  	"nlt;": "≮",
  	"Not;": "⫬",
  	"not;": "¬",
  	"npr;": "⊀",
  	"nsc;": "⊁",
  	"num;": "#",
  	"Ocy;": "О",
  	"ocy;": "о",
  	"Ofr;": "𝔒",
  	"ofr;": "𝔬",
  	"ogt;": "⧁",
  	"ohm;": "Ω",
  	"olt;": "⧀",
  	"ord;": "⩝",
  	ordf: "ª",
  	ordm: "º",
  	"orv;": "⩛",
  	Ouml: "Ö",
  	ouml: "ö",
  	"par;": "∥",
  	para: "¶",
  	"Pcy;": "П",
  	"pcy;": "п",
  	"Pfr;": "𝔓",
  	"pfr;": "𝔭",
  	"Phi;": "Φ",
  	"phi;": "φ",
  	"piv;": "ϖ",
  	"prE;": "⪳",
  	"pre;": "⪯",
  	"Psi;": "Ψ",
  	"psi;": "ψ",
  	"Qfr;": "𝔔",
  	"qfr;": "𝔮",
  	QUOT: "\"",
  	quot: "\"",
  	"Rcy;": "Р",
  	"rcy;": "р",
  	"REG;": "®",
  	"reg;": "®",
  	"Rfr;": "ℜ",
  	"rfr;": "𝔯",
  	"Rho;": "Ρ",
  	"rho;": "ρ",
  	"rlm;": "‏",
  	"Rsh;": "↱",
  	"rsh;": "↱",
  	"scE;": "⪴",
  	"sce;": "⪰",
  	"Scy;": "С",
  	"scy;": "с",
  	sect: "§",
  	"Sfr;": "𝔖",
  	"sfr;": "𝔰",
  	"shy;": "­",
  	"sim;": "∼",
  	"smt;": "⪪",
  	"sol;": "/",
  	"squ;": "□",
  	"Sub;": "⋐",
  	"sub;": "⊂",
  	"Sum;": "∑",
  	"sum;": "∑",
  	"Sup;": "⋑",
  	"sup;": "⊃",
  	sup1: "¹",
  	sup2: "²",
  	sup3: "³",
  	"Tab;": "\t",
  	"Tau;": "Τ",
  	"tau;": "τ",
  	"Tcy;": "Т",
  	"tcy;": "т",
  	"Tfr;": "𝔗",
  	"tfr;": "𝔱",
  	"top;": "⊤",
  	"Ucy;": "У",
  	"ucy;": "у",
  	"Ufr;": "𝔘",
  	"ufr;": "𝔲",
  	"uml;": "¨",
  	Uuml: "Ü",
  	uuml: "ü",
  	"Vcy;": "В",
  	"vcy;": "в",
  	"Vee;": "⋁",
  	"vee;": "∨",
  	"Vfr;": "𝔙",
  	"vfr;": "𝔳",
  	"Wfr;": "𝔚",
  	"wfr;": "𝔴",
  	"Xfr;": "𝔛",
  	"xfr;": "𝔵",
  	"Ycy;": "Ы",
  	"ycy;": "ы",
  	"yen;": "¥",
  	"Yfr;": "𝔜",
  	"yfr;": "𝔶",
  	yuml: "ÿ",
  	"Zcy;": "З",
  	"zcy;": "з",
  	"Zfr;": "ℨ",
  	"zfr;": "𝔷",
  	"zwj;": "‍",
  	Acirc: "Â",
  	acirc: "â",
  	acute: "´",
  	AElig: "Æ",
  	aelig: "æ",
  	"andd;": "⩜",
  	"andv;": "⩚",
  	"ange;": "⦤",
  	"Aopf;": "𝔸",
  	"aopf;": "𝕒",
  	"apid;": "≋",
  	"apos;": "'",
  	Aring: "Å",
  	aring: "å",
  	"Ascr;": "𝒜",
  	"ascr;": "𝒶",
  	"Auml;": "Ä",
  	"auml;": "ä",
  	"Barv;": "⫧",
  	"bbrk;": "⎵",
  	"Beta;": "Β",
  	"beta;": "β",
  	"beth;": "ℶ",
  	"bNot;": "⫭",
  	"bnot;": "⌐",
  	"Bopf;": "𝔹",
  	"bopf;": "𝕓",
  	"boxH;": "═",
  	"boxh;": "─",
  	"boxV;": "║",
  	"boxv;": "│",
  	"Bscr;": "ℬ",
  	"bscr;": "𝒷",
  	"bsim;": "∽",
  	"bsol;": "\\",
  	"bull;": "•",
  	"bump;": "≎",
  	"caps;": "∩︀",
  	"Cdot;": "Ċ",
  	"cdot;": "ċ",
  	cedil: "¸",
  	"cent;": "¢",
  	"CHcy;": "Ч",
  	"chcy;": "ч",
  	"circ;": "ˆ",
  	"cirE;": "⧃",
  	"cire;": "≗",
  	"comp;": "∁",
  	"cong;": "≅",
  	"Copf;": "ℂ",
  	"copf;": "𝕔",
  	"COPY;": "©",
  	"copy;": "©",
  	"Cscr;": "𝒞",
  	"cscr;": "𝒸",
  	"csub;": "⫏",
  	"csup;": "⫐",
  	"cups;": "∪︀",
  	"Darr;": "↡",
  	"dArr;": "⇓",
  	"darr;": "↓",
  	"dash;": "‐",
  	"dHar;": "⥥",
  	"diam;": "⋄",
  	"DJcy;": "Ђ",
  	"djcy;": "ђ",
  	"Dopf;": "𝔻",
  	"dopf;": "𝕕",
  	"Dscr;": "𝒟",
  	"dscr;": "𝒹",
  	"DScy;": "Ѕ",
  	"dscy;": "ѕ",
  	"dsol;": "⧶",
  	"dtri;": "▿",
  	"DZcy;": "Џ",
  	"dzcy;": "џ",
  	"ecir;": "≖",
  	Ecirc: "Ê",
  	ecirc: "ê",
  	"Edot;": "Ė",
  	"eDot;": "≑",
  	"edot;": "ė",
  	"emsp;": " ",
  	"ensp;": " ",
  	"Eopf;": "𝔼",
  	"eopf;": "𝕖",
  	"epar;": "⋕",
  	"epsi;": "ε",
  	"Escr;": "ℰ",
  	"escr;": "ℯ",
  	"Esim;": "⩳",
  	"esim;": "≂",
  	"Euml;": "Ë",
  	"euml;": "ë",
  	"euro;": "€",
  	"excl;": "!",
  	"flat;": "♭",
  	"fnof;": "ƒ",
  	"Fopf;": "𝔽",
  	"fopf;": "𝕗",
  	"fork;": "⋔",
  	"Fscr;": "ℱ",
  	"fscr;": "𝒻",
  	"Gdot;": "Ġ",
  	"gdot;": "ġ",
  	"geqq;": "≧",
  	"gesl;": "⋛︀",
  	"GJcy;": "Ѓ",
  	"gjcy;": "ѓ",
  	"gnap;": "⪊",
  	"gneq;": "⪈",
  	"Gopf;": "𝔾",
  	"gopf;": "𝕘",
  	"Gscr;": "𝒢",
  	"gscr;": "ℊ",
  	"gsim;": "≳",
  	"gtcc;": "⪧",
  	"gvnE;": "≩︀",
  	"half;": "½",
  	"hArr;": "⇔",
  	"harr;": "↔",
  	"hbar;": "ℏ",
  	"Hopf;": "ℍ",
  	"hopf;": "𝕙",
  	"Hscr;": "ℋ",
  	"hscr;": "𝒽",
  	Icirc: "Î",
  	icirc: "î",
  	"Idot;": "İ",
  	"IEcy;": "Е",
  	"iecy;": "е",
  	iexcl: "¡",
  	"imof;": "⊷",
  	"IOcy;": "Ё",
  	"iocy;": "ё",
  	"Iopf;": "𝕀",
  	"iopf;": "𝕚",
  	"Iota;": "Ι",
  	"iota;": "ι",
  	"Iscr;": "ℐ",
  	"iscr;": "𝒾",
  	"isin;": "∈",
  	"Iuml;": "Ï",
  	"iuml;": "ï",
  	"Jopf;": "𝕁",
  	"jopf;": "𝕛",
  	"Jscr;": "𝒥",
  	"jscr;": "𝒿",
  	"KHcy;": "Х",
  	"khcy;": "х",
  	"KJcy;": "Ќ",
  	"kjcy;": "ќ",
  	"Kopf;": "𝕂",
  	"kopf;": "𝕜",
  	"Kscr;": "𝒦",
  	"kscr;": "𝓀",
  	"Lang;": "⟪",
  	"lang;": "⟨",
  	laquo: "«",
  	"Larr;": "↞",
  	"lArr;": "⇐",
  	"larr;": "←",
  	"late;": "⪭",
  	"lcub;": "{",
  	"ldca;": "⤶",
  	"ldsh;": "↲",
  	"leqq;": "≦",
  	"lesg;": "⋚︀",
  	"lHar;": "⥢",
  	"LJcy;": "Љ",
  	"ljcy;": "љ",
  	"lnap;": "⪉",
  	"lneq;": "⪇",
  	"Lopf;": "𝕃",
  	"lopf;": "𝕝",
  	"lozf;": "⧫",
  	"lpar;": "(",
  	"Lscr;": "ℒ",
  	"lscr;": "𝓁",
  	"lsim;": "≲",
  	"lsqb;": "[",
  	"ltcc;": "⪦",
  	"ltri;": "◃",
  	"lvnE;": "≨︀",
  	"macr;": "¯",
  	"male;": "♂",
  	"malt;": "✠",
  	micro: "µ",
  	"mlcp;": "⫛",
  	"mldr;": "…",
  	"Mopf;": "𝕄",
  	"mopf;": "𝕞",
  	"Mscr;": "ℳ",
  	"mscr;": "𝓂",
  	"nang;": "∠⃒",
  	"napE;": "⩰̸",
  	"nbsp;": " ",
  	"ncap;": "⩃",
  	"ncup;": "⩂",
  	"ngeq;": "≱",
  	"nges;": "⩾̸",
  	"ngtr;": "≯",
  	"nGtv;": "≫̸",
  	"nisd;": "⋺",
  	"NJcy;": "Њ",
  	"njcy;": "њ",
  	"nldr;": "‥",
  	"nleq;": "≰",
  	"nles;": "⩽̸",
  	"nLtv;": "≪̸",
  	"nmid;": "∤",
  	"Nopf;": "ℕ",
  	"nopf;": "𝕟",
  	"npar;": "∦",
  	"npre;": "⪯̸",
  	"nsce;": "⪰̸",
  	"Nscr;": "𝒩",
  	"nscr;": "𝓃",
  	"nsim;": "≁",
  	"nsub;": "⊄",
  	"nsup;": "⊅",
  	"ntgl;": "≹",
  	"ntlg;": "≸",
  	"nvap;": "≍⃒",
  	"nvge;": "≥⃒",
  	"nvgt;": ">⃒",
  	"nvle;": "≤⃒",
  	"nvlt;": "<⃒",
  	"oast;": "⊛",
  	"ocir;": "⊚",
  	Ocirc: "Ô",
  	ocirc: "ô",
  	"odiv;": "⨸",
  	"odot;": "⊙",
  	"ogon;": "˛",
  	"oint;": "∮",
  	"omid;": "⦶",
  	"Oopf;": "𝕆",
  	"oopf;": "𝕠",
  	"opar;": "⦷",
  	"ordf;": "ª",
  	"ordm;": "º",
  	"oror;": "⩖",
  	"Oscr;": "𝒪",
  	"oscr;": "ℴ",
  	"osol;": "⊘",
  	"Ouml;": "Ö",
  	"ouml;": "ö",
  	"para;": "¶",
  	"part;": "∂",
  	"perp;": "⊥",
  	"phiv;": "ϕ",
  	"plus;": "+",
  	"Popf;": "ℙ",
  	"popf;": "𝕡",
  	pound: "£",
  	"prap;": "⪷",
  	"prec;": "≺",
  	"prnE;": "⪵",
  	"prod;": "∏",
  	"prop;": "∝",
  	"Pscr;": "𝒫",
  	"pscr;": "𝓅",
  	"qint;": "⨌",
  	"Qopf;": "ℚ",
  	"qopf;": "𝕢",
  	"Qscr;": "𝒬",
  	"qscr;": "𝓆",
  	"QUOT;": "\"",
  	"quot;": "\"",
  	"race;": "∽̱",
  	"Rang;": "⟫",
  	"rang;": "⟩",
  	raquo: "»",
  	"Rarr;": "↠",
  	"rArr;": "⇒",
  	"rarr;": "→",
  	"rcub;": "}",
  	"rdca;": "⤷",
  	"rdsh;": "↳",
  	"real;": "ℜ",
  	"rect;": "▭",
  	"rHar;": "⥤",
  	"rhov;": "ϱ",
  	"ring;": "˚",
  	"Ropf;": "ℝ",
  	"ropf;": "𝕣",
  	"rpar;": ")",
  	"Rscr;": "ℛ",
  	"rscr;": "𝓇",
  	"rsqb;": "]",
  	"rtri;": "▹",
  	"scap;": "⪸",
  	"scnE;": "⪶",
  	"sdot;": "⋅",
  	"sect;": "§",
  	"semi;": ";",
  	"sext;": "✶",
  	"SHcy;": "Ш",
  	"shcy;": "ш",
  	"sime;": "≃",
  	"simg;": "⪞",
  	"siml;": "⪝",
  	"smid;": "∣",
  	"smte;": "⪬",
  	"solb;": "⧄",
  	"Sopf;": "𝕊",
  	"sopf;": "𝕤",
  	"spar;": "∥",
  	"Sqrt;": "√",
  	"squf;": "▪",
  	"Sscr;": "𝒮",
  	"sscr;": "𝓈",
  	"Star;": "⋆",
  	"star;": "☆",
  	"subE;": "⫅",
  	"sube;": "⊆",
  	"succ;": "≻",
  	"sung;": "♪",
  	"sup1;": "¹",
  	"sup2;": "²",
  	"sup3;": "³",
  	"supE;": "⫆",
  	"supe;": "⊇",
  	szlig: "ß",
  	"tbrk;": "⎴",
  	"tdot;": "⃛",
  	THORN: "Þ",
  	thorn: "þ",
  	times: "×",
  	"tint;": "∭",
  	"toea;": "⤨",
  	"Topf;": "𝕋",
  	"topf;": "𝕥",
  	"tosa;": "⤩",
  	"trie;": "≜",
  	"Tscr;": "𝒯",
  	"tscr;": "𝓉",
  	"TScy;": "Ц",
  	"tscy;": "ц",
  	"Uarr;": "↟",
  	"uArr;": "⇑",
  	"uarr;": "↑",
  	Ucirc: "Û",
  	ucirc: "û",
  	"uHar;": "⥣",
  	"Uopf;": "𝕌",
  	"uopf;": "𝕦",
  	"Upsi;": "ϒ",
  	"upsi;": "υ",
  	"Uscr;": "𝒰",
  	"uscr;": "𝓊",
  	"utri;": "▵",
  	"Uuml;": "Ü",
  	"uuml;": "ü",
  	"vArr;": "⇕",
  	"varr;": "↕",
  	"Vbar;": "⫫",
  	"vBar;": "⫨",
  	"Vert;": "‖",
  	"vert;": "|",
  	"Vopf;": "𝕍",
  	"vopf;": "𝕧",
  	"Vscr;": "𝒱",
  	"vscr;": "𝓋",
  	"Wopf;": "𝕎",
  	"wopf;": "𝕨",
  	"Wscr;": "𝒲",
  	"wscr;": "𝓌",
  	"xcap;": "⋂",
  	"xcup;": "⋃",
  	"xmap;": "⟼",
  	"xnis;": "⋻",
  	"Xopf;": "𝕏",
  	"xopf;": "𝕩",
  	"Xscr;": "𝒳",
  	"xscr;": "𝓍",
  	"xvee;": "⋁",
  	"YAcy;": "Я",
  	"yacy;": "я",
  	"YIcy;": "Ї",
  	"yicy;": "ї",
  	"Yopf;": "𝕐",
  	"yopf;": "𝕪",
  	"Yscr;": "𝒴",
  	"yscr;": "𝓎",
  	"YUcy;": "Ю",
  	"yucy;": "ю",
  	"Yuml;": "Ÿ",
  	"yuml;": "ÿ",
  	"Zdot;": "Ż",
  	"zdot;": "ż",
  	"Zeta;": "Ζ",
  	"zeta;": "ζ",
  	"ZHcy;": "Ж",
  	"zhcy;": "ж",
  	"Zopf;": "ℤ",
  	"zopf;": "𝕫",
  	"Zscr;": "𝒵",
  	"zscr;": "𝓏",
  	"zwnj;": "‌",
  	Aacute: "Á",
  	aacute: "á",
  	"Acirc;": "Â",
  	"acirc;": "â",
  	"acute;": "´",
  	"AElig;": "Æ",
  	"aelig;": "æ",
  	Agrave: "À",
  	agrave: "à",
  	"aleph;": "ℵ",
  	"Alpha;": "Α",
  	"alpha;": "α",
  	"Amacr;": "Ā",
  	"amacr;": "ā",
  	"amalg;": "⨿",
  	"angle;": "∠",
  	"angrt;": "∟",
  	"angst;": "Å",
  	"Aogon;": "Ą",
  	"aogon;": "ą",
  	"Aring;": "Å",
  	"aring;": "å",
  	"asymp;": "≈",
  	Atilde: "Ã",
  	atilde: "ã",
  	"awint;": "⨑",
  	"bcong;": "≌",
  	"bdquo;": "„",
  	"bepsi;": "϶",
  	"blank;": "␣",
  	"blk12;": "▒",
  	"blk14;": "░",
  	"blk34;": "▓",
  	"block;": "█",
  	"boxDL;": "╗",
  	"boxDl;": "╖",
  	"boxdL;": "╕",
  	"boxdl;": "┐",
  	"boxDR;": "╔",
  	"boxDr;": "╓",
  	"boxdR;": "╒",
  	"boxdr;": "┌",
  	"boxHD;": "╦",
  	"boxHd;": "╤",
  	"boxhD;": "╥",
  	"boxhd;": "┬",
  	"boxHU;": "╩",
  	"boxHu;": "╧",
  	"boxhU;": "╨",
  	"boxhu;": "┴",
  	"boxUL;": "╝",
  	"boxUl;": "╜",
  	"boxuL;": "╛",
  	"boxul;": "┘",
  	"boxUR;": "╚",
  	"boxUr;": "╙",
  	"boxuR;": "╘",
  	"boxur;": "└",
  	"boxVH;": "╬",
  	"boxVh;": "╫",
  	"boxvH;": "╪",
  	"boxvh;": "┼",
  	"boxVL;": "╣",
  	"boxVl;": "╢",
  	"boxvL;": "╡",
  	"boxvl;": "┤",
  	"boxVR;": "╠",
  	"boxVr;": "╟",
  	"boxvR;": "╞",
  	"boxvr;": "├",
  	"Breve;": "˘",
  	"breve;": "˘",
  	brvbar: "¦",
  	"bsemi;": "⁏",
  	"bsime;": "⋍",
  	"bsolb;": "⧅",
  	"bumpE;": "⪮",
  	"bumpe;": "≏",
  	"caret;": "⁁",
  	"caron;": "ˇ",
  	"ccaps;": "⩍",
  	Ccedil: "Ç",
  	ccedil: "ç",
  	"Ccirc;": "Ĉ",
  	"ccirc;": "ĉ",
  	"ccups;": "⩌",
  	"cedil;": "¸",
  	"check;": "✓",
  	"clubs;": "♣",
  	"Colon;": "∷",
  	"colon;": ":",
  	"comma;": ",",
  	"crarr;": "↵",
  	"Cross;": "⨯",
  	"cross;": "✗",
  	"csube;": "⫑",
  	"csupe;": "⫒",
  	"ctdot;": "⋯",
  	"cuepr;": "⋞",
  	"cuesc;": "⋟",
  	"cupor;": "⩅",
  	curren: "¤",
  	"cuvee;": "⋎",
  	"cuwed;": "⋏",
  	"cwint;": "∱",
  	"Dashv;": "⫤",
  	"dashv;": "⊣",
  	"dblac;": "˝",
  	"ddarr;": "⇊",
  	"Delta;": "Δ",
  	"delta;": "δ",
  	"dharl;": "⇃",
  	"dharr;": "⇂",
  	"diams;": "♦",
  	"disin;": "⋲",
  	divide: "÷",
  	"doteq;": "≐",
  	"dtdot;": "⋱",
  	"dtrif;": "▾",
  	"duarr;": "⇵",
  	"duhar;": "⥯",
  	Eacute: "É",
  	eacute: "é",
  	"Ecirc;": "Ê",
  	"ecirc;": "ê",
  	"eDDot;": "⩷",
  	"efDot;": "≒",
  	Egrave: "È",
  	egrave: "è",
  	"Emacr;": "Ē",
  	"emacr;": "ē",
  	"empty;": "∅",
  	"Eogon;": "Ę",
  	"eogon;": "ę",
  	"eplus;": "⩱",
  	"epsiv;": "ϵ",
  	"eqsim;": "≂",
  	"Equal;": "⩵",
  	"equiv;": "≡",
  	"erarr;": "⥱",
  	"erDot;": "≓",
  	"esdot;": "≐",
  	"exist;": "∃",
  	"fflig;": "ﬀ",
  	"filig;": "ﬁ",
  	"fjlig;": "fj",
  	"fllig;": "ﬂ",
  	"fltns;": "▱",
  	"forkv;": "⫙",
  	frac12: "½",
  	frac14: "¼",
  	frac34: "¾",
  	"frasl;": "⁄",
  	"frown;": "⌢",
  	"Gamma;": "Γ",
  	"gamma;": "γ",
  	"Gcirc;": "Ĝ",
  	"gcirc;": "ĝ",
  	"gescc;": "⪩",
  	"gimel;": "ℷ",
  	"gneqq;": "≩",
  	"gnsim;": "⋧",
  	"grave;": "`",
  	"gsime;": "⪎",
  	"gsiml;": "⪐",
  	"gtcir;": "⩺",
  	"gtdot;": "⋗",
  	"Hacek;": "ˇ",
  	"harrw;": "↭",
  	"Hcirc;": "Ĥ",
  	"hcirc;": "ĥ",
  	"hoarr;": "⇿",
  	Iacute: "Í",
  	iacute: "í",
  	"Icirc;": "Î",
  	"icirc;": "î",
  	"iexcl;": "¡",
  	Igrave: "Ì",
  	igrave: "ì",
  	"iiint;": "∭",
  	"iiota;": "℩",
  	"IJlig;": "Ĳ",
  	"ijlig;": "ĳ",
  	"Imacr;": "Ī",
  	"imacr;": "ī",
  	"image;": "ℑ",
  	"imath;": "ı",
  	"imped;": "Ƶ",
  	"infin;": "∞",
  	"Iogon;": "Į",
  	"iogon;": "į",
  	"iprod;": "⨼",
  	iquest: "¿",
  	"isinE;": "⋹",
  	"isins;": "⋴",
  	"isinv;": "∈",
  	"Iukcy;": "І",
  	"iukcy;": "і",
  	"Jcirc;": "Ĵ",
  	"jcirc;": "ĵ",
  	"jmath;": "ȷ",
  	"Jukcy;": "Є",
  	"jukcy;": "є",
  	"Kappa;": "Κ",
  	"kappa;": "κ",
  	"lAarr;": "⇚",
  	"langd;": "⦑",
  	"laquo;": "«",
  	"larrb;": "⇤",
  	"lates;": "⪭︀",
  	"lBarr;": "⤎",
  	"lbarr;": "⤌",
  	"lbbrk;": "❲",
  	"lbrke;": "⦋",
  	"lceil;": "⌈",
  	"ldquo;": "“",
  	"lescc;": "⪨",
  	"lhard;": "↽",
  	"lharu;": "↼",
  	"lhblk;": "▄",
  	"llarr;": "⇇",
  	"lltri;": "◺",
  	"lneqq;": "≨",
  	"lnsim;": "⋦",
  	"loang;": "⟬",
  	"loarr;": "⇽",
  	"lobrk;": "⟦",
  	"lopar;": "⦅",
  	"lrarr;": "⇆",
  	"lrhar;": "⇋",
  	"lrtri;": "⊿",
  	"lsime;": "⪍",
  	"lsimg;": "⪏",
  	"lsquo;": "‘",
  	"ltcir;": "⩹",
  	"ltdot;": "⋖",
  	"ltrie;": "⊴",
  	"ltrif;": "◂",
  	"mdash;": "—",
  	"mDDot;": "∺",
  	"micro;": "µ",
  	middot: "·",
  	"minus;": "−",
  	"mumap;": "⊸",
  	"nabla;": "∇",
  	"napid;": "≋̸",
  	"napos;": "ŉ",
  	"natur;": "♮",
  	"nbump;": "≎̸",
  	"ncong;": "≇",
  	"ndash;": "–",
  	"neArr;": "⇗",
  	"nearr;": "↗",
  	"nedot;": "≐̸",
  	"nesim;": "≂̸",
  	"ngeqq;": "≧̸",
  	"ngsim;": "≵",
  	"nhArr;": "⇎",
  	"nharr;": "↮",
  	"nhpar;": "⫲",
  	"nlArr;": "⇍",
  	"nlarr;": "↚",
  	"nleqq;": "≦̸",
  	"nless;": "≮",
  	"nlsim;": "≴",
  	"nltri;": "⋪",
  	"notin;": "∉",
  	"notni;": "∌",
  	"npart;": "∂̸",
  	"nprec;": "⊀",
  	"nrArr;": "⇏",
  	"nrarr;": "↛",
  	"nrtri;": "⋫",
  	"nsime;": "≄",
  	"nsmid;": "∤",
  	"nspar;": "∦",
  	"nsubE;": "⫅̸",
  	"nsube;": "⊈",
  	"nsucc;": "⊁",
  	"nsupE;": "⫆̸",
  	"nsupe;": "⊉",
  	Ntilde: "Ñ",
  	ntilde: "ñ",
  	"numsp;": " ",
  	"nvsim;": "∼⃒",
  	"nwArr;": "⇖",
  	"nwarr;": "↖",
  	Oacute: "Ó",
  	oacute: "ó",
  	"Ocirc;": "Ô",
  	"ocirc;": "ô",
  	"odash;": "⊝",
  	"OElig;": "Œ",
  	"oelig;": "œ",
  	"ofcir;": "⦿",
  	Ograve: "Ò",
  	ograve: "ò",
  	"ohbar;": "⦵",
  	"olarr;": "↺",
  	"olcir;": "⦾",
  	"oline;": "‾",
  	"Omacr;": "Ō",
  	"omacr;": "ō",
  	"Omega;": "Ω",
  	"omega;": "ω",
  	"operp;": "⦹",
  	"oplus;": "⊕",
  	"orarr;": "↻",
  	"order;": "ℴ",
  	Oslash: "Ø",
  	oslash: "ø",
  	Otilde: "Õ",
  	otilde: "õ",
  	"ovbar;": "⌽",
  	"parsl;": "⫽",
  	"phone;": "☎",
  	"plusb;": "⊞",
  	"pluse;": "⩲",
  	plusmn: "±",
  	"pound;": "£",
  	"prcue;": "≼",
  	"Prime;": "″",
  	"prime;": "′",
  	"prnap;": "⪹",
  	"prsim;": "≾",
  	"quest;": "?",
  	"rAarr;": "⇛",
  	"radic;": "√",
  	"rangd;": "⦒",
  	"range;": "⦥",
  	"raquo;": "»",
  	"rarrb;": "⇥",
  	"rarrc;": "⤳",
  	"rarrw;": "↝",
  	"ratio;": "∶",
  	"RBarr;": "⤐",
  	"rBarr;": "⤏",
  	"rbarr;": "⤍",
  	"rbbrk;": "❳",
  	"rbrke;": "⦌",
  	"rceil;": "⌉",
  	"rdquo;": "”",
  	"reals;": "ℝ",
  	"rhard;": "⇁",
  	"rharu;": "⇀",
  	"rlarr;": "⇄",
  	"rlhar;": "⇌",
  	"rnmid;": "⫮",
  	"roang;": "⟭",
  	"roarr;": "⇾",
  	"robrk;": "⟧",
  	"ropar;": "⦆",
  	"rrarr;": "⇉",
  	"rsquo;": "’",
  	"rtrie;": "⊵",
  	"rtrif;": "▸",
  	"sbquo;": "‚",
  	"sccue;": "≽",
  	"Scirc;": "Ŝ",
  	"scirc;": "ŝ",
  	"scnap;": "⪺",
  	"scsim;": "≿",
  	"sdotb;": "⊡",
  	"sdote;": "⩦",
  	"seArr;": "⇘",
  	"searr;": "↘",
  	"setmn;": "∖",
  	"sharp;": "♯",
  	"Sigma;": "Σ",
  	"sigma;": "σ",
  	"simeq;": "≃",
  	"simgE;": "⪠",
  	"simlE;": "⪟",
  	"simne;": "≆",
  	"slarr;": "←",
  	"smile;": "⌣",
  	"smtes;": "⪬︀",
  	"sqcap;": "⊓",
  	"sqcup;": "⊔",
  	"sqsub;": "⊏",
  	"sqsup;": "⊐",
  	"srarr;": "→",
  	"starf;": "★",
  	"strns;": "¯",
  	"subnE;": "⫋",
  	"subne;": "⊊",
  	"supnE;": "⫌",
  	"supne;": "⊋",
  	"swArr;": "⇙",
  	"swarr;": "↙",
  	"szlig;": "ß",
  	"Theta;": "Θ",
  	"theta;": "θ",
  	"thkap;": "≈",
  	"THORN;": "Þ",
  	"thorn;": "þ",
  	"Tilde;": "∼",
  	"tilde;": "˜",
  	"times;": "×",
  	"TRADE;": "™",
  	"trade;": "™",
  	"trisb;": "⧍",
  	"TSHcy;": "Ћ",
  	"tshcy;": "ћ",
  	"twixt;": "≬",
  	Uacute: "Ú",
  	uacute: "ú",
  	"Ubrcy;": "Ў",
  	"ubrcy;": "ў",
  	"Ucirc;": "Û",
  	"ucirc;": "û",
  	"udarr;": "⇅",
  	"udhar;": "⥮",
  	Ugrave: "Ù",
  	ugrave: "ù",
  	"uharl;": "↿",
  	"uharr;": "↾",
  	"uhblk;": "▀",
  	"ultri;": "◸",
  	"Umacr;": "Ū",
  	"umacr;": "ū",
  	"Union;": "⋃",
  	"Uogon;": "Ų",
  	"uogon;": "ų",
  	"uplus;": "⊎",
  	"upsih;": "ϒ",
  	"UpTee;": "⊥",
  	"Uring;": "Ů",
  	"uring;": "ů",
  	"urtri;": "◹",
  	"utdot;": "⋰",
  	"utrif;": "▴",
  	"uuarr;": "⇈",
  	"varpi;": "ϖ",
  	"vBarv;": "⫩",
  	"VDash;": "⊫",
  	"Vdash;": "⊩",
  	"vDash;": "⊨",
  	"vdash;": "⊢",
  	"veeeq;": "≚",
  	"vltri;": "⊲",
  	"vnsub;": "⊂⃒",
  	"vnsup;": "⊃⃒",
  	"vprop;": "∝",
  	"vrtri;": "⊳",
  	"Wcirc;": "Ŵ",
  	"wcirc;": "ŵ",
  	"Wedge;": "⋀",
  	"wedge;": "∧",
  	"xcirc;": "◯",
  	"xdtri;": "▽",
  	"xhArr;": "⟺",
  	"xharr;": "⟷",
  	"xlArr;": "⟸",
  	"xlarr;": "⟵",
  	"xodot;": "⨀",
  	"xrArr;": "⟹",
  	"xrarr;": "⟶",
  	"xutri;": "△",
  	Yacute: "Ý",
  	yacute: "ý",
  	"Ycirc;": "Ŷ",
  	"ycirc;": "ŷ",
  	"Aacute;": "Á",
  	"aacute;": "á",
  	"Abreve;": "Ă",
  	"abreve;": "ă",
  	"Agrave;": "À",
  	"agrave;": "à",
  	"andand;": "⩕",
  	"angmsd;": "∡",
  	"angsph;": "∢",
  	"apacir;": "⩯",
  	"approx;": "≈",
  	"Assign;": "≔",
  	"Atilde;": "Ã",
  	"atilde;": "ã",
  	"barvee;": "⊽",
  	"Barwed;": "⌆",
  	"barwed;": "⌅",
  	"becaus;": "∵",
  	"bernou;": "ℬ",
  	"bigcap;": "⋂",
  	"bigcup;": "⋃",
  	"bigvee;": "⋁",
  	"bkarow;": "⤍",
  	"bottom;": "⊥",
  	"bowtie;": "⋈",
  	"boxbox;": "⧉",
  	"bprime;": "‵",
  	"brvbar;": "¦",
  	"bullet;": "•",
  	"Bumpeq;": "≎",
  	"bumpeq;": "≏",
  	"Cacute;": "Ć",
  	"cacute;": "ć",
  	"capand;": "⩄",
  	"capcap;": "⩋",
  	"capcup;": "⩇",
  	"capdot;": "⩀",
  	"Ccaron;": "Č",
  	"ccaron;": "č",
  	"Ccedil;": "Ç",
  	"ccedil;": "ç",
  	"circeq;": "≗",
  	"cirmid;": "⫯",
  	"Colone;": "⩴",
  	"colone;": "≔",
  	"commat;": "@",
  	"compfn;": "∘",
  	"Conint;": "∯",
  	"conint;": "∮",
  	"coprod;": "∐",
  	"copysr;": "℗",
  	"cularr;": "↶",
  	"CupCap;": "≍",
  	"cupcap;": "⩆",
  	"cupcup;": "⩊",
  	"cupdot;": "⊍",
  	"curarr;": "↷",
  	"curren;": "¤",
  	"cylcty;": "⌭",
  	"Dagger;": "‡",
  	"dagger;": "†",
  	"daleth;": "ℸ",
  	"Dcaron;": "Ď",
  	"dcaron;": "ď",
  	"dfisht;": "⥿",
  	"divide;": "÷",
  	"divonx;": "⋇",
  	"dlcorn;": "⌞",
  	"dlcrop;": "⌍",
  	"dollar;": "$",
  	"DotDot;": "⃜",
  	"drcorn;": "⌟",
  	"drcrop;": "⌌",
  	"Dstrok;": "Đ",
  	"dstrok;": "đ",
  	"Eacute;": "É",
  	"eacute;": "é",
  	"easter;": "⩮",
  	"Ecaron;": "Ě",
  	"ecaron;": "ě",
  	"ecolon;": "≕",
  	"Egrave;": "È",
  	"egrave;": "è",
  	"egsdot;": "⪘",
  	"elsdot;": "⪗",
  	"emptyv;": "∅",
  	"emsp13;": " ",
  	"emsp14;": " ",
  	"eparsl;": "⧣",
  	"eqcirc;": "≖",
  	"equals;": "=",
  	"equest;": "≟",
  	"Exists;": "∃",
  	"female;": "♀",
  	"ffilig;": "ﬃ",
  	"ffllig;": "ﬄ",
  	"ForAll;": "∀",
  	"forall;": "∀",
  	"frac12;": "½",
  	"frac13;": "⅓",
  	"frac14;": "¼",
  	"frac15;": "⅕",
  	"frac16;": "⅙",
  	"frac18;": "⅛",
  	"frac23;": "⅔",
  	"frac25;": "⅖",
  	"frac34;": "¾",
  	"frac35;": "⅗",
  	"frac38;": "⅜",
  	"frac45;": "⅘",
  	"frac56;": "⅚",
  	"frac58;": "⅝",
  	"frac78;": "⅞",
  	"gacute;": "ǵ",
  	"Gammad;": "Ϝ",
  	"gammad;": "ϝ",
  	"Gbreve;": "Ğ",
  	"gbreve;": "ğ",
  	"Gcedil;": "Ģ",
  	"gesdot;": "⪀",
  	"gesles;": "⪔",
  	"gtlPar;": "⦕",
  	"gtrarr;": "⥸",
  	"gtrdot;": "⋗",
  	"gtrsim;": "≳",
  	"hairsp;": " ",
  	"hamilt;": "ℋ",
  	"HARDcy;": "Ъ",
  	"hardcy;": "ъ",
  	"hearts;": "♥",
  	"hellip;": "…",
  	"hercon;": "⊹",
  	"homtht;": "∻",
  	"horbar;": "―",
  	"hslash;": "ℏ",
  	"Hstrok;": "Ħ",
  	"hstrok;": "ħ",
  	"hybull;": "⁃",
  	"hyphen;": "‐",
  	"Iacute;": "Í",
  	"iacute;": "í",
  	"Igrave;": "Ì",
  	"igrave;": "ì",
  	"iiiint;": "⨌",
  	"iinfin;": "⧜",
  	"incare;": "℅",
  	"inodot;": "ı",
  	"intcal;": "⊺",
  	"iquest;": "¿",
  	"isinsv;": "⋳",
  	"Itilde;": "Ĩ",
  	"itilde;": "ĩ",
  	"Jsercy;": "Ј",
  	"jsercy;": "ј",
  	"kappav;": "ϰ",
  	"Kcedil;": "Ķ",
  	"kcedil;": "ķ",
  	"kgreen;": "ĸ",
  	"Lacute;": "Ĺ",
  	"lacute;": "ĺ",
  	"lagran;": "ℒ",
  	"Lambda;": "Λ",
  	"lambda;": "λ",
  	"langle;": "⟨",
  	"larrfs;": "⤝",
  	"larrhk;": "↩",
  	"larrlp;": "↫",
  	"larrpl;": "⤹",
  	"larrtl;": "↢",
  	"lAtail;": "⤛",
  	"latail;": "⤙",
  	"lbrace;": "{",
  	"lbrack;": "[",
  	"Lcaron;": "Ľ",
  	"lcaron;": "ľ",
  	"Lcedil;": "Ļ",
  	"lcedil;": "ļ",
  	"ldquor;": "„",
  	"lesdot;": "⩿",
  	"lesges;": "⪓",
  	"lfisht;": "⥼",
  	"lfloor;": "⌊",
  	"lharul;": "⥪",
  	"llhard;": "⥫",
  	"Lmidot;": "Ŀ",
  	"lmidot;": "ŀ",
  	"lmoust;": "⎰",
  	"loplus;": "⨭",
  	"lowast;": "∗",
  	"lowbar;": "_",
  	"lparlt;": "⦓",
  	"lrhard;": "⥭",
  	"lsaquo;": "‹",
  	"lsquor;": "‚",
  	"Lstrok;": "Ł",
  	"lstrok;": "ł",
  	"lthree;": "⋋",
  	"ltimes;": "⋉",
  	"ltlarr;": "⥶",
  	"ltrPar;": "⦖",
  	"mapsto;": "↦",
  	"marker;": "▮",
  	"mcomma;": "⨩",
  	"midast;": "*",
  	"midcir;": "⫰",
  	"middot;": "·",
  	"minusb;": "⊟",
  	"minusd;": "∸",
  	"mnplus;": "∓",
  	"models;": "⊧",
  	"mstpos;": "∾",
  	"Nacute;": "Ń",
  	"nacute;": "ń",
  	"nbumpe;": "≏̸",
  	"Ncaron;": "Ň",
  	"ncaron;": "ň",
  	"Ncedil;": "Ņ",
  	"ncedil;": "ņ",
  	"nearhk;": "⤤",
  	"nequiv;": "≢",
  	"nesear;": "⤨",
  	"nexist;": "∄",
  	"nltrie;": "⋬",
  	"notinE;": "⋹̸",
  	"nparsl;": "⫽⃥",
  	"nprcue;": "⋠",
  	"nrarrc;": "⤳̸",
  	"nrarrw;": "↝̸",
  	"nrtrie;": "⋭",
  	"nsccue;": "⋡",
  	"nsimeq;": "≄",
  	"Ntilde;": "Ñ",
  	"ntilde;": "ñ",
  	"numero;": "№",
  	"nVDash;": "⊯",
  	"nVdash;": "⊮",
  	"nvDash;": "⊭",
  	"nvdash;": "⊬",
  	"nvHarr;": "⤄",
  	"nvlArr;": "⤂",
  	"nvrArr;": "⤃",
  	"nwarhk;": "⤣",
  	"nwnear;": "⤧",
  	"Oacute;": "Ó",
  	"oacute;": "ó",
  	"Odblac;": "Ő",
  	"odblac;": "ő",
  	"odsold;": "⦼",
  	"Ograve;": "Ò",
  	"ograve;": "ò",
  	"ominus;": "⊖",
  	"origof;": "⊶",
  	"Oslash;": "Ø",
  	"oslash;": "ø",
  	"Otilde;": "Õ",
  	"otilde;": "õ",
  	"Otimes;": "⨷",
  	"otimes;": "⊗",
  	"parsim;": "⫳",
  	"percnt;": "%",
  	"period;": ".",
  	"permil;": "‰",
  	"phmmat;": "ℳ",
  	"planck;": "ℏ",
  	"plankv;": "ℏ",
  	"plusdo;": "∔",
  	"plusdu;": "⨥",
  	"plusmn;": "±",
  	"preceq;": "⪯",
  	"primes;": "ℙ",
  	"prnsim;": "⋨",
  	"propto;": "∝",
  	"prurel;": "⊰",
  	"puncsp;": " ",
  	"qprime;": "⁗",
  	"Racute;": "Ŕ",
  	"racute;": "ŕ",
  	"rangle;": "⟩",
  	"rarrap;": "⥵",
  	"rarrfs;": "⤞",
  	"rarrhk;": "↪",
  	"rarrlp;": "↬",
  	"rarrpl;": "⥅",
  	"Rarrtl;": "⤖",
  	"rarrtl;": "↣",
  	"rAtail;": "⤜",
  	"ratail;": "⤚",
  	"rbrace;": "}",
  	"rbrack;": "]",
  	"Rcaron;": "Ř",
  	"rcaron;": "ř",
  	"Rcedil;": "Ŗ",
  	"rcedil;": "ŗ",
  	"rdquor;": "”",
  	"rfisht;": "⥽",
  	"rfloor;": "⌋",
  	"rharul;": "⥬",
  	"rmoust;": "⎱",
  	"roplus;": "⨮",
  	"rpargt;": "⦔",
  	"rsaquo;": "›",
  	"rsquor;": "’",
  	"rthree;": "⋌",
  	"rtimes;": "⋊",
  	"Sacute;": "Ś",
  	"sacute;": "ś",
  	"Scaron;": "Š",
  	"scaron;": "š",
  	"Scedil;": "Ş",
  	"scedil;": "ş",
  	"scnsim;": "⋩",
  	"searhk;": "⤥",
  	"seswar;": "⤩",
  	"sfrown;": "⌢",
  	"SHCHcy;": "Щ",
  	"shchcy;": "щ",
  	"sigmaf;": "ς",
  	"sigmav;": "ς",
  	"simdot;": "⩪",
  	"smashp;": "⨳",
  	"SOFTcy;": "Ь",
  	"softcy;": "ь",
  	"solbar;": "⌿",
  	"spades;": "♠",
  	"sqcaps;": "⊓︀",
  	"sqcups;": "⊔︀",
  	"sqsube;": "⊑",
  	"sqsupe;": "⊒",
  	"Square;": "□",
  	"square;": "□",
  	"squarf;": "▪",
  	"ssetmn;": "∖",
  	"ssmile;": "⌣",
  	"sstarf;": "⋆",
  	"subdot;": "⪽",
  	"Subset;": "⋐",
  	"subset;": "⊂",
  	"subsim;": "⫇",
  	"subsub;": "⫕",
  	"subsup;": "⫓",
  	"succeq;": "⪰",
  	"supdot;": "⪾",
  	"Supset;": "⋑",
  	"supset;": "⊃",
  	"supsim;": "⫈",
  	"supsub;": "⫔",
  	"supsup;": "⫖",
  	"swarhk;": "⤦",
  	"swnwar;": "⤪",
  	"target;": "⌖",
  	"Tcaron;": "Ť",
  	"tcaron;": "ť",
  	"Tcedil;": "Ţ",
  	"tcedil;": "ţ",
  	"telrec;": "⌕",
  	"there4;": "∴",
  	"thetav;": "ϑ",
  	"thinsp;": " ",
  	"thksim;": "∼",
  	"timesb;": "⊠",
  	"timesd;": "⨰",
  	"topbot;": "⌶",
  	"topcir;": "⫱",
  	"tprime;": "‴",
  	"tridot;": "◬",
  	"Tstrok;": "Ŧ",
  	"tstrok;": "ŧ",
  	"Uacute;": "Ú",
  	"uacute;": "ú",
  	"Ubreve;": "Ŭ",
  	"ubreve;": "ŭ",
  	"Udblac;": "Ű",
  	"udblac;": "ű",
  	"ufisht;": "⥾",
  	"Ugrave;": "Ù",
  	"ugrave;": "ù",
  	"ulcorn;": "⌜",
  	"ulcrop;": "⌏",
  	"urcorn;": "⌝",
  	"urcrop;": "⌎",
  	"Utilde;": "Ũ",
  	"utilde;": "ũ",
  	"vangrt;": "⦜",
  	"varphi;": "ϕ",
  	"varrho;": "ϱ",
  	"Vdashl;": "⫦",
  	"veebar;": "⊻",
  	"vellip;": "⋮",
  	"Verbar;": "‖",
  	"verbar;": "|",
  	"vsubnE;": "⫋︀",
  	"vsubne;": "⊊︀",
  	"vsupnE;": "⫌︀",
  	"vsupne;": "⊋︀",
  	"Vvdash;": "⊪",
  	"wedbar;": "⩟",
  	"wedgeq;": "≙",
  	"weierp;": "℘",
  	"wreath;": "≀",
  	"xoplus;": "⨁",
  	"xotime;": "⨂",
  	"xsqcup;": "⨆",
  	"xuplus;": "⨄",
  	"xwedge;": "⋀",
  	"Yacute;": "Ý",
  	"yacute;": "ý",
  	"Zacute;": "Ź",
  	"zacute;": "ź",
  	"Zcaron;": "Ž",
  	"zcaron;": "ž",
  	"zeetrf;": "ℨ",
  	"alefsym;": "ℵ",
  	"angrtvb;": "⊾",
  	"angzarr;": "⍼",
  	"asympeq;": "≍",
  	"backsim;": "∽",
  	"Because;": "∵",
  	"because;": "∵",
  	"bemptyv;": "⦰",
  	"between;": "≬",
  	"bigcirc;": "◯",
  	"bigodot;": "⨀",
  	"bigstar;": "★",
  	"bnequiv;": "≡⃥",
  	"boxplus;": "⊞",
  	"Cayleys;": "ℭ",
  	"Cconint;": "∰",
  	"ccupssm;": "⩐",
  	"Cedilla;": "¸",
  	"cemptyv;": "⦲",
  	"cirscir;": "⧂",
  	"coloneq;": "≔",
  	"congdot;": "⩭",
  	"cudarrl;": "⤸",
  	"cudarrr;": "⤵",
  	"cularrp;": "⤽",
  	"curarrm;": "⤼",
  	"dbkarow;": "⤏",
  	"ddagger;": "‡",
  	"ddotseq;": "⩷",
  	"demptyv;": "⦱",
  	"Diamond;": "⋄",
  	"diamond;": "⋄",
  	"digamma;": "ϝ",
  	"dotplus;": "∔",
  	"DownTee;": "⊤",
  	"dwangle;": "⦦",
  	"Element;": "∈",
  	"Epsilon;": "Ε",
  	"epsilon;": "ε",
  	"eqcolon;": "≕",
  	"equivDD;": "⩸",
  	"gesdoto;": "⪂",
  	"gtquest;": "⩼",
  	"gtrless;": "≷",
  	"harrcir;": "⥈",
  	"Implies;": "⇒",
  	"intprod;": "⨼",
  	"isindot;": "⋵",
  	"larrbfs;": "⤟",
  	"larrsim;": "⥳",
  	"lbrksld;": "⦏",
  	"lbrkslu;": "⦍",
  	"ldrdhar;": "⥧",
  	"LeftTee;": "⊣",
  	"lesdoto;": "⪁",
  	"lessdot;": "⋖",
  	"lessgtr;": "≶",
  	"lesssim;": "≲",
  	"lotimes;": "⨴",
  	"lozenge;": "◊",
  	"ltquest;": "⩻",
  	"luruhar;": "⥦",
  	"maltese;": "✠",
  	"minusdu;": "⨪",
  	"napprox;": "≉",
  	"natural;": "♮",
  	"nearrow;": "↗",
  	"NewLine;": "\n",
  	"nexists;": "∄",
  	"NoBreak;": "⁠",
  	"notinva;": "∉",
  	"notinvb;": "⋷",
  	"notinvc;": "⋶",
  	"NotLess;": "≮",
  	"notniva;": "∌",
  	"notnivb;": "⋾",
  	"notnivc;": "⋽",
  	"npolint;": "⨔",
  	"npreceq;": "⪯̸",
  	"nsqsube;": "⋢",
  	"nsqsupe;": "⋣",
  	"nsubset;": "⊂⃒",
  	"nsucceq;": "⪰̸",
  	"nsupset;": "⊃⃒",
  	"nvinfin;": "⧞",
  	"nvltrie;": "⊴⃒",
  	"nvrtrie;": "⊵⃒",
  	"nwarrow;": "↖",
  	"olcross;": "⦻",
  	"Omicron;": "Ο",
  	"omicron;": "ο",
  	"orderof;": "ℴ",
  	"orslope;": "⩗",
  	"OverBar;": "‾",
  	"pertenk;": "‱",
  	"planckh;": "ℎ",
  	"pluscir;": "⨢",
  	"plussim;": "⨦",
  	"plustwo;": "⨧",
  	"precsim;": "≾",
  	"Product;": "∏",
  	"quatint;": "⨖",
  	"questeq;": "≟",
  	"rarrbfs;": "⤠",
  	"rarrsim;": "⥴",
  	"rbrksld;": "⦎",
  	"rbrkslu;": "⦐",
  	"rdldhar;": "⥩",
  	"realine;": "ℛ",
  	"rotimes;": "⨵",
  	"ruluhar;": "⥨",
  	"searrow;": "↘",
  	"simplus;": "⨤",
  	"simrarr;": "⥲",
  	"subedot;": "⫃",
  	"submult;": "⫁",
  	"subplus;": "⪿",
  	"subrarr;": "⥹",
  	"succsim;": "≿",
  	"supdsub;": "⫘",
  	"supedot;": "⫄",
  	"suphsol;": "⟉",
  	"suphsub;": "⫗",
  	"suplarr;": "⥻",
  	"supmult;": "⫂",
  	"supplus;": "⫀",
  	"swarrow;": "↙",
  	"topfork;": "⫚",
  	"triplus;": "⨹",
  	"tritime;": "⨻",
  	"UpArrow;": "↑",
  	"Uparrow;": "⇑",
  	"uparrow;": "↑",
  	"Upsilon;": "Υ",
  	"upsilon;": "υ",
  	"uwangle;": "⦧",
  	"vzigzag;": "⦚",
  	"zigrarr;": "⇝",
  	"andslope;": "⩘",
  	"angmsdaa;": "⦨",
  	"angmsdab;": "⦩",
  	"angmsdac;": "⦪",
  	"angmsdad;": "⦫",
  	"angmsdae;": "⦬",
  	"angmsdaf;": "⦭",
  	"angmsdag;": "⦮",
  	"angmsdah;": "⦯",
  	"angrtvbd;": "⦝",
  	"approxeq;": "≊",
  	"awconint;": "∳",
  	"backcong;": "≌",
  	"barwedge;": "⌅",
  	"bbrktbrk;": "⎶",
  	"bigoplus;": "⨁",
  	"bigsqcup;": "⨆",
  	"biguplus;": "⨄",
  	"bigwedge;": "⋀",
  	"boxminus;": "⊟",
  	"boxtimes;": "⊠",
  	"bsolhsub;": "⟈",
  	"capbrcup;": "⩉",
  	"circledR;": "®",
  	"circledS;": "Ⓢ",
  	"cirfnint;": "⨐",
  	"clubsuit;": "♣",
  	"cupbrcap;": "⩈",
  	"curlyvee;": "⋎",
  	"cwconint;": "∲",
  	"DDotrahd;": "⤑",
  	"doteqdot;": "≑",
  	"DotEqual;": "≐",
  	"dotminus;": "∸",
  	"drbkarow;": "⤐",
  	"dzigrarr;": "⟿",
  	"elinters;": "⏧",
  	"emptyset;": "∅",
  	"eqvparsl;": "⧥",
  	"fpartint;": "⨍",
  	"geqslant;": "⩾",
  	"gesdotol;": "⪄",
  	"gnapprox;": "⪊",
  	"hksearow;": "⤥",
  	"hkswarow;": "⤦",
  	"imagline;": "ℐ",
  	"imagpart;": "ℑ",
  	"infintie;": "⧝",
  	"integers;": "ℤ",
  	"Integral;": "∫",
  	"intercal;": "⊺",
  	"intlarhk;": "⨗",
  	"laemptyv;": "⦴",
  	"ldrushar;": "⥋",
  	"leqslant;": "⩽",
  	"lesdotor;": "⪃",
  	"LessLess;": "⪡",
  	"llcorner;": "⌞",
  	"lnapprox;": "⪉",
  	"lrcorner;": "⌟",
  	"lurdshar;": "⥊",
  	"mapstoup;": "↥",
  	"multimap;": "⊸",
  	"naturals;": "ℕ",
  	"ncongdot;": "⩭̸",
  	"NotEqual;": "≠",
  	"notindot;": "⋵̸",
  	"NotTilde;": "≁",
  	"otimesas;": "⨶",
  	"parallel;": "∥",
  	"PartialD;": "∂",
  	"plusacir;": "⨣",
  	"pointint;": "⨕",
  	"Precedes;": "≺",
  	"precneqq;": "⪵",
  	"precnsim;": "⋨",
  	"profalar;": "⌮",
  	"profline;": "⌒",
  	"profsurf;": "⌓",
  	"raemptyv;": "⦳",
  	"realpart;": "ℜ",
  	"RightTee;": "⊢",
  	"rppolint;": "⨒",
  	"rtriltri;": "⧎",
  	"scpolint;": "⨓",
  	"setminus;": "∖",
  	"shortmid;": "∣",
  	"smeparsl;": "⧤",
  	"sqsubset;": "⊏",
  	"sqsupset;": "⊐",
  	"subseteq;": "⊆",
  	"Succeeds;": "≻",
  	"succneqq;": "⪶",
  	"succnsim;": "⋩",
  	"SuchThat;": "∋",
  	"Superset;": "⊃",
  	"supseteq;": "⊇",
  	"thetasym;": "ϑ",
  	"thicksim;": "∼",
  	"timesbar;": "⨱",
  	"triangle;": "▵",
  	"triminus;": "⨺",
  	"trpezium;": "⏢",
  	"Uarrocir;": "⥉",
  	"ulcorner;": "⌜",
  	"UnderBar;": "_",
  	"urcorner;": "⌝",
  	"varkappa;": "ϰ",
  	"varsigma;": "ς",
  	"vartheta;": "ϑ",
  	"backprime;": "‵",
  	"backsimeq;": "⋍",
  	"Backslash;": "∖",
  	"bigotimes;": "⨂",
  	"CenterDot;": "·",
  	"centerdot;": "·",
  	"checkmark;": "✓",
  	"CircleDot;": "⊙",
  	"complexes;": "ℂ",
  	"Congruent;": "≡",
  	"Coproduct;": "∐",
  	"dotsquare;": "⊡",
  	"DoubleDot;": "¨",
  	"DownArrow;": "↓",
  	"Downarrow;": "⇓",
  	"downarrow;": "↓",
  	"DownBreve;": "̑",
  	"gtrapprox;": "⪆",
  	"gtreqless;": "⋛",
  	"gvertneqq;": "≩︀",
  	"heartsuit;": "♥",
  	"HumpEqual;": "≏",
  	"LeftArrow;": "←",
  	"Leftarrow;": "⇐",
  	"leftarrow;": "←",
  	"LeftFloor;": "⌊",
  	"lesseqgtr;": "⋚",
  	"LessTilde;": "≲",
  	"lvertneqq;": "≨︀",
  	"Mellintrf;": "ℳ",
  	"MinusPlus;": "∓",
  	"ngeqslant;": "⩾̸",
  	"nleqslant;": "⩽̸",
  	"NotCupCap;": "≭",
  	"NotExists;": "∄",
  	"NotSubset;": "⊂⃒",
  	"nparallel;": "∦",
  	"nshortmid;": "∤",
  	"nsubseteq;": "⊈",
  	"nsupseteq;": "⊉",
  	"OverBrace;": "⏞",
  	"pitchfork;": "⋔",
  	"PlusMinus;": "±",
  	"rationals;": "ℚ",
  	"spadesuit;": "♠",
  	"subseteqq;": "⫅",
  	"subsetneq;": "⊊",
  	"supseteqq;": "⫆",
  	"supsetneq;": "⊋",
  	"Therefore;": "∴",
  	"therefore;": "∴",
  	"ThinSpace;": " ",
  	"triangleq;": "≜",
  	"TripleDot;": "⃛",
  	"UnionPlus;": "⊎",
  	"varpropto;": "∝",
  	"Bernoullis;": "ℬ",
  	"circledast;": "⊛",
  	"CirclePlus;": "⊕",
  	"complement;": "∁",
  	"curlywedge;": "⋏",
  	"eqslantgtr;": "⪖",
  	"EqualTilde;": "≂",
  	"Fouriertrf;": "ℱ",
  	"gtreqqless;": "⪌",
  	"ImaginaryI;": "ⅈ",
  	"Laplacetrf;": "ℒ",
  	"LeftVector;": "↼",
  	"lessapprox;": "⪅",
  	"lesseqqgtr;": "⪋",
  	"Lleftarrow;": "⇚",
  	"lmoustache;": "⎰",
  	"longmapsto;": "⟼",
  	"mapstodown;": "↧",
  	"mapstoleft;": "↤",
  	"nLeftarrow;": "⇍",
  	"nleftarrow;": "↚",
  	"NotElement;": "∉",
  	"NotGreater;": "≯",
  	"nsubseteqq;": "⫅̸",
  	"nsupseteqq;": "⫆̸",
  	"precapprox;": "⪷",
  	"Proportion;": "∷",
  	"RightArrow;": "→",
  	"Rightarrow;": "⇒",
  	"rightarrow;": "→",
  	"RightFloor;": "⌋",
  	"rmoustache;": "⎱",
  	"sqsubseteq;": "⊑",
  	"sqsupseteq;": "⊒",
  	"subsetneqq;": "⫋",
  	"succapprox;": "⪸",
  	"supsetneqq;": "⫌",
  	"ThickSpace;": "  ",
  	"TildeEqual;": "≃",
  	"TildeTilde;": "≈",
  	"UnderBrace;": "⏟",
  	"UpArrowBar;": "⤒",
  	"UpTeeArrow;": "↥",
  	"upuparrows;": "⇈",
  	"varepsilon;": "ϵ",
  	"varnothing;": "∅",
  	"backepsilon;": "϶",
  	"blacksquare;": "▪",
  	"circledcirc;": "⊚",
  	"circleddash;": "⊝",
  	"CircleMinus;": "⊖",
  	"CircleTimes;": "⊗",
  	"curlyeqprec;": "⋞",
  	"curlyeqsucc;": "⋟",
  	"diamondsuit;": "♦",
  	"eqslantless;": "⪕",
  	"Equilibrium;": "⇌",
  	"expectation;": "ℰ",
  	"GreaterLess;": "≷",
  	"LeftCeiling;": "⌈",
  	"LessGreater;": "≶",
  	"MediumSpace;": " ",
  	"NotLessLess;": "≪̸",
  	"NotPrecedes;": "⊀",
  	"NotSucceeds;": "⊁",
  	"NotSuperset;": "⊃⃒",
  	"nRightarrow;": "⇏",
  	"nrightarrow;": "↛",
  	"OverBracket;": "⎴",
  	"preccurlyeq;": "≼",
  	"precnapprox;": "⪹",
  	"quaternions;": "ℍ",
  	"RightVector;": "⇀",
  	"Rrightarrow;": "⇛",
  	"RuleDelayed;": "⧴",
  	"SmallCircle;": "∘",
  	"SquareUnion;": "⊔",
  	"straightphi;": "ϕ",
  	"SubsetEqual;": "⊆",
  	"succcurlyeq;": "≽",
  	"succnapprox;": "⪺",
  	"thickapprox;": "≈",
  	"UpDownArrow;": "↕",
  	"Updownarrow;": "⇕",
  	"updownarrow;": "↕",
  	"VerticalBar;": "∣",
  	"blacklozenge;": "⧫",
  	"DownArrowBar;": "⤓",
  	"DownTeeArrow;": "↧",
  	"ExponentialE;": "ⅇ",
  	"exponentiale;": "ⅇ",
  	"GreaterEqual;": "≥",
  	"GreaterTilde;": "≳",
  	"HilbertSpace;": "ℋ",
  	"HumpDownHump;": "≎",
  	"Intersection;": "⋂",
  	"LeftArrowBar;": "⇤",
  	"LeftTeeArrow;": "↤",
  	"LeftTriangle;": "⊲",
  	"LeftUpVector;": "↿",
  	"NotCongruent;": "≢",
  	"NotHumpEqual;": "≏̸",
  	"NotLessEqual;": "≰",
  	"NotLessTilde;": "≴",
  	"Proportional;": "∝",
  	"RightCeiling;": "⌉",
  	"risingdotseq;": "≓",
  	"RoundImplies;": "⥰",
  	"ShortUpArrow;": "↑",
  	"SquareSubset;": "⊏",
  	"triangledown;": "▿",
  	"triangleleft;": "◃",
  	"UnderBracket;": "⎵",
  	"varsubsetneq;": "⊊︀",
  	"varsupsetneq;": "⊋︀",
  	"VerticalLine;": "|",
  	"ApplyFunction;": "⁡",
  	"bigtriangleup;": "△",
  	"blacktriangle;": "▴",
  	"DifferentialD;": "ⅆ",
  	"divideontimes;": "⋇",
  	"DoubleLeftTee;": "⫤",
  	"DoubleUpArrow;": "⇑",
  	"fallingdotseq;": "≒",
  	"hookleftarrow;": "↩",
  	"leftarrowtail;": "↢",
  	"leftharpoonup;": "↼",
  	"LeftTeeVector;": "⥚",
  	"LeftVectorBar;": "⥒",
  	"LessFullEqual;": "≦",
  	"LongLeftArrow;": "⟵",
  	"Longleftarrow;": "⟸",
  	"longleftarrow;": "⟵",
  	"looparrowleft;": "↫",
  	"measuredangle;": "∡",
  	"NotEqualTilde;": "≂̸",
  	"NotTildeEqual;": "≄",
  	"NotTildeTilde;": "≉",
  	"ntriangleleft;": "⋪",
  	"Poincareplane;": "ℌ",
  	"PrecedesEqual;": "⪯",
  	"PrecedesTilde;": "≾",
  	"RightArrowBar;": "⇥",
  	"RightTeeArrow;": "↦",
  	"RightTriangle;": "⊳",
  	"RightUpVector;": "↾",
  	"shortparallel;": "∥",
  	"smallsetminus;": "∖",
  	"SucceedsEqual;": "⪰",
  	"SucceedsTilde;": "≿",
  	"SupersetEqual;": "⊇",
  	"triangleright;": "▹",
  	"UpEquilibrium;": "⥮",
  	"upharpoonleft;": "↿",
  	"varsubsetneqq;": "⫋︀",
  	"varsupsetneqq;": "⫌︀",
  	"VerticalTilde;": "≀",
  	"VeryThinSpace;": " ",
  	"curvearrowleft;": "↶",
  	"DiacriticalDot;": "˙",
  	"doublebarwedge;": "⌆",
  	"DoubleRightTee;": "⊨",
  	"downdownarrows;": "⇊",
  	"DownLeftVector;": "↽",
  	"GreaterGreater;": "⪢",
  	"hookrightarrow;": "↪",
  	"HorizontalLine;": "─",
  	"InvisibleComma;": "⁣",
  	"InvisibleTimes;": "⁢",
  	"LeftDownVector;": "⇃",
  	"leftleftarrows;": "⇇",
  	"LeftRightArrow;": "↔",
  	"Leftrightarrow;": "⇔",
  	"leftrightarrow;": "↔",
  	"leftthreetimes;": "⋋",
  	"LessSlantEqual;": "⩽",
  	"LongRightArrow;": "⟶",
  	"Longrightarrow;": "⟹",
  	"longrightarrow;": "⟶",
  	"looparrowright;": "↬",
  	"LowerLeftArrow;": "↙",
  	"NestedLessLess;": "≪",
  	"NotGreaterLess;": "≹",
  	"NotLessGreater;": "≸",
  	"NotSubsetEqual;": "⊈",
  	"NotVerticalBar;": "∤",
  	"nshortparallel;": "∦",
  	"ntriangleright;": "⋫",
  	"OpenCurlyQuote;": "‘",
  	"ReverseElement;": "∋",
  	"rightarrowtail;": "↣",
  	"rightharpoonup;": "⇀",
  	"RightTeeVector;": "⥛",
  	"RightVectorBar;": "⥓",
  	"ShortDownArrow;": "↓",
  	"ShortLeftArrow;": "←",
  	"SquareSuperset;": "⊐",
  	"TildeFullEqual;": "≅",
  	"trianglelefteq;": "⊴",
  	"upharpoonright;": "↾",
  	"UpperLeftArrow;": "↖",
  	"ZeroWidthSpace;": "​",
  	"bigtriangledown;": "▽",
  	"circlearrowleft;": "↺",
  	"CloseCurlyQuote;": "’",
  	"ContourIntegral;": "∮",
  	"curvearrowright;": "↷",
  	"DoubleDownArrow;": "⇓",
  	"DoubleLeftArrow;": "⇐",
  	"downharpoonleft;": "⇃",
  	"DownRightVector;": "⇁",
  	"leftharpoondown;": "↽",
  	"leftrightarrows;": "⇆",
  	"LeftRightVector;": "⥎",
  	"LeftTriangleBar;": "⧏",
  	"LeftUpTeeVector;": "⥠",
  	"LeftUpVectorBar;": "⥘",
  	"LowerRightArrow;": "↘",
  	"nLeftrightarrow;": "⇎",
  	"nleftrightarrow;": "↮",
  	"NotGreaterEqual;": "≱",
  	"NotGreaterTilde;": "≵",
  	"NotHumpDownHump;": "≎̸",
  	"NotLeftTriangle;": "⋪",
  	"NotSquareSubset;": "⊏̸",
  	"ntrianglelefteq;": "⋬",
  	"OverParenthesis;": "⏜",
  	"RightDownVector;": "⇂",
  	"rightleftarrows;": "⇄",
  	"rightsquigarrow;": "↝",
  	"rightthreetimes;": "⋌",
  	"ShortRightArrow;": "→",
  	"straightepsilon;": "ϵ",
  	"trianglerighteq;": "⊵",
  	"UpperRightArrow;": "↗",
  	"vartriangleleft;": "⊲",
  	"circlearrowright;": "↻",
  	"DiacriticalAcute;": "´",
  	"DiacriticalGrave;": "`",
  	"DiacriticalTilde;": "˜",
  	"DoubleRightArrow;": "⇒",
  	"DownArrowUpArrow;": "⇵",
  	"downharpoonright;": "⇂",
  	"EmptySmallSquare;": "◻",
  	"GreaterEqualLess;": "⋛",
  	"GreaterFullEqual;": "≧",
  	"LeftAngleBracket;": "⟨",
  	"LeftUpDownVector;": "⥑",
  	"LessEqualGreater;": "⋚",
  	"NonBreakingSpace;": " ",
  	"NotPrecedesEqual;": "⪯̸",
  	"NotRightTriangle;": "⋫",
  	"NotSucceedsEqual;": "⪰̸",
  	"NotSucceedsTilde;": "≿̸",
  	"NotSupersetEqual;": "⊉",
  	"ntrianglerighteq;": "⋭",
  	"rightharpoondown;": "⇁",
  	"rightrightarrows;": "⇉",
  	"RightTriangleBar;": "⧐",
  	"RightUpTeeVector;": "⥜",
  	"RightUpVectorBar;": "⥔",
  	"twoheadleftarrow;": "↞",
  	"UnderParenthesis;": "⏝",
  	"UpArrowDownArrow;": "⇅",
  	"vartriangleright;": "⊳",
  	"blacktriangledown;": "▾",
  	"blacktriangleleft;": "◂",
  	"DoubleUpDownArrow;": "⇕",
  	"DoubleVerticalBar;": "∥",
  	"DownLeftTeeVector;": "⥞",
  	"DownLeftVectorBar;": "⥖",
  	"FilledSmallSquare;": "◼",
  	"GreaterSlantEqual;": "⩾",
  	"LeftDoubleBracket;": "⟦",
  	"LeftDownTeeVector;": "⥡",
  	"LeftDownVectorBar;": "⥙",
  	"leftrightharpoons;": "⇋",
  	"LeftTriangleEqual;": "⊴",
  	"NegativeThinSpace;": "​",
  	"NotGreaterGreater;": "≫̸",
  	"NotLessSlantEqual;": "⩽̸",
  	"NotNestedLessLess;": "⪡̸",
  	"NotReverseElement;": "∌",
  	"NotSquareSuperset;": "⊐̸",
  	"NotTildeFullEqual;": "≇",
  	"RightAngleBracket;": "⟩",
  	"rightleftharpoons;": "⇌",
  	"RightUpDownVector;": "⥏",
  	"SquareSubsetEqual;": "⊑",
  	"twoheadrightarrow;": "↠",
  	"VerticalSeparator;": "❘",
  	"blacktriangleright;": "▸",
  	"DownRightTeeVector;": "⥟",
  	"DownRightVectorBar;": "⥗",
  	"LongLeftRightArrow;": "⟷",
  	"Longleftrightarrow;": "⟺",
  	"longleftrightarrow;": "⟷",
  	"NegativeThickSpace;": "​",
  	"NotLeftTriangleBar;": "⧏̸",
  	"PrecedesSlantEqual;": "≼",
  	"ReverseEquilibrium;": "⇋",
  	"RightDoubleBracket;": "⟧",
  	"RightDownTeeVector;": "⥝",
  	"RightDownVectorBar;": "⥕",
  	"RightTriangleEqual;": "⊵",
  	"SquareIntersection;": "⊓",
  	"SucceedsSlantEqual;": "≽",
  	"DoubleLongLeftArrow;": "⟸",
  	"DownLeftRightVector;": "⥐",
  	"LeftArrowRightArrow;": "⇆",
  	"leftrightsquigarrow;": "↭",
  	"NegativeMediumSpace;": "​",
  	"NotGreaterFullEqual;": "≧̸",
  	"NotRightTriangleBar;": "⧐̸",
  	"RightArrowLeftArrow;": "⇄",
  	"SquareSupersetEqual;": "⊒",
  	"CapitalDifferentialD;": "ⅅ",
  	"DoubleLeftRightArrow;": "⇔",
  	"DoubleLongRightArrow;": "⟹",
  	"EmptyVerySmallSquare;": "▫",
  	"NestedGreaterGreater;": "≫",
  	"NotDoubleVerticalBar;": "∦",
  	"NotGreaterSlantEqual;": "⩾̸",
  	"NotLeftTriangleEqual;": "⋬",
  	"NotSquareSubsetEqual;": "⋢",
  	"OpenCurlyDoubleQuote;": "“",
  	"ReverseUpEquilibrium;": "⥯",
  	"CloseCurlyDoubleQuote;": "”",
  	"DoubleContourIntegral;": "∯",
  	"FilledVerySmallSquare;": "▪",
  	"NegativeVeryThinSpace;": "​",
  	"NotPrecedesSlantEqual;": "⋠",
  	"NotRightTriangleEqual;": "⋭",
  	"NotSucceedsSlantEqual;": "⋡",
  	"DiacriticalDoubleAcute;": "˝",
  	"NotSquareSupersetEqual;": "⋣",
  	"NotNestedGreaterGreater;": "⪢̸",
  	"ClockwiseContourIntegral;": "∲",
  	"DoubleLongLeftRightArrow;": "⟺",
  	"CounterClockwiseContourIntegral;": "∳"
  };

  // lazy compute this to make this file tree-shakable for browser
  let maxCRNameLength;
  const decodeHtml = (rawText, asAttr) => {
      let offset = 0;
      const end = rawText.length;
      let decodedText = '';
      function advance(length) {
          offset += length;
          rawText = rawText.slice(length);
      }
      while (offset < end) {
          const head = /&(?:#x?)?/i.exec(rawText);
          if (!head || offset + head.index >= end) {
              const remaining = end - offset;
              decodedText += rawText.slice(0, remaining);
              advance(remaining);
              break;
          }
          // Advance to the "&".
          decodedText += rawText.slice(0, head.index);
          advance(head.index);
          if (head[0] === '&') {
              // Named character reference.
              let name = '';
              let value = undefined;
              // & ->
              if (/[0-9a-z]/i.test(rawText[1])) {
                  if (!maxCRNameLength) {
                      // 找到字符 json 里面名字最长的那个属性？
                      maxCRNameLength = Object.keys(namedCharacterReferences).reduce((max, name) => Math.max(max, name.length), 0);
                  }
                  for (let length = maxCRNameLength; !value && length > 0; --length) {
                      name = rawText.substr(1, length);
                      value = namedCharacterReferences[name];
                  }
                  if (value) {
                      const semi = name.endsWith(';');
                      if (asAttr &&
                          !semi &&
                          /[=a-z0-9]/i.test(rawText[name.length + 1] || '')) {
                          decodedText += '&' + name;
                          advance(1 + name.length);
                      }
                      else {
                          decodedText += value;
                          advance(1 + name.length);
                      }
                  }
                  else {
                      decodedText += '&' + name;
                      advance(1 + name.length);
                  }
              }
              else {
                  decodedText += '&';
                  advance(1);
              }
          }
          else {
              // Numeric character reference.
              const hex = head[0] === '&#x';
              const pattern = hex ? /^&#x([0-9a-f]+);?/ : /^&#([0-9]+);?/;
              const body = pattern.exec(rawText);
              if (!body) {
                  decodedText += head[0];
                  advance(head[0].length);
              }
              else {
                  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
                  let cp = Number.parseInt(body[1], hex ? 16 : 10);
                  if (cp === 0) {
                      cp = 0xfffd;
                  }
                  else if (cp > 0x10ffff) {
                      cp = 0xfffd;
                  }
                  else if (cp >= 0xd800 && cp <= 0xdfff) {
                      cp = 0xfffd;
                  }
                  else if ((cp >= 0xfdd0 && cp <= 0xfdef) || (cp & 0xfffe) === 0xfffe) ;
                  else if ((cp >= 0x01 && cp <= 0x08) ||
                      cp === 0x0b ||
                      (cp >= 0x0d && cp <= 0x1f) ||
                      (cp >= 0x7f && cp <= 0x9f)) {
                      cp = CCR_REPLACEMENTS[cp] || cp;
                  }
                  decodedText += String.fromCodePoint(cp);
                  advance(body[0].length);
              }
          }
      }
      return decodedText;
  };
  // https://html.spec.whatwg.org/multipage/parsing.html#numeric-character-reference-end-state
  const CCR_REPLACEMENTS = {
      0x80: 0x20ac,
      0x82: 0x201a,
      0x83: 0x0192,
      0x84: 0x201e,
      0x85: 0x2026,
      0x86: 0x2020,
      0x87: 0x2021,
      0x88: 0x02c6,
      0x89: 0x2030,
      0x8a: 0x0160,
      0x8b: 0x2039,
      0x8c: 0x0152,
      0x8e: 0x017d,
      0x91: 0x2018,
      0x92: 0x2019,
      0x93: 0x201c,
      0x94: 0x201d,
      0x95: 0x2022,
      0x96: 0x2013,
      0x97: 0x2014,
      0x98: 0x02dc,
      0x99: 0x2122,
      0x9a: 0x0161,
      0x9b: 0x203a,
      0x9c: 0x0153,
      0x9e: 0x017e,
      0x9f: 0x0178
  };

  /* eslint-disable no-restricted-globals */
  let decoder;
  function decodeHtmlBrowser(raw) {
      (decoder || (decoder = document.createElement('div'))).innerHTML = raw;
      return decoder.textContent;
  }

  const isRawTextContainer = /*#__PURE__*/ makeMap('style,iframe,script,noscript', true);
  const parserOptions = {
      isVoidTag,
      isNativeTag: tag => isHTMLTag(tag) || isSVGTag(tag),
      isPreTag: tag => tag === 'pre',
      decodeEntities:  decodeHtmlBrowser ,
      isBuiltInComponent: (tag) => {
          if (isBuiltInType(tag, `Transition`)) {
              return TRANSITION;
          }
          else if (isBuiltInType(tag, `TransitionGroup`)) {
              return TRANSITION_GROUP;
          }
      },
      // https://html.spec.whatwg.org/multipage/parsing.html#tree-construction-dispatcher
      getNamespace(tag, parent) {
          let ns = parent ? parent.ns : 0 /* HTML */;
          if (parent && ns === 2 /* MATH_ML */) {
              if (parent.tag === 'annotation-xml') {
                  if (tag === 'svg') {
                      return 1 /* SVG */;
                  }
                  if (parent.props.some(a => a.type === 6 /* ATTRIBUTE */ &&
                      a.name === 'encoding' &&
                      a.value != null &&
                      (a.value.content === 'text/html' ||
                          a.value.content === 'application/xhtml+xml'))) {
                      ns = 0 /* HTML */;
                  }
              }
              else if (/^m(?:[ions]|text)$/.test(parent.tag) &&
                  tag !== 'mglyph' &&
                  tag !== 'malignmark') {
                  ns = 0 /* HTML */;
              }
          }
          else if (parent && ns === 1 /* SVG */) {
              if (parent.tag === 'foreignObject' ||
                  parent.tag === 'desc' ||
                  parent.tag === 'title') {
                  ns = 0 /* HTML */;
              }
          }
          if (ns === 0 /* HTML */) {
              if (tag === 'svg') {
                  return 1 /* SVG */;
              }
              if (tag === 'math') {
                  return 2 /* MATH_ML */;
              }
          }
          return ns;
      },
      // https://html.spec.whatwg.org/multipage/parsing.html#parsing-html-fragments
      getTextMode({ tag, ns }) {
          if (ns === 0 /* HTML */) {
              if (tag === 'textarea' || tag === 'title') {
                  return 1 /* RCDATA */;
              }
              if (isRawTextContainer(tag)) {
                  return 2 /* RAWTEXT */;
              }
          }
          return 0 /* DATA */;
      }
  };

  const ignoreSideEffectTags = (node, context) => {
      if (node.type === 1 /* ELEMENT */ &&
          node.tagType === 0 /* ELEMENT */ &&
          (node.tag === 'script' || node.tag === 'style')) {
          context.onError(createDOMCompilerError(59 /* X_IGNORED_SIDE_EFFECT_TAG */, node.loc));
          context.removeNode();
      }
  };

  const DOMNodeTransforms = [
      transformStyle,
      ...( [warnTransitionChildren] )
  ];
  const DOMDirectiveTransforms = {
      cloak: noopDirectiveTransform,
      html: transformVHtml,
      text: transformVText,
      model: transformModel$1,
      on: transformOn$1,
      show: transformShow
  };
  function compile(template, options = {}) {
      return baseCompile(template, extend({}, parserOptions, options, {
          nodeTransforms: [
              // ignore <script> and <tag>
              // this is not put inside DOMNodeTransforms because that list is used
              // by compiler-ssr to generate vnode fallback branches
              ignoreSideEffectTags,
              ...DOMNodeTransforms,
              ...(options.nodeTransforms || [])
          ],
          directiveTransforms: extend({}, DOMDirectiveTransforms, options.directiveTransforms || {}),
          // 静态提升 transform
          transformHoist:  null 
      }));
  }
  function parse(template, options = {}) {
      return baseParse(template, extend({}, parserOptions, options));
  }

  exports.BASE_TRANSITION = BASE_TRANSITION;
  exports.CAMELIZE = CAMELIZE;
  exports.CAPITALIZE = CAPITALIZE;
  exports.CREATE_BLOCK = CREATE_BLOCK;
  exports.CREATE_COMMENT = CREATE_COMMENT;
  exports.CREATE_SLOTS = CREATE_SLOTS;
  exports.CREATE_STATIC = CREATE_STATIC;
  exports.CREATE_TEXT = CREATE_TEXT;
  exports.CREATE_VNODE = CREATE_VNODE;
  exports.DOMDirectiveTransforms = DOMDirectiveTransforms;
  exports.DOMNodeTransforms = DOMNodeTransforms;
  exports.FRAGMENT = FRAGMENT;
  exports.IS_REF = IS_REF;
  exports.KEEP_ALIVE = KEEP_ALIVE;
  exports.MERGE_PROPS = MERGE_PROPS;
  exports.OPEN_BLOCK = OPEN_BLOCK;
  exports.POP_SCOPE_ID = POP_SCOPE_ID;
  exports.PUSH_SCOPE_ID = PUSH_SCOPE_ID;
  exports.RENDER_LIST = RENDER_LIST;
  exports.RENDER_SLOT = RENDER_SLOT;
  exports.RESOLVE_COMPONENT = RESOLVE_COMPONENT;
  exports.RESOLVE_DIRECTIVE = RESOLVE_DIRECTIVE;
  exports.RESOLVE_DYNAMIC_COMPONENT = RESOLVE_DYNAMIC_COMPONENT;
  exports.SET_BLOCK_TRACKING = SET_BLOCK_TRACKING;
  exports.SUSPENSE = SUSPENSE;
  exports.TELEPORT = TELEPORT;
  exports.TO_DISPLAY_STRING = TO_DISPLAY_STRING;
  exports.TO_HANDLERS = TO_HANDLERS;
  exports.TO_HANDLER_KEY = TO_HANDLER_KEY;
  exports.UNREF = UNREF;
  exports.WITH_CTX = WITH_CTX;
  exports.WITH_DIRECTIVES = WITH_DIRECTIVES;
  exports.WITH_SCOPE_ID = WITH_SCOPE_ID;
  exports.advancePositionWithClone = advancePositionWithClone;
  exports.advancePositionWithMutation = advancePositionWithMutation;
  exports.assert = assert;
  exports.baseCompile = baseCompile;
  exports.baseParse = baseParse;
  exports.buildProps = buildProps;
  exports.buildSlots = buildSlots;
  exports.compile = compile;
  exports.createArrayExpression = createArrayExpression;
  exports.createAssignmentExpression = createAssignmentExpression;
  exports.createBlockStatement = createBlockStatement;
  exports.createCacheExpression = createCacheExpression;
  exports.createCallExpression = createCallExpression;
  exports.createCompilerError = createCompilerError;
  exports.createCompoundExpression = createCompoundExpression;
  exports.createConditionalExpression = createConditionalExpression;
  exports.createDOMCompilerError = createDOMCompilerError;
  exports.createForLoopParams = createForLoopParams;
  exports.createFunctionExpression = createFunctionExpression;
  exports.createIfStatement = createIfStatement;
  exports.createInterpolation = createInterpolation;
  exports.createObjectExpression = createObjectExpression;
  exports.createObjectProperty = createObjectProperty;
  exports.createReturnStatement = createReturnStatement;
  exports.createRoot = createRoot;
  exports.createSequenceExpression = createSequenceExpression;
  exports.createSimpleExpression = createSimpleExpression;
  exports.createStructuralDirectiveTransform = createStructuralDirectiveTransform;
  exports.createTemplateLiteral = createTemplateLiteral;
  exports.createTransformContext = createTransformContext;
  exports.createVNodeCall = createVNodeCall;
  exports.decodeHtml = decodeHtml;
  exports.decodeHtmlBrowser = decodeHtmlBrowser;
  exports.findDir = findDir;
  exports.findProp = findProp;
  exports.generate = generate;
  exports.generateCodeFrame = generateCodeFrame;
  exports.getBaseTransformPreset = getBaseTransformPreset;
  exports.getInnerRange = getInnerRange;
  exports.hasDynamicKeyVBind = hasDynamicKeyVBind;
  exports.hasScopeRef = hasScopeRef;
  exports.helperNameMap = helperNameMap;
  exports.injectProp = injectProp;
  exports.isBindKey = isBindKey;
  exports.isBuiltInType = isBuiltInType;
  exports.isCoreComponent = isCoreComponent;
  exports.isMemberExpression = isMemberExpression;
  exports.isSimpleIdentifier = isSimpleIdentifier;
  exports.isSlotOutlet = isSlotOutlet;
  exports.isStaticExp = isStaticExp;
  exports.isTemplateNode = isTemplateNode;
  exports.isText = isText;
  exports.isVSlot = isVSlot;
  exports.locStub = locStub;
  exports.noopDirectiveTransform = noopDirectiveTransform;
  exports.parse = parse;
  exports.parserOptions = parserOptions;
  exports.processExpression = processExpression;
  exports.processFor = processFor;
  exports.processIf = processIf;
  exports.processSlotOutlet = processSlotOutlet;
  exports.registerRuntimeHelpers = registerRuntimeHelpers;
  exports.resolveComponentType = resolveComponentType;
  exports.toValidAssetId = toValidAssetId;
  exports.trackSlotScopes = trackSlotScopes;
  exports.trackVForSlotScopes = trackVForSlotScopes;
  exports.transform = transform;
  exports.transformBind = transformBind;
  exports.transformElement = transformElement;
  exports.transformExpression = transformExpression;
  exports.transformModel = transformModel;
  exports.transformOn = transformOn;
  exports.transformStyle = transformStyle;
  exports.traverseNode = traverseNode;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

}({}));

try {
  if (module) {
    module.exports = VueCompilerDOM;
  }
} catch (e) {}
 
