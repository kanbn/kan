// ../../node_modules/serwist/dist/chunks/waitUntil-BHDx3Rgo.js
var _cacheNameDetails = {
  googleAnalytics: "googleAnalytics",
  precache: "precache-v2",
  prefix: "serwist",
  runtime: "runtime",
  suffix: typeof registration !== "undefined" ? registration.scope : ""
};
var _createCacheName = (cacheName) => {
  return [
    _cacheNameDetails.prefix,
    cacheName,
    _cacheNameDetails.suffix
  ].filter((value) => value && value.length > 0).join("-");
};
var eachCacheNameDetail = (fn) => {
  for (const key of Object.keys(_cacheNameDetails)) fn(key);
};
var cacheNames = {
  updateDetails: (details) => {
    eachCacheNameDetail((key) => {
      const detail = details[key];
      if (typeof detail === "string") _cacheNameDetails[key] = detail;
    });
  },
  getGoogleAnalyticsName: (userCacheName) => {
    return userCacheName || _createCacheName(_cacheNameDetails.googleAnalytics);
  },
  getPrecacheName: (userCacheName) => {
    return userCacheName || _createCacheName(_cacheNameDetails.precache);
  },
  getPrefix: () => {
    return _cacheNameDetails.prefix;
  },
  getRuntimeName: (userCacheName) => {
    return userCacheName || _createCacheName(_cacheNameDetails.runtime);
  },
  getSuffix: () => {
    return _cacheNameDetails.suffix;
  }
};
var supportStatus;
function canConstructResponseFromBodyStream() {
  if (supportStatus === void 0) {
    const testResponse = new Response("");
    if ("body" in testResponse) try {
      new Response(testResponse.body);
      supportStatus = true;
    } catch {
      supportStatus = false;
    }
    supportStatus = false;
  }
  return supportStatus;
}
var messages = {
  "invalid-value": ({ paramName, validValueDescription, value }) => {
    if (!paramName || !validValueDescription) throw new Error(`Unexpected input to 'invalid-value' error.`);
    return `The '${paramName}' parameter was given a value with an unexpected value. ${validValueDescription} Received a value of ${JSON.stringify(value)}.`;
  },
  "not-an-array": ({ moduleName, className, funcName, paramName }) => {
    if (!moduleName || !className || !funcName || !paramName) throw new Error(`Unexpected input to 'not-an-array' error.`);
    return `The parameter '${paramName}' passed into '${moduleName}.${className}.${funcName}()' must be an array.`;
  },
  "incorrect-type": ({ expectedType, paramName, moduleName, className, funcName }) => {
    if (!expectedType || !paramName || !moduleName || !funcName) throw new Error(`Unexpected input to 'incorrect-type' error.`);
    return `The parameter '${paramName}' passed into '${moduleName}.${className ? `${className}.` : ""}${funcName}()' must be of type ${expectedType}.`;
  },
  "incorrect-class": ({ expectedClassName, paramName, moduleName, className, funcName, isReturnValueProblem }) => {
    if (!expectedClassName || !moduleName || !funcName) throw new Error(`Unexpected input to 'incorrect-class' error.`);
    const classNameStr = className ? `${className}.` : "";
    if (isReturnValueProblem) return `The return value from '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
    return `The parameter '${paramName}' passed into '${moduleName}.${classNameStr}${funcName}()' must be an instance of class ${expectedClassName}.`;
  },
  "missing-a-method": ({ expectedMethod, paramName, moduleName, className, funcName }) => {
    if (!expectedMethod || !paramName || !moduleName || !className || !funcName) throw new Error(`Unexpected input to 'missing-a-method' error.`);
    return `${moduleName}.${className}.${funcName}() expected the '${paramName}' parameter to expose a '${expectedMethod}' method.`;
  },
  "add-to-cache-list-unexpected-type": ({ entry }) => {
    return `An unexpected entry was passed to 'serwist.Serwist.addToPrecacheList()' The entry '${JSON.stringify(entry)}' isn't supported. You must supply an array of strings with one or more characters, objects with a url property or Request objects.`;
  },
  "add-to-cache-list-conflicting-entries": ({ firstEntry, secondEntry }) => {
    if (!firstEntry || !secondEntry) throw new Error("Unexpected input to 'add-to-cache-list-duplicate-entries' error.");
    return `Two of the entries passed to 'serwist.Serwist.addToPrecacheList()' had the URL ${firstEntry} but different revision details. Serwist is unable to cache and version the asset correctly. Please remove one of the entries.`;
  },
  "plugin-error-request-will-fetch": ({ thrownErrorMessage }) => {
    if (!thrownErrorMessage) throw new Error("Unexpected input to 'plugin-error-request-will-fetch', error.");
    return `An error was thrown by a plugin's 'requestWillFetch()' method. The thrown error message was: '${thrownErrorMessage}'.`;
  },
  "invalid-cache-name": ({ cacheNameId, value }) => {
    if (!cacheNameId) throw new Error(`Expected a 'cacheNameId' for error 'invalid-cache-name'`);
    return `You must provide a name containing at least one character for setCacheDetails({${cacheNameId}: '...'}). Received a value of '${JSON.stringify(value)}'`;
  },
  "unregister-route-but-not-found-with-method": ({ method }) => {
    if (!method) throw new Error("Unexpected input to 'unregister-route-but-not-found-with-method' error.");
    return `The route you're trying to unregister was not  previously registered for the method type '${method}'.`;
  },
  "unregister-route-route-not-registered": () => {
    return "The route you're trying to unregister was not previously registered.";
  },
  "queue-replay-failed": ({ name }) => {
    return `Replaying the background sync queue '${name}' failed.`;
  },
  "duplicate-queue-name": ({ name }) => {
    return `The queue name '${name}' is already being used. All instances of 'serwist.BackgroundSyncQueue' must be given unique names.`;
  },
  "expired-test-without-max-age": ({ methodName, paramName }) => {
    return `The '${methodName}()' method can only be used when the '${paramName}' is used in the constructor.`;
  },
  "unsupported-route-type": ({ moduleName, className, funcName, paramName }) => {
    return `The supplied '${paramName}' parameter was an unsupported type. Please check the docs for ${moduleName}.${className}.${funcName} for valid input types.`;
  },
  "not-array-of-class": ({ value, expectedClass, moduleName, className, funcName, paramName }) => {
    return `The supplied '${paramName}' parameter must be an array of '${expectedClass}' objects. Received '${JSON.stringify(value)},'. Please check the call to ${moduleName}.${className}.${funcName}() to fix the issue.`;
  },
  "max-entries-or-age-required": ({ moduleName, className, funcName }) => {
    return `You must define either 'config.maxEntries' or 'config.maxAgeSeconds' in '${moduleName}.${className}.${funcName}'`;
  },
  "statuses-or-headers-required": ({ moduleName, className, funcName }) => {
    return `You must define either 'config.statuses' or 'config.headers' in '${moduleName}.${className}.${funcName}'`;
  },
  "invalid-string": ({ moduleName, funcName, paramName }) => {
    if (!paramName || !moduleName || !funcName) throw new Error(`Unexpected input to 'invalid-string' error.`);
    return `When using strings, the '${paramName}' parameter must start with 'http' (for cross-origin matches) or '/' (for same-origin matches). Please see the docs for ${moduleName}.${funcName}() for more info.`;
  },
  "channel-name-required": () => {
    return "You must provide a channelName to construct a BroadcastCacheUpdate instance.";
  },
  "invalid-responses-are-same-args": () => {
    return "The arguments passed into responsesAreSame() appear to be invalid. Please ensure valid Responses are used.";
  },
  "expire-custom-caches-only": () => {
    return "You must provide a 'cacheName' property when using the expiration plugin with a runtime caching strategy.";
  },
  "unit-must-be-bytes": ({ normalizedRangeHeader }) => {
    if (!normalizedRangeHeader) throw new Error(`Unexpected input to 'unit-must-be-bytes' error.`);
    return `The 'unit' portion of the Range header must be set to 'bytes'. The Range header provided was "${normalizedRangeHeader}"`;
  },
  "single-range-only": ({ normalizedRangeHeader }) => {
    if (!normalizedRangeHeader) throw new Error(`Unexpected input to 'single-range-only' error.`);
    return `Multiple ranges are not supported. Please use a  single start value, and optional end value. The Range header provided was "${normalizedRangeHeader}"`;
  },
  "invalid-range-values": ({ normalizedRangeHeader }) => {
    if (!normalizedRangeHeader) throw new Error(`Unexpected input to 'invalid-range-values' error.`);
    return `The Range header is missing both start and end values. At least one of those values is needed. The Range header provided was "${normalizedRangeHeader}"`;
  },
  "no-range-header": () => {
    return "No Range header was found in the Request provided.";
  },
  "range-not-satisfiable": ({ size, start, end }) => {
    return `The start (${start}) and end (${end}) values in the Range are not satisfiable by the cached response, which is ${size} bytes.`;
  },
  "attempt-to-cache-non-get-request": ({ url, method }) => {
    return `Unable to cache '${url}' because it is a '${method}' request and only 'GET' requests can be cached.`;
  },
  "cache-put-with-no-response": ({ url }) => {
    return `There was an attempt to cache '${url}' but the response was not defined.`;
  },
  "no-response": ({ url, error }) => {
    let message = `The strategy could not generate a response for '${url}'.`;
    if (error) message += ` The underlying error is ${error}.`;
    return message;
  },
  "bad-precaching-response": ({ url, status }) => {
    return `The precaching request for '${url}' failed${status ? ` with an HTTP status of ${status}.` : "."}`;
  },
  "non-precached-url": ({ url }) => {
    return `'createHandlerBoundToURL("${url}")' was called, but that URL is not precached. Please pass in a URL that is precached instead.`;
  },
  "add-to-cache-list-conflicting-integrities": ({ url }) => {
    return `Two of the entries passed to 'serwist.Serwist.addToPrecacheList()' had the URL ${url} with different integrity values. Please remove one of them.`;
  },
  "missing-precache-entry": ({ cacheName, url }) => {
    return `Unable to find a precached response in ${cacheName} for ${url}.`;
  },
  "cross-origin-copy-response": ({ origin }) => {
    return `'@serwist/core.copyResponse()' can only be used with same-origin responses. It was passed a response with origin ${origin}.`;
  },
  "opaque-streams-source": ({ type }) => {
    const message = `One of the '@serwist/streams' sources resulted in an '${type}' response.`;
    if (type === "opaqueredirect") return `${message} Please do not use a navigation request that results in a redirect as a source.`;
    return `${message} Please ensure your sources are CORS-enabled.`;
  }
};
var generatorFunction = (code, details = {}) => {
  const message = messages[code];
  if (!message) throw new Error(`Unable to find message for code '${code}'.`);
  return message(details);
};
var messageGenerator = false ? fallback : generatorFunction;
var SerwistError = class extends Error {
  details;
  /**
  *
  * @param errorCode The error code that
  * identifies this particular error.
  * @param details Any relevant arguments
  * that will help developers identify issues should
  * be added as a key on the context object.
  */
  constructor(errorCode, details) {
    const message = messageGenerator(errorCode, details);
    super(message);
    this.name = errorCode;
    this.details = details;
  }
};
var isArray = (value, details) => {
  if (!Array.isArray(value)) throw new SerwistError("not-an-array", details);
};
var hasMethod = (object, expectedMethod, details) => {
  if (typeof object[expectedMethod] !== "function") {
    details.expectedMethod = expectedMethod;
    throw new SerwistError("missing-a-method", details);
  }
};
var isType = (object, expectedType, details) => {
  if (typeof object !== expectedType) {
    details.expectedType = expectedType;
    throw new SerwistError("incorrect-type", details);
  }
};
var isInstance = (object, expectedClass, details) => {
  if (!(object instanceof expectedClass)) {
    details.expectedClassName = expectedClass.name;
    throw new SerwistError("incorrect-class", details);
  }
};
var isOneOf = (value, validValues, details) => {
  if (!validValues.includes(value)) {
    details.validValueDescription = `Valid values are ${JSON.stringify(validValues)}.`;
    throw new SerwistError("invalid-value", details);
  }
};
var isArrayOfClass = (value, expectedClass, details) => {
  const error = new SerwistError("not-array-of-class", details);
  if (!Array.isArray(value)) throw error;
  for (const item of value) if (!(item instanceof expectedClass)) throw error;
};
var finalAssertExports = false ? null : {
  hasMethod,
  isArray,
  isInstance,
  isOneOf,
  isType,
  isArrayOfClass
};
var getFriendlyURL = (url) => {
  return new URL(String(url), location.href).href.replace(new RegExp(`^${location.origin}`), "");
};
var logger = typeof self === "undefined" ? null : (() => {
  if (!("__WB_DISABLE_DEV_LOGS" in globalThis)) self.__WB_DISABLE_DEV_LOGS = false;
  let inGroup = false;
  const methodToColorMap = {
    debug: "#7f8c8d",
    log: "#2ecc71",
    warn: "#f39c12",
    error: "#c0392b",
    groupCollapsed: "#3498db",
    groupEnd: null
  };
  const print = (method, args) => {
    if (self.__WB_DISABLE_DEV_LOGS) return;
    if (method === "groupCollapsed") {
      if (typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)) {
        console[method](...args);
        return;
      }
    }
    const styles = [
      `background: ${methodToColorMap[method]}`,
      "border-radius: 0.5em",
      "color: white",
      "font-weight: bold",
      "padding: 2px 0.5em"
    ];
    const logPrefix = inGroup ? [] : ["%cserwist", styles.join(";")];
    console[method](...logPrefix, ...args);
    if (method === "groupCollapsed") inGroup = true;
    if (method === "groupEnd") inGroup = false;
  };
  return Object.keys(methodToColorMap).reduce((api, method) => {
    api[method] = (...args) => {
      print(method, args);
    };
    return api;
  }, {});
})();
function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
var quotaErrorCallbacks = /* @__PURE__ */ new Set();
function stripParams(fullURL, ignoreParams) {
  const strippedURL = new URL(fullURL);
  for (const param of ignoreParams) strippedURL.searchParams.delete(param);
  return strippedURL.href;
}
async function cacheMatchIgnoreParams(cache, request, ignoreParams, matchOptions) {
  const strippedRequestURL = stripParams(request.url, ignoreParams);
  if (request.url === strippedRequestURL) return cache.match(request, matchOptions);
  const keysOptions = {
    ...matchOptions,
    ignoreSearch: true
  };
  const cacheKeys = await cache.keys(request, keysOptions);
  for (const cacheKey of cacheKeys) if (strippedRequestURL === stripParams(cacheKey.url, ignoreParams)) return cache.match(cacheKey, matchOptions);
}
var Deferred = class {
  promise;
  resolve;
  reject;
  /**
  * Creates a promise and exposes its resolve and reject functions as methods.
  */
  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
};
var executeQuotaErrorCallbacks = async () => {
  if (true) logger.log(`About to run ${quotaErrorCallbacks.size} callbacks to clean up caches.`);
  for (const callback of quotaErrorCallbacks) {
    await callback();
    if (true) logger.log(callback, "is complete.");
  }
  if (true) logger.log("Finished running callbacks.");
};
var SUBSTRING_TO_FIND = "-precache-";
var deleteOutdatedCaches = async (currentPrecacheName, substringToFind = SUBSTRING_TO_FIND) => {
  const cacheNamesToDelete = (await self.caches.keys()).filter((cacheName) => {
    return cacheName.includes(substringToFind) && cacheName.includes(self.registration.scope) && cacheName !== currentPrecacheName;
  });
  await Promise.all(cacheNamesToDelete.map((cacheName) => self.caches.delete(cacheName)));
  return cacheNamesToDelete;
};
var cleanupOutdatedCaches = (cacheName) => {
  self.addEventListener("activate", (event) => {
    event.waitUntil(deleteOutdatedCaches(cacheNames.getPrecacheName(cacheName)).then((cachesDeleted) => {
      if (true) {
        if (cachesDeleted.length > 0) logger.log("The following out-of-date precaches were cleaned up automatically:", cachesDeleted);
      }
    }));
  });
};
var clientsClaim = () => {
  self.addEventListener("activate", () => self.clients.claim());
};
var waitUntil = (event, asyncFn) => {
  const returnPromise = asyncFn();
  event.waitUntil(returnPromise);
  return returnPromise;
};

