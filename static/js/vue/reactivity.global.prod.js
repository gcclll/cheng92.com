var VueReactivity = (function(e) {
  'use strict'
  const t = Object.prototype.toString,
    n = e => (e => t.call(e))(e).slice(8, -1)
  function r(e = !1, t = !1) {
    return function(e, n, r) {
      const c = Reflect.get(e, n, r)
      return t || console.log({ res: c }, 'get'), c
    }
  }
  const c = { get: r() },
    a = new WeakMap(),
    s = new WeakMap()
  return (
    (e.reactive = function(e) {
      return e && e.__v_isReadonly
        ? e
        : (function(e, t, r, c) {
            if (((i = e), null === i || 'object' != typeof i)) return e
            var i
            if (e.__v_raw && (!t || !e.__v_isReactive)) return e
            const o = t ? s : a,
              u = o.get(e)
            if (u) return u
            const f = ((_ = e),
            _.__v_skip || !Object.isExtensible(_)
              ? 0
              : (function(e) {
                  switch (e) {
                    case 'Object':
                    case 'Array':
                      return 1
                    case 'Map':
                    case 'Set':
                    case 'WeakMap':
                    case 'WeakSet':
                      return 2
                    default:
                      return 0
                  }
                })(n(_)))
            var _
            if (0 === f) return e
            const l = new Proxy(e, 2 === f ? c : r)
            return o.set(e, l), l
          })(e, !1, c, {})
    }),
    Object.defineProperty(e, '__esModule', { value: !0 }),
    e
  )
})({})
