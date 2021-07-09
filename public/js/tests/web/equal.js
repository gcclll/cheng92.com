const isObject = (v) => Type(v) === "[object Object]";
const isArray = (v) => Type(v) === "[object Array]";
const hasOwn = Object.prototype.hasOwnProperty;
const isNum = (v) => typeof v === "number";
const isString = (v) => typeof v === "string";
const isBigInt = (v) => typeof v === "bigint";
const isBool = (v) => typeof v === "boolean";
const isSymbol = (v) => typeof v === "symbol";
const isRef = (v) => typeof v === "object";
const toString = Object.prototype.toString;
const sify = JSON.stringify;
const getType = (v) =>
  toString.call(v).split(" ")[1].slice(0, -1).toLowerCase();

function Type(v) {
  return toString.call(v);
}

function R(x) {
  return x;
}

function strictEqual(x, y) {
  // TODO
  return x === y;
}

function StringToBigInt(v) {
  if (typeof v !== "string") v = "" + v;
  if (isNaN(v)) return NaN;
  if (/[^\d]/g.test(v)) {
    // 包含非数字的都不合法报错
    throw new SyntaxError(`不能将 ${v} 转成 BigInt。`);
  }
  return MyBigInt(v); // 这里直接使用 BigInt
}

function MyBigInt(v) {
  if (this instanceof MyBigInt) {
    throw new TypeError(" 不支持 new 操作。");
  }
  let prim = ToPrimitive(v, "number");
  if (typeof prim === "number") {
    return NumberToBigInt(prim);
  }
  return BigInt(v);
}

function NumberToBigInt(v) {
  return BigInt(v);
}

var logPrimitive = "";
function ToPrimitive(x, ref) {
  if (!isRef(x)) return x;
  const xs = sify(x);
  if (isString(ref) || ref === "string") {
    logPrimitive = `<p>ToPrimitive: object ${xs} to string</p>`;
    return "" + x;
  } else if (isNum(ref) || ref === "number") {
    logPrimitive = `<p>ToPrimitive: object ${xs} to number</p>`;
    return +x;
  } else if (isBigInt(ref)) {
    logPrimitive = `<p>ToPrimitive: object ${xs} to bigint</p>`;
    if (isNum(x)) {
      logPrimitive = "<p><font color='red'>BigInt 不能转成 number</font></p>";
      throw new TypeError(logPrimitive);
    } else if (isString(x)) {
      return "" + x;
    }
  } else if (isSymbol(ref)) {
    logPrimitive = `<p>ToPrimitive: object ${xs} to symbol</p>`;
    return Symbol(x);
  }
}

// 非严格相等， == 的实现
function equal(x, y) {
  // 类型一样就直接返回 x === y 的结果
  if (Type(x) === Type(y)) {
    return strictEqual(x, y);
  }

  // 1. 即 null == undefined => true
  if ((x === null && y === undefined) || (x === undefined && y === null)) {
    return true;
  }

  // 2. 内部属性无法直接获取，这里到时候使用对象普通属性模拟
  if (isObject(x) && hasOwn(x, "[[IsHTMLDDA]]")) {
    if (y === null || y === undefined) {
      return true;
    }
  }

  if (isObject(y) && hasOwn(y, "[[IsHTMLDDA]]")) {
    if (x === null || x === undefined) {
      return true;
    }
  }

  // 3. 如果其中有一个是字符串，将字符串转成数字之后进行比较
  if (isNum(x) && isString(y)) {
    return strictEqual(x, ToNumber(y));
  }

  if (isString(x) && isNum(y)) {
    return strictEqual(ToNumber(x), y);
  }

  // 4. BigInt 类型和字符串比较，将字符串转成 BigInt 类型
  if (isBigInt(x) && isString(y)) {
    let n = StringToBigInt(y);
    if (isNaN(n)) {
      return false;
    }
    return equal(x, n);
  }

  if (isString(x) && isBigInt(y)) {
    return equal(y, x);
  }

  console.log(x, typeof x, "xxx");
  // 5. 如果是布尔类型转成数字再进行比较
  if (isBool(x)) {
    return equal(ToNumber(x), y);
  }
  if (isBool(y)) {
    return equal(x, ToNumber(y));
  }

  // 6. 如果其中有一个是引用类型，将其转成原始类型再比较
  if (isRef(y) && (isString(x) || isNum(x) || isBigInt(x) || isSymbol(x))) {
    return equal(x, ToPrimitive(y, x));
  }

  if (isRef(x) && (isString(y) || isNum(y) || isBigInt(y) || isSymbol(y))) {
    return equal(ToPrimitive(x, y), y);
  }

  // 7. BigInt 和 Number 类型
  if (isBigInt(x) && isNum(y)) {
    if (isNaN(x) || strictEqual(x, +Infinity) || strictEqual(x === -Infinity)) {
      return false;
    }
    if (isNaN(y) || strictEqual(y, +Infinity) || strictEqual(y === -Infinity)) {
      return false;
    }

    return equal(R(x), R(y));
  }

  return false;
}

var logNumber = "";
// 转成数字
function ToNumber(v) {
  if (v === undefined) {
    logNumber = `<p>ToNumber: undefined to number<p>`;
    return NaN;
  } else if (v === null) {
    logNumber = `<p>ToNumber: null to number<p>`;
    return +0;
  } else if (v === true) {
    logNumber = `<p>ToNumber: true to number<p>`;
    return 1;
  } else if (v === false) {
    logNumber = `<p>ToNumber: false to number</p>`;
    return +0;
  } else if (isNum(v)) {
    logNumber = `<p>ToNumber: number to number</p>`;
    return v;
  } else if (isString(v)) {
    logNumber = `<p>ToNumber: string ${v} to number</p>`;
    return Number(v); // TODO
  } else if (isSymbol(v)) {
    const error =
      "<p><font color='red'>ToNumber: Symbol cannot convert to number.</p></font>";
    logNumber = s;
    throw new TypeError(error);
  } else if (isBigInt(v)) {
    logNumber = `<p>ToNumber: bigint ${v} to number</p>`;
    return Number(v);
  } else if (isRef(v)) {
    logNumber = `<p>ToNumber: object ${JSON.stringify(v)} to number</p>`;
    const primValue = ToPrimitive(v, "number");
    return ToNumber(primValue);
  }
  return v;
}

var logError = "";
function tryCatch(fn) {
  let val;
  try {
    val = fn();
  } catch (e) {
    logError = e.message;
  }
  return val;
}

function showStr(v) {
  if (isBigInt(v)) {
    return "" + v + "n";
  }
  if (isArray(v)) {
    return `[${showStr(v[0])}]`;
  }
  return typeof v === "string"
    ? `"${v}"`
    : typeof v === "object"
      ? JSON.stringify(v)
      : typeof v === "boolean"
        ? "" + v
        : v;
}

// equal = (x, y) => tryCatch(() => equal(x, y));

function clearLogInfo() {
  logNumber = "";
  logPrimitive = "";
  logError = "";
}

function getLogInfo() {
  const v = logNumber + logPrimitive + logError;
  clearLogInfo();
  return v;
}
try {
  module.exports = {
    equal,
    tryCatch,
    getType,
    showStr,
  };
} catch (e) {
  console.warn(e.message);
}
