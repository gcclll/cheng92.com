const NoPriority = 0;
const ImmediatePriority = 1;
const UserBlockingPriority = 2;
const NormalPriority = 3;
const LowPriority = 4;
const IdlePriority = 5;

// Node Heap //////////////////////////////////////////////////////////////////
function push(heap, node) {
  const index = heap.length
  heap.push(node)
  siftUp(heap, node, index)
}

function peek(heap) {
  return heap.length === 0 ? null : heap[0]
}

function pop(heap) {
  if (heap.length === 0) {
    return null
  }

  const first = heap[0]
  const last = heap.pop()
  console.log('pop >> ', { first, last });
  if (last !== first) {
    heap[0] = last
    siftDown(heap, last, 0)
  }
  return first
}


function siftUp(heap, node, i) {
  let index = i;
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1
    const parent = heap[parentIndex]
    if (compare(parent, node) > 0) {
      // 找到比 node.id/sortIndex 更大的节点，然后交换
      heap[parentIndex] = node
      heap[index] = parent
      index = parentIndex
    } else {
      // 排序完成，没有更大的了
      return
    }
  }
}

function siftDown(heap, node, i) {
  let index = i
  const length = heap.length
  const halfLength = length >>> 1
  while (index < halfLength) {
    const leftIndex = (index + 1) * 2 - 1
    const left = heap[leftIndex]
    const rightIndex = leftIndex + 1
    const right = heap[rightIndex]

    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        heap[index] = right
        heap[rightIndex] = node
        index = rightIndex
      } else {
        heap[index] = left
        heap[leftIndex] = node
        index = leftIndex
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;

    } else {
      // Neither child is smaller. Exit.
      return
    }
  }
}

function compare(a, b) {
  // 先比较 sort index 然后比较 task id
  const diff = a.sortIndex - b.sortIndex
  return diff !== 0 ? diff : a.id - b.id
}

// Scheduler //////////////////////////////////////////////////////////////////
// 浏览器环境的 performance 对象, 省略其它判断...
let getCurrentTime = () => performance.now()
// Incrementing id counter. Used to maintain insertion order.
var taskIdCounter = 1;
// Tasks are stored on a min heap
var taskQueue = [];
var timerQueue = [];

// 当前正在执行的任务及其优先级
var currentTask = null;
var currentPriorityLevel = NormalPriority;


// This is set while performing work, to prevent re-entrancy.
var isPerformingWork = false;

// 已经过期的任务是不是正在被执行
var isHostCallbackScheduled = false;
// 还没过期的任务是不是正在被执行
var isHostTimeoutScheduled = false;

function advanceTimers(currentTime) {
  // 检查 timerQueue 中是不是有已经过期了的任务，将它们加入到 taskQueue 中
  // 去优先执行
  let timer = peek(timerQueue)
  while (timer !== null) {
    if (timer.callback === null) {
      // Timer was cancelled
      pop(timerQueue)
    } else if (timer.startTime <= currentTime) {
      // 时间到了，将它加入到 taskQueue
      pop(timerQueue)
      timer.sortIndex = timer.expirationTime
      push(taskQueue, timer)
    } else {
      // 还没过期，依旧等待
      return
    }
    timer = peek(timerQueue)
  }
}

function flushWork(hasTimeRemaining, initialTime) {

  isHostCallbackScheduled = false
  if (isHostTimeoutScheduled) {
    // 如果此时有一个未来时间的任务存在计时中，要取消它，先执行 host callback
    isHostTimeoutScheduled = false
    cancelHostTimeout()
  }

  isPerformingWork = true
  const previousPriorityLevel = currentPriorityLevel
  try {
    return workLoop(hasTimeRemaining, initialTime)
  } finally {
    // 清理工作
    currentTask = null
    currentPriorityLevel = previousPriorityLevel
    isPerformingWork = false
  }
}

