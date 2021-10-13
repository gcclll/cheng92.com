/**
 * packages/react-dom/src/events
 * @fileOverview
 * @name event.js
 * @author Zhicheng Lee<gccll.love@gmail.com>
 * @license MIT
 */

// SyntheticEvent.js, 所有事件定义
function functionThatReturnsTrue() {
  return true;
}

function functionThatReturnsFalse() {
  return false;
}

// 创建合成事件构造函数
function createSyntheticEvent(Interface) {

  function SyntheticBaseEvent(
    reactName,
    reactEventType,
    targetInst/*Fiber*/,
    nativeEvent/*原生事件对象*/,
    nativeEventTarget/*原生事件目标元素*/,
  ) {
    this._reactName = reactName;
    this._targetInst = targetInst;
    this.type = reactEventType;
    this.nativeEvent = nativeEvent;
    this.target = nativeEventTarget;
    this.currentTarget = null;

    for (const propName in Interface) {
      if (!Interface.hasOwnProperty(propName)) {
        continue;
      }
      const normalize = Interface[propName];
      if (normalize) {
        this[propName] = normalize(nativeEvent);
      } else {
        this[propName] = nativeEvent[propName];
      }
    }

    const defaultPrevented =
      nativeEvent.defaultPrevented != null
        ? nativeEvent.defaultPrevented
        : nativeEvent.returnValue === false;
    if (defaultPrevented) {
      this.isDefaultPrevented = functionThatReturnsTrue;
    } else {
      this.isDefaultPrevented = functionThatReturnsFalse;
    }
    this.isPropagationStopped = functionThatReturnsFalse;
    return this;
  }

  Object.assign(SyntheticBaseEvent.prototype, {
    preventDefault: function() {
      this.defaultPrevented = true;
      const event = this.nativeEvent;
      if (!event) {
        return;
      }

      if (event.preventDefault) {
        event.preventDefault();
        // $FlowFixMe - flow is not aware of `unknown` in IE
      } else if (typeof event.returnValue !== 'unknown') {
        event.returnValue = false;
      }
      this.isDefaultPrevented = functionThatReturnsTrue;
    },

    stopPropagation: function() {
      const event = this.nativeEvent;
      if (!event) {
        return;
      }

      if (event.stopPropagation) {
        event.stopPropagation();
      } else if (typeof event.cancelBubble !== 'unknown') {
        event.cancelBubble = true;
      }

      this.isPropagationStopped = functionThatReturnsTrue;
    },

    persist: function() {
      // Modern event system doesn't use pooling.
    },

    /**
     * Checks if this event should be released back into the pool.
     *
     * @return {boolean} True if this should not be released, false otherwise.
     */
    isPersistent: functionThatReturnsTrue,
  });
  return SyntheticBaseEvent;
}

function props2Obj() {
  let o = {}
  if (Array.isArray(props)) {
    props.forEach(key => o[key] = 0)
  } else {
    o = props
  }
  return o
}

function generateEvent(props) {
  return createSyntheticEvent({
    ...props2Obj(props)
  })
}

const EventInterface = {
  eventPhase: 0,
  bubbles: 0,
  cancelable: 0,
  timeStamp: function(event) {
    return event.timeStamp || Date.now();
  },
  defaultPrevented: 0,
  isTrusted: 0,
};
export const SyntheticEvent = createSyntheticEvent(EventInterface);



// SimpleEventPlugin.js