// ../../node_modules/idb/build/index.js
var instanceOfAny = (object, constructors) => constructors.some((c) => object instanceof c);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(this.request);
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
function openDB(name, version, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name, version);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
function deleteDB(name, { blocked } = {}) {
  const request = indexedDB.deleteDatabase(name);
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event
    ));
  }
  return wrap(request).then(() => void 0);
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
var advanceMethodProps = ["continue", "continuePrimaryKey", "advance"];
var methodMap = {};
var advanceResults = /* @__PURE__ */ new WeakMap();
var ittrProxiedCursorToOriginalProxy = /* @__PURE__ */ new WeakMap();
var cursorIteratorTraps = {
  get(target, prop) {
    if (!advanceMethodProps.includes(prop))
      return target[prop];
    let cachedFunc = methodMap[prop];
    if (!cachedFunc) {
      cachedFunc = methodMap[prop] = function(...args) {
        advanceResults.set(this, ittrProxiedCursorToOriginalProxy.get(this)[prop](...args));
      };
    }
    return cachedFunc;
  }
};
async function* iterate(...args) {
  let cursor = this;
  if (!(cursor instanceof IDBCursor)) {
    cursor = await cursor.openCursor(...args);
  }
  if (!cursor)
    return;
  cursor = cursor;
  const proxiedCursor = new Proxy(cursor, cursorIteratorTraps);
  ittrProxiedCursorToOriginalProxy.set(proxiedCursor, cursor);
  reverseTransformCache.set(proxiedCursor, unwrap(cursor));
  while (cursor) {
    yield proxiedCursor;
    cursor = await (advanceResults.get(proxiedCursor) || cursor.continue());
    advanceResults.delete(proxiedCursor);
  }
}
function isIteratorProp(target, prop) {
  return prop === Symbol.asyncIterator && instanceOfAny(target, [IDBIndex, IDBObjectStore, IDBCursor]) || prop === "iterate" && instanceOfAny(target, [IDBIndex, IDBObjectStore]);
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get(target, prop, receiver) {
    if (isIteratorProp(target, prop))
      return iterate;
    return oldTraps.get(target, prop, receiver);
  },
  has(target, prop) {
    return isIteratorProp(target, prop) || oldTraps.has(target, prop);
  }
}));