function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime
  advanceTimers(currentTime)
  // 取出队列中第一个任务 taskQueue[0]
  currentTask = peek(taskQueue)
  while (currentTask !== null/*省略debug的条件*/) {
    if (currentTask.expirationTime > currentTime && (
      !hasTimeRemaining || shouldYieldToHost()
    )) {
      // 任务还没过期且没有多余的时间去执行它了，所以要退出等下次有充足的时间再说
      break
    }

    // 时间充足
    const callback = currentTask.callback
    if (typeof callback === 'function') {
      currentTask.callback = null
      currentPriorityLevel = currentTask.priorityLevel
      // 已经过期了
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime
      // 执行任务函数
      const continuationCallback = callback(didUserCallbackTimeout)
      // 重新取一次时间， callback 调用可能比较耗时
      currentTime = getCurrentTime()
      if (typeof continuationCallback === 'function') {
        // 如果任务函数本身返回了一个函数，当作下一个任务处理，即 callback 返回的
        // 函数会在它执行退出之后立即被执行
        currentTask.callback = continuationCallback
      } else {
        if (currentTask === peek(taskQueue)) {
          // 执行完之后丢掉
          pop(taskQueue)
        }
      }
      advanceTimers(currentTime)
    } else {
      // 不是函数丢弃掉，pop 就是取第一个出来，然后最后一个放到 heap[0]
      // 进行 siftDown(heap, node, 0)
      pop(taskQueue)
    }
    // 取下一个
    currentTask = peek(taskQueue)
  }
  // 不管有没任务都退出
  if (currentTask !== null) {
    return true
  } else {
    // 到这里说明 taskQueue 清空了，该到 timerQueue 中的任务了
    const firstTimer = peek(timerQueue)
    if (firstTime !== null) {
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime)
    }
    return false
  }
}

function scheduleCallback(priorityLevel, callback, options) {
  var currentTime = getCurrentTime()

  var startTime // 任务执行的开始时间
  if (typeof options === 'object' && options !== null) {
    var delay = options.delay
    if (typeof delay === 'number' && delay > 0) {
      startTime = currentTime + delay
    } else {
      startTime = currentTime
    }
  } else {
    startTime = currentTime
  }

  var timeout // 根据优化级设置超时时间
  switch (priorityLevel) {
    case ImmediatePriority:
      timeout = -1
      break
    case UserBlockingPriority:
      timeout = 250
      break
    case IdlePriority:
      // Max 31 bit integer. The max integer size in V8 for 32-bit systems.
      // Math.pow(2, 30) - 1
      // 0b111111111111111111111111111111
      timeout = 1073741823
      break
    case LowPriority:
      timeout = 10000
      break
    case NormalPriority:
      timeout = 5000
      break
  }

  // 过期时间
  var expirationTime = startTime + timeout

  // 封装新任务
  var newTask = {
    id: taskIdCounter++,
    callback,
    priorityLevel,
    startTime,
    expirationTime,
    sortIndex: -1
  }

  if (startTime > currentTime) {
    // 延迟的任务，应该进入队列排队，用肇始时间做索引
    newTask.sortIndex = startTime
    push(timerQueue, newTask)
    // peek 取队列中第一个任务 queue[0]
    if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
      // queue: [null, newTask] 情况
      // 所有的任务还在排队中，且当前的 newTask 就是最早过期的那个
      if (isHostTimeoutScheduled) {
        cancelHostTimeout()
      } else {
        isHostTimeoutScheduled = true
      }
      requestHostTimeout(handleTimeout, startTime - currentTime)
    }
  } else {
    newTask.sortIndex = expirationTime
    push(taskQueue, newTask)
    // Schedule a host callback, if needed. If we're already performing work,
    // wait until the next time we yield.
    if (!isHostCallbackScheduled && !isPerformingWork) {
      isHostCallbackScheduled = true
      requestHostCallback(flushWork)
    }
  }

  return newTask
}

let isMessageLoopRunning = false;
let taskTimeoutID = -1;
// 当前正在 flush 的任务流
let scheduledHostCallback = null

