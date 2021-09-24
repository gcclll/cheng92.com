let i = 0

// ---- worker.js -----------------------------
// Shared worker script
onconnect = function(e) {
  var port = e.ports[0];
  var taskStart = 0, taskEnd = 0, result
  port.onmessage = function(e) {
    // Time execution in worker
    taskStart = performance.now();
    result = fib(100);
    taskEnd = performance.now();
  }

  // Send results and epoch-relative timestamps to another context
  port.postMessage({
    'task': 'Some worker task',
    'start_time': taskStart + performance.timeOrigin,
    'end_time': taskEnd + performance.timeOrigin,
    'result': result
  });
}


const cached = new Map()
function fib(n) {
  if (cached.has(n))
    return cached.get(n)

  if (n < 2) {
    return 1
  }

  const val = fib(n - 1) + fib(n - 2)
  cached.set(n, val)
  return val
}