// ../../node_modules/serwist/dist/chunks/printInstallDetails-c9A08ZVZ.js
var copyResponse = async (response, modifier) => {
  let origin = null;
  if (response.url) origin = new URL(response.url).origin;
  if (origin !== self.location.origin) throw new SerwistError("cross-origin-copy-response", { origin });
  const clonedResponse = response.clone();
  const responseInit = {
    headers: new Headers(clonedResponse.headers),
    status: clonedResponse.status,
    statusText: clonedResponse.statusText
  };
  const modifiedResponseInit = modifier ? modifier(responseInit) : responseInit;
  const body = canConstructResponseFromBodyStream() ? clonedResponse.body : await clonedResponse.blob();
  return new Response(body, modifiedResponseInit);
};
var disableDevLogs = () => {
  self.__WB_DISABLE_DEV_LOGS = true;
};
var BACKGROUND_SYNC_DB_VERSION = 3;
var BACKGROUND_SYNC_DB_NAME = "serwist-background-sync";
var REQUEST_OBJECT_STORE_NAME = "requests";
var QUEUE_NAME_INDEX = "queueName";
var BackgroundSyncQueueDb = class {
  _db = null;
  /**
  * Add QueueStoreEntry to underlying db.
  *
  * @param entry
  */
  async addEntry(entry) {
    const tx = (await this.getDb()).transaction(REQUEST_OBJECT_STORE_NAME, "readwrite", { durability: "relaxed" });
    await tx.store.add(entry);
    await tx.done;
  }
  /**
  * Returns the first entry id in the ObjectStore.
  *
  * @returns
  */
  async getFirstEntryId() {
    return (await (await this.getDb()).transaction(REQUEST_OBJECT_STORE_NAME).store.openCursor())?.value.id;
  }
  /**
  * Get all the entries filtered by index
  *
  * @param queueName
  * @returns
  */
  async getAllEntriesByQueueName(queueName) {
    const results = await (await this.getDb()).getAllFromIndex(REQUEST_OBJECT_STORE_NAME, QUEUE_NAME_INDEX, IDBKeyRange.only(queueName));
    return results ? results : [];
  }
  /**
  * Returns the number of entries filtered by index
  *
  * @param queueName
  * @returns
  */
  async getEntryCountByQueueName(queueName) {
    return (await this.getDb()).countFromIndex(REQUEST_OBJECT_STORE_NAME, QUEUE_NAME_INDEX, IDBKeyRange.only(queueName));
  }
  /**
  * Deletes a single entry by id.
  *
  * @param id the id of the entry to be deleted
  */
  async deleteEntry(id) {
    await (await this.getDb()).delete(REQUEST_OBJECT_STORE_NAME, id);
  }
  /**
  *
  * @param queueName
  * @returns
  */
  async getFirstEntryByQueueName(queueName) {
    return await this.getEndEntryFromIndex(IDBKeyRange.only(queueName), "next");
  }
  /**
  *
  * @param queueName
  * @returns
  */
  async getLastEntryByQueueName(queueName) {
    return await this.getEndEntryFromIndex(IDBKeyRange.only(queueName), "prev");
  }
  /**
  * Returns either the first or the last entries, depending on direction.
  * Filtered by index.
  *
  * @param direction
  * @param query
  * @returns
  * @private
  */
  async getEndEntryFromIndex(query, direction) {
    return (await (await this.getDb()).transaction(REQUEST_OBJECT_STORE_NAME).store.index(QUEUE_NAME_INDEX).openCursor(query, direction))?.value;
  }
  /**
  * Returns an open connection to the database.
  *
  * @private
  */
  async getDb() {
    if (!this._db) this._db = await openDB(BACKGROUND_SYNC_DB_NAME, BACKGROUND_SYNC_DB_VERSION, { upgrade: this._upgradeDb });
    return this._db;
  }
  /**
  * Upgrades QueueDB
  *
  * @param db
  * @param oldVersion
  * @private
  */
  _upgradeDb(db, oldVersion) {
    if (oldVersion > 0 && oldVersion < BACKGROUND_SYNC_DB_VERSION) {
      if (db.objectStoreNames.contains(REQUEST_OBJECT_STORE_NAME)) db.deleteObjectStore(REQUEST_OBJECT_STORE_NAME);
    }
    db.createObjectStore(REQUEST_OBJECT_STORE_NAME, {
      autoIncrement: true,
      keyPath: "id"
    }).createIndex(QUEUE_NAME_INDEX, QUEUE_NAME_INDEX, { unique: false });
  }
};
var BackgroundSyncQueueStore = class {
  _queueName;
  _queueDb;
  /**
  * Associates this instance with a Queue instance, so entries added can be
  * identified by their queue name.
  *
  * @param queueName
  */
  constructor(queueName) {
    this._queueName = queueName;
    this._queueDb = new BackgroundSyncQueueDb();
  }
  /**
  * Append an entry last in the queue.
  *
  * @param entry
  */
  async pushEntry(entry) {
    if (true) {
      finalAssertExports.isType(entry, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueueStore",
        funcName: "pushEntry",
        paramName: "entry"
      });
      finalAssertExports.isType(entry.requestData, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueueStore",
        funcName: "pushEntry",
        paramName: "entry.requestData"
      });
    }
    delete entry.id;
    entry.queueName = this._queueName;
    await this._queueDb.addEntry(entry);
  }
  /**
  * Prepend an entry first in the queue.
  *
  * @param entry
  */
  async unshiftEntry(entry) {
    if (true) {
      finalAssertExports.isType(entry, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueueStore",
        funcName: "unshiftEntry",
        paramName: "entry"
      });
      finalAssertExports.isType(entry.requestData, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueueStore",
        funcName: "unshiftEntry",
        paramName: "entry.requestData"
      });
    }
    const firstId = await this._queueDb.getFirstEntryId();
    if (firstId) entry.id = firstId - 1;
    else delete entry.id;
    entry.queueName = this._queueName;
    await this._queueDb.addEntry(entry);
  }
  /**
  * Removes and returns the last entry in the queue matching the `queueName`.
  *
  * @returns
  */
  async popEntry() {
    return this._removeEntry(await this._queueDb.getLastEntryByQueueName(this._queueName));
  }
  /**
  * Removes and returns the first entry in the queue matching the `queueName`.
  *
  * @returns
  */
  async shiftEntry() {
    return this._removeEntry(await this._queueDb.getFirstEntryByQueueName(this._queueName));
  }
  /**
  * Returns all entries in the store matching the `queueName`.
  *
  * @returns
  */
  async getAll() {
    return await this._queueDb.getAllEntriesByQueueName(this._queueName);
  }
  /**
  * Returns the number of entries in the store matching the `queueName`.
  *
  * @returns
  */
  async size() {
    return await this._queueDb.getEntryCountByQueueName(this._queueName);
  }
  /**
  * Deletes the entry for the given ID.
  *
  * WARNING: this method does not ensure the deleted entry belongs to this
  * queue (i.e. matches the `queueName`). But this limitation is acceptable
  * as this class is not publicly exposed. An additional check would make
  * this method slower than it needs to be.
  *
  * @param id
  */
  async deleteEntry(id) {
    await this._queueDb.deleteEntry(id);
  }
  /**
  * Removes and returns the first or last entry in the queue (based on the
  * `direction` argument) matching the `queueName`.
  *
  * @returns
  * @private
  */
  async _removeEntry(entry) {
    if (entry) await this.deleteEntry(entry.id);
    return entry;
  }
};
var serializableProperties = [
  "method",
  "referrer",
  "referrerPolicy",
  "mode",
  "credentials",
  "cache",
  "redirect",
  "integrity",
  "keepalive"
];
var StorableRequest = class StorableRequest2 {
  _requestData;
  /**
  * Converts a Request object to a plain object that can be structured
  * cloned or stringified to JSON.
  *
  * @param request
  * @returns
  */
  static async fromRequest(request) {
    const requestData = {
      url: request.url,
      headers: {}
    };
    if (request.method !== "GET") requestData.body = await request.clone().arrayBuffer();
    request.headers.forEach((value, key) => {
      requestData.headers[key] = value;
    });
    for (const prop of serializableProperties) if (request[prop] !== void 0) requestData[prop] = request[prop];
    return new StorableRequest2(requestData);
  }
  /**
  * Accepts an object of request data that can be used to construct a
  * `Request` object but can also be stored in IndexedDB.
  *
  * @param requestData An object of request data that includes the `url` plus any relevant property of
  * [`requestInit`](https://fetch.spec.whatwg.org/#requestinit).
  */
  constructor(requestData) {
    if (true) {
      finalAssertExports.isType(requestData, "object", {
        moduleName: "serwist",
        className: "StorableRequest",
        funcName: "constructor",
        paramName: "requestData"
      });
      finalAssertExports.isType(requestData.url, "string", {
        moduleName: "serwist",
        className: "StorableRequest",
        funcName: "constructor",
        paramName: "requestData.url"
      });
    }
    if (requestData.mode === "navigate") requestData.mode = "same-origin";
    this._requestData = requestData;
  }
  /**
  * Returns a deep clone of the instance's `requestData` object.
  *
  * @returns
  */
  toObject() {
    const requestData = Object.assign({}, this._requestData);
    requestData.headers = Object.assign({}, this._requestData.headers);
    if (requestData.body) requestData.body = requestData.body.slice(0);
    return requestData;
  }
  /**
  * Converts this instance to a Request.
  *
  * @returns
  */
  toRequest() {
    return new Request(this._requestData.url, this._requestData);
  }
  /**
  * Creates and returns a deep clone of the instance.
  *
  * @returns
  */
  clone() {
    return new StorableRequest2(this.toObject());
  }
};
var TAG_PREFIX = "serwist-background-sync";
var MAX_RETENTION_TIME = 1440 * 7;
var queueNames = /* @__PURE__ */ new Set();
var convertEntry = (queueStoreEntry) => {
  const queueEntry = {
    request: new StorableRequest(queueStoreEntry.requestData).toRequest(),
    timestamp: queueStoreEntry.timestamp
  };
  if (queueStoreEntry.metadata) queueEntry.metadata = queueStoreEntry.metadata;
  return queueEntry;
};
var BackgroundSyncQueue = class {
  _name;
  _onSync;
  _maxRetentionTime;
  _queueStore;
  _forceSyncFallback;
  _syncInProgress = false;
  _requestsAddedDuringSync = false;
  /**
  * Creates an instance of Queue with the given options
  *
  * @param name The unique name for this queue. This name must be
  * unique as it's used to register sync events and store requests
  * in IndexedDB specific to this instance. An error will be thrown if
  * a duplicate name is detected.
  * @param options
  */
  constructor(name, { forceSyncFallback, onSync, maxRetentionTime } = {}) {
    if (queueNames.has(name)) throw new SerwistError("duplicate-queue-name", { name });
    queueNames.add(name);
    this._name = name;
    this._onSync = onSync || this.replayRequests;
    this._maxRetentionTime = maxRetentionTime || MAX_RETENTION_TIME;
    this._forceSyncFallback = Boolean(forceSyncFallback);
    this._queueStore = new BackgroundSyncQueueStore(this._name);
    this._addSyncListener();
  }
  /**
  * @returns
  */
  get name() {
    return this._name;
  }
  /**
  * Stores the passed request in IndexedDB (with its timestamp and any
  * metadata) at the end of the queue.
  *
  * @param entry
  */
  async pushRequest(entry) {
    if (true) {
      finalAssertExports.isType(entry, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueue",
        funcName: "pushRequest",
        paramName: "entry"
      });
      finalAssertExports.isInstance(entry.request, Request, {
        moduleName: "serwist",
        className: "BackgroundSyncQueue",
        funcName: "pushRequest",
        paramName: "entry.request"
      });
    }
    await this._addRequest(entry, "push");
  }
  /**
  * Stores the passed request in IndexedDB (with its timestamp and any
  * metadata) at the beginning of the queue.
  *
  * @param entry
  */
  async unshiftRequest(entry) {
    if (true) {
      finalAssertExports.isType(entry, "object", {
        moduleName: "serwist",
        className: "BackgroundSyncQueue",
        funcName: "unshiftRequest",
        paramName: "entry"
      });
      finalAssertExports.isInstance(entry.request, Request, {
        moduleName: "serwist",
        className: "BackgroundSyncQueue",
        funcName: "unshiftRequest",
        paramName: "entry.request"
      });
    }
    await this._addRequest(entry, "unshift");
  }
  /**
  * Removes and returns the last request in the queue (along with its
  * timestamp and any metadata).
  *
  * @returns
  */
  async popRequest() {
    return this._removeRequest("pop");
  }
  /**
  * Removes and returns the first request in the queue (along with its
  * timestamp and any metadata).
  *
  * @returns
  */
  async shiftRequest() {
    return this._removeRequest("shift");
  }
  /**
  * Returns all the entries that have not expired (per `maxRetentionTime`).
  * Any expired entries are removed from the queue.
  *
  * @returns
  */
  async getAll() {
    const allEntries = await this._queueStore.getAll();
    const now = Date.now();
    const unexpiredEntries = [];
    for (const entry of allEntries) {
      const maxRetentionTimeInMs = this._maxRetentionTime * 60 * 1e3;
      if (now - entry.timestamp > maxRetentionTimeInMs) await this._queueStore.deleteEntry(entry.id);
      else unexpiredEntries.push(convertEntry(entry));
    }
    return unexpiredEntries;
  }
  /**
  * Returns the number of entries present in the queue.
  * Note that expired entries (per `maxRetentionTime`) are also included in this count.
  *
  * @returns
  */
  async size() {
    return await this._queueStore.size();
  }
  /**
  * Adds the entry to the QueueStore and registers for a sync event.
  *
  * @param entry
  * @param operation
  * @private
  */
  async _addRequest({ request, metadata, timestamp = Date.now() }, operation) {
    const entry = {
      requestData: (await StorableRequest.fromRequest(request.clone())).toObject(),
      timestamp
    };
    if (metadata) entry.metadata = metadata;
    switch (operation) {
      case "push":
        await this._queueStore.pushEntry(entry);
        break;
      case "unshift":
        await this._queueStore.unshiftEntry(entry);
        break;
    }
    if (true) logger.log(`Request for '${getFriendlyURL(request.url)}' has been added to background sync queue '${this._name}'.`);
    if (this._syncInProgress) this._requestsAddedDuringSync = true;
    else await this.registerSync();
  }
  /**
  * Removes and returns the first or last (depending on `operation`) entry
  * from the {@linkcode BackgroundSyncQueueStore} that's not older than the `maxRetentionTime`.
  *
  * @param operation
  * @returns
  * @private
  */
  async _removeRequest(operation) {
    const now = Date.now();
    let entry;
    switch (operation) {
      case "pop":
        entry = await this._queueStore.popEntry();
        break;
      case "shift":
        entry = await this._queueStore.shiftEntry();
        break;
    }
    if (entry) {
      const maxRetentionTimeInMs = this._maxRetentionTime * 60 * 1e3;
      if (now - entry.timestamp > maxRetentionTimeInMs) return this._removeRequest(operation);
      return convertEntry(entry);
    }
  }
  /**
  * Loops through each request in the queue and attempts to re-fetch it.
  * If any request fails to re-fetch, it's put back in the same position in
  * the queue (which registers a retry for the next sync event).
  */
  async replayRequests() {
    let entry;
    while (entry = await this.shiftRequest()) try {
      await fetch(entry.request.clone());
      if (true) logger.log(`Request for '${getFriendlyURL(entry.request.url)}' has been replayed in queue '${this._name}'`);
    } catch {
      await this.unshiftRequest(entry);
      if (true) logger.log(`Request for '${getFriendlyURL(entry.request.url)}' failed to replay, putting it back in queue '${this._name}'`);
      throw new SerwistError("queue-replay-failed", { name: this._name });
    }
    if (true) logger.log(`All requests in queue '${this.name}' have successfully replayed; the queue is now empty!`);
  }
  /**
  * Registers a sync event with a tag unique to this instance.
  */
  async registerSync() {
    if ("sync" in self.registration && !this._forceSyncFallback) try {
      await self.registration.sync.register(`${TAG_PREFIX}:${this._name}`);
    } catch (err) {
      if (true) logger.warn(`Unable to register sync event for '${this._name}'.`, err);
    }
  }
  /**
  * In sync-supporting browsers, this adds a listener for the sync event.
  * In non-sync-supporting browsers, or if _forceSyncFallback is true, this
  * will retry the queue on service worker startup.
  *
  * @private
  */
  _addSyncListener() {
    if ("sync" in self.registration && !this._forceSyncFallback) self.addEventListener("sync", (event) => {
      if (event.tag === `${TAG_PREFIX}:${this._name}`) {
        if (true) logger.log(`Background sync for tag '${event.tag}' has been received`);
        const syncComplete = async () => {
          this._syncInProgress = true;
          let syncError;
          try {
            await this._onSync({ queue: this });
          } catch (error) {
            if (error instanceof Error) {
              syncError = error;
              throw syncError;
            }
          } finally {
            if (this._requestsAddedDuringSync && !(syncError && !event.lastChance)) await this.registerSync();
            this._syncInProgress = false;
            this._requestsAddedDuringSync = false;
          }
        };
        event.waitUntil(syncComplete());
      }
    });
    else {
      if (true) logger.log("Background sync replaying without background sync event");
      this._onSync({ queue: this });
    }
  }
  /**
  * Returns the set of queue names. This is primarily used to reset the list
  * of queue names in tests.
  *
  * @returns
  * @private
  */
  static get _queueNames() {
    return queueNames;
  }
};
var BackgroundSyncPlugin = class {
  _queue;
  /**
  * @param name See the {@linkcode BackgroundSyncQueue}
  * documentation for parameter details.
  * @param options See the {@linkcode BackgroundSyncQueue}
  * documentation for parameter details.
  * @see https://serwist.pages.dev/docs/serwist/core/background-sync-queue
  */
  constructor(name, options) {
    this._queue = new BackgroundSyncQueue(name, options);
  }
  /**
  * @param options
  * @private
  */
  async fetchDidFail({ request }) {
    await this._queue.pushRequest({ request });
  }
};
var cacheOkAndOpaquePlugin = {
  /**
  * Returns a valid response (to allow caching) if the status is 200 (OK) or
  * 0 (opaque).
  *
  * @param options
  * @returns
  * @private
  */
  cacheWillUpdate: async ({ response }) => {
    if (response.status === 200 || response.status === 0) return response;
    return null;
  }
};
function toRequest(input) {
  return typeof input === "string" ? new Request(input) : input;
}
var StrategyHandler = class {
  /**
  * The event associated with this request.
  */
  event;
  /**
  * The request the strategy is processing (passed to the strategy's
  * `handle()` or `handleAll()` method).
  */
  request;
  /**
  * A `URL` instance of `request.url` (if passed to the strategy's
  * `handle()` or `handleAll()` method).
  * Note: the `url` param will be present if the strategy is invoked
  * from a {@linkcode Route} object.
  */
  url;
  /**
  * Some additional params (if passed to the strategy's
  * `handle()` or `handleAll()` method).
  *
  * Note: the `params` param will be present if the strategy is invoked
  * from a {@linkcode Route} object and that route's matcher returned a truthy
  * value (it will be that value).
  */
  params;
  _cacheKeys = {};
  _strategy;
  _handlerDeferred;
  _extendLifetimePromises;
  _plugins;
  _pluginStateMap;
  /**
  * Creates a new instance associated with the passed strategy and event
  * that's handling the request.
  *
  * The constructor also initializes the state that will be passed to each of
  * the plugins handling this request.
  *
  * @param strategy
  * @param options
  */
  constructor(strategy, options) {
    if (true) {
      finalAssertExports.isInstance(options.event, ExtendableEvent, {
        moduleName: "serwist",
        className: "StrategyHandler",
        funcName: "constructor",
        paramName: "options.event"
      });
      finalAssertExports.isInstance(options.request, Request, {
        moduleName: "serwist",
        className: "StrategyHandler",
        funcName: "constructor",
        paramName: "options.request"
      });
    }
    this.event = options.event;
    this.request = options.request;
    if (options.url) {
      this.url = options.url;
      this.params = options.params;
    }
    this._strategy = strategy;
    this._handlerDeferred = new Deferred();
    this._extendLifetimePromises = [];
    this._plugins = [...strategy.plugins];
    this._pluginStateMap = /* @__PURE__ */ new Map();
    for (const plugin of this._plugins) this._pluginStateMap.set(plugin, {});
    this.event.waitUntil(this._handlerDeferred.promise);
  }
  /**
  * Fetches a given request (and invokes any applicable plugin callback
  * methods), taking the `fetchOptions` (for non-navigation requests) and
  * `plugins` provided to the {@linkcode Strategy} object into account.
  *
  * The following plugin lifecycle methods are invoked when using this method:
  * - `requestWillFetch()`
  * - `fetchDidSucceed()`
  * - `fetchDidFail()`
  *
  * @param input The URL or request to fetch.
  * @returns
  */
  async fetch(input) {
    const { event } = this;
    let request = toRequest(input);
    const preloadResponse = await this.getPreloadResponse();
    if (preloadResponse) return preloadResponse;
    const originalRequest = this.hasCallback("fetchDidFail") ? request.clone() : null;
    try {
      for (const cb of this.iterateCallbacks("requestWillFetch")) request = await cb({
        request: request.clone(),
        event
      });
    } catch (err) {
      if (err instanceof Error) throw new SerwistError("plugin-error-request-will-fetch", { thrownErrorMessage: err.message });
    }
    const pluginFilteredRequest = request.clone();
    try {
      let fetchResponse;
      fetchResponse = await fetch(request, request.mode === "navigate" ? void 0 : this._strategy.fetchOptions);
      if (true) logger.debug(`Network request for '${getFriendlyURL(request.url)}' returned a response with status '${fetchResponse.status}'.`);
      for (const callback of this.iterateCallbacks("fetchDidSucceed")) fetchResponse = await callback({
        event,
        request: pluginFilteredRequest,
        response: fetchResponse
      });
      return fetchResponse;
    } catch (error) {
      if (true) logger.log(`Network request for '${getFriendlyURL(request.url)}' threw an error.`, error);
      if (originalRequest) await this.runCallbacks("fetchDidFail", {
        error,
        event,
        originalRequest: originalRequest.clone(),
        request: pluginFilteredRequest.clone()
      });
      throw error;
    }
  }
  /**
  * Calls `this.fetch()` and (in the background) caches the generated response.
  *
  * The call to `this.cachePut()` automatically invokes `this.waitUntil()`,
  * so you do not have to call `waitUntil()` yourself.
  *
  * @param input The request or URL to fetch and cache.
  * @returns
  */
  async fetchAndCachePut(input) {
    const response = await this.fetch(input);
    const responseClone = response.clone();
    this.waitUntil(this.cachePut(input, responseClone));
    return response;
  }
  /**
  * Matches a request from the cache (and invokes any applicable plugin
  * callback method) using the `cacheName`, `matchOptions`, and `plugins`
  * provided to the `Strategy` object.
  *
  * The following lifecycle methods are invoked when using this method:
  * - `cacheKeyWillBeUsed`
  * - `cachedResponseWillBeUsed`
  *
  * @param key The `Request` or `URL` object to use as the cache key.
  * @returns A matching response, if found.
  */
  async cacheMatch(key) {
    const request = toRequest(key);
    let cachedResponse;
    const { cacheName, matchOptions } = this._strategy;
    const effectiveRequest = await this.getCacheKey(request, "read");
    const multiMatchOptions = {
      ...matchOptions,
      cacheName
    };
    cachedResponse = await caches.match(effectiveRequest, multiMatchOptions);
    if (true) if (cachedResponse) logger.debug(`Found a cached response in '${cacheName}'.`);
    else logger.debug(`No cached response found in '${cacheName}'.`);
    for (const callback of this.iterateCallbacks("cachedResponseWillBeUsed")) cachedResponse = await callback({
      cacheName,
      matchOptions,
      cachedResponse,
      request: effectiveRequest,
      event: this.event
    }) || void 0;
    return cachedResponse;
  }
  /**
  * Puts a request/response pair into the cache (and invokes any applicable
  * plugin callback method) using the `cacheName` and `plugins` provided to
  * the {@linkcode Strategy} object.
  *
  * The following plugin lifecycle methods are invoked when using this method:
  * - `cacheKeyWillBeUsed`
  * - `cacheWillUpdate`
  * - `cacheDidUpdate`
  *
  * @param key The request or URL to use as the cache key.
  * @param response The response to cache.
  * @returns `false` if a `cacheWillUpdate` caused the response to
  * not be cached, and `true` otherwise.
  */
  async cachePut(key, response) {
    const request = toRequest(key);
    await timeout(0);
    const effectiveRequest = await this.getCacheKey(request, "write");
    if (true) {
      if (effectiveRequest.method && effectiveRequest.method !== "GET") throw new SerwistError("attempt-to-cache-non-get-request", {
        url: getFriendlyURL(effectiveRequest.url),
        method: effectiveRequest.method
      });
    }
    if (!response) {
      if (true) logger.error(`Cannot cache non-existent response for '${getFriendlyURL(effectiveRequest.url)}'.`);
      throw new SerwistError("cache-put-with-no-response", { url: getFriendlyURL(effectiveRequest.url) });
    }
    const responseToCache = await this._ensureResponseSafeToCache(response);
    if (!responseToCache) {
      if (true) logger.debug(`Response '${getFriendlyURL(effectiveRequest.url)}' will not be cached.`, responseToCache);
      return false;
    }
    const { cacheName, matchOptions } = this._strategy;
    const cache = await self.caches.open(cacheName);
    if (true) {
      const vary = response.headers.get("Vary");
      if (vary && matchOptions?.ignoreVary !== true) logger.debug(`The response for ${getFriendlyURL(effectiveRequest.url)} has a 'Vary: ${vary}' header. Consider setting the {ignoreVary: true} option on your strategy to ensure cache matching and deletion works as expected.`);
    }
    const hasCacheUpdateCallback = this.hasCallback("cacheDidUpdate");
    const oldResponse = hasCacheUpdateCallback ? await cacheMatchIgnoreParams(cache, effectiveRequest.clone(), ["__WB_REVISION__"], matchOptions) : null;
    if (true) logger.debug(`Updating the '${cacheName}' cache with a new Response for ${getFriendlyURL(effectiveRequest.url)}.`);
    try {
      await cache.put(effectiveRequest, hasCacheUpdateCallback ? responseToCache.clone() : responseToCache);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "QuotaExceededError") await executeQuotaErrorCallbacks();
        throw error;
      }
    }
    for (const callback of this.iterateCallbacks("cacheDidUpdate")) await callback({
      cacheName,
      oldResponse,
      newResponse: responseToCache.clone(),
      request: effectiveRequest,
      event: this.event
    });
    return true;
  }
  /**
  * Checks the `plugins` provided to the {@linkcode Strategy} object for `cacheKeyWillBeUsed`
  * callbacks and executes found callbacks in sequence. The final `Request`
  * object returned by the last plugin is treated as the cache key for cache
  * reads and/or writes. If no `cacheKeyWillBeUsed` plugin callbacks have
  * been registered, the passed request is returned unmodified.
  *
  * @param request
  * @param mode
  * @returns
  */
  async getCacheKey(request, mode) {
    const key = `${request.url} | ${mode}`;
    if (!this._cacheKeys[key]) {
      let effectiveRequest = request;
      for (const callback of this.iterateCallbacks("cacheKeyWillBeUsed")) effectiveRequest = toRequest(await callback({
        mode,
        request: effectiveRequest,
        event: this.event,
        params: this.params
      }));
      this._cacheKeys[key] = effectiveRequest;
    }
    return this._cacheKeys[key];
  }
  /**
  * Returns `true` if the strategy has at least one plugin with the given
  * callback.
  *
  * @param name The name of the callback to check for.
  * @returns
  */
  hasCallback(name) {
    for (const plugin of this._strategy.plugins) if (name in plugin) return true;
    return false;
  }
  /**
  * Runs all plugin callbacks matching the given name, in order, passing the
  * given param object as the only argument.
  *
  * Note: since this method runs all plugins, it's not suitable for cases
  * where the return value of a callback needs to be applied prior to calling
  * the next callback. See {@linkcode StrategyHandler.iterateCallbacks} for how to handle that case.
  *
  * @param name The name of the callback to run within each plugin.
  * @param param The object to pass as the first (and only) param when executing each callback. This object will be merged with the
  * current plugin state prior to callback execution.
  */
  async runCallbacks(name, param) {
    for (const callback of this.iterateCallbacks(name)) await callback(param);
  }
  /**
  * Accepts a callback name and returns an iterable of matching plugin callbacks.
  *
  * @param name The name fo the callback to run
  * @returns
  */
  *iterateCallbacks(name) {
    for (const plugin of this._strategy.plugins) if (typeof plugin[name] === "function") {
      const state = this._pluginStateMap.get(plugin);
      const statefulCallback = (param) => {
        const statefulParam = {
          ...param,
          state
        };
        return plugin[name](statefulParam);
      };
      yield statefulCallback;
    }
  }
  /**
  * Adds a promise to the
  * [extend lifetime promises](https://w3c.github.io/ServiceWorker/#extendableevent-extend-lifetime-promises)
  * of the event event associated with the request being handled (usually a `FetchEvent`).
  *
  * Note: you can await {@linkcode StrategyHandler.doneWaiting} to know when all added promises have settled.
  *
  * @param promise A promise to add to the extend lifetime promises of
  * the event that triggered the request.
  */
  waitUntil(promise) {
    this._extendLifetimePromises.push(promise);
    return promise;
  }
  /**
  * Returns a promise that resolves once all promises passed to
  * `this.waitUntil()` have settled.
  *
  * Note: any work done after `doneWaiting()` settles should be manually
  * passed to an event's `waitUntil()` method (not `this.waitUntil()`), otherwise
  * the service worker thread may be killed prior to your work completing.
  */
  async doneWaiting() {
    let promise;
    while (promise = this._extendLifetimePromises.shift()) await promise;
  }
  /**
  * Stops running the strategy and immediately resolves any pending
  * `waitUntil()` promise.
  */
  destroy() {
    this._handlerDeferred.resolve(null);
  }
  /**
  * This method checks if the navigation preload `Response` is available.
  *
  * @param request
  * @param event
  * @returns
  */
  async getPreloadResponse() {
    if (this.event instanceof FetchEvent && this.event.request.mode === "navigate" && "preloadResponse" in this.event) try {
      const possiblePreloadResponse = await this.event.preloadResponse;
      if (possiblePreloadResponse) {
        if (true) logger.log(`Using a preloaded navigation response for '${getFriendlyURL(this.event.request.url)}'`);
        return possiblePreloadResponse;
      }
    } catch (error) {
      if (true) logger.error(error);
      return;
    }
  }
  /**
  * This method will call `cacheWillUpdate` on the available plugins (or use
  * status === 200) to determine if the response is safe and valid to cache.
  *
  * @param response
  * @returns
  * @private
  */
  async _ensureResponseSafeToCache(response) {
    let responseToCache = response;
    let pluginsUsed = false;
    for (const callback of this.iterateCallbacks("cacheWillUpdate")) {
      responseToCache = await callback({
        request: this.request,
        response: responseToCache,
        event: this.event
      }) || void 0;
      pluginsUsed = true;
      if (!responseToCache) break;
    }
    if (!pluginsUsed) {
      if (responseToCache && responseToCache.status !== 200) {
        if (true) if (responseToCache.status === 0) logger.warn(`The response for '${this.request.url}' is an opaque response. The caching strategy that you're using will not cache opaque responses by default.`);
        else logger.debug(`The response for '${this.request.url}' returned a status code of '${response.status}' and won't be cached as a result.`);
        responseToCache = void 0;
      }
    }
    return responseToCache;
  }
};
var Strategy = class {
  cacheName;
  plugins;
  fetchOptions;
  matchOptions;
  /**
  * Creates a new instance of the strategy and sets all documented option
  * properties as public instance properties.
  *
  * Note: if a custom strategy class extends the base Strategy class and does
  * not need more than these properties, it does not need to define its own
  * constructor.
  *
  * @param options
  */
  constructor(options = {}) {
    this.cacheName = cacheNames.getRuntimeName(options.cacheName);
    this.plugins = options.plugins || [];
    this.fetchOptions = options.fetchOptions;
    this.matchOptions = options.matchOptions;
  }
  /**
  * Performs a request strategy and returns a promise that will resolve to
  * a response, invoking all relevant plugin callbacks.
  *
  * When a strategy instance is registered with a route, this method is automatically
  * called when the route matches.
  *
  * Alternatively, this method can be used in a standalone `fetch` event
  * listener by passing it to `event.respondWith()`.
  *
  * @param options A `FetchEvent` or an object with the properties listed below.
  * @param options.request A request to run this strategy for.
  * @param options.event The event associated with the request.
  * @param options.url
  * @param options.params
  */
  handle(options) {
    const [responseDone] = this.handleAll(options);
    return responseDone;
  }
  /**
  * Similar to `handle()`, but instead of just returning a promise that
  * resolves to a response, it will return an tuple of `[response, done]` promises,
  * where `response` is equivalent to what `handle()` returns, and `done` is a
  * promise that will resolve once all promises added to `event.waitUntil()` as a part
  * of performing the strategy have completed.
  *
  * You can await the `done` promise to ensure any extra work performed by
  * the strategy (usually caching responses) completes successfully.
  *
  * @param options A `FetchEvent` or `HandlerCallbackOptions` object.
  * @returns A tuple of [response, done] promises that can be used to determine when the response resolves as
  * well as when the handler has completed all its work.
  */
  handleAll(options) {
    if (options instanceof FetchEvent) options = {
      event: options,
      request: options.request
    };
    const event = options.event;
    const request = typeof options.request === "string" ? new Request(options.request) : options.request;
    const handler = new StrategyHandler(this, options.url ? {
      event,
      request,
      url: options.url,
      params: options.params
    } : {
      event,
      request
    });
    const responseDone = this._getResponse(handler, request, event);
    return [responseDone, this._awaitComplete(responseDone, handler, request, event)];
  }
  async _getResponse(handler, request, event) {
    await handler.runCallbacks("handlerWillStart", {
      event,
      request
    });
    let response;
    try {
      response = await this._handle(request, handler);
      if (response === void 0 || response.type === "error") throw new SerwistError("no-response", { url: request.url });
    } catch (error) {
      if (error instanceof Error) for (const callback of handler.iterateCallbacks("handlerDidError")) {
        response = await callback({
          error,
          event,
          request
        });
        if (response !== void 0) break;
      }
      if (!response) throw error;
      if (true) throw logger.log(`While responding to '${getFriendlyURL(request.url)}', an ${error instanceof Error ? error.toString() : ""} error occurred. Using a fallback response provided by a handlerDidError plugin.`);
    }
    for (const callback of handler.iterateCallbacks("handlerWillRespond")) response = await callback({
      event,
      request,
      response
    });
    return response;
  }
  async _awaitComplete(responseDone, handler, request, event) {
    let response;
    let error;
    try {
      response = await responseDone;
    } catch {
    }
    try {
      await handler.runCallbacks("handlerDidRespond", {
        event,
        request,
        response
      });
      await handler.doneWaiting();
    } catch (waitUntilError) {
      if (waitUntilError instanceof Error) error = waitUntilError;
    }
    await handler.runCallbacks("handlerDidComplete", {
      event,
      request,
      response,
      error
    });
    handler.destroy();
    if (error) throw error;
  }
};
var messages2 = {
  strategyStart: (strategyName, request) => `Using ${strategyName} to respond to '${getFriendlyURL(request.url)}'`,
  printFinalResponse: (response) => {
    if (response) {
      logger.groupCollapsed("View the final response here.");
      logger.log(response || "[No response returned]");
      logger.groupEnd();
    }
  }
};
var NetworkFirst = class extends Strategy {
  _networkTimeoutSeconds;
  /**
  * @param options
  * This option can be used to combat
  * "[lie-fi](https://developers.google.com/web/fundamentals/performance/poor-connectivity/#lie-fi)"
  * scenarios.
  */
  constructor(options = {}) {
    super(options);
    if (!this.plugins.some((p) => "cacheWillUpdate" in p)) this.plugins.unshift(cacheOkAndOpaquePlugin);
    this._networkTimeoutSeconds = options.networkTimeoutSeconds || 0;
    if (true) {
      if (this._networkTimeoutSeconds) finalAssertExports.isType(this._networkTimeoutSeconds, "number", {
        moduleName: "serwist",
        className: this.constructor.name,
        funcName: "constructor",
        paramName: "networkTimeoutSeconds"
      });
    }
  }
  /**
  * @private
  * @param request A request to run this strategy for.
  * @param handler The event that triggered the request.
  * @returns
  */
  async _handle(request, handler) {
    const logs = [];
    if (true) finalAssertExports.isInstance(request, Request, {
      moduleName: "serwist",
      className: this.constructor.name,
      funcName: "handle",
      paramName: "makeRequest"
    });
    const promises = [];
    let timeoutId;
    if (this._networkTimeoutSeconds) {
      const { id, promise } = this._getTimeoutPromise({
        request,
        logs,
        handler
      });
      timeoutId = id;
      promises.push(promise);
    }
    const networkPromise = this._getNetworkPromise({
      timeoutId,
      request,
      logs,
      handler
    });
    promises.push(networkPromise);
    const response = await handler.waitUntil((async () => {
      return await handler.waitUntil(Promise.race(promises)) || await networkPromise;
    })());
    if (true) {
      logger.groupCollapsed(messages2.strategyStart(this.constructor.name, request));
      for (const log of logs) logger.log(log);
      messages2.printFinalResponse(response);
      logger.groupEnd();
    }
    if (!response) throw new SerwistError("no-response", { url: request.url });
    return response;
  }
  /**
  * @param options
  * @returns
  * @private
  */
  _getTimeoutPromise({ request, logs, handler }) {
    let timeoutId;
    return {
      promise: new Promise((resolve) => {
        const onNetworkTimeout = async () => {
          if (true) logs.push(`Timing out the network response at ${this._networkTimeoutSeconds} seconds.`);
          resolve(await handler.cacheMatch(request));
        };
        timeoutId = setTimeout(onNetworkTimeout, this._networkTimeoutSeconds * 1e3);
      }),
      id: timeoutId
    };
  }
  /**
  * @param options
  * @param options.timeoutId
  * @param options.request
  * @param options.logs A reference to the logs Array.
  * @param options.event
  * @returns
  *
  * @private
  */
  async _getNetworkPromise({ timeoutId, request, logs, handler }) {
    let error;
    let response;
    try {
      response = await handler.fetchAndCachePut(request);
    } catch (fetchError) {
      if (fetchError instanceof Error) error = fetchError;
    }
    if (timeoutId) clearTimeout(timeoutId);
    if (true) if (response) logs.push("Got response from network.");
    else logs.push("Unable to get a response from the network. Will respond with a cached response.");
    if (error || !response) {
      response = await handler.cacheMatch(request);
      if (true) if (response) logs.push(`Found a cached response in the '${this.cacheName}' cache.`);
      else logs.push(`No response found in the '${this.cacheName}' cache.`);
    }
    return response;
  }
};
var NetworkOnly = class extends Strategy {
  _networkTimeoutSeconds;
  /**
  * @param options
  */
  constructor(options = {}) {
    super(options);
    this._networkTimeoutSeconds = options.networkTimeoutSeconds || 0;
  }
  /**
  * @private
  * @param request A request to run this strategy for.
  * @param handler The event that triggered the request.
  * @returns
  */
  async _handle(request, handler) {
    if (true) finalAssertExports.isInstance(request, Request, {
      moduleName: "serwist",
      className: this.constructor.name,
      funcName: "_handle",
      paramName: "request"
    });
    let error;
    let response;
    try {
      const promises = [handler.fetch(request)];
      if (this._networkTimeoutSeconds) {
        const timeoutPromise = timeout(this._networkTimeoutSeconds * 1e3);
        promises.push(timeoutPromise);
      }
      response = await Promise.race(promises);
      if (!response) throw new Error(`Timed out the network response after ${this._networkTimeoutSeconds} seconds.`);
    } catch (err) {
      if (err instanceof Error) error = err;
    }
    if (true) {
      logger.groupCollapsed(messages2.strategyStart(this.constructor.name, request));
      if (response) logger.log("Got response from network.");
      else logger.log("Unable to get a response from the network.");
      messages2.printFinalResponse(response);
      logger.groupEnd();
    }
    if (!response) throw new SerwistError("no-response", {
      url: request.url,
      error
    });
    return response;
  }
};
var validMethods = [
  "DELETE",
  "GET",
  "HEAD",
  "PATCH",
  "POST",
  "PUT"
];
var normalizeHandler = (handler) => {
  if (handler && typeof handler === "object") {
    if (true) finalAssertExports.hasMethod(handler, "handle", {
      moduleName: "serwist",
      className: "Route",
      funcName: "constructor",
      paramName: "handler"
    });
    return handler;
  }
  if (true) finalAssertExports.isType(handler, "function", {
    moduleName: "serwist",
    className: "Route",
    funcName: "constructor",
    paramName: "handler"
  });
  return { handle: handler };
};
var Route = class {
  handler;
  match;
  method;
  catchHandler;
  /**
  * Constructor for Route class.
  *
  * @param match A callback function that determines whether the
  * route matches a given `fetch` event by returning a truthy value.
  * @param handler A callback function that returns a `Promise` resolving
  * to a `Response`.
  * @param method The HTTP method to match the route against. Defaults
  * to `GET`.
  */
  constructor(match, handler, method = "GET") {
    if (true) {
      finalAssertExports.isType(match, "function", {
        moduleName: "serwist",
        className: "Route",
        funcName: "constructor",
        paramName: "match"
      });
      if (method) finalAssertExports.isOneOf(method, validMethods, { paramName: "method" });
    }
    this.handler = normalizeHandler(handler);
    this.match = match;
    this.method = method;
  }
  /**
  *
  * @param handler A callback function that returns a Promise resolving
  * to a Response.
  */
  setCatchHandler(handler) {
    this.catchHandler = normalizeHandler(handler);
  }
};
var PrecacheStrategy = class PrecacheStrategy2 extends Strategy {
  _fallbackToNetwork;
  static defaultPrecacheCacheabilityPlugin = { async cacheWillUpdate({ response }) {
    if (!response || response.status >= 400) return null;
    return response;
  } };
  static copyRedirectedCacheableResponsesPlugin = { async cacheWillUpdate({ response }) {
    return response.redirected ? await copyResponse(response) : response;
  } };
  /**
  * @param options
  */
  constructor(options = {}) {
    options.cacheName = cacheNames.getPrecacheName(options.cacheName);
    super(options);
    this._fallbackToNetwork = options.fallbackToNetwork !== false;
    this.plugins.push(PrecacheStrategy2.copyRedirectedCacheableResponsesPlugin);
  }
  /**
  * @private
  * @param request A request to run this strategy for.
  * @param handler The event that triggered the request.
  * @returns
  */
  async _handle(request, handler) {
    const preloadResponse = await handler.getPreloadResponse();
    if (preloadResponse) return preloadResponse;
    const response = await handler.cacheMatch(request);
    if (response) return response;
    if (handler.event && handler.event.type === "install") return await this._handleInstall(request, handler);
    return await this._handleFetch(request, handler);
  }
  async _handleFetch(request, handler) {
    let response;
    const params = handler.params || {};
    if (this._fallbackToNetwork) {
      if (true) logger.warn(`The precached response for ${getFriendlyURL(request.url)} in ${this.cacheName} was not found. Falling back to the network.`);
      const integrityInManifest = params.integrity;
      const integrityInRequest = request.integrity;
      const noIntegrityConflict = !integrityInRequest || integrityInRequest === integrityInManifest;
      response = await handler.fetch(new Request(request, { integrity: request.mode !== "no-cors" ? integrityInRequest || integrityInManifest : void 0 }));
      if (integrityInManifest && noIntegrityConflict && request.mode !== "no-cors") {
        this._useDefaultCacheabilityPluginIfNeeded();
        const wasCached = await handler.cachePut(request, response.clone());
        if (true) {
          if (wasCached) logger.log(`A response for ${getFriendlyURL(request.url)} was used to "repair" the precache.`);
        }
      }
    } else throw new SerwistError("missing-precache-entry", {
      cacheName: this.cacheName,
      url: request.url
    });
    if (true) {
      const cacheKey = params.cacheKey || await handler.getCacheKey(request, "read");
      logger.groupCollapsed(`Precaching is responding to: ${getFriendlyURL(request.url)}`);
      logger.log(`Serving the precached url: ${getFriendlyURL(cacheKey instanceof Request ? cacheKey.url : cacheKey)}`);
      logger.groupCollapsed("View request details here.");
      logger.log(request);
      logger.groupEnd();
      logger.groupCollapsed("View response details here.");
      logger.log(response);
      logger.groupEnd();
      logger.groupEnd();
    }
    return response;
  }
  async _handleInstall(request, handler) {
    this._useDefaultCacheabilityPluginIfNeeded();
    const response = await handler.fetch(request);
    if (!await handler.cachePut(request, response.clone())) throw new SerwistError("bad-precaching-response", {
      url: request.url,
      status: response.status
    });
    return response;
  }
  /**
  * This method is complex, as there a number of things to account for:
  *
  * The `plugins` array can be set at construction, and/or it might be added to
  * to at any time before the strategy is used.
  *
  * At the time the strategy is used (i.e. during an `install` event), there
  * needs to be at least one plugin that implements `cacheWillUpdate` in the
  * array, other than `copyRedirectedCacheableResponsesPlugin`.
  *
  * - If this method is called and there are no suitable `cacheWillUpdate`
  * plugins, we need to add `defaultPrecacheCacheabilityPlugin`.
  *
  * - If this method is called and there is exactly one `cacheWillUpdate`, then
  * we don't have to do anything (this might be a previously added
  * `defaultPrecacheCacheabilityPlugin`, or it might be a custom plugin).
  *
  * - If this method is called and there is more than one `cacheWillUpdate`,
  * then we need to check if one is `defaultPrecacheCacheabilityPlugin`. If so,
  * we need to remove it. (This situation is unlikely, but it could happen if
  * the strategy is used multiple times, the first without a `cacheWillUpdate`,
  * and then later on after manually adding a custom `cacheWillUpdate`.)
  *
  * See https://github.com/GoogleChrome/workbox/issues/2737 for more context.
  *
  * @private
  */
  _useDefaultCacheabilityPluginIfNeeded() {
    let defaultPluginIndex = null;
    let cacheWillUpdatePluginCount = 0;
    for (const [index, plugin] of this.plugins.entries()) {
      if (plugin === PrecacheStrategy2.copyRedirectedCacheableResponsesPlugin) continue;
      if (plugin === PrecacheStrategy2.defaultPrecacheCacheabilityPlugin) defaultPluginIndex = index;
      if (plugin.cacheWillUpdate) cacheWillUpdatePluginCount++;
    }
    if (cacheWillUpdatePluginCount === 0) this.plugins.push(PrecacheStrategy2.defaultPrecacheCacheabilityPlugin);
    else if (cacheWillUpdatePluginCount > 1 && defaultPluginIndex !== null) this.plugins.splice(defaultPluginIndex, 1);
  }
};
var NavigationRoute = class extends Route {
  _allowlist;
  _denylist;
  /**
  * If both `denylist` and `allowlist` are provided, `denylist` will
  * take precedence.
  *
  * The regular expressions in `allowlist` and `denylist`
  * are matched against the concatenated
  * [`pathname`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLHyperlinkElementUtils/pathname)
  * and [`search`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLHyperlinkElementUtils/search)
  * portions of the requested URL.
  *
  * *Note*: These RegExps may be evaluated against every destination URL during
  * a navigation. Avoid using
  * [complex RegExps](https://github.com/GoogleChrome/workbox/issues/3077),
  * or else your users may see delays when navigating your site.
  *
  * @param handler A callback function that returns a `Promise` resulting in a `Response`.
  * @param options
  */
  constructor(handler, { allowlist = [/./], denylist = [] } = {}) {
    if (true) {
      finalAssertExports.isArrayOfClass(allowlist, RegExp, {
        moduleName: "serwist",
        className: "NavigationRoute",
        funcName: "constructor",
        paramName: "options.allowlist"
      });
      finalAssertExports.isArrayOfClass(denylist, RegExp, {
        moduleName: "serwist",
        className: "NavigationRoute",
        funcName: "constructor",
        paramName: "options.denylist"
      });
    }
    super((options) => this._match(options), handler);
    this._allowlist = allowlist;
    this._denylist = denylist;
  }
  /**
  * Routes match handler.
  *
  * @param options
  * @returns
  * @private
  */
  _match({ url, request }) {
    if (request && request.mode !== "navigate") return false;
    const pathnameAndSearch = url.pathname + url.search;
    for (const regExp of this._denylist) if (regExp.test(pathnameAndSearch)) {
      if (true) logger.log(`The navigation route ${pathnameAndSearch} is not being used, since the URL matches this denylist pattern: ${regExp.toString()}`);
      return false;
    }
    if (this._allowlist.some((regExp) => regExp.test(pathnameAndSearch))) {
      if (true) logger.debug(`The navigation route ${pathnameAndSearch} is being used.`);
      return true;
    }
    if (true) logger.log(`The navigation route ${pathnameAndSearch} is not being used, since the URL being navigated to doesn't match the allowlist.`);
    return false;
  }
};
var isNavigationPreloadSupported = () => {
  return Boolean(self.registration?.navigationPreload);
};
var enableNavigationPreload = (headerValue) => {
  if (isNavigationPreloadSupported()) self.addEventListener("activate", (event) => {
    event.waitUntil(self.registration.navigationPreload.enable().then(() => {
      if (headerValue) self.registration.navigationPreload.setHeaderValue(headerValue);
      if (true) logger.log("Navigation preloading is enabled.");
    }));
  });
  else if (true) logger.log("Navigation preloading is not supported in this browser.");
};
var removeIgnoredSearchParams = (urlObject, ignoreURLParametersMatching = []) => {
  for (const paramName of [...urlObject.searchParams.keys()]) if (ignoreURLParametersMatching.some((regExp) => regExp.test(paramName))) urlObject.searchParams.delete(paramName);
  return urlObject;
};
function* generateURLVariations(url, { directoryIndex = "index.html", ignoreURLParametersMatching = [/^utm_/, /^fbclid$/], cleanURLs = true, urlManipulation } = {}) {
  const urlObject = new URL(url, location.href);
  urlObject.hash = "";
  yield urlObject.href;
  const urlWithoutIgnoredParams = removeIgnoredSearchParams(urlObject, ignoreURLParametersMatching);
  yield urlWithoutIgnoredParams.href;
  if (directoryIndex && urlWithoutIgnoredParams.pathname.endsWith("/")) {
    const directoryURL = new URL(urlWithoutIgnoredParams.href);
    directoryURL.pathname += directoryIndex;
    yield directoryURL.href;
  }
  if (cleanURLs) {
    const cleanURL = new URL(urlWithoutIgnoredParams.href);
    cleanURL.pathname += ".html";
    yield cleanURL.href;
  }
  if (urlManipulation) {
    const additionalURLs = urlManipulation({ url: urlObject });
    for (const urlToAttempt of additionalURLs) yield urlToAttempt.href;
  }
}
var RegExpRoute = class extends Route {
  /**
  * If the regular expression contains
  * [capture groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp#grouping-back-references),
  * the captured values will be passed to the `params` argument.
  *
  * @param regExp The regular expression to match against URLs.
  * @param handler A callback function that returns a `Promise` resulting in a `Response`.
  * @param method The HTTP method to match the {@linkcode Route} against. Defaults to `GET`.
  * against.
  */
  constructor(regExp, handler, method) {
    if (true) finalAssertExports.isInstance(regExp, RegExp, {
      moduleName: "serwist",
      className: "RegExpRoute",
      funcName: "constructor",
      paramName: "pattern"
    });
    const match = ({ url }) => {
      const result = regExp.exec(url.href);
      if (!result) return;
      if (url.origin !== location.origin && result.index !== 0) {
        if (true) logger.debug(`The regular expression '${regExp.toString()}' only partially matched against the cross-origin URL '${url.toString()}'. RegExpRoute's will only handle cross-origin requests if they match the entire URL.`);
        return;
      }
      return result.slice(1);
    };
    super(match, handler, method);
  }
};
var setCacheNameDetails = (details) => {
  if (true) {
    for (const key of Object.keys(details)) finalAssertExports.isType(details[key], "string", {
      moduleName: "@serwist/core",
      funcName: "setCacheNameDetails",
      paramName: `details.${key}`
    });
    if (details.precache?.length === 0) throw new SerwistError("invalid-cache-name", {
      cacheNameId: "precache",
      value: details.precache
    });
    if (details.runtime?.length === 0) throw new SerwistError("invalid-cache-name", {
      cacheNameId: "runtime",
      value: details.runtime
    });
    if (details.googleAnalytics?.length === 0) throw new SerwistError("invalid-cache-name", {
      cacheNameId: "googleAnalytics",
      value: details.googleAnalytics
    });
  }
  cacheNames.updateDetails(details);
};
var REVISION_SEARCH_PARAM = "__WB_REVISION__";
var createCacheKey = (entry) => {
  if (!entry) throw new SerwistError("add-to-cache-list-unexpected-type", { entry });
  if (typeof entry === "string") {
    const urlObject = new URL(entry, location.href);
    return {
      cacheKey: urlObject.href,
      url: urlObject.href
    };
  }
  const { revision, url } = entry;
  if (!url) throw new SerwistError("add-to-cache-list-unexpected-type", { entry });
  if (!revision) {
    const urlObject = new URL(url, location.href);
    return {
      cacheKey: urlObject.href,
      url: urlObject.href
    };
  }
  const cacheKeyURL = new URL(url, location.href);
  const originalURL = new URL(url, location.href);
  cacheKeyURL.searchParams.set(REVISION_SEARCH_PARAM, revision);
  return {
    cacheKey: cacheKeyURL.href,
    url: originalURL.href
  };
};
var PrecacheInstallReportPlugin = class {
  updatedURLs = [];
  notUpdatedURLs = [];
  handlerWillStart = async ({ request, state }) => {
    if (state) state.originalRequest = request;
  };
  cachedResponseWillBeUsed = async ({ event, state, cachedResponse }) => {
    if (event.type === "install") {
      if (state?.originalRequest && state.originalRequest instanceof Request) {
        const url = state.originalRequest.url;
        if (cachedResponse) this.notUpdatedURLs.push(url);
        else this.updatedURLs.push(url);
      }
    }
    return cachedResponse;
  };
};
var parseRoute = (capture, handler, method) => {
  if (typeof capture === "string") {
    const captureUrl = new URL(capture, location.href);
    if (true) {
      if (!(capture.startsWith("/") || capture.startsWith("http"))) throw new SerwistError("invalid-string", {
        moduleName: "serwist",
        funcName: "parseRoute",
        paramName: "capture"
      });
      const valueToCheck = capture.startsWith("http") ? captureUrl.pathname : capture;
      const wildcards = "[*:?+]";
      if (new RegExp(`${wildcards}`).exec(valueToCheck)) logger.debug(`The '$capture' parameter contains an Express-style wildcard character (${wildcards}). Strings are now always interpreted as exact matches; use a RegExp for partial or wildcard matches.`);
    }
    const matchCallback = ({ url }) => {
      if (true) {
        if (url.pathname === captureUrl.pathname && url.origin !== captureUrl.origin) logger.debug(`${capture} only partially matches the cross-origin URL ${url.toString()}. This route will only handle cross-origin requests if they match the entire URL.`);
      }
      return url.href === captureUrl.href;
    };
    return new Route(matchCallback, handler, method);
  }
  if (capture instanceof RegExp) return new RegExpRoute(capture, handler, method);
  if (typeof capture === "function") return new Route(capture, handler, method);
  if (capture instanceof Route) return capture;
  throw new SerwistError("unsupported-route-type", {
    moduleName: "serwist",
    funcName: "parseRoute",
    paramName: "capture"
  });
};
var logGroup = (groupTitle, deletedURLs) => {
  logger.groupCollapsed(groupTitle);
  for (const url of deletedURLs) logger.log(url);
  logger.groupEnd();
};
var printCleanupDetails = (deletedURLs) => {
  const deletionCount = deletedURLs.length;
  if (deletionCount > 0) {
    logger.groupCollapsed(`During precaching cleanup, ${deletionCount} cached request${deletionCount === 1 ? " was" : "s were"} deleted.`);
    logGroup("Deleted Cache Requests", deletedURLs);
    logger.groupEnd();
  }
};
function _nestedGroup(groupTitle, urls) {
  if (urls.length === 0) return;
  logger.groupCollapsed(groupTitle);
  for (const url of urls) logger.log(url);
  logger.groupEnd();
}
var printInstallDetails = (urlsToPrecache, urlsAlreadyPrecached) => {
  const precachedCount = urlsToPrecache.length;
  const alreadyPrecachedCount = urlsAlreadyPrecached.length;
  if (precachedCount || alreadyPrecachedCount) {
    let message = `Precaching ${precachedCount} file${precachedCount === 1 ? "" : "s"}.`;
    if (alreadyPrecachedCount > 0) message += ` ${alreadyPrecachedCount} file${alreadyPrecachedCount === 1 ? " is" : "s are"} already cached.`;
    logger.groupCollapsed(message);
    _nestedGroup("View newly precached URLs.", urlsToPrecache);
    _nestedGroup("View previously precached URLs.", urlsAlreadyPrecached);
    logger.groupEnd();
  }
};