// scheduler 会周期性的暂停以防主线程上有正在执行的其它工作，例如：用户事件等
// 默认情况下，每一帧会暂停多次。它并不会试图去结合帧边界，因为大多数的工作并不
// 需要这么做，如果有必要的会用 requestAnimationFrame
let yieldInterval = 5;
let deadline = 0;

// TODO: Make this configurable
// TODO: Adjust this based on priority?
const maxYieldInterval = 300;
let needsPaint = false;

// flags
let enableIsInputPending = false

function shouldYieldToHost() {
  if (enableIsInputPending &&
    navigator?.scheduling?.isInputPending !== undefined) {
    const scheduling = navigator.scheduling
    const currentTime = getCurrentTime()
    if (currentTime >= deadline) {
      // 没时间了。我们可能想暂停对主要线程的控制，以便浏览器可以执行高优先级任务。
      // 主要的是渲染和用户输入。如果有悬而未决的渲染或悬而未决的输入，我们就应该暂停。
      // 但如果两者都没有，那么我们可以在保持响应性的同时减少暂停。不管怎样我们最终都
      // 需要暂停，因为可能有一个悬而未决的渲染不是伴随着对“requestPaint”或其他
      // 主线程任务的调用比如网络事件。
      if (needsPaint || scheduling.isInputPending()) {
        // 有一个 pending 的渲染或用户输入，应该暂停等待完成
        return true
      }

      // 没有 pending 输入，仅仅暂停 maxYieldInterval 时长
      return currentTime >= maxYieldInterval
    } else {
      // 在当前帧还有多余的时间，就不该暂停
      return false
    }
  } else {
    // isInputPending = false.
    // 因为没有什么其它的方式可以知道是不是有 pending input，
    // 所以这里要保证在 frame 的最后总是要暂停一下
    return getCurrentTime() >= deadline
  }
}

const performWorkUntilDeadline = () => {
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime()
    deadline = currentTime + yieldInterval
    const hasTimeRemaining = true

    // 如果 scheduler task 异常，退出当前的浏览器 task 以致 error 可以被观测到
    //
    // 注意不要使用 try...catch，而是要让程序继续执行下去
    let hasMoreWork = true
    try {
      hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime)
    } finally {
      if (hasMoreWork) {
        // 无论如何都要执行，看是不是有更多的任务待处理
        schedulePerformWorkUntilDeadline()
      } else {
        // 完成了一轮
        isMessageLoopRunning = false
        // 准备接受下一个 flushWork
        scheduledHostCallback = null
      }
    }
  } else {
    // 标记当前空闲
    isMessageLoopRunning = false
  }

  // 暂停，会使浏览器有机会去渲染，所以要重围
  needsPaint = false
}
// 省略环境的检查，直接使用 DOM 和 Worker 环境，注释中说更
// 偏向用 MessageChannel 是因为 setTimeout 4ms 的问题
// 原本的检查优化级： setImmediate > MessageChannel > setTimeout
let schedulePerformWorkUntilDeadline = (() => {
  const channel = new MessageChannel()
  const port = channel.port2
  channel.port1.onmessage = performWorkUntilDeadline
  return () => port.postMessage(null)
})()

function requestHostCallback(callback/*flushWork*/) {
  // 保存将来恢复用?
  scheduledHostCallback = callback
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true
    schedulePerformWorkUntilDeadline()
  }
}

function cancelHostTimeout() {
  clearTimeout(taskTimeoutID)
  taskTimeoutID = -1
}

function requestHostTimeout(callback, ms) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime())
  }, ms)
}

try {
  module.exports = {
    scheduleCallback,

    // heap
    siftUp,
    siftDown,
    push,
    pop,
    peek,

    // priorities
    NoPriority,
    ImmediatePriority,
    UserBlockingPriority,
    NormalPriority,
    LowPriority,
    IdlePriority
  }
} catch (e) {
  console.warn('not in node environment.')
}
