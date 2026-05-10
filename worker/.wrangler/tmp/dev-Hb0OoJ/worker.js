var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __publicField = (obj, key, value) => {
  __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  return value;
};

// .wrangler/tmp/bundle-HHNFCI/strip-cf-connecting-ip-header.js
function stripCfConnectingIPHeader(input, init) {
  const request = new Request(input, init);
  request.headers.delete("CF-Connecting-IP");
  return request;
}
__name(stripCfConnectingIPHeader, "stripCfConnectingIPHeader");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    return Reflect.apply(target, thisArg, [
      stripCfConnectingIPHeader.apply(null, argArray)
    ]);
  }
});

// node_modules/unenv/dist/runtime/_internal/utils.mjs
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
__name(PerformanceEntry, "PerformanceEntry");
var PerformanceMark = /* @__PURE__ */ __name(class PerformanceMark2 extends PerformanceEntry {
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
}, "PerformanceMark");
var PerformanceMeasure = class extends PerformanceEntry {
  entryType = "measure";
};
__name(PerformanceMeasure, "PerformanceMeasure");
var PerformanceResourceTiming = class extends PerformanceEntry {
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
__name(PerformanceResourceTiming, "PerformanceResourceTiming");
var PerformanceObserverEntryList = class {
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
__name(PerformanceObserverEntryList, "PerformanceObserverEntryList");
var Performance = class {
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
__name(Performance, "Performance");
var PerformanceObserver = class {
  __unenv__ = true;
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
__name(PerformanceObserver, "PerformanceObserver");
__publicField(PerformanceObserver, "supportedEntryTypes", []);
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
import { Socket } from "node:net";
var ReadStream = class extends Socket {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  isRaw = false;
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
  isTTY = false;
};
__name(ReadStream, "ReadStream");

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
import { Socket as Socket2 } from "node:net";
var WriteStream = class extends Socket2 {
  fd;
  constructor(fd) {
    super();
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  columns = 80;
  rows = 24;
  isTTY = false;
};
__name(WriteStream, "WriteStream");

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class extends EventEmitter {
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return "";
  }
  get versions() {
    return {};
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  ref() {
  }
  unref() {
  }
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: () => 0 });
  mainModule = void 0;
  domain = void 0;
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};
__name(Process, "Process");

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var { exit, platform, nextTick } = getBuiltinModule(
  "node:process"
);
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  nextTick
});
var {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  finalization,
  features,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  on,
  off,
  once,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// worker.js
var worker_default = {
  async fetch(request, env2) {
    const origin = request.headers.get("Origin") || "";
    try {
      return await router(request, env2);
    } catch (e) {
      return cors(json({ detail: String(e) }, 500), origin);
    }
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");
function cors(response, origin) {
  const allowed = [
    "https://onecontract.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000"
  ];
  const o = allowed.includes(origin) ? origin : allowed[0];
  response.headers.set("Access-Control-Allow-Origin", o);
  response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  response.headers.set("Access-Control-Allow-Credentials", "true");
  return response;
}
__name(cors, "cors");
function matchPath(pattern, path) {
  const pp = pattern.split("/").filter(Boolean);
  const ap = path.split("/").filter(Boolean);
  if (pp.length !== ap.length)
    return null;
  const params = {};
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(":"))
      params[pp[i].slice(1)] = ap[i];
    else if (pp[i] !== ap[i])
      return null;
  }
  return params;
}
__name(matchPath, "matchPath");
async function router(request, env2) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";
  const method = request.method;
  const origin = request.headers.get("Origin") || "";
  if (method === "OPTIONS")
    return cors(new Response(null, { status: 204 }), origin);
  const R = /* @__PURE__ */ __name((response) => cors(response, origin), "R");
  if (path === "/api/auth/login" && method === "POST")
    return R(await login(request, env2));
  if (path === "/api/auth/register" && method === "POST")
    return R(await register(request, env2));
  if (path === "/api/auth/user" && method === "GET")
    return R(await getUser(request, env2));
  if (path === "/api/auth/ecp" && method === "POST")
    return R(await ecpAuth(request, env2));
  if (path === "/api/auth/google" && method === "GET")
    return googleLogin(request, env2);
  if (path === "/api/auth/google/callback" && method === "GET")
    return googleCallback(request, env2);
  if (path === "/api/chat/message" && method === "POST")
    return R(await chatMessage(request, env2));
  if (path === "/api/chat/history" && method === "GET")
    return R(await chatHistory(request, env2, url));
  if (path === "/api/chat/clear" && method === "DELETE")
    return R(await chatClear(request, env2, url));
  if (path === "/api/documents/templates" && method === "GET")
    return R(await listTemplates(request, env2));
  if (path === "/api/documents/templates" && method === "POST")
    return R(await createTemplate(request, env2));
  {
    let p;
    if (p = matchPath("/api/documents/templates/:id", path)) {
      if (method === "DELETE")
        return R(await deleteTemplate(request, env2, p));
    }
    if (p = matchPath("/api/documents/templates/:id/use", path)) {
      if (method === "POST")
        return R(await useTemplate(request, env2, p));
    }
    if (p = matchPath("/api/documents/templates/:id/file", path)) {
      if (method === "GET")
        return R(await serveTemplateFile(request, env2, p));
    }
  }
  {
    let p;
    if (path === "/api/documents" && method === "GET")
      return R(await listDocs(request, env2));
    if (path === "/api/documents" && method === "POST")
      return R(await createDoc(request, env2));
    if ((p = matchPath("/api/documents/public/:uuid", path)) && method === "GET")
      return R(await publicRetrieve(request, env2, p));
    if ((p = matchPath("/api/documents/public/:uuid/file", path)) && method === "GET")
      return R(await publicDocFile(request, env2, p));
    if ((p = matchPath("/api/documents/public/:uuid/fill", path)) && method === "POST")
      return R(await publicFill(request, env2, p));
    if ((p = matchPath("/api/documents/public/:uuid/sign", path)) && method === "POST")
      return R(await publicSign(request, env2, p));
    if ((p = matchPath("/api/documents/:id/file", path)) && method === "GET")
      return R(await serveDocFile(request, env2, p));
    if ((p = matchPath("/api/documents/:id", path)) && method === "DELETE")
      return R(await deleteDoc(request, env2, p));
    if ((p = matchPath("/api/documents/:id/org_sign", path)) && method === "POST")
      return R(await orgSign(request, env2, p));
    if ((p = matchPath("/api/documents/:id/close", path)) && method === "POST")
      return R(await closeDoc(request, env2, p));
    if ((p = matchPath("/api/documents/:id/verify", path)) && method === "GET")
      return R(await verifyDoc(request, env2, p));
  }
  if (path === "/health")
    return R(json({ status: "ok", db: "D1", storage: "D1" }));
  return R(json({ detail: "Not found" }, 404));
}
__name(router, "router");
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
__name(b64url, "b64url");
function b64urlDecode(s) {
  return Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}
__name(b64urlDecode, "b64urlDecode");
async function jwtKey(secret, use) {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [use]
  );
}
__name(jwtKey, "jwtKey");
async function signJWT(payload, secret) {
  const h = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const b = b64url(new TextEncoder().encode(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1e3),
    exp: Math.floor(Date.now() / 1e3) + 86400 * 30
  })));
  const sig = await crypto.subtle.sign("HMAC", await jwtKey(secret, "sign"), new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${b64url(sig)}`;
}
__name(signJWT, "signJWT");
async function verifyJWT(token, secret) {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s)
      return null;
    const ok = await crypto.subtle.verify(
      "HMAC",
      await jwtKey(secret, "verify"),
      b64urlDecode(s),
      new TextEncoder().encode(`${h}.${b}`)
    );
    if (!ok)
      return null;
    const p = JSON.parse(new TextDecoder().decode(b64urlDecode(b)));
    if (p.exp && p.exp < Date.now() / 1e3)
      return null;
    return p;
  } catch {
    return null;
  }
}
__name(verifyJWT, "verifyJWT");
async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pwd), "PBKDF2", false, ["deriveBits"]);
  const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" }, key, 256);
  return `${btoa(String.fromCharCode(...salt))}:${btoa(String.fromCharCode(...new Uint8Array(hash)))}`;
}
__name(hashPassword, "hashPassword");
async function verifyPassword(pwd, stored) {
  try {
    const [saltB64, hashB64] = stored.split(":");
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pwd), "PBKDF2", false, ["deriveBits"]);
    const hash = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 1e5, hash: "SHA-256" }, key, 256);
    return btoa(String.fromCharCode(...new Uint8Array(hash))) === hashB64;
  } catch {
    return false;
  }
}
__name(verifyPassword, "verifyPassword");
var CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++)
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(data) {
  let c = 4294967295;
  for (const b of data)
    c = (CRC_TABLE[(c ^ b) & 255] ^ c >>> 8) >>> 0;
  return (c ^ 4294967295) >>> 0;
}
__name(crc32, "crc32");
function readZipEntries(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65536); i--) {
    if (dv.getUint32(i, true) === 101010256) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0)
    return null;
  const cdOff = dv.getUint32(eocd + 16, true);
  const cdCount = dv.getUint16(eocd + 8, true);
  const entries = [];
  let pos = cdOff;
  for (let i = 0; i < cdCount; i++) {
    if (pos + 46 > u8.length || dv.getUint32(pos, true) !== 33639248)
      break;
    const method = dv.getUint16(pos + 10, true);
    const crc = dv.getUint32(pos + 16, true);
    const csize = dv.getUint32(pos + 20, true);
    const usize = dv.getUint32(pos + 24, true);
    const fnLen = dv.getUint16(pos + 28, true);
    const exLen = dv.getUint16(pos + 30, true);
    const cmLen = dv.getUint16(pos + 32, true);
    const lOff = dv.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(u8.slice(pos + 46, pos + 46 + fnLen));
    const lFnLen = dv.getUint16(lOff + 26, true);
    const lExLen = dv.getUint16(lOff + 28, true);
    const dataStart = lOff + 30 + lFnLen + lExLen;
    const compressedData = u8.slice(dataStart, dataStart + csize);
    entries.push({ name, method, crc, csize, usize, compressedData });
    pos += 46 + fnLen + exLen + cmLen;
  }
  return entries;
}
__name(readZipEntries, "readZipEntries");
async function inflate(data) {
  if (data.length === 0)
    return new Uint8Array(0);
  const ds = new DecompressionStream("deflate-raw");
  const w = ds.writable.getWriter(), r = ds.readable.getReader();
  w.write(data.slice());
  w.close();
  const chunks = [];
  for (; ; ) {
    const res = await r.read();
    if (res.done)
      break;
    chunks.push(res.value);
  }
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}
__name(inflate, "inflate");
async function deflate(data) {
  const cs = new CompressionStream("deflate-raw");
  const w = cs.writable.getWriter(), r = cs.readable.getReader();
  w.write(data);
  w.close();
  const chunks = [];
  for (; ; ) {
    const res = await r.read();
    if (res.done)
      break;
    chunks.push(res.value);
  }
  const out = new Uint8Array(chunks.reduce((s, c) => s + c.length, 0));
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}
__name(deflate, "deflate");
function buildZip(entries) {
  const enc = new TextEncoder();
  const locals = [], cdirs = [];
  let off2 = 0;
  for (const { name, method, crc, compressedData, usize } of entries) {
    const nb = enc.encode(name);
    const csize = compressedData.length;
    const lh = new Uint8Array(30 + nb.length), lv = new DataView(lh.buffer);
    lv.setUint32(0, 67324752, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, method, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, csize, true);
    lv.setUint32(22, usize, true);
    lv.setUint16(26, nb.length, true);
    lv.setUint16(28, 0, true);
    lh.set(nb, 30);
    locals.push(lh, compressedData);
    const cd = new Uint8Array(46 + nb.length), cv = new DataView(cd.buffer);
    cv.setUint32(0, 33639248, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, method, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, csize, true);
    cv.setUint32(24, usize, true);
    cv.setUint16(28, nb.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint32(42, off2, true);
    cd.set(nb, 46);
    cdirs.push(cd);
    off2 += 30 + nb.length + csize;
  }
  const cdSz = cdirs.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22), ev = new DataView(eocd.buffer);
  ev.setUint32(0, 101010256, true);
  ev.setUint16(8, cdirs.length, true);
  ev.setUint16(10, cdirs.length, true);
  ev.setUint32(12, cdSz, true);
  ev.setUint32(16, off2, true);
  const all = [...locals, ...cdirs, eocd];
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const a of all) {
    out.set(a, p);
    p += a.length;
  }
  return out.buffer;
}
__name(buildZip, "buildZip");
function xmlEsc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
__name(xmlEsc, "xmlEsc");
function fillXml(xml, fields) {
  xml = xml.replace(/\{\{([^}]+)\}\}/g, (_, k) => k in fields ? xmlEsc(fields[k]) : `{{${k}}}`);
  if (!xml.includes("{{"))
    return xml;
  xml = xml.replace(/(<w:p[ >][\s\S]*?<\/w:p>)/g, (para) => {
    if (!para.includes("{{"))
      return para;
    const texts = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    const joined = texts.join("");
    if (!joined.includes("{{"))
      return para;
    const pPr = (para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [""])[0];
    const firstR = para.match(/<w:r[ >][\s\S]*?<\/w:r>/);
    const rPr = firstR ? (firstR[0].match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [""])[0] : "";
    const filled = joined.replace(/\{\{([^}]+)\}\}/g, (_, k) => k in fields ? xmlEsc(fields[k]) : `{{${k}}}`);
    return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${filled}</w:t></w:r></w:p>`;
  });
  return xml;
}
__name(fillXml, "fillXml");
async function processDocx(buf, fields) {
  if (!fields || !Object.keys(fields).length)
    return buf;
  try {
    const entries = readZipEntries(buf);
    if (!entries)
      return buf;
    const xmlNames = /* @__PURE__ */ new Set(["word/document.xml", "word/header1.xml", "word/footer1.xml", "word/header2.xml", "word/footer2.xml"]);
    const processed = [];
    for (const e of entries) {
      if (xmlNames.has(e.name) && e.csize > 0) {
        let rawBytes = e.compressedData;
        if (e.method === 8)
          rawBytes = await inflate(e.compressedData);
        const xml = new TextDecoder().decode(rawBytes);
        const filledXml = fillXml(xml, fields);
        const filledBytes = new TextEncoder().encode(filledXml);
        const filledCrc = crc32(filledBytes);
        let compressedData = filledBytes;
        let method = 0;
        try {
          const recomp = await deflate(filledBytes);
          if (recomp.length < filledBytes.length) {
            compressedData = recomp;
            method = 8;
          }
        } catch {
        }
        processed.push({ name: e.name, method, crc: filledCrc, compressedData, usize: filledBytes.length });
      } else {
        processed.push({ name: e.name, method: e.method, crc: e.crc, compressedData: e.compressedData, usize: e.usize });
      }
    }
    const result = buildZip(processed);
    if (result.byteLength > 22 && new DataView(result).getUint32(0, true) === 67324752)
      return result;
    return buf;
  } catch {
    return buf;
  }
}
__name(processDocx, "processDocx");
async function extractDocxFields(buf) {
  const entries = readZipEntries(buf);
  if (!entries)
    return [];
  const doc = entries.find((e) => e.name === "word/document.xml");
  if (!doc)
    return [];
  let rawBytes = doc.compressedData;
  if (doc.method === 8)
    rawBytes = await inflate(doc.compressedData);
  const xml = new TextDecoder().decode(rawBytes);
  const found = /* @__PURE__ */ new Set();
  const stripped = xml.replace(/<[^>]+>/g, "");
  for (const [, n] of stripped.matchAll(/\{\{([^}]+)\}\}/g))
    found.add(n.trim());
  for (const [para] of xml.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
    const text = [...para.matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]).join("");
    for (const [, n] of text.matchAll(/\{\{([^}]+)\}\}/g))
      found.add(n.trim());
  }
  return [...found].sort();
}
__name(extractDocxFields, "extractDocxFields");
function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++)
    s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