// ../../node_modules/@serwist/utils/dist/index.mjs
var parallel = async (limit, array, func) => {
  const work = array.map((item, index) => ({
    index,
    item
  }));
  const processor = async (res) => {
    const results = [];
    while (true) {
      const next = work.pop();
      if (!next) return res(results);
      const result = await func(next.item);
      results.push({
        result,
        index: next.index
      });
    }
  };
  const queues = Array.from({ length: limit }, () => new Promise(processor));
  return (await Promise.all(queues)).flat().sort((a, b) => a.index < b.index ? -1 : 1).map((res) => res.result);
};

// ../../node_modules/serwist/dist/index.mjs
var isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
var CacheableResponse = class {
  _statuses;
  _headers;
  /**
  * To construct a new `CacheableResponse` instance you must provide at least
  * one of the `config` properties.
  *
  * If both `statuses` and `headers` are specified, then both conditions must
  * be met for the response to be considered cacheable.
  *
  * @param config
  */
  constructor(config = {}) {
    if (true) {
      if (!(config.statuses || config.headers)) throw new SerwistError("statuses-or-headers-required", {
        moduleName: "serwist",
        className: "CacheableResponse",
        funcName: "constructor"
      });
      if (config.statuses) finalAssertExports.isArray(config.statuses, {
        moduleName: "serwist",
        className: "CacheableResponse",
        funcName: "constructor",
        paramName: "config.statuses"
      });
      if (config.headers) finalAssertExports.isType(config.headers, "object", {
        moduleName: "serwist",
        className: "CacheableResponse",
        funcName: "constructor",
        paramName: "config.headers"
      });
    }
    this._statuses = config.statuses;
    if (config.headers) this._headers = new Headers(config.headers);
  }
  /**
  * Checks a response to see whether it's cacheable or not.
  *
  * @param response The response whose cacheability is being
  * checked.
  * @returns `true` if the response is cacheable, and `false`
  * otherwise.
  */
  isResponseCacheable(response) {
    if (true) finalAssertExports.isInstance(response, Response, {
      moduleName: "serwist",
      className: "CacheableResponse",
      funcName: "isResponseCacheable",
      paramName: "response"
    });
    let cacheable = true;
    if (this._statuses) cacheable = this._statuses.includes(response.status);
    if (this._headers && cacheable) {
      for (const [headerName, headerValue] of this._headers.entries()) if (response.headers.get(headerName) !== headerValue) {
        cacheable = false;
        break;
      }
    }
    if (true) {
      if (!cacheable) {
        logger.groupCollapsed(`The request for '${getFriendlyURL(response.url)}' returned a response that does not meet the criteria for being cached.`);
        logger.groupCollapsed("View cacheability criteria here.");
        logger.log(`Cacheable statuses: ${JSON.stringify(this._statuses)}`);
        logger.log(`Cacheable headers: ${JSON.stringify(this._headers, null, 2)}`);
        logger.groupEnd();
        const logFriendlyHeaders = {};
        response.headers.forEach((value, key) => {
          logFriendlyHeaders[key] = value;
        });
        logger.groupCollapsed("View response status and headers here.");
        logger.log(`Response status: ${response.status}`);
        logger.log(`Response headers: ${JSON.stringify(logFriendlyHeaders, null, 2)}`);
        logger.groupEnd();
        logger.groupCollapsed("View full response details here.");
        logger.log(response.headers);
        logger.log(response);
        logger.groupEnd();
        logger.groupEnd();
      }
    }
    return cacheable;
  }
};
var CacheableResponsePlugin = class {
  _cacheableResponse;
  /**
  * To construct a new `CacheableResponsePlugin` instance you must provide at
  * least one of the `config` properties.
  *
  * If both `statuses` and `headers` are specified, then both conditions must
  * be met for the response to be considered cacheable.
  *
  * @param config
  */
  constructor(config) {
    this._cacheableResponse = new CacheableResponse(config);
  }
  /**
  * @param options
  * @returns
  * @private
  */
  cacheWillUpdate = async ({ response }) => {
    if (this._cacheableResponse.isResponseCacheable(response)) return response;
    return null;
  };
};
var DB_NAME = "serwist-expiration";
var CACHE_OBJECT_STORE = "cache-entries";
var normalizeURL = (unNormalizedUrl) => {
  const url = new URL(unNormalizedUrl, location.href);
  url.hash = "";
  return url.href;
};
var CacheTimestampsModel = class {
  _cacheName;
  _db = null;
  /**
  *
  * @param cacheName
  *
  * @private
  */
  constructor(cacheName) {
    this._cacheName = cacheName;
  }
  /**
  * Takes a URL and returns an ID that will be unique in the object store.
  *
  * @param url
  * @returns
  * @private
  */
  _getId(url) {
    return `${this._cacheName}|${normalizeURL(url)}`;
  }
  /**
  * Performs an upgrade of indexedDB.
  *
  * @param db
  *
  * @private
  */
  _upgradeDb(db) {
    const objStore = db.createObjectStore(CACHE_OBJECT_STORE, { keyPath: "id" });
    objStore.createIndex("cacheName", "cacheName", { unique: false });
    objStore.createIndex("timestamp", "timestamp", { unique: false });
  }
  /**
  * Performs an upgrade of indexedDB and deletes deprecated DBs.
  *
  * @param db
  *
  * @private
  */
  _upgradeDbAndDeleteOldDbs(db) {
    this._upgradeDb(db);
    if (this._cacheName) deleteDB(this._cacheName);
  }
  /**
  * @param url
  * @param timestamp
  *
  * @private
  */
  async setTimestamp(url, timestamp) {
    url = normalizeURL(url);
    const entry = {
      id: this._getId(url),
      cacheName: this._cacheName,
      url,
      timestamp
    };
    const tx = (await this.getDb()).transaction(CACHE_OBJECT_STORE, "readwrite", { durability: "relaxed" });
    await tx.store.put(entry);
    await tx.done;
  }
  /**
  * Returns the timestamp stored for a given URL.
  *
  * @param url
  * @returns
  * @private
  */
  async getTimestamp(url) {
    return (await (await this.getDb()).get(CACHE_OBJECT_STORE, this._getId(url)))?.timestamp;
  }
  /**
  * Iterates through all the entries in the object store (from newest to
  * oldest) and removes entries once either `maxCount` is reached or the
  * entry's timestamp is less than `minTimestamp`.
  *
  * @param minTimestamp
  * @param maxCount
  * @returns
  * @private
  */
  async expireEntries(minTimestamp, maxCount) {
    let cursor = await (await this.getDb()).transaction(CACHE_OBJECT_STORE, "readwrite").store.index("timestamp").openCursor(null, "prev");
    const urlsDeleted = [];
    let entriesNotDeletedCount = 0;
    while (cursor) {
      const result = cursor.value;
      if (result.cacheName === this._cacheName) if (minTimestamp && result.timestamp < minTimestamp || maxCount && entriesNotDeletedCount >= maxCount) {
        cursor.delete();
        urlsDeleted.push(result.url);
      } else entriesNotDeletedCount++;
      cursor = await cursor.continue();
    }
    return urlsDeleted;
  }
  /**
  * Returns an open connection to the database.
  *
  * @private
  */
  async getDb() {
    if (!this._db) this._db = await openDB(DB_NAME, 1, { upgrade: this._upgradeDbAndDeleteOldDbs.bind(this) });
    return this._db;
  }
};
var CacheExpiration = class {
  _isRunning = false;
  _rerunRequested = false;
  _maxEntries;
  _maxAgeSeconds;
  _matchOptions;
  _cacheName;
  _timestampModel;
  /**
  * To construct a new `CacheExpiration` instance you must provide at least
  * one of the `config` properties.
  *
  * @param cacheName Name of the cache to apply restrictions to.
  * @param config
  */
  constructor(cacheName, config = {}) {
    if (true) {
      finalAssertExports.isType(cacheName, "string", {
        moduleName: "serwist",
        className: "CacheExpiration",
        funcName: "constructor",
        paramName: "cacheName"
      });
      if (!(config.maxEntries || config.maxAgeSeconds)) throw new SerwistError("max-entries-or-age-required", {
        moduleName: "serwist",
        className: "CacheExpiration",
        funcName: "constructor"
      });
      if (config.maxEntries) finalAssertExports.isType(config.maxEntries, "number", {
        moduleName: "serwist",
        className: "CacheExpiration",
        funcName: "constructor",
        paramName: "config.maxEntries"
      });
      if (config.maxAgeSeconds) finalAssertExports.isType(config.maxAgeSeconds, "number", {
        moduleName: "serwist",
        className: "CacheExpiration",
        funcName: "constructor",
        paramName: "config.maxAgeSeconds"
      });
    }
    this._maxEntries = config.maxEntries;
    this._maxAgeSeconds = config.maxAgeSeconds;
    this._matchOptions = config.matchOptions;
    this._cacheName = cacheName;
    this._timestampModel = new CacheTimestampsModel(cacheName);
  }
  /**
  * Expires entries for the given cache and given criteria.
  */
  async expireEntries() {
    if (this._isRunning) {
      this._rerunRequested = true;
      return;
    }
    this._isRunning = true;
    const minTimestamp = this._maxAgeSeconds ? Date.now() - this._maxAgeSeconds * 1e3 : 0;
    const urlsExpired = await this._timestampModel.expireEntries(minTimestamp, this._maxEntries);
    const cache = await self.caches.open(this._cacheName);
    for (const url of urlsExpired) await cache.delete(url, this._matchOptions);
    if (true) if (urlsExpired.length > 0) {
      logger.groupCollapsed(`Expired ${urlsExpired.length} ${urlsExpired.length === 1 ? "entry" : "entries"} and removed ${urlsExpired.length === 1 ? "it" : "them"} from the '${this._cacheName}' cache.`);
      logger.log(`Expired the following ${urlsExpired.length === 1 ? "URL" : "URLs"}:`);
      for (const url of urlsExpired) logger.log(`    ${url}`);
      logger.groupEnd();
    } else logger.debug("Cache expiration ran and found no entries to remove.");
    this._isRunning = false;
    if (this._rerunRequested) {
      this._rerunRequested = false;
      this.expireEntries();
    }
  }
  /**
  * Updates the timestamp for the given URL, allowing it to be correctly
  * tracked by the class.
  *
  * @param url
  */
  async updateTimestamp(url) {
    if (true) finalAssertExports.isType(url, "string", {
      moduleName: "serwist",
      className: "CacheExpiration",
      funcName: "updateTimestamp",
      paramName: "url"
    });
    await this._timestampModel.setTimestamp(url, Date.now());
  }
  /**
  * Checks if a URL has expired or not before it's used.
  *
  * This looks the timestamp up in IndexedDB and can be slow.
  *
  * Note: This method does not remove an expired entry, call
  * `expireEntries()` to remove such entries instead.
  *
  * @param url
  * @returns
  */
  async isURLExpired(url) {
    if (!this._maxAgeSeconds) {
      if (true) throw new SerwistError("expired-test-without-max-age", {
        methodName: "isURLExpired",
        paramName: "maxAgeSeconds"
      });
      return false;
    }
    const timestamp = await this._timestampModel.getTimestamp(url);
    const expireOlderThan = Date.now() - this._maxAgeSeconds * 1e3;
    return timestamp !== void 0 ? timestamp < expireOlderThan : true;
  }
  /**
  * Removes the IndexedDB used to keep track of cache expiration metadata.
  */
  async delete() {
    this._rerunRequested = false;
    await this._timestampModel.expireEntries(Number.POSITIVE_INFINITY);
  }
};
var registerQuotaErrorCallback = (callback) => {
  if (true) finalAssertExports.isType(callback, "function", {
    moduleName: "@serwist/core",
    funcName: "register",
    paramName: "callback"
  });
  quotaErrorCallbacks.add(callback);
  if (true) logger.log("Registered a callback to respond to quota errors.", callback);
};
var ExpirationPlugin = class {
  _config;
  _cacheExpirations;
  /**
  * @param config
  */
  constructor(config = {}) {
    if (true) {
      if (!(config.maxEntries || config.maxAgeSeconds)) throw new SerwistError("max-entries-or-age-required", {
        moduleName: "serwist",
        className: "ExpirationPlugin",
        funcName: "constructor"
      });
      if (config.maxEntries) finalAssertExports.isType(config.maxEntries, "number", {
        moduleName: "serwist",
        className: "ExpirationPlugin",
        funcName: "constructor",
        paramName: "config.maxEntries"
      });
      if (config.maxAgeSeconds) finalAssertExports.isType(config.maxAgeSeconds, "number", {
        moduleName: "serwist",
        className: "ExpirationPlugin",
        funcName: "constructor",
        paramName: "config.maxAgeSeconds"
      });
      if (config.maxAgeFrom) finalAssertExports.isType(config.maxAgeFrom, "string", {
        moduleName: "serwist",
        className: "ExpirationPlugin",
        funcName: "constructor",
        paramName: "config.maxAgeFrom"
      });
    }
    this._config = config;
    this._cacheExpirations = /* @__PURE__ */ new Map();
    if (!this._config.maxAgeFrom) this._config.maxAgeFrom = "last-fetched";
    if (this._config.purgeOnQuotaError) registerQuotaErrorCallback(() => this.deleteCacheAndMetadata());
  }
  /**
  * A simple helper method to return a CacheExpiration instance for a given
  * cache name.
  *
  * @param cacheName
  * @returns
  * @private
  */
  _getCacheExpiration(cacheName) {
    if (cacheName === cacheNames.getRuntimeName()) throw new SerwistError("expire-custom-caches-only");
    let cacheExpiration = this._cacheExpirations.get(cacheName);
    if (!cacheExpiration) {
      cacheExpiration = new CacheExpiration(cacheName, this._config);
      this._cacheExpirations.set(cacheName, cacheExpiration);
    }
    return cacheExpiration;
  }
  /**
  * A lifecycle callback that will be triggered automatically when a
  * response is about to be returned from a [`Cache`](https://developer.mozilla.org/en-US/docs/Web/API/Cache).
  * It allows the response to be inspected for freshness and
  * prevents it from being used if the response's `Date` header value is
  * older than the configured `maxAgeSeconds`.
  *
  * @param options
  * @returns `cachedResponse` if it is fresh and `null` if it is stale or
  * not available.
  * @private
  */
  cachedResponseWillBeUsed({ event, cacheName, request, cachedResponse }) {
    if (!cachedResponse) return null;
    const isFresh = this._isResponseDateFresh(cachedResponse);
    const cacheExpiration = this._getCacheExpiration(cacheName);
    const isMaxAgeFromLastUsed = this._config.maxAgeFrom === "last-used";
    const done = (async () => {
      if (isMaxAgeFromLastUsed) await cacheExpiration.updateTimestamp(request.url);
      await cacheExpiration.expireEntries();
    })();
    try {
      event.waitUntil(done);
    } catch {
      if (true) {
        if (event instanceof FetchEvent) logger.warn(`Unable to ensure service worker stays alive when updating cache entry for '${getFriendlyURL(event.request.url)}'.`);
      }
    }
    return isFresh ? cachedResponse : null;
  }
  /**
  * @param cachedResponse
  * @returns
  * @private
  */
  _isResponseDateFresh(cachedResponse) {
    if (this._config.maxAgeFrom === "last-used") return true;
    const now = Date.now();
    if (!this._config.maxAgeSeconds) return true;
    const dateHeaderTimestamp = this._getDateHeaderTimestamp(cachedResponse);
    if (dateHeaderTimestamp === null) return true;
    return dateHeaderTimestamp >= now - this._config.maxAgeSeconds * 1e3;
  }
  /**
  * Extracts the `Date` header and parse it into an useful value.
  *
  * @param cachedResponse
  * @returns
  * @private
  */
  _getDateHeaderTimestamp(cachedResponse) {
    if (!cachedResponse.headers.has("date")) return null;
    const dateHeader = cachedResponse.headers.get("date");
    const headerTime = new Date(dateHeader).getTime();
    if (Number.isNaN(headerTime)) return null;
    return headerTime;
  }
  /**
  * A lifecycle callback that will be triggered automatically when an entry is added
  * to a cache.
  *
  * @param options
  * @private
  */
  async cacheDidUpdate({ cacheName, request }) {
    if (true) {
      finalAssertExports.isType(cacheName, "string", {
        moduleName: "serwist",
        className: "Plugin",
        funcName: "cacheDidUpdate",
        paramName: "cacheName"
      });
      finalAssertExports.isInstance(request, Request, {
        moduleName: "serwist",
        className: "Plugin",
        funcName: "cacheDidUpdate",
        paramName: "request"
      });
    }
    const cacheExpiration = this._getCacheExpiration(cacheName);
    await cacheExpiration.updateTimestamp(request.url);
    await cacheExpiration.expireEntries();
  }
  /**
  * Deletes the underlying `Cache` instance associated with this instance and the metadata
  * from IndexedDB used to keep track of expiration details for each `Cache` instance.
  *
  * When using cache expiration, calling this method is preferable to calling
  * `caches.delete()` directly, since this will ensure that the IndexedDB
  * metadata is also cleanly removed and that open IndexedDB instances are deleted.
  *
  * Note that if you're *not* using cache expiration for a given cache, calling
  * `caches.delete()` and passing in the cache's name should be sufficient.
  * There is no Serwist-specific method needed for cleanup in that case.
  */
  async deleteCacheAndMetadata() {
    for (const [cacheName, cacheExpiration] of this._cacheExpirations) {
      await self.caches.delete(cacheName);
      await cacheExpiration.delete();
    }
    this._cacheExpirations = /* @__PURE__ */ new Map();
  }
};
var QUEUE_NAME = "serwist-google-analytics";
var MAX_RETENTION_TIME2 = 2880;
var COLLECT_PATHS_REGEX = /^\/(\w+\/)?collect/;
var createOnSyncCallback = (config) => {
  return async ({ queue }) => {
    let entry;
    while (entry = await queue.shiftRequest()) {
      const { request, timestamp } = entry;
      const url = new URL(request.url);
      try {
        const params = request.method === "POST" ? new URLSearchParams(await request.clone().text()) : url.searchParams;
        const originalHitTime = timestamp - (Number(params.get("qt")) || 0);
        const queueTime = Date.now() - originalHitTime;
        params.set("qt", String(queueTime));
        if (config.parameterOverrides) for (const param of Object.keys(config.parameterOverrides)) {
          const value = config.parameterOverrides[param];
          params.set(param, value);
        }
        if (typeof config.hitFilter === "function") config.hitFilter.call(null, params);
        await fetch(new Request(url.origin + url.pathname, {
          body: params.toString(),
          method: "POST",
          mode: "cors",
          credentials: "omit",
          headers: { "Content-Type": "text/plain" }
        }));
        if (true) logger.log(`Request for '${getFriendlyURL(url.href)}' has been replayed`);
      } catch (err) {
        await queue.unshiftRequest(entry);
        if (true) logger.log(`Request for '${getFriendlyURL(url.href)}' failed to replay, putting it back in the queue.`);
        throw err;
      }
    }
    if (true) logger.log("All Google Analytics request successfully replayed; the queue is now empty!");
  };
};
var createCollectRoutes = (bgSyncPlugin) => {
  const match = ({ url }) => url.hostname === "www.google-analytics.com" && COLLECT_PATHS_REGEX.test(url.pathname);
  const handler = new NetworkOnly({ plugins: [bgSyncPlugin] });
  return [new Route(match, handler, "GET"), new Route(match, handler, "POST")];
};
var createAnalyticsJsRoute = (cacheName) => {
  const match = ({ url }) => url.hostname === "www.google-analytics.com" && url.pathname === "/analytics.js";
  return new Route(match, new NetworkFirst({ cacheName }), "GET");
};
var createGtagJsRoute = (cacheName) => {
  const match = ({ url }) => url.hostname === "www.googletagmanager.com" && url.pathname === "/gtag/js";
  return new Route(match, new NetworkFirst({ cacheName }), "GET");
};
var createGtmJsRoute = (cacheName) => {
  const match = ({ url }) => url.hostname === "www.googletagmanager.com" && url.pathname === "/gtm.js";
  return new Route(match, new NetworkFirst({ cacheName }), "GET");
};
var initializeGoogleAnalytics = ({ serwist: serwist2, cacheName, ...options }) => {
  const resolvedCacheName = cacheNames.getGoogleAnalyticsName(cacheName);
  const bgSyncPlugin = new BackgroundSyncPlugin(QUEUE_NAME, {
    maxRetentionTime: MAX_RETENTION_TIME2,
    onSync: createOnSyncCallback(options)
  });
  const routes = [
    createGtmJsRoute(resolvedCacheName),
    createAnalyticsJsRoute(resolvedCacheName),
    createGtagJsRoute(resolvedCacheName),
    ...createCollectRoutes(bgSyncPlugin)
  ];
  for (const route of routes) serwist2.registerRoute(route);
};
var PrecacheFallbackPlugin = class {
  _fallbackUrls;
  _serwist;
  /**
  * Constructs a new instance with the associated `fallbackUrls`.
  *
  * @param config
  */
  constructor({ fallbackUrls, serwist: serwist2 }) {
    this._fallbackUrls = fallbackUrls;
    this._serwist = serwist2;
  }
  /**
  * @returns The precache response for one of the fallback URLs, or `undefined` if
  * nothing satisfies the conditions.
  * @private
  */
  async handlerDidError(param) {
    for (const fallback of this._fallbackUrls) if (typeof fallback === "string") {
      const fallbackResponse = await this._serwist.matchPrecache(fallback);
      if (fallbackResponse !== void 0) return fallbackResponse;
    } else if (fallback.matcher(param)) {
      const fallbackResponse = await this._serwist.matchPrecache(fallback.url);
      if (fallbackResponse !== void 0) return fallbackResponse;
    }
  }
};
var CacheFirst = class extends Strategy {
  /**
  * @private
  * @param request A request to run this strategy for.
  * @param handler The event that triggered the request.
  * @returns
  */
  async _handle(request, handler) {
    const logs = [];
    if (true) finalAssertExports.isInstance(request, Request, {
      moduleName: "serwist",
      className: this.constructor.name,
      funcName: "makeRequest",
      paramName: "request"
    });
    let response = await handler.cacheMatch(request);
    let error;
    if (!response) {
      if (true) logs.push(`No response found in the '${this.cacheName}' cache. Will respond with a network request.`);
      try {
        response = await handler.fetchAndCachePut(request);
      } catch (err) {
        if (err instanceof Error) error = err;
      }
      if (true) if (response) logs.push("Got response from network.");
      else logs.push("Unable to get a response from the network.");
    } else if (true) logs.push(`Found a cached response in the '${this.cacheName}' cache.`);
    if (true) {
      logger.groupCollapsed(messages2.strategyStart(this.constructor.name, request));
      for (const log of logs) logger.log(log);
      messages2.printFinalResponse(response);
      logger.groupEnd();
    }
    if (!response) throw new SerwistError("no-response", {
      url: request.url,
      error
    });
    return response;
  }
};
var StaleWhileRevalidate = class extends Strategy {
  /**
  * @param options
  */
  constructor(options = {}) {
    super(options);
    if (!this.plugins.some((p) => "cacheWillUpdate" in p)) this.plugins.unshift(cacheOkAndOpaquePlugin);
  }
  /**
  * @private
  * @param request A request to run this strategy for.
  * @param handler The event that triggered the request.
  * @returns
  */
  async _handle(request, handler) {
    const logs = [];
    if (true) finalAssertExports.isInstance(request, Request, {
      moduleName: "serwist",
      className: this.constructor.name,
      funcName: "handle",
      paramName: "request"
    });
    const fetchAndCachePromise = handler.fetchAndCachePut(request).catch(() => {
    });
    handler.waitUntil(fetchAndCachePromise);
    let response = await handler.cacheMatch(request);
    let error;
    if (response) {
      if (true) logs.push(`Found a cached response in the '${this.cacheName}' cache. Will update with the network response in the background.`);
    } else {
      if (true) logs.push(`No response found in the '${this.cacheName}' cache. Will wait for the network response.`);
      try {
        response = await fetchAndCachePromise;
      } catch (err) {
        if (err instanceof Error) error = err;
      }
    }
    if (true) {
      logger.groupCollapsed(messages2.strategyStart(this.constructor.name, request));
      for (const log of logs) logger.log(log);
      messages2.printFinalResponse(response);
      logger.groupEnd();
    }
    if (!response) throw new SerwistError("no-response", {
      url: request.url,
      error
    });
    return response;
  }
};
var PrecacheRoute = class extends Route {
  /**
  * @param serwist A {@linkcode Serwist} instance.
  * @param options Options to control how requests are matched
  * against the list of precached URLs.
  */
  constructor(serwist2, options) {
    const match = ({ request }) => {
      const urlsToCacheKeys = serwist2.getUrlsToPrecacheKeys();
      for (const possibleURL of generateURLVariations(request.url, options)) {
        const cacheKey = urlsToCacheKeys.get(possibleURL);
        if (cacheKey) return {
          cacheKey,
          integrity: serwist2.getIntegrityForPrecacheKey(cacheKey)
        };
      }
      if (true) logger.debug(`Precaching did not find a match for ${getFriendlyURL(request.url)}.`);
    };
    super(match, serwist2.precacheStrategy);
  }
};
var PrecacheCacheKeyPlugin = class {
  _precacheController;
  constructor({ precacheController }) {
    this._precacheController = precacheController;
  }
  cacheKeyWillBeUsed = async ({ request, params }) => {
    const cacheKey = params?.cacheKey || this._precacheController.getPrecacheKeyForUrl(request.url);
    return cacheKey ? new Request(cacheKey, { headers: request.headers }) : request;
  };
};
var parsePrecacheOptions = (serwist2, precacheOptions = {}) => {
  const { cacheName: precacheCacheName, plugins: precachePlugins = [], fetchOptions: precacheFetchOptions, matchOptions: precacheMatchOptions, fallbackToNetwork: precacheFallbackToNetwork, directoryIndex: precacheDirectoryIndex, ignoreURLParametersMatching: precacheIgnoreUrls, cleanURLs: precacheCleanUrls, urlManipulation: precacheUrlManipulation, cleanupOutdatedCaches: cleanupOutdatedCaches2, concurrency = 10, navigateFallback, navigateFallbackAllowlist, navigateFallbackDenylist } = precacheOptions ?? {};
  return {
    precacheStrategyOptions: {
      cacheName: cacheNames.getPrecacheName(precacheCacheName),
      plugins: [...precachePlugins, new PrecacheCacheKeyPlugin({ precacheController: serwist2 })],
      fetchOptions: precacheFetchOptions,
      matchOptions: precacheMatchOptions,
      fallbackToNetwork: precacheFallbackToNetwork
    },
    precacheRouteOptions: {
      directoryIndex: precacheDirectoryIndex,
      ignoreURLParametersMatching: precacheIgnoreUrls,
      cleanURLs: precacheCleanUrls,
      urlManipulation: precacheUrlManipulation
    },
    precacheMiscOptions: {
      cleanupOutdatedCaches: cleanupOutdatedCaches2,
      concurrency,
      navigateFallback,
      navigateFallbackAllowlist,
      navigateFallbackDenylist
    }
  };
};
var Serwist = class {
  _urlsToCacheKeys = /* @__PURE__ */ new Map();
  _urlsToCacheModes = /* @__PURE__ */ new Map();
  _cacheKeysToIntegrities = /* @__PURE__ */ new Map();
  _concurrentPrecaching;
  _precacheStrategy;
  _routes;
  _defaultHandlerMap;
  _catchHandler;
  _requestRules;
  constructor({ precacheEntries, precacheOptions, skipWaiting = false, importScripts, navigationPreload = false, cacheId, clientsClaim: clientsClaim$1 = false, runtimeCaching, offlineAnalyticsConfig, disableDevLogs: disableDevLogs$1 = false, fallbacks, requestRules } = {}) {
    const { precacheStrategyOptions, precacheRouteOptions, precacheMiscOptions } = parsePrecacheOptions(this, precacheOptions);
    this._concurrentPrecaching = precacheMiscOptions.concurrency;
    this._precacheStrategy = new PrecacheStrategy(precacheStrategyOptions);
    this._routes = /* @__PURE__ */ new Map();
    this._defaultHandlerMap = /* @__PURE__ */ new Map();
    this._requestRules = requestRules;
    this.handleInstall = this.handleInstall.bind(this);
    this.handleActivate = this.handleActivate.bind(this);
    this.handleFetch = this.handleFetch.bind(this);
    this.handleCache = this.handleCache.bind(this);
    if (!!importScripts && importScripts.length > 0) self.importScripts(...importScripts);
    if (navigationPreload) enableNavigationPreload();
    if (cacheId !== void 0) setCacheNameDetails({ prefix: cacheId });
    if (skipWaiting) self.skipWaiting();
    else self.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
    });
    if (clientsClaim$1) clientsClaim();
    if (!!precacheEntries && precacheEntries.length > 0) this.addToPrecacheList(precacheEntries);
    if (precacheMiscOptions.cleanupOutdatedCaches) cleanupOutdatedCaches(precacheStrategyOptions.cacheName);
    this.registerRoute(new PrecacheRoute(this, precacheRouteOptions));
    if (precacheMiscOptions.navigateFallback) this.registerRoute(new NavigationRoute(this.createHandlerBoundToUrl(precacheMiscOptions.navigateFallback), {
      allowlist: precacheMiscOptions.navigateFallbackAllowlist,
      denylist: precacheMiscOptions.navigateFallbackDenylist
    }));
    if (offlineAnalyticsConfig !== void 0) if (typeof offlineAnalyticsConfig === "boolean") offlineAnalyticsConfig && initializeGoogleAnalytics({ serwist: this });
    else initializeGoogleAnalytics({
      ...offlineAnalyticsConfig,
      serwist: this
    });
    if (runtimeCaching !== void 0) {
      if (fallbacks !== void 0) {
        const fallbackPlugin = new PrecacheFallbackPlugin({
          fallbackUrls: fallbacks.entries,
          serwist: this
        });
        runtimeCaching.forEach((cacheEntry) => {
          if (cacheEntry.handler instanceof Strategy && !cacheEntry.handler.plugins.some((plugin) => "handlerDidError" in plugin)) cacheEntry.handler.plugins.push(fallbackPlugin);
        });
      }
      for (const entry of runtimeCaching) this.registerCapture(entry.matcher, entry.handler, entry.method);
    }
    if (disableDevLogs$1) disableDevLogs();
  }
  /**
  * The strategy used to precache assets and respond to `fetch` events.
  */
  get precacheStrategy() {
    return this._precacheStrategy;
  }
  /**
  * A `Map` of HTTP method name (`'GET'`, etc.) to an array of all corresponding registered {@linkcode Route}
  * instances.
  */
  get routes() {
    return this._routes;
  }
  /**
  * Adds Serwist's event listeners for you. Before calling it, add your own listeners should you need to.
  */
  addEventListeners() {
    self.addEventListener("install", this.handleInstall);
    self.addEventListener("activate", this.handleActivate);
    self.addEventListener("fetch", this.handleFetch);
    self.addEventListener("message", this.handleCache);
  }
  /**
  * Adds items to the precache list, removing duplicates and ensuring the information is valid.
  *
  * @param entries Array of entries to precache.
  */
  addToPrecacheList(entries) {
    if (true) finalAssertExports.isArray(entries, {
      moduleName: "serwist",
      className: "Serwist",
      funcName: "addToCacheList",
      paramName: "entries"
    });
    const urlsToWarnAbout = [];
    for (const entry of entries) {
      if (typeof entry === "string") urlsToWarnAbout.push(entry);
      else if (entry && !entry.integrity && entry.revision === void 0) urlsToWarnAbout.push(entry.url);
      const { cacheKey, url } = createCacheKey(entry);
      const cacheMode = typeof entry !== "string" && entry.revision ? "reload" : "default";
      if (this._urlsToCacheKeys.has(url) && this._urlsToCacheKeys.get(url) !== cacheKey) throw new SerwistError("add-to-cache-list-conflicting-entries", {
        firstEntry: this._urlsToCacheKeys.get(url),
        secondEntry: cacheKey
      });
      if (typeof entry !== "string" && entry.integrity) {
        if (this._cacheKeysToIntegrities.has(cacheKey) && this._cacheKeysToIntegrities.get(cacheKey) !== entry.integrity) throw new SerwistError("add-to-cache-list-conflicting-integrities", { url });
        this._cacheKeysToIntegrities.set(cacheKey, entry.integrity);
      }
      this._urlsToCacheKeys.set(url, cacheKey);
      this._urlsToCacheModes.set(url, cacheMode);
    }
    if (urlsToWarnAbout.length > 0) {
      const warningMessage = `Serwist is precaching URLs without revision info: ${urlsToWarnAbout.join(", ")}
This is generally NOT safe. Learn more at https://bit.ly/wb-precache`;
      if (false) console.warn(warningMessage);
      else logger.warn(warningMessage);
    }
  }
  /**
  * Precaches new and updated assets. Call this method from the service worker's
  * `install` event.
  *
  * Note: this method calls `event.waitUntil()` for you, so you do not need
  * to call it yourself in your event handlers.
  *
  * @param event
  * @returns
  */
  handleInstall(event) {
    this.registerRequestRules(event);
    return waitUntil(event, async () => {
      const installReportPlugin = new PrecacheInstallReportPlugin();
      this.precacheStrategy.plugins.push(installReportPlugin);
      await parallel(this._concurrentPrecaching, Array.from(this._urlsToCacheKeys.entries()), async ([url, cacheKey]) => {
        const integrity = this._cacheKeysToIntegrities.get(cacheKey);
        const cacheMode = this._urlsToCacheModes.get(url);
        const request = new Request(url, {
          integrity,
          cache: cacheMode,
          credentials: "same-origin"
        });
        await Promise.all(this.precacheStrategy.handleAll({
          event,
          request,
          url: new URL(request.url),
          params: { cacheKey }
        }));
      });
      const { updatedURLs, notUpdatedURLs } = installReportPlugin;
      if (true) printInstallDetails(updatedURLs, notUpdatedURLs);
      return {
        updatedURLs,
        notUpdatedURLs
      };
    });
  }
  /**
  * Registers request rules using the experimental `InstallEvent.addRoutes()` API.
  * These rules allow bypassing the service worker for specific requests to improve performance.
  *
  * @param event The event object of an `install` event handler.
  * @throws {Error} When the route rules are invalid
  */
  async registerRequestRules(event) {
    if (!this._requestRules) return;
    if (!event?.addRoutes) {
      if (true) logger.warn("Request rules ignored as the Static Routing API is not supported in this browser. See https://caniuse.com/mdn-api_installevent_addroutes for more information.");
      return;
    }
    try {
      if (true) logger.warn("Request rules may not be supported in all browsers as the Static Routing API is experimental. This feature allows bypassing the service worker for specific requests to improve performance. See https://developer.mozilla.org/en-US/docs/Web/API/InstallEvent/addRoutes for more information.");
      await event.addRoutes(this._requestRules);
      this._requestRules = void 0;
    } catch (error) {
      if (true) logger.error(`Failed to register request rules: ${error instanceof Error ? error.message : String(error)}. This may occur if the browser doesn't support the Static Routing API or if the request rules are invalid.`);
      throw error;
    }
  }
  /**
  * Deletes assets that are no longer present in the current precache manifest.
  * Call this method from the service worker's `activate` event.
  *
  * Note: this method calls `event.waitUntil()` for you, so you do not need
  * to call it yourself in your event handlers.
  *
  * @param event
  * @returns
  */
  handleActivate(event) {
    return waitUntil(event, async () => {
      const cache = await self.caches.open(this.precacheStrategy.cacheName);
      const currentlyCachedRequests = await cache.keys();
      const expectedCacheKeys = new Set(this._urlsToCacheKeys.values());
      const deletedCacheRequests = [];
      for (const request of currentlyCachedRequests) if (!expectedCacheKeys.has(request.url)) {
        await cache.delete(request);
        deletedCacheRequests.push(request.url);
      }
      if (true) printCleanupDetails(deletedCacheRequests);
      return { deletedCacheRequests };
    });
  }
  /**
  * Gets a `Response` from an appropriate `Route`'s handler. Call this method
  * from the service worker's `fetch` event.
  * @param event
  */
  handleFetch(event) {
    const { request } = event;
    const responsePromise = this.handleRequest({
      request,
      event
    });
    if (responsePromise) event.respondWith(responsePromise);
  }
  /**
  * Caches new URLs on demand. Call this method from the service worker's
  * `message` event. To trigger the handler, send a message of type `"CACHE_URLS"`
  * alongside a list of URLs that should be cached as `urlsToCache`.
  * @param event
  */
  handleCache(event) {
    if (event.data && event.data.type === "CACHE_URLS") {
      const { payload } = event.data;
      if (true) logger.debug("Caching URLs from the window", payload.urlsToCache);
      const requestPromises = Promise.all(payload.urlsToCache.map((entry) => {
        let request;
        if (typeof entry === "string") request = new Request(entry);
        else request = new Request(...entry);
        return this.handleRequest({
          request,
          event
        });
      }));
      event.waitUntil(requestPromises);
      if (event.ports?.[0]) requestPromises.then(() => event.ports[0].postMessage(true));
    }
  }
  /**
  * Define a default handler that's called when no routes explicitly
  * match the incoming request.
  *
  * Each HTTP method (`'GET'`, `'POST'`, etc.) gets its own default handler.
  *
  * Without a default handler, unmatched requests will go against the
  * network as if there were no service worker present.
  *
  * @param handler A callback function that returns a `Promise` resulting in a `Response`.
  * @param method The HTTP method to associate with this default handler. Each method
  * has its own default. Defaults to `'GET'`.
  */
  setDefaultHandler(handler, method = "GET") {
    this._defaultHandlerMap.set(method, normalizeHandler(handler));
  }
  /**
  * If a {@linkcode Route} throws an error while handling a request, this handler
  * will be called and given a chance to provide a response.
  *
  * @param handler A callback function that returns a `Promise` resulting
  * in a `Response`.
  */
  setCatchHandler(handler) {
    this._catchHandler = normalizeHandler(handler);
  }
  /**
  * Registers a `RegExp`, string, or function with a caching
  * strategy to the router.
  *
  * @param capture If the capture param is a {@linkcode Route} object, all other arguments will be ignored.
  * @param handler A callback function that returns a `Promise` resulting in a `Response`.
  * This parameter is required if `capture` is not a {@linkcode Route} object.
  * @param method The HTTP method to match the route against. Defaults to `'GET'`.
  * @returns The generated {@linkcode Route} object.
  */
  registerCapture(capture, handler, method) {
    const route = parseRoute(capture, handler, method);
    this.registerRoute(route);
    return route;
  }
  /**
  * Registers a {@linkcode Route} with the router.
  *
  * @param route The {@linkcode Route} to register.
  */
  registerRoute(route) {
    if (true) {
      finalAssertExports.isType(route, "object", {
        moduleName: "serwist",
        className: "Serwist",
        funcName: "registerRoute",
        paramName: "route"
      });
      finalAssertExports.hasMethod(route, "match", {
        moduleName: "serwist",
        className: "Serwist",
        funcName: "registerRoute",
        paramName: "route"
      });
      finalAssertExports.isType(route.handler, "object", {
        moduleName: "serwist",
        className: "Serwist",
        funcName: "registerRoute",
        paramName: "route"
      });
      finalAssertExports.hasMethod(route.handler, "handle", {
        moduleName: "serwist",
        className: "Serwist",
        funcName: "registerRoute",
        paramName: "route.handler"
      });
      finalAssertExports.isType(route.method, "string", {
        moduleName: "serwist",
        className: "Serwist",
        funcName: "registerRoute",
        paramName: "route.method"
      });
    }
    if (!this._routes.has(route.method)) this._routes.set(route.method, []);
    this._routes.get(route.method).push(route);
  }
  /**
  * Unregisters a route from the router.
  *
  * @param route The {@linkcode Route} object to unregister.
  */
  unregisterRoute(route) {
    if (!this._routes.has(route.method)) throw new SerwistError("unregister-route-but-not-found-with-method", { method: route.method });
    const routeIndex = this._routes.get(route.method).indexOf(route);
    if (routeIndex > -1) this._routes.get(route.method).splice(routeIndex, 1);
    else throw new SerwistError("unregister-route-route-not-registered");
  }
  /**
  * Returns a mapping of a precached URL to the corresponding cache key, taking
  * into account the revision information for the URL.
  *
  * @returns A URL to cache key mapping.
  */
  getUrlsToPrecacheKeys() {
    return this._urlsToCacheKeys;
  }
  /**
  * Returns a list of all the URLs that have been precached by the current
  * service worker.
  *
  * @returns The precached URLs.
  */
  getPrecachedUrls() {
    return [...this._urlsToCacheKeys.keys()];
  }
  /**
  * Returns the cache key used for storing a given URL. If that URL is
  * unversioned, like "/index.html", then the cache key will be the original
  * URL with a search parameter appended to it.
  *
  * @param url A URL whose cache key you want to look up.
  * @returns The versioned URL that corresponds to a cache key
  * for the original URL, or undefined if that URL isn't precached.
  */
  getPrecacheKeyForUrl(url) {
    const urlObject = new URL(url, location.href);
    return this._urlsToCacheKeys.get(urlObject.href);
  }
  /**
  * @param url A cache key whose SRI you want to look up.
  * @returns The subresource integrity associated with the cache key,
  * or undefined if it's not set.
  */
  getIntegrityForPrecacheKey(cacheKey) {
    return this._cacheKeysToIntegrities.get(cacheKey);
  }
  /**
  * This acts as a drop-in replacement for
  * [`cache.match()`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match)
  * with the following differences:
  *
  * - It knows what the name of the precache is, and only checks in that cache.
  * - It allows you to pass in an "original" URL without versioning parameters,
  * and it will automatically look up the correct cache key for the currently
  * active revision of that URL.
  *
  * E.g., `matchPrecache('index.html')` will find the correct precached
  * response for the currently active service worker, even if the actual cache
  * key is `'/index.html?__WB_REVISION__=1234abcd'`.
  *
  * @param request The key (without revisioning parameters)
  * to look up in the precache.
  * @returns
  */
  async matchPrecache(request) {
    const url = request instanceof Request ? request.url : request;
    const cacheKey = this.getPrecacheKeyForUrl(url);
    if (cacheKey) return (await self.caches.open(this.precacheStrategy.cacheName)).match(cacheKey);
  }
  /**
  * Returns a function that looks up `url` in the precache (taking into
  * account revision information), and returns the corresponding `Response`.
  *
  * @param url The precached URL which will be used to lookup the response.
  * @return
  */
  createHandlerBoundToUrl(url) {
    const cacheKey = this.getPrecacheKeyForUrl(url);
    if (!cacheKey) throw new SerwistError("non-precached-url", { url });
    return (options) => {
      options.request = new Request(url);
      options.params = {
        cacheKey,
        ...options.params
      };
      return this.precacheStrategy.handle(options);
    };
  }
  /**
  * Applies the routing rules to a `FetchEvent` object to get a response from an
  * appropriate route.
  *
  * @param options
  * @returns A promise is returned if a registered route can handle the request.
  * If there is no matching route and there's no default handler, `undefined`
  * is returned.
  */
  handleRequest({ request, event }) {
    if (true) finalAssertExports.isInstance(request, Request, {
      moduleName: "serwist",
      className: "Serwist",
      funcName: "handleRequest",
      paramName: "options.request"
    });
    const url = new URL(request.url, location.href);
    if (!url.protocol.startsWith("http")) {
      if (true) logger.debug("Router only supports URLs that start with 'http'.");
      return;
    }
    const sameOrigin = url.origin === location.origin;
    const { params, route } = this.findMatchingRoute({
      event,
      request,
      sameOrigin,
      url
    });
    let handler = route?.handler;
    const debugMessages = [];
    if (true) {
      if (handler) {
        debugMessages.push(["Found a route to handle this request:", route]);
        if (params) debugMessages.push([`Passing the following params to the route's handler:`, params]);
      }
    }
    const method = request.method;
    if (!handler && this._defaultHandlerMap.has(method)) {
      if (true) debugMessages.push(`Failed to find a matching route. Falling back to the default handler for ${method}.`);
      handler = this._defaultHandlerMap.get(method);
    }
    if (!handler) {
      if (true) logger.debug(`No route found for: ${getFriendlyURL(url)}`);
      return;
    }
    if (true) {
      logger.groupCollapsed(`Router is responding to: ${getFriendlyURL(url)}`);
      for (const msg of debugMessages) if (Array.isArray(msg)) logger.log(...msg);
      else logger.log(msg);
      logger.groupEnd();
    }
    let responsePromise;
    try {
      responsePromise = handler.handle({
        url,
        request,
        event,
        params
      });
    } catch (err) {
      responsePromise = Promise.reject(err);
    }
    const catchHandler = route?.catchHandler;
    if (responsePromise instanceof Promise && (this._catchHandler || catchHandler)) responsePromise = responsePromise.catch(async (err) => {
      if (catchHandler) {
        if (true) {
          logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to route's Catch Handler.`);
          logger.error("Error thrown by:", route);
          logger.error(err);
          logger.groupEnd();
        }
        try {
          return await catchHandler.handle({
            url,
            request,
            event,
            params
          });
        } catch (catchErr) {
          if (catchErr instanceof Error) err = catchErr;
        }
      }
      if (this._catchHandler) {
        if (true) {
          logger.groupCollapsed(`Error thrown when responding to:  ${getFriendlyURL(url)}. Falling back to global Catch Handler.`);
          logger.error("Error thrown by:", route);
          logger.error(err);
          logger.groupEnd();
        }
        return this._catchHandler.handle({
          url,
          request,
          event
        });
      }
      throw err;
    });
    return responsePromise;
  }
  /**
  * Checks a request and URL (and optionally an event) against the list of
  * registered routes, and if there's a match, returns the corresponding
  * route along with any params generated by the match.
  *
  * @param options
  * @returns An object with `route` and `params` properties. They are populated
  * if a matching route was found or `undefined` otherwise.
  */
  findMatchingRoute({ url, sameOrigin, request, event }) {
    const routes = this._routes.get(request.method) || [];
    for (const route of routes) {
      let params;
      const matchResult = route.match({
        url,
        sameOrigin,
        request,
        event
      });
      if (matchResult) {
        if (true) {
          if (matchResult instanceof Promise) logger.warn(`While routing ${getFriendlyURL(url)}, an async matchCallback function was used. Please convert the following route to use a synchronous matchCallback function:`, route);
        }
        params = matchResult;
        if (Array.isArray(params) && params.length === 0) params = void 0;
        else if (matchResult.constructor === Object && Object.keys(matchResult).length === 0) params = void 0;
        else if (typeof matchResult === "boolean") params = void 0;
        return {
          route,
          params
        };
      }
    }
    return {};
  }
};

