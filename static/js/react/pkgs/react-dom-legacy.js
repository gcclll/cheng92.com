// ./scheduler.js
const now = () => performance.now()

function getInstance(key) {
  return key._reactInternals
}
// ReactWorkTags.js
const FunctionComponent = 0;
const ClassComponent = 1;
const IndeterminateComponent = 2; // Before we know whether it is function or class
const HostRoot = 3; // Root of a host tree. Could be nested inside another node.
const HostPortal = 4; // A subtree. Could be an entry point to a different renderer.
const HostComponent = 5;
const HostText = 6;
const Fragment = 7;
const Mode = 8;
const ContextConsumer = 9;
const ContextProvider = 10;
const ForwardRef = 11;
const Profiler = 12;
const SuspenseComponent = 13;
const MemoComponent = 14;
const SimpleMemoComponent = 15;
const LazyComponent = 16;
const IncompleteClassComponent = 17;
const DehydratedFragment = 18;
const SuspenseListComponent = 19;
const ScopeComponent = 21;
const OffscreenComponent = 22;
const LegacyHiddenComponent = 23;
const CacheComponent = 24;

function getPublicInstance(instance) {
  return instance;
}

// ReactFiberLane.new.js
const TotalLanes = 31;
const NoLanes = 0b0000000000000000000000000000000;
const NoLane = 0b0000000000000000000000000000000;
const SyncLane = 0b0000000000000000000000000000001;


// ReactFiberWorkLoop.new.js
let rootDoesHavePassiveEffects = false;
let rootWithPendingPassiveEffects = null;
let pendingPassiveEffectsLanes = NoLanes;
let pendingPassiveProfilerEffects = [];

const NoContext = 0b0000;
const BatchedContext = 0b0001;
const RenderContext = 0b0010;
const CommitContext = 0b0100;
const RetryAfterError = 0b1000;

// Describes where we are in the React execution stack
let executionContext = NoContext;
// The root we're working on
let workInProgressRoot = null;
// The fiber we're working on
let workInProgress = null;
// The lanes we're rendering
let workInProgressRootRenderLanes = NoLanes;

let currentEventTime = NoTimestamp;
let currentEventTransitionLane = NoLanes;

function requestEventTime() {
  if ((executionContext & (RenderContext | CommitContext)) !== NoContext) {
    // We're inside React, so it's fine to read the actual time.
    return now();
  }
  // We're not inside React, so we may be in the middle of a browser event.
  if (currentEventTime !== NoTimestamp) {
    // Use the same start time for all updates until we enter React again.
    return currentEventTime;
  }
  // This is the first update since React yielded. Compute a new start time.
  currentEventTime = now();
  return currentEventTime;
}

function flushSync(fn) {
  try {
    if (fn) {
      return fn()
    } else {
      return undefined
    }
  } finally {
    // TODO ...
  }
}

// ReactUpdateQueue.new.js
const UpdateState = 0;
const ReplaceState = 1;
const ForceUpdate = 2;
const CaptureUpdate = 3;

function createUpdate(eventTime, lane) {
  return {
    eventTime,
    lane,

    tag: UpdateState,
    payload: null,
    callback,

    next: null
  }
}

function enqueueUpdate(fiber, update, lane) {
  const updateQueue = fiber.updateQueue

  if (updateQueue === null) return

  const sharedQueue = updateQueue.shared

  if (isInterleavedUpdate(fiber, lane)) {
    const interleaved = sharedQueue.interleaved
    if (interleaved === null) {
      // 第一个 update, create a circular list, 形成链表
      update.next = update
      pushInterleavedQueue(sharedQueue)
    } else {
      update.next = interleaved.next
      interleaved.next = update
    }
    sharedQueue.interleaved = update
  } else {
    const pending = sharedQueue.pending
    if (pending === null) {
      update.next = update
    } else {
      update.next = pending.next
      pending.next = update
    }
    sharedQueue.pending = update
  }
}

// 简化后
function scheduleUpdateOnFiber(fiber, lane, eventTime) {

  const root = markUpdateLaneFromFiberToRoot(fiber, lane)
  if (root === null) {
    return null
  }

  // markRootSuspended

  ensureRootIsScheduled(root, eventTime)

  // 条件判断是否需要启动同步任务
  if (true) {
    resetRenderTimer()
    flushSyncCallbacksOnlyInLegacyMode()
  }

  return root

}
// ReactFiberReconciler.new.js

function updateContainer(element, container, parentComponent, callback) {
  const current = container.current
  const eventTime = requestEventTime()
  const lane = NoLane /*test*/

  const context = {} /*test*/
  if (container.context === null) {
    container.context = context
  } else {
    container.pendingContext = context
  }

  const update = createUpdate(eventTime, lane)
  update.payload = { element }

  callback = callback ?? null
  if (callback !== null) {
    update.callback = callback
  }

  enqueueUpdate(current, update, lane)
  const root = scheduleUpdateOnFiber(current, lane, eventTime)
  if (root !== null) {
    // entangleTransitions(root, current, lane)
  }
  return lane
}

function getPublicRootInstance(container) {
  const containerFiber = container.current
  if (!containerFiber.child) return null

  switch (containerFiber.child.tag) {
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode)
    default:
      return containerFiber.child.stateNode
  }
}

function legacyRenderSubtreeIntoContainer(
  parentComponent,
  children,
  container,
  forceHydrate,
  callback
) {
  let root = container._reactRootContainer
  let firberRoot

  if (!root) {
    // 初始 mount
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate
    )

    firberRoot = root
    callback = setCallback(callback, firberRoot)
    flushSync(() => updateContainer(children, fiberRoot, parentComponent, callback))
  } else {
    fiberRoot = root
    callback = setCallback(callback, firberRoot)
    updateContainer(children, fiberRoot, parentComponent, callback)
  }
  return getPublicRootInstance(fiberRoot)
}

function setCallback(callback, fiberRoot) {
  if (typeof callback === 'function') {
    const originalCallback = callback
    return function() {
      const instance = getPublicRootInstance(fiberRoot)
      originalCallback.call(instance)
    }
  }
  return callback
}

function render(element, container, callback) {
  // TODO 检测 container 合法性

  return legacyRenderSubtreeIntoContainer(
    null,
    element,
    container,
    false,
    callback
  )
}

try {
  module.exports = {
    render
  }
} catch (e) {
  console.warn('[react-dom] not in node environment.')
}