__name(bufToBase64, "bufToBase64");
function base64ToResponse(b64, fileName, mimeType) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++)
    bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      "Content-Type": mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, max-age=3600"
    }
  });
}
__name(base64ToResponse, "base64ToResponse");
async function authenticate(request, env2) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token)
    return null;
  const payload = await verifyJWT(token, env2.JWT_SECRET);
  if (!payload?.sub)
    return null;
  return env2.DB.prepare("SELECT * FROM users WHERE id = ?").bind(payload.sub).first();
}
__name(authenticate, "authenticate");
async function requireUser(request, env2) {
  const user = await authenticate(request, env2);
  if (!user)
    throw { status: 401, detail: "Authentication required" };
  return user;
}
__name(requireUser, "requireUser");
function requireRole(user, ...roles) {
  if (!roles.includes(user.role))
    throw { status: 403, detail: "Permission denied" };
}
__name(requireRole, "requireRole");
function safeUser(u) {
  return { id: u.id, username: u.username, email: u.email, first_name: u.first_name, last_name: u.last_name, role: u.role };
}
__name(safeUser, "safeUser");
async function docWithSigs(db, doc) {
  const sigs = (await db.prepare("SELECT * FROM document_signatures WHERE document_id = ? ORDER BY signed_at ASC").bind(doc.id).all()).results;
  const { file_data, ...rest } = doc;
  return {
    ...rest,
    signatures: sigs,
    signature_count: sigs.length,
    client_fields: JSON.parse(doc.client_fields || "[]")
  };
}
__name(docWithSigs, "docWithSigs");
async function register(request, env2) {
  const b = await request.json();
  const { email, password, password2, first_name = "", last_name = "", role = "CLIENT" } = b;
  const username = b.username || email.split("@")[0];
  if (!email || !password)
    return json({ detail: "email and password required" }, 400);
  if (password !== password2)
    return json({ detail: "Passwords do not match" }, 400);
  const finalRole = ["CLIENT", "ORGANIZATION"].includes(role) ? role : "CLIENT";
  const exists = await env2.DB.prepare("SELECT id FROM users WHERE email = ? OR username = ?").bind(email, username).first();
  if (exists)
    return json({ detail: "Email or username already taken" }, 400);
  const id = crypto.randomUUID();
  const password_hash = await hashPassword(password);
  await env2.DB.prepare("INSERT INTO users (id,username,email,first_name,last_name,password_hash,role) VALUES (?,?,?,?,?,?,?)").bind(id, username, email, first_name, last_name, password_hash, finalRole).run();
  const user = await env2.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
  const token = await signJWT({ sub: id }, env2.JWT_SECRET);
  return json({ token, user: safeUser(user) }, 201);
}
__name(register, "register");
async function login(request, env2) {
  const { email, password } = await request.json();
  if (!email || !password)
    return json({ detail: "email and password required" }, 400);
  const user = await env2.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user || !user.password_hash || !await verifyPassword(password, user.password_hash))
    return json({ detail: "Invalid credentials" }, 400);
  const token = await signJWT({ sub: user.id }, env2.JWT_SECRET);
  return json({ token, user: safeUser(user) });
}
__name(login, "login");
async function getUser(request, env2) {
  try {
    const user = await requireUser(request, env2);
    return json(safeUser(user));
  } catch (e) {
    return json({ detail: e.detail }, e.status || 401);
  }
}
__name(getUser, "getUser");
async function ecpAuth(request, env2) {
  try {
    const { signed_data, signature_key } = await request.json();
    if (!signed_data || !signature_key)
      return json({ detail: "signed_data and signature_key required" }, 400);
    const bin = atob(signature_key);
    const iinMatch = bin.match(/IIN(\d{12})/);
    if (!iinMatch)
      return json({ detail: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u0432\u043B\u0435\u0447\u044C \u0418\u0418\u041D \u0438\u0437 \u043F\u043E\u0434\u043F\u0438\u0441\u0438. \u0423\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u0432\u044B\u0431\u0440\u0430\u043D\u0430 \u043F\u043E\u0434\u043F\u0438\u0441\u044C \u0441 \u0418\u0418\u041D." }, 400);
    const iin = iinMatch[1];
    const emailMatch = bin.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
    const certEmail = emailMatch ? emailMatch[0] : `${iin}@ecp.kz`;
    let user = await env2.DB.prepare("SELECT * FROM users WHERE username = ? OR (email = ? AND role != 'CLIENT')").bind(`ecp_${iin}`, certEmail).first() ?? await env2.DB.prepare("SELECT * FROM users WHERE username = ?").bind(`ecp_${iin}`).first();
    if (!user) {
      const id = crypto.randomUUID();
      await env2.DB.prepare("INSERT INTO users (id,username,email,role,is_ecp_verified) VALUES (?,?,?,?,1)").bind(id, `ecp_${iin}`, certEmail, "CLIENT").run();
      user = await env2.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    } else if (!user.is_ecp_verified) {
      await env2.DB.prepare("UPDATE users SET is_ecp_verified=1 WHERE id=?").bind(user.id).run();
      user = { ...user, is_ecp_verified: 1 };
    }
    const token = await signJWT({ sub: user.id }, env2.JWT_SECRET);
    return json({ token, user: safeUser(user) });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(ecpAuth, "ecpAuth");
function googleLogin(request, env2) {
  if (!env2.GOOGLE_CLIENT_ID)
    return json({ error: "GOOGLE_CLIENT_ID not set" }, 500);
  const url = new URL(request.url);
  const redirectUri = `${url.origin}/api/auth/google/callback`;
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env2.GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  return Response.redirect(authUrl.toString(), 302);
}
__name(googleLogin, "googleLogin");
async function googleCallback(request, env2) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const fe = env2.FRONTEND_URL || "https://onecontract.pages.dev";
  if (!code)
    return Response.redirect(`${fe}/login?error=no_code`, 302);
  try {
    const redirectUri = `${url.origin}/api/auth/google/callback`;
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: env2.GOOGLE_CLIENT_ID, client_secret: env2.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code" })
    });
    const tokens = await tokenRes.json();
    if (tokens.error)
      return Response.redirect(`${fe}/login?error=${tokens.error}`, 302);
    const info3 = await (await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
    if (!info3.email)
      return Response.redirect(`${fe}/login?error=no_email`, 302);
    let user = await env2.DB.prepare("SELECT * FROM users WHERE email = ?").bind(info3.email).first();
    if (!user) {
      const id = crypto.randomUUID();
      await env2.DB.prepare("INSERT INTO users (id,username,email,first_name,last_name,role) VALUES (?,?,?,?,?,?)").bind(id, info3.email.split("@")[0], info3.email, info3.given_name || "", info3.family_name || "", "CLIENT").run();
      user = await env2.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
    }
    const token = await signJWT({ sub: user.id }, env2.JWT_SECRET);
    return Response.redirect(`${fe}/auth/callback?token=${token}`, 302);
  } catch (e) {
    return Response.redirect(`${fe}/login?error=${encodeURIComponent(String(e))}`, 302);
  }
}
__name(googleCallback, "googleCallback");
async function listDocs(request, env2) {
  try {
    const user = await requireUser(request, env2);
    let rows;
    if (user.role === "SUPERADMIN" || user.role === "ADMIN") {
      rows = (await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents ORDER BY created_at DESC").all()).results;
    } else if (user.role === "ORGANIZATION") {
      rows = (await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all()).results;
    } else {
      rows = (await env2.DB.prepare("SELECT d.id,d.user_id,d.template_id,d.uuid,d.title,d.file_name,d.status,d.org_signature,d.org_signed_at,d.created_at FROM documents d INNER JOIN document_signatures s ON s.document_id=d.id WHERE s.client_id=? ORDER BY d.created_at DESC").bind(user.id).all()).results;
    }
    return json(await Promise.all(rows.map((d) => docWithSigs(env2.DB, d))));
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(listDocs, "listDocs");
async function createDoc(request, env2) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN");
    const form = await request.formData();
    const file = form.get("file");
    const title2 = form.get("title") || file?.name || "Untitled";
    const templateId = form.get("template_id") || null;
    if (!file)
      return json({ detail: "file is required" }, 400);
    const buf = await file.arrayBuffer();
    const fileData = bufToBase64(buf);
    const docUuid = crypto.randomUUID();
    const mimeType = file.type || "application/octet-stream";
    const res = await env2.DB.prepare(
      "INSERT INTO documents (user_id,template_id,uuid,title,file_key,file_name,file_data,file_mime) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(user.id, templateId, docUuid, title2, docUuid, file.name, fileData, mimeType).run();
    const doc = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id = ?").bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env2.DB, doc), 201);
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(createDoc, "createDoc");
async function deleteDoc(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN");
    const doc = await env2.DB.prepare("SELECT id,user_id FROM documents WHERE id = ?").bind(params.id).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    if (doc.user_id !== user.id && user.role !== "SUPERADMIN")
      return json({ detail: "Permission denied" }, 403);
    await env2.DB.prepare("DELETE FROM documents WHERE id = ?").bind(doc.id).run();
    return new Response(null, { status: 204 });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(deleteDoc, "deleteDoc");
async function publicRetrieve(request, env2, params) {
  const doc = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE uuid = ?").bind(params.uuid).first();
  if (!doc)
    return json({ detail: "Not found" }, 404);
  return json(await docWithSigs(env2.DB, doc));
}
__name(publicRetrieve, "publicRetrieve");
async function publicDocFile(request, env2, params) {
  const doc = await env2.DB.prepare("SELECT file_data,file_name,file_mime FROM documents WHERE uuid = ?").bind(params.uuid).first();
  if (!doc || !doc.file_data)
    return json({ detail: "File not found" }, 404);
  const origin = request.headers.get("Origin") || "";
  const resp = base64ToResponse(doc.file_data, doc.file_name, doc.file_mime);
  resp.headers.set("Content-Disposition", `inline; filename="${doc.file_name}"`);
  return cors(resp, origin);
}
__name(publicDocFile, "publicDocFile");
async function publicFill(request, env2, params) {
  try {
    const doc = await env2.DB.prepare("SELECT * FROM documents WHERE uuid = ?").bind(params.uuid).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    if (doc.status === "CLOSED")
      return json({ detail: "Document is closed" }, 400);
    const clientFields = JSON.parse(doc.client_fields || "[]");
    if (!clientFields.length)
      return json({ detail: "No client fields to fill" }, 400);
    const { fields = {} } = await request.json();
    const managerFields = JSON.parse(doc.manager_fields || "{}");
    const allFields = { ...managerFields, ...fields };
    let fileData = doc.file_data;
    if (doc.file_name.toLowerCase().endsWith(".docx")) {
      const buf = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0)).buffer;
      const filled = await processDocx(buf, allFields);
      fileData = bufToBase64(filled);
    }
    await env2.DB.prepare("UPDATE documents SET file_data=?, client_fields='[]' WHERE id=?").bind(fileData, doc.id).run();
    const updated = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?").bind(doc.id).first();
    return json({ detail: "Fields filled successfully", document: await docWithSigs(env2.DB, updated) });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(publicFill, "publicFill");
async function publicSign(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    const doc = await env2.DB.prepare("SELECT * FROM documents WHERE uuid = ?").bind(params.uuid).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    if (doc.status === "CLOSED")
      return json({ detail: "Document is closed" }, 400);
    const exists = await env2.DB.prepare("SELECT id FROM document_signatures WHERE document_id=? AND client_id=?").bind(doc.id, user.id).first();
    if (exists)
      return json({ detail: "You already signed this document" }, 400);
    const { signature } = await request.json();
    if (!signature)
      return json({ detail: "Signature is required" }, 400);
    const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
    await env2.DB.prepare("INSERT INTO document_signatures (document_id,client_id,client_email,client_name,signature) VALUES (?,?,?,?,?)").bind(doc.id, user.id, user.email, name, signature).run();
    const updated = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id = ?").bind(doc.id).first();
    return json({ detail: "Signed successfully", document: await docWithSigs(env2.DB, updated) });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(publicSign, "publicSign");
async function serveDocFile(request, env2, params) {
  try {
    await requireUser(request, env2);
    const doc = await env2.DB.prepare("SELECT file_data,file_name,file_mime FROM documents WHERE id = ?").bind(params.id).first();
    if (!doc || !doc.file_data)
      return json({ detail: "File not found" }, 404);
    const origin = request.headers.get("Origin") || "";
    return cors(base64ToResponse(doc.file_data, doc.file_name, doc.file_mime), origin);
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(serveDocFile, "serveDocFile");
async function orgSign(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN");
    const doc = await env2.DB.prepare("SELECT id,user_id,org_signed_at FROM documents WHERE id=? AND user_id=?").bind(params.id, user.id).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    if (doc.org_signed_at)
      return json({ detail: "Already signed by org" }, 400);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await env2.DB.prepare("UPDATE documents SET org_signature=?,org_signed_at=? WHERE id=?").bind(`ORG_APPROVED_${user.id}`, now, doc.id).run();
    const updated = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id=?").bind(doc.id).first();
    return json(await docWithSigs(env2.DB, updated));
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(orgSign, "orgSign");
async function closeDoc(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN");
    const doc = await env2.DB.prepare("SELECT id,user_id FROM documents WHERE id=? AND user_id=?").bind(params.id, user.id).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    await env2.DB.prepare("UPDATE documents SET status='CLOSED' WHERE id=?").bind(doc.id).run();
    const updated = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,created_at FROM documents WHERE id=?").bind(doc.id).first();
    return json(await docWithSigs(env2.DB, updated));
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(closeDoc, "closeDoc");
async function verifyDoc(request, env2, params) {
  try {
    await requireUser(request, env2);
    const doc = await env2.DB.prepare("SELECT id,org_signed_at FROM documents WHERE id=?").bind(params.id).first();
    if (!doc)
      return json({ detail: "Not found" }, 404);
    const sigs = (await env2.DB.prepare("SELECT * FROM document_signatures WHERE document_id=? ORDER BY signed_at ASC").bind(doc.id).all()).results;
    return json({ org_signed_at: doc.org_signed_at, client_signatures: sigs });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(verifyDoc, "verifyDoc");
async function listTemplates(request, env2) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN", "MANAGER");
    const orgId = user.role === "MANAGER" ? user.organization_id || user.id : user.id;
    const rows = user.role === "SUPERADMIN" ? (await env2.DB.prepare("SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates ORDER BY created_at DESC").all()).results : (await env2.DB.prepare("SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE organization_id=? ORDER BY created_at DESC").bind(orgId).all()).results;
    return json(rows.map((t) => ({ ...t, template_fields: JSON.parse(t.template_fields || "[]") })));
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(listTemplates, "listTemplates");
async function createTemplate(request, env2) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN", "MANAGER");
    const orgId = user.role === "MANAGER" ? user.organization_id || user.id : user.id;
    const form = await request.formData();
    const file = form.get("file");
    const content = form.get("content");
    const title2 = form.get("title") || file?.name || "\u0428\u0430\u0431\u043B\u043E\u043D";
    const description = form.get("description") || "";
    let buf, fileName, mimeType, placeholders = [];
    if (file) {
      buf = await file.arrayBuffer();
      fileName = file.name;
      mimeType = file.type || "application/octet-stream";
      if (fileName.toLowerCase().endsWith(".docx")) {
        placeholders = await extractDocxFields(buf);
      } else {
        const text = new TextDecoder().decode(buf);
        placeholders = [...new Set([...text.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]))].sort();
      }
    } else if (content) {
      const enc = new TextEncoder().encode(content);
      buf = enc.buffer;
      fileName = `${title2}.txt`;
      mimeType = "text/plain";
      placeholders = [...new Set([...content.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[1]))].sort();
    } else {
      return json({ detail: "file or content is required" }, 400);
    }
    const fileData = bufToBase64(buf);
    const key = crypto.randomUUID();
    const res = await env2.DB.prepare(
      "INSERT INTO templates (organization_id,title,description,file_key,file_name,file_data,file_mime,template_fields) VALUES (?,?,?,?,?,?,?,?)"
    ).bind(orgId, title2, description, key, fileName, fileData, mimeType, JSON.stringify(placeholders)).run();
    const tmpl = await env2.DB.prepare("SELECT id,organization_id,title,description,file_name,template_fields,created_at FROM templates WHERE id=?").bind(res.meta.last_row_id).first();
    return json({ ...tmpl, template_fields: JSON.parse(tmpl.template_fields || "[]") }, 201);
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(createTemplate, "createTemplate");
async function deleteTemplate(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN", "MANAGER");
    const orgId = user.role === "MANAGER" ? user.organization_id || user.id : user.id;
    const tmpl = await env2.DB.prepare("SELECT id,organization_id FROM templates WHERE id=?").bind(params.id).first();
    if (!tmpl)
      return json({ detail: "Not found" }, 404);
    if (tmpl.organization_id !== orgId && user.role !== "SUPERADMIN")
      return json({ detail: "Permission denied" }, 403);
    await env2.DB.prepare("DELETE FROM templates WHERE id=?").bind(tmpl.id).run();
    return new Response(null, { status: 204 });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(deleteTemplate, "deleteTemplate");
async function useTemplate(request, env2, params) {
  try {
    const user = await requireUser(request, env2);
    requireRole(user, "ORGANIZATION", "SUPERADMIN", "MANAGER");
    const orgId = user.role === "MANAGER" ? user.organization_id || user.id : user.id;
    const tmpl = await env2.DB.prepare("SELECT * FROM templates WHERE id=?").bind(params.id).first();
    if (!tmpl || !tmpl.file_data)
      return json({ detail: "Template file missing" }, 404);
    const { title: title2 = tmpl.title, fields = {}, client_fields = [] } = await request.json();
    const managerFields = fields;
    let fileData = tmpl.file_data;
    if (tmpl.file_name.toLowerCase().endsWith(".docx")) {
      const buf = Uint8Array.from(atob(fileData), (c) => c.charCodeAt(0)).buffer;
      const filled = await processDocx(buf, managerFields);
      fileData = bufToBase64(filled);
    } else {
      let text = atob(fileData);
      text = text.replace(/\{\{([^}]+)\}\}/g, (_, k) => managerFields[k] ?? `{{${k}}}`);
      fileData = btoa(text);
    }
    const docUuid = crypto.randomUUID();
    const res = await env2.DB.prepare(
      "INSERT INTO documents (user_id,organization_id,template_id,uuid,title,file_key,file_name,file_data,file_mime,client_fields,manager_fields) VALUES (?,?,?,?,?,?,?,?,?,?,?)"
    ).bind(
      user.id,
      orgId,
      tmpl.id,
      docUuid,
      title2,
      docUuid,
      tmpl.file_name,
      fileData,
      tmpl.file_mime || "application/octet-stream",
      JSON.stringify(client_fields),
      JSON.stringify(managerFields)
    ).run();
    const doc = await env2.DB.prepare("SELECT id,user_id,template_id,uuid,title,file_name,status,org_signature,org_signed_at,client_fields,created_at FROM documents WHERE id=?").bind(res.meta.last_row_id).first();
    return json(await docWithSigs(env2.DB, doc), 201);
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(useTemplate, "useTemplate");
async function serveTemplateFile(request, env2, params) {
  try {
    await requireUser(request, env2);
    const tmpl = await env2.DB.prepare("SELECT file_data,file_name,file_mime FROM templates WHERE id=?").bind(params.id).first();
    if (!tmpl || !tmpl.file_data)
      return json({ detail: "File not found" }, 404);
    return cors(base64ToResponse(tmpl.file_data, tmpl.file_name, tmpl.file_mime), request.headers.get("Origin") || "");
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(serveTemplateFile, "serveTemplateFile");
var chatSessions = /* @__PURE__ */ new Map();
async function chatMessage(request, env2) {
  try {
    const user = await requireUser(request, env2);
    const { message, session_id, document_text } = await request.json();
    if (!message?.trim())
      return json({ error: "message required" }, 400);
    const sid = session_id || crypto.randomUUID();
    if (!chatSessions.has(sid))
      chatSessions.set(sid, []);
    const history = chatSessions.get(sid);
    const content = document_text && !history.length ? `[Document]
${String(document_text).slice(0, 3e3)}

[Question]
${message}` : message;
    history.push({ role: "user", content });
    if (!env2.GROQ_API_KEY) {
      history.push({ role: "assistant", content: "GROQ_API_KEY is not configured." });
      return json({ reply: "GROQ_API_KEY is not configured.", session_id: sid });
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${env2.GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 1024,
        messages: [
          { role: "system", content: "You are OneContract AI \u2014 a helpful legal assistant. Respond in the same language as the user." },
          ...history.slice(-18)
        ]
      })
    });
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "No response";
    history.push({ role: "assistant", content: reply });
    if (history.length > 20)
      history.splice(0, history.length - 20);
    return json({ reply, session_id: sid });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(chatMessage, "chatMessage");
async function chatHistory(request, env2, url) {
  try {
    await requireUser(request, env2);
    const sid = url.searchParams.get("session_id") || "";
    return json({ messages: chatSessions.get(sid) || [], session_id: sid });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(chatHistory, "chatHistory");
async function chatClear(request, env2, url) {
  try {
    await requireUser(request, env2);
    const sid = url.searchParams.get("session_id") || "";
    chatSessions.delete(sid);
    return json({ status: "cleared" });
  } catch (e) {
    return json({ detail: e.detail || String(e) }, e.status || 500);
  }
}
__name(chatClear, "chatClear");

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env2, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env2);
  } catch (e) {
    const error3 = reduceError(e);
    return Response.json(error3, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-HHNFCI/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env2, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env2, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env2, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env2, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-HHNFCI/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof __Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
__name(__Facade_ScheduledController__, "__Facade_ScheduledController__");
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env2, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env2, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env2, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env2, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env2, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = (request, env2, ctx) => {
      this.env = env2;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    };
    #dispatcher = (type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    };
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