// src/sw.ts
var swScope = self;
var DAY = 24 * 60 * 60;
var MONTH = 30 * DAY;
var onlyGoodResponses = new CacheableResponsePlugin({ statuses: [0, 200] });
var serwist = new Serwist({
  clientsClaim: true,
  navigationPreload: true,
  precacheEntries: [{ url: "/offline.html", revision: "1" }],
  precacheOptions: { cleanupOutdatedCaches: true },
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.mode === "navigate"
      }
    ]
  },
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: "page-cache",
        networkTimeoutSeconds: 3,
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 50,
            maxAgeSeconds: DAY,
            purgeOnQuotaError: true
          })
        ]
      })
    },
    {
      matcher: ({ request, url }) => url.pathname.startsWith("/_next/static/") || ["script", "style", "font", "worker"].includes(request.destination),
      handler: new CacheFirst({
        cacheName: "static-resources",
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 150,
            maxAgeSeconds: MONTH,
            purgeOnQuotaError: true
          })
        ]
      })
    },
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "image-cache",
        plugins: [
          onlyGoodResponses,
          new ExpirationPlugin({
            maxEntries: 60,
            maxAgeSeconds: MONTH,
            purgeOnQuotaError: true
          })
        ]
      })
    }
  ]
});
serwist.addEventListeners();
swScope.addEventListener("push", (ev) => {
  let payload = { title: "Notification" };
  try {
    const parsed = ev.data?.json();
    if (parsed) payload = parsed;
  } catch {
    const text = ev.data?.text();
    if (text) payload = { title: "Notification", body: text };
  }
  ev.waitUntil(
    swScope.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-512.png",
      badge: "/icon-512.png",
      data: { url: payload.url ?? "/" },
      tag: "kan-notification"
    })
  );
});
swScope.addEventListener("notificationclick", (ev) => {
  ev.notification.close();
  const data = ev.notification.data ?? {};
  const targetUrl = data.url ?? "/";
  ev.waitUntil(
    (async () => {
      const allClients = await swScope.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });
      const existing = allClients.find((client) => {
        try {
          return "focus" in client && new URL(client.url).pathname === targetUrl;
        } catch {
          return false;
        }
      });
      if (existing && "focus" in existing) {
        return existing.focus();
      }
      return swScope.clients.openWindow(targetUrl);
    })()
  );
});
