---
title: "Javascript ECMA 6 Plus"
date: 2020-08-28T15:42:38+08:00
tags: ["javascript", "es6"]
categories: ["javascript"]
---

> 参考链接：<https://leanpub.com/understandinges6/read>  

# 简介

JavaScript 核心特性在 [ECMA-262](https://tc39.github.io/ecma262/) 标准中被定义，也叫做 `ECMAScript` ，我们所熟知的在浏览器端和 `Node.js` 实际上是 ECMAScript 的一个超集。  

本文包含 es6+ 新增特性。

<!-- more -->

## ES6 演变之路

### 1999 发布 v3

1999.TC39 年发布了 ECMA-262 第三版。  

直到 2007 之前都没有任何变化。  

### 2007 发布 v4, v3.1

2007 年发布了第四版，包含以下特性：  

-   新语法(new syntax)
-   模块(modules)
-   类概念(classes)
-   类继承概念(classical inheritance)
-   对象私有属性(private object members)
-   更多类型
-   其他

由于第四版涉及的内容太多，因此造成分歧，部分成员由此创建了  

3.1 版本，只包含少部分的语法变化，聚焦在：  

-   属性
-   原生 JSON 支持
-   已有对象增加方法

但是两拨人在 v4 和 v3.1 版本之间并没有达成共识，导致最后不了了之。  

### 2008 JavaScript 创始人决定

[Brendan Eich](https://en.wikipedia.org/wiki/Brendan_Eich) 决定将着力于 v3.1 版本。  

最后 v3.1 作为 `ECMA-262` 的第五个版本被标准化，即： `ECMASCript 5`  

### 2015 年发布 ECMAScript 6 也叫 ECMAScript 2015

即本书要讲的内容(ES6)。  

# 块级绑定(var, let, const)

## Var 声明和提升

使用 `var` 来声明变量时，在一个作用域内，无论它在哪里声明的，都会被升到到该作  
用域的顶部。  

比如：  

```js
function getValue(condition) {
  // 比如： var value; // undefined

  if (condition) {
    // 虽然在这里声明的，其实会被提升到函数顶端
    var value = 'blue'

    // code

    return value
  } else {
    // 这里依旧可以访问变量 `value` 只不过它的值是 `undefined`
    return null
  }
}

console.log(getValue(false)) // 'null'
```

上面的 `getValue` 相当于下面的变量声明版本（提升之后）：  

```js
function getValue(condition) {
  var value; // undefined

  if (condition) {
    value = 'blue'

    // code

    return value
  } else {
    return null
  }
}

console.log(getValue(false)) // 'null'

```

+RESULTS:  

    null

## 块级声明 let/const 声明

块级作用域，如：函数，\*{ &#x2026; }\* 大括号，等等都属于块级作用域，在该作用域下使  
用 `let` 声明的变量只在  

该作用域下可访问。  

### 声明提升问题

`let` 声明不会被提升，但是也有另一种说法是 **let** 会提升，并且在如果在提升处  
到赋值的中间范围内使用了该变量，  

会使该区域成为一块临时死区(TDZ)。  

在声明之前使用 let 变量：  

**VM88:4 Uncaught ReferenceError: Cannot access 'value' before  
initialization**  

```js
function getValue(cond) {

  if (cond) {
    console.log(value)
    let value = 'blue'

    // code

    return value
  } else {
    // value 在该作用域不存在

    return null
  }

  // value 在该作用域不存在
}

getValue(true)

```

### 不能重复声明

使用 `var` 的时候是可以重复声明的：  

`var count = 39; var count;`  

这样是不会有问题的，只不过它的声明只会被记录一次而已，即只会记录 `var count
    = 39;` 这里声明，但是不会出现异常。  

如果使用 `let` 就不一样了，如果出现重复声明则会异常：  

`var count = 39;let count;`  

异常结果：\*SyntaxError: Identifier 'count' has already been declared\*  

### 两者差别

let 声明的值可变，const 声明的是个常量，值是不能发生改变的。  

```js
let name = 'xxx';

name = 'yyy'; // ok

const age = 100;

age = 88; // error
```

### 临时死区(TDZ)

使用 `let/const` 声明的变量，任何时候试图在其声明之前使用变量都会抛出异常。  

即使是在声明之前使用 `typeof` 也会出现引用异常(ReferenceError)。  

```js
if (true) {
  console.log(typeof value)
  let value = 'blue'
}

```

![img](http://qiniu.ii6g.com/1560691097.png)  

### 循环中使用块级声明

我们都知道使用 `var` 声明的变量是不存在块级作用域的，即在 *if/for* 的 {} 作  
用域内使用 `var`  

声明的变量其实是该全局作用下的全局变量。  

比如：我们常见的 `for` 循环中的 `i` 的值  

```js
for (var i = 0; i < 10; i++) {
  // ...
}

console.log(i) // 10
```

+RESULTS:  

    10

结果为 **10** 表明在 `console.log(i)` 处是可以访问 `i` 变量的，因为 `var i =
    0;` 的声明  

被提升成了全局变量，即循环体中使用的一直是这一份全局变量。  

如果是同步代码，可能没什么问题，但要是异步代码就会出现问题，如下结果：  

```js
for (var i = 0; i < 5; i++) {
  setTimeout(() => console.log(i))
}
```

+RESULTS:  

    5
    5
    5
    5
    5

很遗憾最后结果都成了 5，因为循环体是个异步代码 `setTimeout`  

解决方法有：  

-   闭包:

形成一个封闭的作用域，将当前的 `i` 值传递进去。  

```js
for (var i = 0; i < 5; i++) {
  (v => {
    // 这里的 v 值即传递进来的当前次循环的 i 的值
    setTimeout(() => console.log(v))
  })(i)
}
```

+RESULTS:  

    0
    1
    2
    3
    4

-   let

每次循环相当于新创建了一个变量，因此变量的值都得以保存。  

```js
for (let i = 0; i < 5; i++) {
  setTimeout(() => console.log(i))
}
```

+RESULTS:  

    0
    1
    2
    3
    4

### 全局作用域声明

var, let, const 另一个区别是在全局环境下的声明作用域也是不一样，  

我们都知道在全局作用域下使用 `var` 声明的话，浏览器端是可以通过 window.name  
来访问该变量的，但是 let, const 却不行。  

```js
var age = 100

let name = 'xxx'

console.log(window.name)
console.log(window.age)
```

结果：  

![img](http://qiniu.ii6g.com/1560735450.png)  

浏览器端作用域：  

![img](http://qiniu.ii6g.com/1560735987.png)  

**结论：**  

无论 `let` 在那里声明的它都是个块级作用域变量，只在其声明到该作用域之后才能  
使用。  

而 `var` 声明的始终相对于当前作用域下是全局变量。  

## 总结(var, let, const)

在 es6 之后尽量使用 let 和 const 去声明变量，严格控制变量的作用域。  

1.  var 变量声明会提升，可重复声明，且在该作用域内为全局变量
2.  let/const 变量声明不会提升，不可重复声明，局部变量，且在 DTZ 范围内使用即  
    使是 typeof 也会报错
3.  let/const 区别在于 const 声明的变量值不能发生改变

| 关键词  | 提升                                 | 作用域                           | 值属性 |
| ------- | ------------------------------------ | -------------------------------- | ------ |
| `var`   | 有提升，声明提升(命名函数定义也提升) | 范围内全局                       | 可变   |
| `let`   | 无提升                               | 局部变量，作用域内声明处开始往下 | 可变   |
| `const` | 无提升                               | 局部变量，作用域内声明处开始往下 | 不可变 |

# 字符串和正则表达式(String&Regex)

## 更好的 Unicode 编码支持<a id="org952d340"></a>

### UTF-16 编码

### 新增 str.codePointAt(n) 和 String.fromCodePoint(str)

已有的编码查询函数： str.charCodeAt 和 String.fromCodeAt 用来应对单字符一个  
字节的情况。  

新增的两个函数可以处理单个字符串占两个字节的大小，比如一些特殊字符“𠮷”需要用  
到两个字节来存储。  

即 2bytes = 16bits 大小。  

charCodeAt 和 fromCodeAt 是以一个字节为单位来处理字符串的，因此如果遇到这些  
字就没法正常处理。  

```js
var name = '𠮷'

console.log(name.charCodeAt(0))
console.log(name.codePointAt(0))
console.log(String.fromCharCode(name.charCodeAt(0)))
console.log(String.fromCodePoint(name.codePointAt(0)))

```

+RESULTS:  

    55362
    134071
    �
    𠮷

可以看到如果我们还用原来的函数 charCodeAt 和 fromCharCode 去处理这个字得到结  
果是不正确的。  

### normalize() 函数

参考链接：<https://www.cnblogs.com/hahazexia/p/9257409.html>  

### repeat(n) 函数

将一个字符串重复 n 次后返回。  

```js
var c = 'x'

var b = c.repeat(3)

console.log(b, c, b === c)
```

+RESULTS:  

    xxx x false

## 正则表达式

### y 标记

### s(dotAll)flag<sup>2018</sup>

```js
console.log(/one.two/.test('one\ntwo'));     // → false
console.log(/one.two/s.test('one\ntwo'));    // → true
```

### 命名捕获组(Named Caputre Groups)<sup>2018</sup>

格式： `?<name>`  

引用： `match.groups` 一个包含捕获组名称的对象  

```js
const re = /(\d{4})-(\d{2})-(\d{2})/
const match = re.exec('2019-10-10')

console.log(match[0]) // -> 2019-10-10
console.log(match[1]) // -> 2019
console.log(match[2]) // -> 10
console.log(match[3]) // -> 10

```

命名捕获组：  

```js

const namedRe = /(?<year>\d{4})-(?<month>\d{2})-(?<date>\d{2})/
const namedMatch = namedRe.exec('2019-10-10')
console.log(namedMatch.groups) // { year: '2019', month: '10', date: '10' }
console.log(namedMatch.groups.year) // 2019
console.log(namedMatch.groups.month) // 10
console.log(namedMatch.groups.date) // 10
```

## JSON

### JSON.stringify<sup>2019</sup>

更好的处理不支持的字符序列。  

![img](https://miro.medium.com/max/605/1*1avfy0C8OcP71XsBBCmuOA.png)  

## 字符串方法

### String.prototype.trimStart()<sup>2019</sup>

### String.prototype.trimEnd()<sup>2019</sup>

### String.prototype.toString()<sup>2019</sup>

更好的处理空格，换行符等特殊字符，比如：字符串化函数的时候，会将函数原样输出。  

如：  

![img](http://qiniu.ii6g.com/1571574030.png)  

## 模板字符串

### 基本语法

```js
let msg = `hello world`

console.log(msg)
console.log(typeof msg)
console.log(msg.length)
```

+RESULTS:  

    hello world
    string
    11

如果需要用到反引号，则需要使用转义字符： `` \` ``  

### 多行字符串

避免一行太长，进行换行书写，但是不影响最终结果显示在一行，可以使用反斜杠  

```js
var msg = `multiline \
string`

console.log(msg)
```

+RESULTS:  

    multiline string

多行字符串情况：  

```js
var msg = "multiline \n string"

console.log(msg)
```

+RESULTS:  

    multiline
     string

使用模板字符串，会按照模板字符串中的格式原样输出，而不再需要显示使用 \`\n\` 来  
进行换行：  

```js
var msg = `multiline
string`

console.log(msg)
```

+RESULTS:  

    multiline
    string

在模板字符串中空格也会是字符串的一部分  

```js
var msg1 = `multiline
   string`

var msg2 = `multiline
string`

console.log(`len1: ${msg1.length}`)
console.log(`len2: ${msg2.length}`)
```

+RESULTS:  

    len1: 19
    len2: 16

所以在书写模板字符串的时候必须慎重使用缩进。  

### 模板字符串插值

```js
var name = 'xxx'
const getAge = () => 100

console.log(`my name is ${name}`) // 普通字符串
console.log(`3 + 4  = ${3 + 4}`) // 可执行计算
console.log(`call function to get age : ${getAge()}`) // 可调用函数
```

+RESULTS:  

    my name is xxx
    3 + 4  = 7
    call function to get age : 100

### 标签模板

允许使用标签模板，该标签对应的是一个函数，后面的模板字符串会被解析成参数传递  
给该函数去进行处理，最后返回处理的结果。  

比如： `` let msg = tag`Hello World` ``  

**定义标签：**  

```js
function tag(literals, ...substitutions) {
  // 返回一个字符串
}
```

示例：  

```js
let count = 10,
    price = 0.25,
    msg = passthru`${count} items cost $${(count * price).toFixed(2)}.`

function passthru(literals, ...subs) {
  console.log(literals.join('--'))
  console.log(subs)

  // 将结果拼起来

  return subs.map((s, i) => literals[i] + subs[i]).join('')
    + literals[literals.length - 1]
}

console.log(msg)
```

+RESULTS:  

    -- items cost $--.
    [ 10, '2.50' ]
    10 items cost $2.50.

从结果可以看到，标签函数参数的内容分别为:  

1.  literals 被插值(${})分割成的字符串数组，比如上例的结果为： `["", " items
           const $", "."]`
2.  subs 为插值计算的结果值作为第2, &#x2026; 第 n 个参数传递给了 `passthru`

### 标签模板原始值(String.raw())

有时候需要在模板字符串中直接使用带有转义字符的内容，比如： \`\n\` 而不是使用其  
转义之后的含义。  

这个时候则可以使用新增的内置 `tag` 函数来处理。  

比如：  

```js
let msg1 = `multiline\nstring`
let msg2 = String.raw`multileline\nstring`

console.log(msg1)
console.log(msg2)
```

+RESULTS:  

    multiline
    string
    multileline\nstring

可看到在我们使用 `String.raw` 之后的 **\n** 并没有被转义成换行符，而是按照其原  
始的样子输出。  

如果在不适用内置的 `Strng.raw` 该怎么做？  

```js
function raw(literals, ...subs) {

  // 将结果拼起来

  return subs.map((s, i) => literals.raw[i] + subs[i]).join('')
    + literals.raw[literals.length - 1]
}

let msg = raw`multiline\nstring`

console.log(msg)

```

+RESULTS:  

    multiline\nstring

nodejs 环境可能看起来不直观，通过下图我们来直观的查看下标签函数是怎么处理带  
转义字符的字符串的：  

![img](http://qiniu.ii6g.com/1560743558.png)  

会发现其实 `literals` 的值依旧是转义之后的，看数组中第一个元素的字符串中是有  
一个回车标识的。  

此外该数组对象本身上面多了一个 `raw` 属性，其值为没有转义的内容。  

从这里我们得出，标签模板是怎么处理带转义字符串的模板的。  

## 小结

1.  完整的编码支持赋予了 JavaScript 处理 UTF-16 字符的能力(通过  
    `codePointAt()` 和 `String.fromCodePoint()` 来转换)
2.  `u` 新增的标记使得正则表达式可以通过码点来代替 UTF-16 字符
3.  `normalize()`
4.  模板字符串，支持原始字符串，插值支持计算表达式或函数调用
5.  标签模板，第一个参数为分割后的字符串列表，后面的参数分别为插值结果
6.  转义标签模板，转义标签的第一个参数数组对象上包含一个 `raw` 数组，其中包含  
    了原始值列表

# 函数(Function)

## 参数默认值

```js
function makeRequest(url, timeout = 2000, callback = () => {}) {
  // ...
}
```

默认参数值是如何影响 `arguments` 对象的？  

### 严格非严格模式下的 arguments

只要记住一旦使用了默认值，那么 `arguments` 对象的行为将发生改变。  

在 ECMAScript5 的非严格模式下，arguments 对象的内容是会随着函数内部函数参数值得变化而发生变化的，也就是说它  

并不是在调用函数之初值就固定了，比如：  

```js
function maxArgs(first, second) {
  console.log(first === arguments[0])
  console.log(second === arguments[1])
  first = 'c'
  second = 'd'
  console.log(first === arguments[0])
  console.log(second === arguments[1])
}

maxArgs('a', 'b')
```

+RESULTS:  

    true
    true
    true
    true

从结果我们会发现，参数值发生变化也会导致 arguments 对象跟着变化，这种情况只会在非严格模式下产生，  

在严格模式下， arguments 对象是不会随着参数值改变而改变的。  

```js
function maxArgs(first, second) {
  'use strict';

  console.log(first === arguments[0])
  console.log(second === arguments[1])
  first = 'c'
  second = 'd'
  console.log(first === arguments[0])
  console.log(second === arguments[1])
}

maxArgs('a', 'b')

```

+RESULTS:  

    true
    true
    false
    false

喏，后面结果为 *false* 。  

### 带默认参数值情况下 arguments

在 es6 之后，arguments 的行为和之前严格模式下是一样的，即不会映射参数值得变化。  

1.  带默认值得参数，如果在调用的时候不传递，是不会计入到 arguments 对象当中  
  
    即 arguments 的实际个数是根据调用的时候所传递的参数个数来决定的。

2.  arguments 对象不再响应参数值得变化

```js
function mixArgs(first, second = 'b') {
  console.log(arguments.length)
  console.log(first === arguments[0]) // true
  console.log(second === arguments[1]) // false
  first = 'c'
  second = 'd'
  console.log(first === arguments[0]) // false
  console.log(second === arguments[1]) // false
}

mixArgs('a')
```

+RESULTS:  

    1
    true
    false
    false
    false

### 默认参数表达式

参数默认值不仅可以使用静态值，还可以赋值为调用函数的结果  

```js
function getValue() {
  console.log('get value...')
  return 5
}

function add(first, second = getValue()) {
  return first + second
}

console.log(add(1, 1)) // 2
console.log(add(1)) // 6
```

+RESULTS:  

    2
    get value...
    6

从结果显示：  

1.  如果 second 没传，会在调用 `add()` 时候执行 `getValue()` 获取默认值
2.  如果传递了 second，那么 `getValue()` 是不会被执行的

即在默认参数中调用的函数，是由在调用时该对应的函数参数是否有传递来决定是否调用。  

~~而不是传递了 second，先调用 getValue() 得到值，然后用传递的 second 值去覆盖。~~  

也就是说 `getValue()` 返回的值不用每次都一样，是可以在每次调用的时候发生变化的，比如：  

```js
var n = 5

function getValue() {
  return n++
}

function add(first, second = getValue()) {
  return first + second
}

console.log(add(1, 1)) // 2
console.log(add(1)) // 6
console.log(add(1)) // 7
```

+RESULTS:  

    2
    6
    7

由于上面的特性，参数默认值可以是动态的，因此我们可以将前面参数值作为后面参数的默认值来使用，  

比如：  

```js
function add(first, second = first) {
  return first + second
}

console.log(add(1, 1)) // 2
console.log(add(1)) // 2
```

+RESULTS:  

    2
    2

甚至还可以将 first 作为参数传递给 `getValue(first)` 获取新值作为默认值来用。  

### 默认参数值的临时死区(TDZ)

这里临时死区的意思是指，第二个参数在使用之前未进行声明，因为参数的声明相当于使用了 `let` 。  

根据 `let` 的特性，在为声明之前使用属于在 TDZ 范围，会抛异常。  

实例：  

```js
function add(first = second, second) {
  return first + second
}

console.log(add(1, 1)) // 2

try {
  add(undefined, 1) // error
} catch (e) {
  console.log(e.message)
}
```

+RESULTS:  

    2
    second is not defined

既然都存在 TDZ 那为什么第一次调用就没事了，下面来分析下看看：  

记住上一节所讲的：  

<span class="underline">默认值的调用(如： `getValue()` )只有在参数未传递的情况下才会发生，这里 `first=second` 的情况依旧适用。</span>  

那么将这句话应用到这里：  

1.  `add(1, 1)` 这里 first 传递了 1  
  
    那么 first 在 add 被调用的时候会被初始化成 1，根据上面那句话，即此时 `first=second` 这句相当于并没有被执行  
    
    因此就不会去检测 second ，也就不会出现未定义了，从而能得出正确结果：2。

2.  `add(undefined, 1)` 传递了 \`undefined\` 相当于没传这个参数，只是占了个位  
  
    那么既然没传， `first=second` 就会被执行， `second` 就会被检测是否定义，然而检测的结果就是“未定义”，  
    
    因此抛出异常。

将 add 函数参数的变化用下来转声明来表示，问题就会更明显了：  

```js
// add(1, 1)

let first = 1 // first = second 未执行，不检测
let second = 1

// add(undefined, 1)
let first = second // 这句被执行，相当于这里提前使用了 second 变量，let 特性生效
let second = 1
```

> 函数参数是有它自己的作用域和TDZ的，并且和函数体作用域是区分开的，  
>
> 这就意味着函数参数是无法访问函数体内的任何变量的，因为根据就是两个不同的作用域。  

## 未命名参数

为什么会存在未命名参数？  

因为 JavaScript 是没有限制调用函数的时候传递参数个数的。  

比如：声明了一个函数 `function add() {}` 没任何参数，但是调用的时候是可以这样  
的 `add(1, 2, 3, ...)`  

那么这些调用的时候传递给 add 的参数对应的函数参数就叫做未命名参数。  

```js
function add() {
  let n = 0
  ;[].slice.call(arguments).forEach(v => n += v)

  return n
}

console.log(add(1, 2, 3, 4, 5))
```

+RESULTS:  

    15

### 参数展开符(&#x2026;)

未命名参数一般很少使用，因为这让使用者会很迷惑该函数的作用，因此参数没任何明  
显特征表示它是干什么用的，  

在 es6 中增加了一个展开符号(&#x2026;)，在函数参数中的作用是将传递进的参数列表合并  
成一个参数数组。  

适用于一个函数参数个数未知的情况下使用。  

比如：  

```js
function pick(object, ...keys) {
  // 这里 keys 会成为一个包含传入的其余参数值的数组
  let result = Object.create(null)

  console.log(arguments.length)
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = object[keys[i]]
  }

  return result
}

const book = {
  author: 'xxx',
  name: 'yyy',
  pages: 300
}

const res = pick(book, 'author', 'name')

console.log(JSON.stringify(res))
```

+RESULTS:  

    3
    {"author":"xxx","name":"yyy"}

利用 &#x2026;keys 将传入的 ('author', 'name') 合并成了一个数组： `['author',
    'name']` ，方便应对  

函数参数个数可变的情况。  

### 参数展开符两种异常使用情况

1.  展开符参数必须是最后一个，不能在其后面还有其他参数  
  
    比如： `function add(n, ...vals, more) {}` 这会出现异常

2.  不能用在对象的 `setter` 函数上

实例：  

```js
const obj = {
  set name(...val) {}
}
```

![img](http://qiniu.ii6g.com/1560755195.png)  

```js
function add(n, ...vals, more) {

}
```

![img](http://qiniu.ii6g.com/1560755252.png)  

### 参数展开符对 arguments 的影响

记住一点：  

<span class="underline">arguments 总是由函数调用时传递进来的参数决定</span>  

```js
function checkArgs(...args) {
  console.log(args.length);
  console.log(arguments.length);
  console.log(args[0], arguments[0]);
  console.log(args[1], arguments[1]);
}

checkArgs("a", "b");
```

+RESULTS:  

    2
    2
    a a
    b b

## 函数构造函数能力增强

在实际编码过程，我们很少直接使用 `Function()` 构造函数去创建一个函数。  

比如这么使用：  

```js
// 参数：参数一名称 first, 参数二名称 second，... 最后一个是函数体
var add = new Function('first', 'second', 'return first + second')

console.log(add(1, 2))
```

+RESULTS:  

    3

在 es6 中对构造函数的使用能力增强了，给其赋予了更多的功能，比如  

1.  默认参数值
2.  展开符

```js
var add = new Function("first", "second = first",
                       "return first + second");

console.log(add(1, 1));     // 2
console.log(add(1));        // 2

var pickFirst = new Function("...args", "return args[0]");

console.log(pickFirst(1, 2));   // 1
```

+RESULTS:  

    2
    2
    1

## 展开符(&#x2026;)

在之前我们在函数参数中用到了展开符，这个时候的用途是将参数合并成数组来用。  

### 普通参数传递

我们一般调用函数的时候都是将参数逐个传递：  

```js
let v1 = 20,
    v2 = 30

console.log(Math.max(v1, v2))
```

+RESULTS:  

    30

这仅仅两个参数，比较好书写，一旦参数多了起来就比较麻烦，在 es6 之前的做法可以利用 `Function.prototype.apply` 去实现：  

### apply 传递多个参数

```js
let vs = [1, 2, 3, 4, 5]

console.log(Math.max.apply(Math, vs))
```

+RESULTS:  

    5

因为 `apply` 会将数组进行展开作为函数的参数传递个调用它的函数。  

### es6 之后展开符传递

在 es6 之后我们将使用展开符去完成这项工作，让代码更简洁和便于理解。  

```js
let vs = [1, 2, 3, 4]

console.log(Math.max(...vs))
```

+RESULTS:  

    4

### 展开符，传统方式相结合

```js
let vs = [1, 2, 3, 4]

console.log(Math.max(10, ...vs)) // 10
console.log(Math.max(...vs, 0)) // 4
console.log(Math.max(3, ...vs, 10)) // 10
```

+RESULTS:  

    10
    4
    10

## 函数名字属性

以往，由于函数的各种使用方式使 JavaScript 在识别函数的时候成为一种挑战，并且  
匿名函数的频繁使用使得程序的 debugging 过程异常痛苦，经常造成追踪栈很难理解。  

因此在 es6 中给所有函数添加了一个 `name` 属性。  

> name 属性只是对函数的一种描述特性，并不会有实际的引用特性，也就是说  
>
> 在实际编程中不可能通过函数的 name 属性去干点啥。  

### 选择合适的名称

JavaScript 会根据函数的声明方式去给其选择合适的名称，比如：  

```js
function doSomething() {
  // ...
}

var doAnotherThing = function() {
  // ...
};

var doThirdThing = function do3rdThing() {

}

console.log(doSomething.name);          // "doSomething"
console.log(doAnotherThing.name);       // "doAnotherThing"
console.log(doThirdThing.name);       // "do3rdThing"
```

+RESULTS:  

    doSomething
    doAnotherThing
    do3rdThing

1.  如果是命名函数式声明方式，则使用的就是它的名字作为 `name` 属性值，如： *doSomething*

2.  如果是表达式匿名方式声明函数，则将使用表达式中左边的变量名称来作为 `name` 属性值，如： *doAnotherThing*

3.  表达式命名方式声明函数，则将使用命名函数的名称作为 `name` 属性，如： *doThridThing* 的名字是： *do3rdThing*

> 通过第三个输出可知，命名函数的优先级高于表达式的变量名。  

### name 属性的特殊情况

1.  对象的函数名称，即该函数的名字
2.  对象的访问器函数名称，通过 `Object.getOwnPropertyDescriptor(obj, 'keyname')` 获取访问器对象
3.  调用 `bind()` 之后的函数名称，总是在原始函数名前加上 **bound**
4.  使用 `new Function()` 创建的函数名称，总是返回 *anonymous*

```js
var doSth = function() {}

var person = {
  get firstName() {
    return 'Nicholas'
  },

  sayName: function() {
    console.log(this.name)
  }
}

console.log(person.sayName.name) // sayName
// 访问器属性，只能通过 getOwnPropertyDescriptor 去获取
var descriptor = Object.getOwnPropertyDescriptor(person, 'firstName')
console.log(descriptor.get.name) // get firstName

// 调用 bind 之后的函数名称总是会在原始的函数名称之前加上 `bound fname`
console.log(doSth.bind().name) // bound doSth
console.log((new Function()).name) // anonymous
```

+RESULTS:  

    sayName
    get firstName
    bound doSth
    anonymous

## 澄清函数双重目的

### 函数使用方式

1.  直接调用，当做函数来使用 `Person()`

2.  使用 `new` 的时候当做构造函数来使用创建一个实例对象

在 es6 之后为了搞清楚这两种使用方式，添加了两个内置属性： `[[Call]]` 和 `[[Constructor]]`  

当当做函数直接调用时，其实内部是调用了 `[[Call]]` 执行了函数体，  

当结合 `new` 来使用是，调用的是 `[[Contructor]]` 执行了以下步骤：  

1.  创建一个新的对象 newObj

2.  将 `this` 绑定到 newObj

3.  将 newObj 对象返回作为该构造函数的一个实例对象

也就是说我们可以在构造函数中去改变它的行为，如果它没有显示的 `return` 一个合  
法的对象，则会默认走 #3 步，如果我们显示的去返回了一个对象，那么最后得到的实  
例对象即这个显示返回的对象。  

```js
function Person1(name) {
  this.name = name || 'xxx'
}

// 没有显示的 return 一个合法对象
// 返回的是新创建的对象，并且 this 被绑定到这个心对象上
const p1 = new Person1('张三')

// 因此这里访问的 name 即构造函数中的 this.name
console.log(p1.name)

function Person2(name) {
  this.name = name || 'xxx'

  return {
    name: '李四'
  }
}

// 按照构造函数的使用定义，这里返回的是
// 显示 return 的那个对象： { name: '李四' }
const p2 = new Person2('张三')

// 因此这里输出的结果为：李四
console.log(p2.name)
```

+RESULTS:  

    张三
    李四

> 并不是所有的函数都有 `[[Constructor]]` ，比如箭头函数就没有，因此箭头函数  
>
> 也就不能被用来 `new` 对象实例。  

### 判断函数被如何使用？

有时候我们需要知道函数是如何被使用的，是当做构造函数？还是单纯当做函数直接调用？  

这个时候 `instanceof` 就派上用场了，它的作用是用来检测一个对象是否在当前对象的  

原型链上出现过。  

比如：在 es5 中强制一个函数只能当做构造函数来使用，一般这么做  

```js
function Person(name) {
  if (this instanceof Person) {
    this.name = name
  } else {
    throw new Error('必须使用 new 来创建实例对象。')
  }
}

var person = new Person('张三')

// 这种调用，内部的 `this` 被绑定到了全局对象
// 而全局对象并非 Person 原型链上的对象，因此会
// 执行 else 抛出异常
var notAPerson = Person('李四')
```

![img](http://qiniu.ii6g.com/1560820870.png)  

但是有一种直接调用的情况，不会走 `else` ，即通过 `call` 调用指定 `person` 实  
例为调用元。  

```js
function Person(name) {
  if (this instanceof Person) {
    this.name = name
  } else {
    throw new Error('必须使用 new 来创建实例对象。')
  }
}

var person = new Person('张三')

// 这样是合法的，请 this instanceof Person 成立
// 因为 Person.call(person, ...) 指定了作用域为实例对象 person
// 因此函数内部的 this 会被绑定到这个实例对象 person 上，
// 而 person 确实是 Person 的实例对象，因此不会报错
var notAPerson = Person.call(person, '李四')

```

正常运行的结果  

+RESULTS:  

    undefined

因此，如果是 `Person.call(person, ...)` 这种情况调用，函数内部同样无法判断它的被使用方式是如何。  

### new.target 元属性<a id="org52daa00"></a>

为了解决上一节的“函数调用方式”判断的问题， es6 中引入了 `new.target` 元属性。  

> 元属性：一个非对象的属性，用来为他的目标（比如： `new` )提供额外的相关信息。  

`new.target` 的取值？？  

1.  如果函数当做构造函数  
  
    使用 `new` 来调用，内部调用 `[[Constructor]]` 的时候， `new.target` 会被填充  
    为 `new` 操作符指定的目标对象，这个目标对象通常是执行内部构造函数的时候新  
    创建的那个对象实例(在函数体重一般是 `this` ）。

2.  如果函数当做普通函数直接调用，那么 `new.target` 的值为 `undefined`

从上面两点，那么我们就可以通过在函数内部判断 `new.target` 来判断函数的使用方  
式了。  

```js
function Person(name) {
  if (typeof new.target !== 'undefined') {
    this.name = name
  } else {
    throw new Error('必须使用 new 创建实例。')
  }
}

var person = new Person('张三')
console.log(person.name, 'new')

var notAPerson = Person.call(person, '李四')
console.log(notAPerson.name, 'call')
```

![img](http://qiniu.ii6g.com/1560822025.png)  

由图中的输出证明上面 #1 和 #2 的结论，也由此结论我们可以直接使用 `new.target
    === Person` 作为判定条件。  

函数外部使用 `new.target` :  

```js
function Person() {

}

if (new.target === Person) {
  // ...
}
console.log(new.target)
```

## 块级函数

### <= es3 行为

在 es3 或更早些时候，在块级作用域中声明函数会出现语法错误，虽然在之后默认允  
许这样使用（不会报错了），但是各个浏览器之间的处理方式依旧不同，因此在实际开  
发过程中，应该尽量避免这么使用，如果非要在块级作用域声明函数可以考虑使用函数  
表达式方式。  

### es5 行为

另外，为了尝试去兼容这种怪异情况，在 es5 的严格模式下如果在块级作用域声明函  
数，会爆出异常。  

```js
'use strict';

if (true) {
  // 在 es5 中会报语法错误， es6 中不会
  function doSth() {}
}
```

### es6 行为<a id="org473d6ba"></a>

在 es6 之后，这种函数声明将会变的合法，且声明之后 `doSth()` 就成了一个局部函  
数变量，即只能在 `if (true) { ... }` 这个作用域内部访问，外部无法访问，比如：  

```js
'use strict';

if (true) {
  // 因为有提升，且命名函数的提升包含声明和定义都会被提升
  console.log(typeof doSth) // function
  function doSth() {}

  doSth()
}

// es6 之后存在块级作用域，因此 doSth 是个局部变量，在
// 它的作用域范围之外无法访问
console.log(typeof doSth); // undefined
```

+RESULTS:  

    function
    undefined

### 决定什么时候该用块级函数

在 [4.7.3](#org473d6ba) 一节中使用的是命名式函数声明方式，这种方式声明和定义均被提升，  
因此在声明处至上访问能得到正常结果。  

如果使用表达式 + `let` 方式，则结果会和用 `let` 声明一样存在 **TDZ** 的问题。  

```js
'use strict';

if (true) {
  // TDZ 区域，访问会异常
  console.log(typeof doSth) // error

  let doSth = function () {}

  doSth()
}

console.log(typeof doSth) // undefined
```

![img](http://qiniu.ii6g.com/1560823372.png)  

因此，我们可以根据需求去决定该使用哪种方式去声明块级函数，如果需要有提升则应  
该使用“命名式函数”，如果不需要提升，只需要在声明之后的范围使用应该使用“函数  
表达式”方式去声明函数。  

### 非严格模式块级函数

在 es6 中的非严格模式下，块级函数的提升不再是针对块级作用域，而是函数体或全  
局环境。  

```js
// 相当于提升到了这里

if (true) {
  console.log(typeof doSth)

  // 非严格模式，全局提升
  function doSth() {}

  doSth()
}

console.log(typeof doSth) // function
```

+RESULTS:  

    function
    function

结果显示外面的 `typeof doSth` 也是 'function' 。  

因此，在 es6 之后函数的声明只需要区分严格或非严格模式，而不再需要考虑浏览器  
的兼容问题，相当于统一了标准。  

## 箭头函数

### 箭头函数特性<a id="org5e8d16a"></a>

在 es6 中引入了箭头函数，大大的简化了函数的书写，比如  

声明一个函数： `function run() {}`  

现在： `const run = () => {}` 或者 `const getName = () => '张三'`  

虽然用起来方便了，但是箭头函数与普通函数又很大的不同，使用的时候必须要注意以  
下几点：  

| 序   | 特性                   | 说明                                                       |
| ---- | ---------------------- | ---------------------------------------------------------- |
| 1    | 无 `this`              | 减少问题，便于优化                                         |
| 2    | 无 `super`             |                                                            |
| 3    | 无 `arguments`         | 箭头函数必须依赖命名参数或 `rest` 参数去访问函数的参数列表 |
| 4    | 无 `new.target` 元属性 | 不能被实例化，功能无歧义，不需要这个属性                   |
| 5    | 不能 `new` 实例化      |                                                            |
| 6    | 无原型                 | 因为不能用 `new` 因此也不需要原型                          |
| 7    | 不能改变 `this` 指向   | 此时指向不再受函数本身限制                                 |
| 8    | 不能有重复的命名参数   | 之前非严格模式下普通函数是可以有的                         |

> 箭头函数中如果引用 `arguments` ，它指向的不再是该箭头函数的参数列表，  
>
> 而是包含该箭头函数的那个非箭头函数的参数列表([4.8.6](#orga805ee7))。  

没有 `this` 绑定主要有两点理由：  

1.  不易追踪，易造成未知行为，众多错误来源  
  
    函数内部 `this` 的值非常不容易追踪，经常会造成未知的函数行为，箭头函数去  
    掉它可以避免这些烦恼

2.  便于引擎优化  
  
    限制箭头函数内部使用 `this` 去执行代码也有利于 JavaScript 引擎更容易去优  
    化内部操作，而不像普通函数一样，函数有可能会当做构造函数使用或其他用途。

> 同样，箭头函数也有自己的 `name` 属性，用来描述函数的名称特征。  

```js
const print = msg => {
  console.log(arguments.length, 'arguments')
  console.log(this, 'this')
  console.log(msg)
}

console.log(print.name)

print('...end')
```

+RESULTS:  

    print
    0 'arguments'
    Object [global] {
    // ... 省略
            { [Function: setImmediate] [Symbol(util.promisify.custom)]: [Function] } } 'this'
    ...end
    undefined

因为是 `nodejs` 环境，因此 `this` 被绑定到了 `global` 对象上。  

第二行输出结果是 `0 'arguments'` 说明已经不能使用 `arguments` 去正确获取传入  
的参数了。  

### 箭头函数语法

箭头函数语法非常灵活，具体如何使用根据使用场景和实际情况决定。  

比如：  

`var reflect = value => value;` 直接返回原值  

相当于  

`var reflect = function(value) { return value; }`  

当只有一个参数时刻省略小括号 `()`  

多个参数时候：  

`var sum = (n1, n2) => n1 + n2;`  

函数体更多内容时候：  

```js
var sum = (n1, n2) => {
  // do more...
  return n1 + n2;
}
```

空函数：  

`var empty = () => {}`  

返回一个对象：  

`var getTempItem = id => ({ id: id, name: 'Temp' })`  

等等。。。  

### 箭头立即函数表达式

在 es6 之前我们要实现一个立即执行函数，一般这样：  

```js
let person = function(name) {
  return {
    getName: function() {
      return name
    }
  }
  // 直接在函数后面加上小括号即成为立即执行函数
}('张三')

console.log(person.getName()) // 张三
```

+RESULTS:  

    张三

**PS: 但是为了代码可读性，建议给函数加上小括号。**  

箭头函数形式的立即执行函数，不可以直接在 `}` 后面使用小括号方式：  

```js
let person = ((name) => {
  return {
    getName: function() {
      return name
    }
  }
})('张三')


console.log(person.getName()) // 张三
```

+RESULTS:  

    张三

### 没有 this 对象

在之前我们经常遇到的一个问题写法是事件的监听回调函数中直接使用 `this` ，这将  
导致引用错误问题，因为事件的回调属于被动触发的，而触发调用该回调的对象是不确  
定的，这就会导致各种问题。  

```js
var PageHandler = {

  id: "123456",

  init: function() {
    document.addEventListener("click", function(event) {
      // 这里用了 this ，意图是想在点击事件触发的时候去调用 PageHandler 的
      // doSomething 这个函数，但实际却是事与愿违的
      // 因为这里的 this 并非指向 Pagehandler 而是事件触发调用回调时候的那个目标对象
      this.doSomething(event.type);     // error
    }, false);
  },

  doSomething: function(type) {
    console.log("Handling " + type  + " for " + this.id);
  }
};
```

以往解决方法：通过 `bind(this)` 手动指定函数调用对象  

```js
var PageHandler = {

  id: "123456",

  init: function() {
    // 经过 bind 之后，回调函数的调用上下文就被绑定到了 PageHandler 这个对象
    // 真正绑定到 click 事件的函数其实是执行 bind(this) 之后绑定了上下文的一个函数副本
    // 从而执行能得到我们想要的结果
    document.addEventListener("click", (function(event) {
      this.doSomething(event.type);     // no error
    }).bind(this), false);
  },

  doSomething: function(type) {
    console.log("Handling " + type  + " for " + this.id);
  }
};

```

虽然问题是解决了，但是使用 `bind(this)` 无疑多创建了一份函数副本，多少都会有  
些奇怪。  

然后，在 es6 之后这个问题就很好的被箭头函数解决掉：  

根据箭头函数没有 `this` 绑定的特性，在其内部使用 `this` 的时候这个指向将是包  
含该箭头函数的非箭头函数所在的上下文，即：  

```js
var PageHandler = {

  id: "123456",

  init: function() {
    document.addEventListener(
      "click",
      // 箭头函数无 this 绑定，内部使用 this
      // 这个 this 的上下文将有包含该箭头函数的上一个非箭头函数
      // 这里即 init() 函数，而 init() 函数的上下文为 PageHandler 对象
      // 也就是说这里箭头函数内部的 this 指向的就是 Pagehandler 这个对象
      // 从而让代码按照预期运行
      event => this.doSomething(event.type), false);
  },

  doSomething: function(type) {
    console.log("Handling " + type  + " for " + this.id);
  }
};
```

### 箭头函数和数组

在使用数组的一些内置函数时，我们经常会碰到需要传递一个参考函数给他们，比如，  
排序函数 `Array.prototype.sort` 就需要我们传递一个比较函数用来决定是升序还是  
降序等等。  

如果用箭头函数将大大简化代码：  

```js
// es6 之前
const values = [1, 10, 2, 5, 3]

var res1 = values.sort(function(a, b) {
  // 指定为升序
  return a - b;
})

// es6 之后
var res2 = values.sort((a, b) => a - b)
console.log(res1.toString(), res2.toString())

```

+RESULTS:  

    1,2,3,5,10 1,2,3,5,10

或者 `map()`, `reduce()` 等等用起来会更方便更简洁许多。  

### 无参数绑定(arguments)<a id="orga805ee7"></a>

看实例：  

```js
function createArrowFunctionReturningFirstArg() {
  return () => arguments[0]
}

var arrowFunction = createArrowFunctionReturningFirstArg(5)

console.log(arrowFunction()) // 5
```

+RESULTS:  

    5

从结果看出，返回的 `arrowFunction()` 箭头函数调用的时候并没有传递任何参数，  
但是执行结果得到了结果这个结果正是包含它的那个非箭头函数  
(`createArrowFunctionReturingFirstArt()`)所接受的参数值。  

*因此箭头函数内部如果访问 `arguments` 对象，此时该对象指向的是包含它的那个非箭头函数的参数列表对象。*  

### 箭头函数的识别

跟普通函数一样， `typeof` 和 `instanceof` 对齐依然使用。  

```js
var comparator = (a, b) => a - b;

console.log(typeof comparator) // function
console.log(comparator instanceof Function) // true
```

+RESULTS:  

    function
    true

在 [4.8.1](#org5e8d16a) 一节提到过箭头函数是不能改变 `this` 指向的，但是  

并不代表我们就完全不能使用 `call, apply, bind`  

比如：  

```js
var sum = (n1, n2) => (this.n1 || 0) + n2

console.log(sum.call(null, 1, 2)) // 3
console.log(sum.call({ n1: 10 }, 1, 2)) // 3
```

+RESULTS:  

    2
    2

从这个例子中可以验证，箭头函数是无法修改它的 `this` 指向的，如果可以修改  

第二个结果值就应该是 `12` 而不是和第一个一样为 `2` ，因为在第二个中  

我们手动将 `sum` 执行上下文绑定到了一个新的对象上 `{n1: 10}` 。  

> 也就是说，并非不能使用，而是用了也不会有任何变化而已。  

使用 `bind` 保留参数：  

```js
var sum = (n1, n2) => n1 + n2

console.log(sum.call(null, 1, 2)) // 3
console.log(sum.apply(null, [1, 2])) // 3

// 产生新的函数，这种和普通函数使用方式一样
var boundSum = sum.bind(null, 1, 2)

console.log(boundSum())
```

+RESULTS:  

    3
    3
    3

## 尾调用优化

尾调用：将一个函数的调用放在两一个函数的最后一行。  

或许在 es6 中对于函数相关的最感兴趣的改动就是引擎的优化了，它改变了函数的尾调  
用系统。  

```js
function doSth() {
  return doSthElse() // tail call
}
```

在 es6 之前，它和普通的函数调用一样被处理：创建一个新的栈帧然后将它推到调用栈  
的栈顶等待被执行, 也就意味着之前的每一个栈帧都在内存里面保留着，如果调用栈过  
大那这将可能是问题的来源。  

### 有什么不同？

在 es6 之后优化了引擎，包含尾调用系统的优化（严格模式下，非严格模式下依旧未  
发生改变）。  

优化之后，不再会为尾部调用创建一个新的栈帧，而是将当前的栈帧情况，然后将其复  
用到尾部调用，前提是满足下面几个条件：  

1.  尾调用函数不需要访问当前栈帧中的任何变量(即尾调用的函数不能是闭包，闭包的  
    作用就是用来持有变量)

2.  即在尾调用的函数之后不能有其他的代码，即尾调用函数必须是函数体的最后一行

3.  尾调用函数的调用结果要作为当前函数的返回值返回

比如：下面的函数就满足尾调用优化的条件  

```js
'use strict'; // 1. 严格模式

function doSth() {

  // 2. 没有引用任何内部变量，非闭包

  // 3. 最后一行

  // 4. 调用结果被作为 doSth 的返回值返回
  return doSthElse()
}
```

以下情况不会被优化：  

```js
'use strict';

function doSth() {
  doSthElse() // 返回作为返回值，不会优化
}

function doSth1() {
  return 1 + doSthElse() // 在尾调用函数返回之后不能有其他操作，不会优化
}

function doSth2() {
  var res = doSthElse()
  return res // 不是最后一行，即不是将结果立即返回，不会优化
}

function doSth3() {
  var num = 1,
      func = () => num

  return func() // 闭包，不会优化
}
```

### 如何利用尾调用优化？

尾调用最经典的莫过于递归调用了，比如斐波那契数列问题。  

```js
function factorial(n) {

  if (n <= 1) {
    return 1;
  } else {

    // 不会被优化，因为函数返回之后还需要进行乘积计算才返回
    return n * factorial(n - 1);
  }
}

console.log(factorial(10))
```

+RESULTS:  

    3628800

上面的并不会被优化，因为尾调用函数并不是立即返回的，修改如下：  

```js
function factorial(n, p = 1) {

  if (n <= 1) {
    return 1 * p;
  } else {

    let res = n * p
    // 被优化
    return factorial(n - 1, res);
  }
}


console.log(factorial(10))
```

+RESULTS:  

    3628800

尾调用优化应该是我们在书写代码的时候时常应该考虑的问题，尤其是书写递归的时候，  
当使用递归涉及到大量的计算的时候，  

尾调用优化的优势将会很明显。  

## 小结

| 选项                 | 功能                                            | 描述                                                         | 其他                                      |
| -------------------- | ----------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------- |
| **arguments**        |                                                 |                                                              |                                           |
|                      | ES6之前非严格模式                               | 值会随着函数体内参数的改变而改变                             |                                           |
|                      | ES6之前严格模式                                 | 不会响应改变，调用之初就定了                                 |                                           |
|                      | ES6之后行为统一                                 | 不会响应改变，内容由实际调用者传递个数决定                   |                                           |
| **函数默认参数**     | 可以是常量值                                    | `function add(f, s = 3) {}`                                  |                                           |
|                      | 可以是变量                                      | `var n = 10; function add(f, s = n) {}`                      |                                           |
|                      | 可以是函数调用                                  | `function getVal() {}; function add(f, s = getVal) {}`       |                                           |
|                      | 默认值参数的执行                                | 调用时有传递则不会检测或执行，未传递则会检测和执行           |                                           |
|                      | 相互引用                                        | 后面的参数可以引用前面的参数变量 `function add(f, s = f) {}` |                                           |
|                      | 临时死区(TDZ)                                   |                                                              |                                           |
| **参数 rest 符号**   | 接受多个参数，合并成数组供函数内部使用          | `function add(f, ...a) {}`                                   |                                           |
|                      | 异常使用一                                      | 不能用在访问器函数                                           | `obj = { set name(...val) {} }`  非法。   |
|                      | 异常使用二                                      | 必须作为函数最后一个参数使用                                 | `function add(f, ...s, t) {}` 非法。      |
|                      | 对arguments影响                                 | 非箭头函数没什么影响                                         | arguments总是由调用者传递的参数决定个数   |
| **构造函数**         | new Function()                                  | 可以使用默认值，rest符号等功能                               |                                           |
| **展开符(&#x2026;)** | 普通多参数函数                                  | `Math.max(1, 2, 3, 4, ...)`                                  |                                           |
|                      | 普通多参数函数apply                             | `Math.max.apply(Math, [1, 2, 3, 4])`                         |                                           |
|                      | ES6展开符                                       | `Math.max(...[1, 2, 3, 4, ...])`                             |                                           |
| **name 属性**        | 函数名称                                        | 仅辅助描述功能，易于跟踪函数                                 |                                           |
|                      | 特殊情况: 访问器函数                            | `get fnName`                                                 |                                           |
|                      | 特殊情况：bind() 函数                           | `bound fnName`                                               |                                           |
|                      | 特殊情况：new Function()                        | 匿名函数 `anonymous`                                         |                                           |
| **new.target**       | 函数可直接调用可new构造实例                     | 因此造成函数内部如何识别使用释放问题？                       |                                           |
|                      | 如果作为函数调用 `[[Call]]`                     | new.target = undefined                                       |                                           |
|                      | 如果是 new 构造函数 `[[Constructor]]`           | new.target = Person 构造函数本身                             |                                           |
| **块级函数**         | 在 es6之情块级函数的声明处理并没有统一          | 严格模式必出异常，非严格不好说                               |                                           |
|                      | es6之后统一标准                                 | 严格模式：块级函数只是局部函数                               | 只在作用域内有效                          |
|                      |                                                 | 非严格模式：块级函数会提升到函数顶部或全局环境               | 全局或函数体生效                          |
| **箭头函数特性**     | 无 `this` 不易追踪，易于引擎优化                | 内部可以使用，但是它指向的是当前箭头函数所在的非箭头函数所在的上下文 |                                           |
|                      | 无 `super`                                      | 没有原型，继承等，不需要 `super`                             |                                           |
|                      | 无 `arguments`                                  | 内部访问的该对象，其实是当前环境函数的参数，而非箭头函数本身的参数列表 |                                           |
|                      | 无 `new.target`                                 | 不支持 `new` 就不存在使用方式问题                            |                                           |
|                      | 无原型                                          | 不支持 `new`                                                 |                                           |
|                      | 不能改变 `this` 指向                            | 其内部的 `this` 已经不是它管辖，可以调用 `call, apply, bind` 之流，但是不会有任何作用 |                                           |
|                      | 不能有重复命名参数                              | 非严格模式下ES6之前的普通参数可以用                          |                                           |
|                      | 箭头函数语法                                    | 使用方式灵活多变                                             |                                           |
|                      | 立即表达式                                      | 必须括号包起来再执行，普通函数可直接在 `}` 后执行            | `(() => {})()`, `function(name){}('xxx')` |
|                      | typeof, instanceof                              | 对箭头函数依旧有效， typeof fn `=` 'function', fn instanceof Function (true) |                                           |
| **尾调用优化**       | 必须满足三个条件                                | 不满足条件不会优化，典型的递归调用                           |                                           |
|                      | 1. 非闭包，尾函数体内不能访问正函数体内任何变量 |                                                              |                                           |
|                      | 2. 结果值必须立即返回，不能参与其他计算后再返回 |                                                              |                                           |
|                      | 3. 必须是正函数的最后一个语句                   |                                                              |                                           |
|                      | 优化之前                                        | 尾函数新建栈帧，放在调用栈顶等待调用                         |                                           |
|                      | 优化之后                                        | 清空调用栈，将它作为尾调用函数的栈帧复用                     |                                           |

# 对象扩展(Object)

## 对象分类

| 类型                 | 说明                                                  |
| -------------------- | ----------------------------------------------------- |
| *普通对象(Ordinary)* | 拥有所有对象的默认行为                                |
| *异类对象(Exotic)*   | 和默认行为有所差异                                    |
| *标准对象(Standard)* | 那些由 ECMAScript 6 定义的，如： `Array`, `Date` 等等 |
| *内置对象(Built-in)* | 脚本当前执行环境中的对象，所有标准对象都是内置对象    |

## 对象字面量(literal)语法扩展

字面量语法在 JavaScript 中使用非常普遍  

1.  书写方便
2.  简洁易懂
3.  JSON 就是基于字面量语法演变而来

es6 的来到是的对象字面量语法更加强大简洁易用。  

### 对象属性简写

<= es5:  

```js
function createPerson(name, age) {
  return {
    name: name,
    age: age
  }
}
```

es6:  

```js
function createPerson(name, age) {
  return {
    name,
    age
  }
}
```

### 简洁函数写法

<= es5:  

```js
var person = {
  name: '张三',
  sayName: function() {
    console.log(this.name)
  }
}
```

es6:  

```js
var person = {
  name: '张三',
  sayName() {
    console.log(this.name)
  }
}
```

### 计算属性

在 es6 之前书写对象字面量的时候，可以直接使用多个字符串组成的字符串作为  
`key` ，但是这种方式在实际使用中是非常不方便的，假如说 key 是个很长的串呢？？  

```js
var person = {
  'first name': '张三'
}

console.log(person['first name']) // 张三
```

+RESULTS:  

    张三

因此， es6 中支持了变量作为对象属性名去访问，根据变量的值动态决定使用什么  
`key` 去访问对象的属性值，这样不管 `key` 多长，只需要使用变量将它存储起来，  
直接使用变量名去使用将更加方便。  

```js
var person = {},
    lastName = "last name";

person["first name"] = "张三";
person[lastName] = "李四";

console.log(person["first name"]);      // "张三"
console.log(person[lastName]);          // "李四"
```

+RESULTS:  

    张三
    李四

支持表达式计算属性名：  

```js
var suffix = ' name'

var person = {
  ['first' + suffix]: '张三',
  ['last' + suffix]: '李四'
}

console.log(person['first name']) // 张三
console.log(person['last name']) // 李四
```

+RESULTS:  

    张三
    李四

## 新方法

### Object.fromEntries(iterable)<sup>2019</sup>

将一组 map 类型或似 map 类型的数组转成对象。  

如： `[ ['key1', 'value1' ], ['key2', 'value2'] ]`  

转换之后： `{ key1: 'value1', key2: 'value2' }`  

### Object.is(value1, value2)

在以往我们判断两个值是否相等，经常使用的是 `==` 和 `===` ，一般推荐使用后者  

因为前者会有隐式强转，会在比较之前将两个值进行强制转换成同一个类型再比较。  

```js
console.log('' == false) // true
console.log(0 == false) // true
console.log(0 == '') // true
console.log(5 == '5') // true
console.log(-0 == +0) // true
console.log(NaN == NaN) // true
```

+RESULTS:  

    true
    true
    true
    true
    true
    false

对于 `+0` 和 `-0` 使用 `===` 的结果是 `true` ，但实际上他们是有符号的，理论  
上应该是不相等的。  

而两个 `NaN` 五路你是 `==` 或 `===` 都判定他们是不相等的。  

为了解决这些差异， es6 中加入了 `Object.is()` 接口，意指将等式的判断更加合理  
化，它的含义是两个值是否是同一个值。  

我们看下各对值使用 `Object.is()` 比较的结果:  

```js
const is = Object.is
const log = console.log

// +0, -0
log('+0 == -0', +0 == -0)
log('+0 === -0', +0 === -0)
log('+0 is -0: ', is(+0, -0))

// NaN
log('NaN == NaN: ', NaN == NaN)
log('NaN === NaN: ', NaN === NaN)
log('NaN is NaN: ', is(NaN, NaN))

// number, string
log('5 == "5": ', 5 == '5')
log('5 == 5: ', 5 == 5)
log('5 === "5": ', 5 === '5')
log('5 === 5: ', 5 === 5)
log('5 is "5": ', is(5, '5'))
log('5 is 5: ', is(5, 5))
```

+RESULTS:  

    +0 == -0 true
    +0 === -0 true
    +0 is -0:  false
    NaN == NaN:  false
    NaN === NaN:  false
    NaN is NaN:  true
    5 == "5":  true
    5 == 5:  true
    5 === "5":  false
    5 === 5:  true
    5 is "5":  false
    5 is 5:  true

因此， `Object.is` 能够弥补， `===` 无法判断出 `+0, -0`, `NaN, Nan` 相等的结  
果。  

### Object.assign(target, source, source1, source2, &#x2026;)

参数：  

1.  `target` 接受拷贝的对象，也将返回这个对象
2.  `source` 拷贝内容的来源对象
3.  来源对象参数可以有多个，如果存在同名属性值，最后的值由最后一个拥有同名属  
    性对象中的值为准

[TC39.ECMA262](https://tc39.es/ecma262/#sec-object.assign) 实现原理图：  

![img](http://qiniu.ii6g.com/Object-assign.png)  

合并对象，将 source 中自身的可枚举的属性浅拷贝到 `target` 对象中，返回  
`target` 对象。  

混合器(*Mixins*)在 JavaScript 中被广泛使用，在一个 mixin 中，一个对象可以从  
另个对象中接受他们的属性和方法，即浅拷贝，许多 JavaScript 库都会有一个与下面  
类似的 mixin 函数:  

```js
const mixin = (receiver, supplier) => {
  Object.keys(supplier).forEach(
    key => receiver[key] = supplier[key])

  return receiver
}

function EventTarget() {}

EventTarget.prototype = {
  constructor: EventTarget,
  get name() {
    return 'EventTarget.prototype'
  },
  emit: function(msg) {
    console.log(msg, 'in EventTarget.prototype')
  },
  on: function(msg) {
    console.log(msg, 'on EventTarget.prototype')
  }
}


const myObj1 = {}
mixin(myObj1, EventTarget.prototype)

myObj1.emit('something changed from myObj1')
console.log(myObj1.name, 'obj1 name')

const myObj2 = {}
Object.assign(myObj2, EventTarget.prototype)

myObj2.on('listen from myObj1')
console.log(myObj2.name, 'obj2 name')

console.log(EventTarget.prototype, myObj1, myObj2)
```

+RESULTS:  

    something changed from myObj1 in EventTarget.prototype
    EventTarget.prototype obj1 name
    listen from myObj1 on EventTarget.prototype
    EventTarget.prototype obj2 name

由于 `mixin()`, `Object.assign` 的实现都是采用的 `=` 操作符，因此是没法拷贝  
访问器属性的，或者说拷贝过来之后就不会再是访问器属性了，看上面代码的运行结果对比图：  

![img](http://qiniu.ii6g.com/1560930362.png)  

多个来源对象支持：  

```js
const receiver = {}
const res = Object.assign(receiver, {
  name: 'xxx',
  age: 100
}, {
  height: 180
}, {
  color: 'yellow',
  age: 80
})

console.log(receiver === res)
console.log(res)
```

+RESULTS:  

    true
    { name: 'xxx', age: 80, height: 180, color: 'yellow' }

最后 `age: 80` 值是最后一个来源对象中的值，返回值即第一个参数对象。  

## 重复属性

<= es5 严格模式下，重复属性会出现语法错误：  

```js
'use strict';

var person = {
  name: 'xxx',
  name: 'yyy' // syntax error in es5 strict mode
}
```

es6 无论严格或非严格模式下都属合法操作，其值为最后一个指定的值：  

```js
'use strict';

var person = {
  name: 'xxx',
  name: 'yyy' // no error
}

console.log(person.name)
```

+RESULTS:  

    yyy

## 自有属性枚举顺序

<= es5 中是不会定义对象属性的枚举顺序的，它的枚举顺序是在实际运行时取决于所处  
的 JavaScript 引擎。  

es6 中严格定义了枚举时返回的属性顺序，这将会影响在使用  
`Objct.getOwnPropertyNames()` 和 `Reflect.ownKeys` 时属性该如何返回。  

枚举时基本顺序遵循：  

1.  所有数字类型的 `keys` 为升序排序

2.  所有字符串类型的 `keys` 按照它添加的时机排序

3.  所有符号类型(Symbols)的 `keys` 按照它添加的时机排序

三者的优先级为： *numbers > strings > symbols*  

```js
var obj = {
  a: 1,
  0: 1,
  c: 1,
  2: 1,
  b: 1,
  1: 1
}

obj.d = 1

console.log(Object.getOwnPropertyNames(obj).join('')) // 012acbd
```

+RESULTS:  

    012acbd

> 由于并非所有 JavaScript 引擎并非统一实现方式，导致 `for-in` 循环依旧无法确定  
> 枚举的顺序。  
>
> 并且 `Object.keys()` 和 `JSON.stringify()` 采用的枚举顺序和 `for-in` 一样。  

```js
var obj = {
  a: 1,
  0: 1,
  c: 1,
  2: 1,
  b: 1,
  1: 1
}

obj.d = 1

for (let prop in obj) {
  console.log(prop)
}
```

## 功能更强的原型对象

原型是 JavaScript 中实现继承的基石，早起的版本中严重限制了原型能做的事情，  

然后随着 JavaScript 的逐渐成熟程序员们开始越来越依赖原型，我们现在能很清晰  

地感受到开发者们对原型控制上和易用性的渴望越来越强烈，由此 ES6 对齐进行了加强。  

### 改变对象原型

正常情况下，对象通过构造函数或 `Object.create()` 创建的同时原型也就被创建了。  

ES5 中可以通过 `Object.getPrototypeof()` 方法去获取对象原型，但是依然  

缺少一个标准的方式去获取失利之后的对象原型。  

ES6 增加了 `Object.setPrototypeof(source, target)` 用来改变对象的原型指向，  

指将 `source.prototype` 指向 `target` 对象。  

```js
let person = {
  getGreeting() {
    return "Hello";
  }
};

let dog = {
  getGreeting() {
    return "Woof";
  }
};

// prototype is person
let friend = Object.create(person);
console.log(friend.getGreeting());                      // "Hello"
console.log(Object.getPrototypeOf(friend) === person);  // true

// set prototype to dog
Object.setPrototypeOf(friend, dog);
console.log(friend.getGreeting());                      // "Woof"
console.log(Object.getPrototypeOf(friend) === dog);     // true
```

实际上，一个对象的原型是存储在它的内部属性 `[[Prototype]]` 上的， `Object.getPrototypeOf()`  

获取的也是这个属性的值， `Object.setPrototypeOf()` 设置也是改变这个属性的值。  

### 旧版原型的访问

比如：如果想在实例中重写原型的某个方法的时候，需要在重写的方法内调用原型方法  
时候，以往是这样搞  

```js
let person = {
  getGreeting() {
    return "Hello";
  }
};

let dog = {
  getGreeting() {
    return "Woof";
  }
};


let friend = {
  getGreeting() {
    return Object.getPrototypeOf(this).getGreeting.call(this) + ", hi!";
  }
};

// set prototype to person
Object.setPrototypeOf(friend, person);
console.log(friend.getGreeting());                      // "Hello, hi!"
console.log(Object.getPrototypeOf(friend) === person);  // true

// set prototype to dog
Object.setPrototypeOf(friend, dog);
console.log(friend.getGreeting());                      // "Woof, hi!"
console.log(Object.getPrototypeOf(friend) === dog);     // true
```

通过 `Object.getPrototypeOf(this).getGreeting.call(this)` &#x2026; 去获取原型中的  
方法  

### 通过 super 引用简化原型的访问

如之前所提，原型是 JavaScript 中一个很重要也很常用的一个对象，ES6 对他们的使  
用进行了简化。  

另外 es6 对原型的另一个改变是 `super` 的引用，这让对象访问原型对象更加方便。  

而在 es6 增加 `super` 之后就变得异常简洁了：  

```js
let friend = {
  getGreeting() {
    // in the previous example, this is the same as:
    // Object.getPrototypeOf(this).getGreeting.call(this)
    return super.getGreeting() + ", hi!";
  }
};
```

类似其他语言的继承， `friend` 是实例，它的原型是它的父类，在实例中的 `super`  
其实是指向父类的引用，因此可以直接在子类中直接使用 `super` 去使用父类的方法。  

### 只能在简写函数中访问 super

但是 `super` 只能在对象的简写方法中使用，如果是使用 “function” 关键词声明的  
函数中使用会出现  

*syntax error*  

比如：下面的方式是非法的  

```js
let friend = {
  getGreeting: function() {
    // syntax error
    return super.getGreeting() + ", hi!";
  }
};
```

因为 `super` 在这种函数的上下文中中不存在的。  

### `Object.getPrototypeOf()` 并不是所有场景都能使用的

因为 `this` 的指向是根据函数的执行上下文来决定了，因此使用 `this` 是完全靠谱  
的。  

比如：  

```js
let person = {
  getGreeting() {
    return "Hello";
  }
};

// prototype is person
let friend = {
  getGreeting() {
    return Object.getPrototypeOf(this).getGreeting.call(this) + ", hi!";
  }
};
Object.setPrototypeOf(friend, person);


// prototype is friend
let relative = Object.create(friend);

console.log(person.getGreeting());                  // "Hello"
console.log(friend.getGreeting());                  // "Hello, hi!"
console.log(relative.getGreeting());                // error!
```

上面的 `relative.getGreeting())` 会报错，原因是 relative 本身是个新的变量，  
这个变量指向由 `Object.create(friend)` 创建的一个空对象，其原型为 `friend` ，  
即 `reletive.getGreeting()` 的调用首先在 friend 中找但没找到，最后在  
`friend` 中找到了，也就是说它实际上调用的就是原型上的 `getGreeting()` 然后原  
型方法里面又是通过 `this` 去调用了原型的方法(也就自身)，由于 `this` 始终是根  
据当前上下文发生变化的，此时它的指向是 `friend` ，最终会导致循环调用。  

而用 `super` 就不会有上面的问题，因为 `super` 指向是固定的，就是指向当前对象  
的原型对象（父对象），即这里指向的是 `person` 。  

### `super` 引用的过程

一般情况下是没什么区别的，但是在我们做继承或者获取对象的原型的时候就很有用了，  
因为 `super` 的指向是和 `[[HomeObject]]` 密切相关的， `super` 获取指向的过程：  

1.  通过在当前方法的内部属性 `[[HomeObject]]` 上面调用 `Object.getPrototypeOf()`  
    去获取这个方法所在对象的原型对象；

2.  在原型对象上搜与这个函数同名函数；

3.  最后将这个同名函数绑定当前的 `this` 执行，然后执行这个函数。

```js
let person = {
  getGreeting() {
    return "Hello";
  }
};

// prototype is person
let friend = {
  getGreeting() {
    return super.getGreeting() + ", hi!";
  }
};
Object.setPrototypeOf(friend, person);

console.log(friend.getGreeting());  // "Hello, hi!"
```

比如，上面的代码  

1.  将 `person` 设置为 `friend` 的原型，成为它的父对象

2.  调用 `friend.getGreeting()` 执行之后在其内部使用 `super.getGreeting()` 这  
    个一开始会找到 `friend.getGreeting` 这个方法的 `[[HomeObject]]` 也就是 `friend`

3.  然后根据扎到的 `friend` ，通过 `Object.getPrototypeOf()` ，去找到原型对象，  
    即 `person` ，找到之后再去这里面找同名函数 `getGreeting`

4.  找到之后将该函数执行上下文绑定到 `this` (即 friend 所在的上下文）。

5.  执行同名函数，此时这个虽是原型(`person`)上的函数，但是上下文已经被绑定到  
    了 `friend` 上

过程简单描述就是：  

设置继承  
=> 重写方法  
=> super 调用父级方法  
=> 找当前函数的 `[[HomeObject]]`  
=> `Object.getPrototypeOf([[HomeObject]]`) 找原型  
=> 找原型上同名函数  
=> 绑定找到的同名函数到当前的 `this`  
=> 执行同名函数  

```js
var person = {
  fnName: 'person',
  getName() {
    return this.fnName
  }
}
var child = {
  fnName: 'child',
  getName() {
    return super.getName() + ',' + this.fnName
  }
}

Object.setPrototypeOf(child, person)

console.log(child.getName()) // child child
```

## 方法定义

在 es6 之前是没有“方法”这个词的定义的，但在 es6 之后对方法的定义才正式有了规定。  

### 函数和方法定义

在对象中的函数才叫做方法，非对象中的叫做函数，且 es6 给方法增加了一个  
`[[HomeObject]]` 内置属性， 它指向的是包含这个方法的那个对象。  

比如：  

```js
let person = {
  // method
  getGreeting() {
    return 'xxx'
  }
}

// not method
function shareGreeting() {
  return 'yyy'
}
```

`getGreeting` 叫做方法，且其有个内部属性 `[[HomeObject]]` 指向了 `person` 说明这  
个对象拥有它。  

`shareGreeting` 叫做函数，不是方法  

## 总结

更新内容  

| 内容                     | 示例/说明                                                    |
| ------------------------ | ------------------------------------------------------------ |
| 属性简写                 | `{name, age}` <=> `{name: name, age: age}`                   |
| 计算属性                 | `{ [first + 'name']: '张三' }`, `{ ['first name']: '张三' }` |
| 简写方法                 | `{ getName() {} }`                                           |
| 重复属性名合法化         | `{ age: 10, age: 100 }` <=> `{ age: 100 }`                   |
| `Object.assign` 合并对象 | 浅拷贝，内部 `=` 实现拷贝                                    |
| `Object.is`              | 加强判断，弥补 `===` 不能判断 `+0, -0` 和 `NaN, NaN` 问题    |
| 固定对象属性枚举顺序     | number > string > symbol, string 和 symbol 按照增加先后顺序排列 |
| `Object.setPrototypeOf`  | 可改变对象原型                                               |
| `super`                  | 指向原型对象，可通过它去访问原型对象中的方法                 |

# 数据解构

## 解构优势

在 es5 及之前如果我们想要从对象中取出属性的值，只能通过普通的赋值表达式来实现，  

一个还好，如果是多个的话就会出现很重复的代码，比如：  

```js
let options = {
  repeat: true,
  save: false
}

let repeat = options.repeat,
    save = options.save


// if more ???
```

上面只是取两个对象的属性，如果很多呢，十几个二十几个？？  

不仅代码量大，还不美观。  

因此 es6 加入了解构系统，让这些操作变的很容易，很简洁。  

## 对象解构

对象解构的时候，等号右边不能是 `null` 或 `undefined` ，这样会报错，这是因为，  
无论什么时候去读取 `null` 或 `undefined` 的属性都会出发运行时错误。  

### 声明式解构

解构的同时声明解构后赋值的变量：  

```js
let node = {
  type: 'Identifier',
  name: 'foo'
}

let { type, name } = node

console.log(type) // Identifier
console.log(name) // foo
```

在使用解构的过程中必须要有右边的初始值，而不能只是用来声明变量，这是不合法的  
操作, 比如：  

```js
// syntax error!
var { type, name };

// syntax error!
let { type, name };

// syntax error!
const { type, name };
```

### 先声明后解构

有时候有些变量早已经存在了，只是后面我们需要将它的值改变，也正好是需要从对象  
中去取值，这个时候就是先声明后解构：  

```js
let node = {
  type: "Identifier",
  name: "foo"
},
    // 这里变量已经声明好了
    type = "Literal",
    name = 5;

// assign different values using destructuring
({ type, name } = node);

console.log(type);      // "Identifier"
console.log(name);      // "foo"
```

这个时候必须用 `()` 将解构语句包起来，让其成为一个执行语句，如果不，左边就相  
当于一个块级语句，然而块级语句是不能出现在等式的左边的。  

在这基础上，另一种情况是将 `{type, name} = node` 作为参数传递给函数的时候，  
这个时候传递给函数的参数其实就是 `node` 本身，例如：  

```js
let node = {
  type: "Identifier",
  name: "foo"
},
    type = "Literal",
    name = 5;

function outputInfo(value) {
  console.log(value === node);
}

outputInfo({ type, name } = node);        // true

console.log(type);      // "Identifier"
console.log(name);      // "foo"
```

### 解构默认值

在解构过程中，可能左边声明的变量在右边的对象中并不存在或者值为 `undefined`  
的时候，这个变量的值将会赋值为 `undefined` ，因此这个时候就需要针对这种情况  
有个默认处理，即这里的解构默认值。  

```js
let node = {
  type: "Identifier",
  name: "foo"
};

let { type, name, value } = node;

console.log(type);      // "Identifier"
console.log(name);      // "foo"
console.log(value);     // undefined
```

属性值为 `undefined` 的情况：  

```js
let node = {
  type: "Identifier",
  name: "foo",
  value: undefined
};

let { type, name, value = 0 } = node;

console.log(type);      // "Identifier"
console.log(name);      // "foo"
console.log(value);     // 0
```

### 属性变量重命名

解构出来之后，可能不想沿用右边对象中的属性名，因此需要将左边的变量名称重命名：  

```js
let node = {
  type: "Identifier",
  name: "foo"
};

let { type: localType, name: localName } = node;

console.log(localType);     // "Identifier"
console.log(localName);     // "foo"
```

重命名 + 默认值:  

```js
let node = {
  type: "Identifier",
  name: "foo"
};

let { type: localType, name: localName = 'xxx' } = node;

console.log(localType);     // "Identifier"
console.log(localName);     // "foo"
```

### 多级对象解构

右边对象中的属性的值不一定是普通类型，可能是对象，或对象中包含对象，数组等等  
类型，次数可以使用内嵌对象解构来进行解构：  

原则就是左边的变量的结构要和右边实际对象中的结构保持一致  

```js
let node = {
  type: "Identifier",
  name: "foo",
  loc: {
    start: {
      line: 1,
      column: 1
    },
    end: {
      line: 1,
      column: 4
    }
  }
};

let { loc: { start }} = node;

console.log(start.line);        // 1
console.log(start.column);      // 1
```

多层解构重命名：  

```js
let node = {
  type: "Identifier",
  name: "foo",
  loc: {
    start: {
      line: 1,
      column: 1
    },
    end: {
      line: 1,
      column: 4
    }
  }
};

// 重命名
let { loc: { start: localStart }} = node;

console.log(start.line);        // 1
console.log(start.column);      // 1

```

\#+BEGIN<sub>QUOTE</sub>  

### 语法陷阱

```js
// no variables declared!
let { loc: {} } = node;
```

这种形式实际上是没任何作用的，因为左边的 `loc` 只是起到了站位的作用，实际起  
作用的是在 `{}` 里面，但是里面没任何东西，也就是说这个不会解构出任何东西，也  
不会产生任何新的变量。  

\#+END<sub>QUOTE</sub>  

## 数组解构

数组解构和对象解构用法基本是一样的，无非就是讲 `{}` 改成数组的 `[]` ，和对象  
一样，右边不可以是 `null` 和 `undefined`  

| 表达式                                                       | 结果                       | 说明                         |
| ------------------------------------------------------------ | -------------------------- | ---------------------------- |
| `let [first, second] = [1, 2]`                               | `first = 1, first = 2`     | 普通解构                     |
| `let [ , , third] = [1, 2, 3]`                               | `third = 3`                | 空置解构，只指定某个位置解构 |
| `let first = 1, second = 2` => `[first, second] = [11, 22]`  | `first = 11, second = 22`  | 先声明再解构                 |
| `let a = 1, b = 2`    => `[a, b] = [b, a]`                   | `a = 2, b = 1`             | 替换值快捷方式               |
| `let [a = 1, b] = [11, 22]`                                  | `a = 11, b = 22`           | 默认值                       |
| `let [a = 1, b] = [, 22]`                                    | `a = 1, b = 22`            | 默认值                       |
| `let [a, b = 2] = [ 1 ]`                                     | `a = 1, b = 2`             | 默认值                       |
| `let [a, [b]] = [1, [2]]`                                    | `a = 1, b = 2`             | 嵌套解构                     |
| `let [a, [b]] = [1, [2, 3], 4]`                              | `a = 1, b = 2`             | 嵌套解构                     |
| `let [a, [b], c] = [1, [2, 3], 4]`                           | `a = 1, b = 2, c = 4`      | 复杂解构                     |
| `let [a, ...bs] = [1, 2, 3, 4, 5]`                           | `a = 1, bs = [2, 3, 4, 5]` | rest 符号解构                |
| `[1, 2, 3].concat()` => `[1, 2, 3]` => es6: `[...as] = [1, 2, 3]` | `as = [1, 2, 3]`           | 克隆数组                     |

## 混合解构

混合解构意味着被解构的对象中可能既包含对象由包含数组，也是按照对象和数组的解  
构原理进行解构就OK。  

```js
let node = {
  type: "Identifier",
  name: "foo",
  loc: {
    start: {
      line: 1,
      column: 1
    },
    end: {
      line: 1,
      column: 4
    }
  },
  range: [0, 3]
};

let {
  loc: { start },
  range: [ startIndex ]
} = node;

console.log(start.line);        // 1
console.log(start.column);      // 1
console.log(startIndex);        // 0
```

## 参数解构

参数解构，即函数在声明的时候，参数是采用解构等式左边的形式书写，这种就需要要  
求在调用的时候, 这个参数位置必须有个非 null 和 Undefined 值，否则会报错，原因  
一样解构时候无法从 null 或 undefined 读取属性。  

### 被解构的参数属性列表

实例：  

```js
function setCookie(name, value, { secure, path, domain, expires }) {

  // code to set the cookie
}

setCookie("type", "js", {
  secure: true,
  expires: 60000
})
```

不传值得非法操作：  

```js
// Error!
setCookie("type", "js");
```

这样第三个参数就是 `undefined` 报错。  

优化参数解构写法有两种：  

1.  函数体内解构
2.  解构体默认值方式(推荐)

### 函数体内解构：

```js
function setCookie(name, value, options) {

  // 函数体内解构，给个默认值 || {} ，或者在参数那里这样： (name, value, options = {})
  let { secure, path, domain, expires } = options || {};

  // code to set the cookie
}
```

或者：  

```js
function setCookie(name, value, options = {}) {

  let { secure, path, domain, expires } = options;

  // code to set the cookie
}

```

### 直接参数解构体给默认值：

```js
function setCookie(name, value, { secure, path, domain, expires } = {}) {

  // ...
}
```

默认值，如果不传第三个参数，那么它的默认值就是 `{}` 避免解构出错。  

### 解构的参数默认值

和普通对象一样，解构出来的参数我们还可以给他们一个默认值：  

```js
function setCookie(name, value,
                   {
                     secure = false,
                     path = "/",
                     domain = "example.com",
                     expires = new Date(Date.now() + 360000000)
                   } = {}
                  ) {

  // ...
}
```

1.  第三个参数没传，四个参数都取默认值
2.  第三个参数有传递，根据普通对象定义解构

## 总结

1.  对象，先声明再解构，表达式必须用 `()` 包起来，作为表达式执行
2.  对象数组解构都可以给默认值，重命名，多层解构，混合解构
3.  解构遵循左侧最内层的变量声明，如果左侧最内层无任何变量，则解构表达式无任何意义
4.  参数解构，要么给当前参数默认值，要么保证调用时该参数都有传入非 `null` 或  
    `undefined` 的值，推荐参数默认值

# 符号和符号属性(Symbols)

符号类型值(`Symbol()`)是 es6 新增的一种原始数据类型和 strings, numbers,  
booleans, `null` 和 `undefined` 属于原始值类型。  

它相当于数字的 `42` 或字符串的 "hello" 一样，只是单穿的一些值，因此不能对其使  
用 `new Symbol()` 否则会报错。  

![img](http://qiniu.ii6g.com/1561166674.png)  

符号类型是作为一种创建私有对象成员的类型，在 es6 之前是没有什么方法可以区分普  
通属性和私有属性的。  

## 新增属性或方法

### Symbol.description<sup>2019</sup>

返回符号变量的描述。  

如： `Symbol('my symbol')` 的 `Symbol.description` 值为 'my symbol'。  

也就是返回内置属性 `[[Description] ]` 的值。  

## 创建符号

符号类型会创建一个包含唯一值得符号变量，这些变量是没有实际字面量表示的，也就  
是说一旦符号变量创建之后，只能通过这个变量去访问你所创建的这个符号类型。  

### 创建符号

通过 `Symbol([ description ])` 来创建符号，创建过程：  

1.  如果 *description* 是 **undefined**, 让 `descString = undefined`
2.  否则 `descString = ToString(description)`
3.  让内部值 `[[Description]]` 为 *descString*
4.  返回一个唯一的 Symbol 值

```js
let firstName = Symbol();
let secondName = Symbol();
let person = {};

person[firstName] = "Nicholas";
console.log(person[firstName]);     // "Nicholas"

console.log(firstName)
console.log(secondName)
console.log(firstName == secondName)
console.log(firstName === secondName)
console.log(Object.is(firstName, secondName))
```

+RESULTS:  

    Nicholas
    Symbol()
    Symbol()
    false
    false
    false

`firstName` 是存放了一个唯一值得符号类型变量，并且用来作为 `person` 对象的一  
个属性使用。  

因此，如果要访问对象中的对应的这个属性的值，每次都必须使用 `firstName` 这个  
符号变量去访问。  

> 如果需要实在需要符号类型对象，可以通过 `new Object(Symbol())` 去创建一个对象，  
> 而不能直接 `new Symbol()` 因为 `Symbol()` 得到的是一个原始值，就像你不能直接  
> `new 42` 一个道理。  
>
> ![img](http://qiniu.ii6g.com/1561167374.png)  

### 带参数的 Symbol(arg)

有时候可能需要对创建的符号做一些简单的区分，或者让其更加语义化，可以在创建的  
时候给 `Symbol()` 函数  

一个参数，参数本身并没有实际的用途，但是有利于代码调试。  

```js
let firstName = Symbol("first name");
let person = {};

person[firstName] = "Nicholas";

console.log("first name" in person);        // false
console.log(person[firstName]);             // "Nicholas"
console.log(firstName);                     // "Symbol(first name)"
console.log(firstName.description) // undefined
console.log(Symbol('xxx').description) // undefined
```

+RESULTS:  

    false
    Nicholas
    Symbol(first name)
    undefined
    undefined

如输出，参数会一并输出，因此推荐使用的时候加上参数，这样在调试的时候你就能区  
分开哪个符号来自哪里，而不至于输出都是 `Symbol()` 无法区分。  

参数作为符号的一种描述性质特征被储存在了内部 `[[Description]]` 属性中，这个属性  
会在对符号调用 `toString()` (隐式或显示调用)的时候去读取它的值，除了这个没有  
其他方法可以直接去访问 `[[Description]]` 。  

### 符号类型检测(typeof)

由于符号属于原始值，因此可以直接通过 `typeof` 就可以去判断变量是不是符号类型，  
es6 对 `typeof` 进行了扩展，如果是符号类型检测的结果值是“symbol”  

```js
let symbol = Symbol("test symbol")

console.log(typeof symbol) // "symbol"
```

+RESULTS:  

    symbol

## 使用符号

之前的例子中使用变量作为对象属性名的，都可以使用符号来替代，并且还可以对符号  
类型的属性进行定制，让其变成只读的。  

```js
// 创建符号，唯一
let firstName = Symbol('first name')

let person = {
  // 直接当做计算属性使用
  [firstName]: '张三'
}

// 让属性只读
Object.defineProperty(person, firstName, { writable: false })

let lastName = Symbol('last name')

Object.defineProperties(person, {
  [lastName]: {
    value: '李四',
    writable: false
  }
})

console.log(person[firstName])
console.log(person[lastName])
```

+RESULTS:  

    张三
    李四

## 分享符号

在使用过程中我们需要考虑一个问题：  

假设某个地方声明了一个符号类型及一个使用了这个符号作为属性 key 的对象，哪天  

如果我想在其他地方去使用它，该怎么办？？  

如今模块化得到普及，现在经常都是一个文件一个模块，用的时候导入这个文件得到相应的对象  

但由于符号值是唯一的，那外部模块又怎么知道另一个模块内部用了怎样的符号值作为对象？？  

这就是下面要讲的“符号分享”问题。  

> 全局符号注册表(Global Symbol Registry) 会在所有代码执行之前就创建好，且列表为空。  
>
> 它和全局对象一样属于环境变量，因此不要去假设它是什么或它不存在之类的，因此它在所有代码执行之前  
>
> 就创建好了，所以它是确确实实存在的。  

### Symbol.for()<a id="org281b793"></a>

在之前我们通过 `let firstName = Symbol('first name');` 来创建一个符号变量，但是在使用的时候必须的用  

`firstName` 去使用这个变量，而现在我们想将符号分享出去需要用到 `Symbol.for()` 。  

`Symbol.for(description)` 会针对 `description` 去创建一个唯一的符号值：  

```js
let uid = Symbol.for("uid");
let object = {};

object[uid] = "12345";

console.log(object[uid]);       // "12345"
console.log(uid);               // "Symbol(uid)"
```

`Symbol.for(desc)` 在第一次调用的时候，首先会去“全局符号注册表(global symbol registry)” 中去查找  

这个 `desc` 对应的符号值，找到了就返回这个符号值，如果没找到会创建一个新的符号值并且将它注册到全局符号注册表中，  

供下次调用时使用。  

-&#x2014;  

`Symbol.for(key)` 内部[实现步骤](https://tc39.es/ecma262/#sec-symbol-objects)(伪代码)：  

```js
Symbol.for = function (key) {

  // 1 key 转字符串
  let stringKey = ToString(key);

  // 2. 遍历 GlobalSymbolRegistryList 注册表
  for (let e in GlobalSymbolRegistryList) {
    // 符号值已经存在
    if (SameValue(e.[[Key]], stringKey)) {
      return e.[[Symbol]];
    }
  }

  // 3. 注册表中不含 `stringKey` 的符号值，则创建新的符号值
  // 3.1 新建符号值
  let newSymbol = Symbol(stringKey);
  // 3.1 给 [[Description]] 赋值
  newSymbol.[[Description]] = stringKey;

  // 4. 注册到符号注册表中去
  GlobalSymbolRegistryList.push({
    [[Key]]: stringKey,
    [[Symbol]]: newSymbol
  });

  // 5. 返回新建的符号值
  return newSymbol;

}
```

总结起来为3个步骤： 查找 -> 新建 -> 注册  

注册表中的每个符号片段是以对象形式存在(对象中包含 `Key` 和 `Symbol` 两个属性分别表示创建时的描述和符号值)。  

### 使用分享符号

在上一节[7.4.1](#org281b793) 中我们描述过了用来创建分享符号的 `Symbol.for(desc)` 接口，这里将探讨如何具体使用它来分享符号值。  

```js
let uid = Symbol.for("uid");
let object = {
  [uid]: "12345"
};

console.log(object[uid]);       // "12345"
console.log(uid);               // "Symbol(uid)"

let uid2 = Symbol.for("uid");

console.log(uid === uid2);      // true
console.log(object[uid2]);      // "12345"
console.log(uid2);              // "Symbol(uid)
```

在当前代码运行的全局作用域中都可以分享到一份 `Symbol.for("uid")` 符号，只需要调用它就可以拿到那个  

唯一的值。  

比如：  

```js

function createObj1() {
  let uid = Symbol.for("uid");
  let object = {
    [uid]: "12345"
  };

  return object
}

function createObj2() {
  let uid = Symbol.for("uid");
  let object = {
    [uid]: "67890"
  };

  return object
}


let uid1 = Symbol.for("uid");
const obj1 = createObj1()

let uid2 = Symbol.for("uid");
const obj2 = createObj2()

console.log(uid1 === uid2);
console.log(obj1[uid1]);
console.log(obj1[uid2]);
console.log(obj2[uid1]);
console.log(obj2[uid2]);

```

+RESULTS:  

    true
    12345
    12345
    67890
    67890

### Symbol.keyFor(symbolValue)

我们如果想创建或获取全局注册表中的符号是可以通过 [7.4.1](#org281b793) 中的 `Symbol.for(key)` ，但是  

如果我们只知道一个符号值变量的情况下，使用 `Symbol.for(key)` 就没法从注册表中取值了。  

因此，这里将介绍如何使用 `Symbol.keyFor(symbolValue)` 去根据符号变量查找注册表中的值。  

在这之前需要知道  

1.  `Symbol.for(key)` 创建的符号才会进入全局注册表
2.  `Symbol()` 直接创建的是不会加入全局注册表的

也就有了下面的代码及结果：  

```js
let uid = Symbol.for("uid");
console.log(Symbol.keyFor(uid));    // "uid"

let uid2 = Symbol.for("uid");
console.log(Symbol.keyFor(uid2));   // "uid"

let uid3 = Symbol("uid");
console.log(Symbol.keyFor(uid3));   // undefined
```

+RESULTS:  

    uid
    uid
    undefined

因此 `Symbol("uid");` 结果不会加入注册表，因此结果是 `undefined` 。  

## 符号强制转换

在 JavaScript 中类型强制转换是经常会被用到的一个特性，也让 JavaScript 使用起  
来会很灵活地可以将一个数据类型转成另一种数据类型。  

但是符号类型不支持强制转换。  

```js
let uid = Symbol.for("uid")

console.log(uid) // Symbol(uid)

// 在输出的时候实际上是调用了 uid.toString()
```

+RESULTS:  

    Symbol(uid)

当我们将符号变量加入计算或字符串操作时会报错，因为两个不同类型的值进行操作会  
发生隐式转换，但是符号类型不支持强转的，因此会报异常。  

```js
let uid = Symbol.for('uid'),
    desc = '',
    sum = 0

try {
  desc = uid + ""
} catch (e) {
  console.log(e.message)
}

try {
  sum = uid / 1
} catch (e) {
  console.log(e.message)
}
```

+RESULTS: 异常信息  

    Cannot convert a Symbol value to a string
    Cannot convert a Symbol value to a number

## 获取对象符号属性

获取对象属性的方法：  

1.  `Object.keys()` 会获取所有可枚举的属性
2.  `Object.getOwnPropertyNames()` 获取所有属性，忽略可枚举性

但是为了兼容 es5 及以前的版本，他们都不会去获取符号属性，因此需要使用  
`Object.getOwnPropertySymbols()` 去单独获取对象所有的符号属性，返回一个包含所  
有符号属性的数组。  

```js
let uid = Symbol.for("uid");
let object = {
  [uid]: "12345",
  [Symbol.for("uid2")]: "67890"
};

let symbols = Object.getOwnPropertySymbols(object);

console.log(symbols.length);        // 1
console.log(symbols[0]);            // "Symbol(uid)"
console.log(object[symbols[0]]);    // "12345"
```

+RESULTS:  

    2
    Symbol(uid)
    12345

## 符号内部操作(方法)

在 es6 中 JavaScript 的许多特性中其内部的实现都是使用到了符号内部方法。  

比如下表涉及到的内容<a id="org3f0983b"></a>：  

| 符号方法                    | 类型          | JavaScript 特性                           | 描述                                                    |
| --------------------------- | ------------- | ----------------------------------------- | ------------------------------------------------------- |
| `Symbol.hasInstance`        | `boolean`     | `instanceof`                              | [7.7.1](#org7e71710) 实例(原型链)检测                   |
| `Symbol.isConcatSpreadable` | `boolean`     | `Array.prototype.concat`                  | [7.7.2](#org67eb564) 检测参数合法性                     |
| `Symbol.iterator`           | `function`    | 调用后得到迭代器                          | 遍历对象或数组(等可迭代的对象)的时候会用到              |
| `Symbol.asyncIterator`      | `function`    | 调用后得到异步迭代器(返回一个 `Promise` ) | 遍历对象或数组(等可迭代的对象)的时候会用到              |
| `Symbol.match`              | `function`    | `String.prototype.match`                  | [7.7.3](#org139fb83) 正则表达式对象内部属性             |
| `Symbol.matchAll`           | `function`    | `String.prototype.matchAll`               | [7.7.3](#org139fb83) 正则表达式对象内部属性             |
| `Symbol.replace`            | `function`    | `String.prototype.replace`                | [7.7.3](#org139fb83) 正则表达式对象内部属性             |
| `Symbol.search`             | `function`    | `String.prototype.search`                 | [7.7.3](#org139fb83) 正则表达式对象内部属性             |
| `Symbol.split`              | `function`    | `String.prototype.split`                  | [7.7.3](#org139fb83) 正则表达式对象内部属性             |
| `Symbol.species`            | `constructor` | -                                         | 派生对象生成                                            |
| `Symbol.toPrimitive`        | `function`    | -                                         | [7.7.4](#orgae3ed38) 返回一个对象的原始值               |
| `Symbol.toStringTag`        | `string`      | `Object.prototype.toString()`             | [7.7.5](#orgc7b5259) 返回一个对象的字符串描述           |
| `Symbol.unscopables`        | `object`      | `with`                                    | [7.7.8](#orgf7af38d) 不能出现在 `with` 语句中的一个对象 |

> 通过改变对象的上面的内部符号属性的实现，可以让我们去修改对象的一些  
>
> 默认行为，比如 `instanceof` 一个对象的时候可以改变它的行为让它返回一个非预期值。  

### Symbol.hasInstance<a id="org7e71710"></a>

每个函数都有一个内部 `Symbol.hasInstance` 方法用来判断给定的对象是不是这个函  
数的一个实例。  

这个函数定义在 `Function.prototype` 上，因此所有的函数都会继承 `instanceof`  
属性的默认行为，  

并且这个方法是 *nonwritable*, *nonconfigurable*, 和 *nonenumerable* 的，确保  
它不会被错误的重写。  

因此下面的中的两句 `obj instanceof Array` 和  
`Array[Symbol.hasInstance](obj)` 是等价的。  

```js

const obj = {}

let v1 = obj instanceof Array;

// 等价于

let v2 = Array[Symbol.hasInstance](obj);

console.log(v1, v2)
```

+RESULTS:  

    false false

在 es6 中实际上已经对 `instanceof` 操作做了重定义，其内部还让它支持了函数调  
用方式，即其内部的 `Symbol.hasInstance` 不再限定只是 `boolean` 类型，它还可  
以是函数类型，因此我们可以通过重写这个方法来改变 `instanceof` 的默认行为。  

比如：让一个对象的 `instanceof` 操作总是返回 `false`  

```js
function MyObj() {
  // ...
}

Object.defineProperty(MyObj, Symbol.hasInstance, {
  value: function(v) {
    console.log('override method')
    return false;
  }
})

let obj = new MyObj();

console.log(obj instanceof MyObj); // false
```

+RESULTS:  

    override method
    false

由于 `Symbol.hasInstance` 属性是 *nonwritable* 的因此需要通过  
`Object.defineProperty` 去重新定义这个属性。  

\#+BIGIN<sub>QUOTE</sub>  
虽然 es6 赋予了这种可以重写一些 JavaScript 特性的默认行为的能力，但是依旧不  
推荐去这么做，很可能让你的代码变得很不可控，也不容易让人理解你的代码。  
\#+END<sub>QUOTE</sub>  

### Symbol.isConcatSpreadable<a id="org67eb564"></a>

对应着 `Array.prototype.concat` 的内部使用 `Symbol.isConcatSpreadable` 。  

concat 使用示例：  

```js
let colors1 = [ "red", "green" ],
    colors2 = colors1.concat([ "blue", "black" ]);

console.log(colors2.length);    // 4
console.log(colors2);           // ["red","green","blue","black"]
```

+RESULTS:  

    4
    [ 'red', 'green', 'blue', 'black' ]

我们一般用 `concat` 去扩展一个数组，把他们合并到一个新的数组中去。  

根据 `Array.prototype.concat(value1, ...valueNs)` 的定义，它是可以接受 `n`  
多个参数的，比如：  

`[].concat(1, 2, 3, ...)` `> =[1, 2, 3, ...]`  

并且并没有限定参数的类型，即这些 `value1, ...valuesNs` 可以是任意类型的值  
（数组，对象，纯值等等）。  

另外，如果参数是数组的话，它会将数组项一一展开合并到源数组中区(且只会做一级  
展开，数组中的数组不会展开)。  

比如：  

```js
let colors1 = [ "red", "green" ],
    colors2 = colors1.concat(
      [ "blue", "black", [ "white" ] ], "brown", { color: "red" });

console.log(colors1 === colors2)
console.log(colors2.length);    // 5
console.log(colors2);           // ["red","green","blue","black","brown"]
```

+RESULTS:  

    false
    7
    [ 'red',
      'green',
      'blue',
      'black',
      [ 'white' ],
      'brown',
      { color: 'red' } ]

但是，如果我们需要的是将 `{ color: 'red' }` 中的属性值 `'red'` 合并到数组末  
尾，该如何做？？  

->>> `Symbol.isConcatSpreadable` 就是它  

和其他内置符号不一样，这个在所有的对象中默认是不存在的，因此如果我们需要就得  
手动去添加，让这个对象  

变成 *concatable* 只需要将这个属性值置为 `true` 即可:  

```js
let collection = {
  0: 'aaa',
  '1': 'bbb',
  length: 2,
  [Symbol.isConcatSpreadable]: true
}

let objNoLength = {
  0: 'xxx',
  1: 'yyy',
  [Symbol.isConcatSpreadable]: true
}


let objNoNumberAttrs = {
  a: 'www',
  b: 'vvv',
  length: 2,
  [Symbol.isConcatSpreadable]: true
}

let words = [ 'somthing' ];

console.log(words.concat(collection).toString())
console.log(words.concat(objNoLength).toString())
console.log(words.concat(objNoNumberAttrs).toString())
```

+RESULTS:  

    somthing,aaa,bbb
    somthing
    somthing,,

分析结果得出，对象要变的可以被 `Array.prototype.concat` 使用，  

需要满足以下条件：  

1.  必须有 `length` 属性，否则对结果没任何影响，如结果第二行输出： *somthing*
2.  必须有以数字为 `key` 的属性，否则数组中将使用空值代替追加的值追加到数组中  
    去，如第三行输出： *somthing,,*
3.  必须增加符号属性 `Symbol.isConcatSpreadable` 且值为 `true`

同理，我们可以将数组对象的 `Symbol.isConcatSpreadable` 符号属性置为 `false`  
来阻止数组的 *concatable* 行为。  

### Symbol.match, Symbol.replace, Symbol.search, Symbol.split<a id="org139fb83"></a>

和字符串，正则表达式有关的一些符号，对应着字符串和正则表达式的方法：  

-   `match(regex)` 字符串是否匹配正则
-   `replace(regex, replacement)` 字符串替换
-   `search(regex)` 字符串搜索
-   `split(regex)` 字符串切割

这些都需要用到正则表达式 `regex`  

在 es6 之前这些方法与正则表达式的交互过程对于开发者而已都是隐藏了其内部细节  
的，也就是说开发者无法通过自己定义的对象去表示一个正则。  

在 es6 中定义了四个符号便是用来实现 `RegExp` 内部实现对象，即可以通过对象的  
方式去实现一个正则表达式规则。  

这四个符号属性是在 `RegExp.prototype` 原型上被定义的，作为以上方法的默认实现。  

> 意思就是 `math`, `replace`, `search`, `split` 这四个方法的 `regex` 正则  
>
> 表达式的内部实现基于对应的四个符号属性函数 `Symbol.math`, `Symbol.replace`,  
>
> `Symbol.search`, `Symbol.split` 。  

-   `Symbol.match` 接受一个字符串参数，如果匹配会返回一个匹配的数组，未匹配返回 `null` 。
-   `Symbol.replace` 接受一个字符串参数和一个用来替换的字符串，返回一个新的字符串。
-   `Symbol.search` 接受一个字符串，返回匹配到的数字所以呢，未匹配返回 -1。
-   `Symbol.split` 接受一个字符串，返回以匹配到的字符串位置分割成的一个字符串数组

```js

// 等价于 /^.${10}$/
let hasLengthOf10 = {
  [Symbol.match]: function(value) {
    return value.length === 10 ? [value] : null
  },

  [Symbol.replace]: function(value, replacement) {
    return value.length === 10 ? replacement : value
  },

  [Symbol.search]: function(value) {
    return value.length === 10 ? 0 : -1
  },

  [Symbol.split]: function(value) {
    return value.length === 10 ? ["", ""] : [value]
  }
}

let msg1 = "Hello World", // 11 chars
    msg2 = "Hello John"; // 10 chars


let m1 = msg1.match(hasLengthOf10)
let m2 = msg2.match(hasLengthOf10)

console.log(m1)
console.log(m2)

let r1 = msg1.replace(hasLengthOf10, "Howdy!")
let r2 = msg2.replace(hasLengthOf10, "Howdy!")

console.log(r1)
console.log(r2)


let s1 = msg1.search(hasLengthOf10)
let s2 = msg2.search(hasLengthOf10)

console.log(s1)
console.log(s2)

let sp1 = msg1.split(hasLengthOf10)
let sp2 = msg2.split(hasLengthOf10)

console.log(sp1)
console.log(sp2)
```

+RESULTS:  

    null
    [ 'Hello John' ]
    Hello World
    Howdy!
    -1
    0
    [ 'Hello World' ]
    [ '', '' ]

通过这几个正则对象的内部符号属性，使得我们有能力根据需要去完成更复杂的正则匹配规则。  

### Symbol.toPrimitive<a id="orgae3ed38"></a>

在 es6 之前，如果我们要使用 `==` 去比较两个对象的时候，其内部都会讲对象转成  
原始值之后再去比较，且此时的转换属于内部操作，我们是无法知晓更无法干涉的。  

但在 es6 出现之后，这种内部实现通过 `Symbol.toPrimitvie` 被暴露出来了，从而  
使得我们有能力取改变他们的默认行为。  

`Symbol.toPrimitvie` 是定义在所有的标准类型对象的原型之上，用来描述在对象被  
转换成原始值之前的都做了些什么行为。  

当一个对象发生原始值转换的时候， `Symbol.toPrimitive` 就会带上一个参数  
(`hint`)被调用，这个参数值为 "number", "string", "default" 中的一个(*值是由  
JavaScript 引擎所决定的*)，分别表示：  

1.  "number" ：表示 `Symbol.toPrimitive` 应该返回一个数字。
2.  "string" ：表示 `Symbol.toPrimitvie` 应该返回一个字符串。
3.  "default" ： 表示原样返回。

在大部分的标准对象中， `number` 模式的行为按照以下的优先级来返回：  

1.  先调用 `valueOf()` 如果结果是一个原始值，返回它。
2.  然后调用 `toString()` 如果结果是一个原始值，返回它。
3.  否则，抛出异常。

同样， `string` 模式的行为优先级如下：  

1.  先调用 `toString()` 如果结果是一个原始值，返回它。
2.  然后调用 `valueOf()` 如果结果是一个原始值，返回它。
3.  否则，抛出异常。

在此，可以通过重写 `Symbol.toPrimitive` 方法，可以改变以上的默认行为。  

> "default" 模式仅在使用 `==`, `+` 操作符，以及调用 `Date` 构造函数的时候  
>
> 只传递一个参数的时候才会用到。大部分的操作都是采用的 "number" 或 "string" 模式。  

实例：  

```js
function Temperature(degrees) {
  this.degrees = degrees
}

let freezing = new Temperature(32)

console.log(freezing + "!") // [object Object]!
console.log(freezing / 2) // NaN
console.log(String(freezing)) // [object Object]
```

输出结果：  

![img](http://qiniu.ii6g.com/1561273762.png)  

因为默认情况下一个对象字符串化之后会变成 `[object Object]` 这是其内部的默认  
行为。  

通过重写原型上的 `Symbol.toPrimitive` 函数可以改写这种默认行为。  

比如：  

```js
function Temperature(degrees) {
  this.degrees = degrees
}

Temperature.prototype[Symbol.toPrimitive] = function(hint) {
  switch (hint) {
  case 'string':
    return this.degrees + '\u00b0'
  case 'number':
    return this.degrees
  case 'default':
    return this.degrees + " degrees"
  }
}

let freezing = new Temperature(32)

console.log(freezing + "!")
console.log(freezing / 2)
console.log(String(freezing))
```

+RESULTS:  

    32 degrees!
    16
    32°

结果就像我们之前分析的， 只有 `==` 和 `+` 执行的是 “default" 模式，  

其他情况执行的要么是 "number" 模式(如： `freezing / 2`)  

要么是 "string" 模式(如： `String(freezing)`)  

### Symbol.toStringTag 介绍<a id="orgc7b5259"></a>

在 JavaScript 的一个有趣的问题是，能同时拥有多个全局执行上下文的能力。  

这个发生在 web 浏览器环境下，一个页面可能包含一个 `iframe` ，因此当前页面和  
这个 iframe 各自都拥有自己的执行环节。  

通常情况下，这并不是什么问题，因为数据可以通过一些手段让其它当前页和  
`iframe` 之间进行传递，问题是如何去识别这个被传递的对象是源自哪个执行环境？？  

比如，一个典型的问题是在 `page` 和 `iframe` 之间互相传递一个数组。在 es6 的  
术语中， 页面和iframe 每一个都代表着一个不同的领域(*realm*, JavaScript 执行  
环境)。每个领域都有它自己的全局作用域包含了它自己的一份全局对象的副本。  

无论，数组在哪个领域被创建，它都很明确的是一个数组对象，当它被传递到另一个领  
域的时候，使用 `instanceof Array` 的结果都是 `false` ，因为数组是通过构造函  
数在别的领域所创建的，而  

`Array` 代表的仅仅是当前领域下的构造函数，即两个领域下的 `Array` 不是一回事。  

*这就造成了在当前领域下去判断另一个领域下的一个数组变量是不是数组，得到的结  
果将是 `false` 。*  

### Symbol.toStringTag 延伸(不同 *realm* 下的对象识别) <a id="org1d14060"></a>

对象识别的应对之策(`Object.prototype.toString.call(obj)`)  

```js
function isArray(value) {
  return Object.prototype.toString.call(value) === "[object Array]";
}

console.log(isArray([]));   // true
```

+RESULTS:  

    true

这种方式虽然比较麻烦，但是却是最靠谱的方法。  

因为每个类型的 `toString()` 可能有自己的实现，返回的值是无法统一的，但是  
`Object.prototype.toString` 返回的内容始终是 `[object Array]` 这种，后面是被  
检测数据代表的类型的构造函数，它总是能得到正确且精确的  

结果。  

`Object.prototype.toString` 内部实现的伪代码：  

```js
// toString(object)

function toString(obj) {
  // 1. 判断 undefined 和 null
  if (this === undefined) {
    return '[object Undefined]';
  }

  if (this === null) {
    return '[object Null]';
  }

  let O = ToObject(this); // 上下文变量对象化
  let isArray = IsArray(O); // 先判断是不是数组类型
  let builtinTag = ''

  let has = builtinName => !!O.builtinName;

  // 2. 根据内置属性，检测各对象的类型
  if (isArray === true) { // 数组类型
    builtinTag = 'Array';
  } else if ( has([[ParameterMap]]) ) { // 参数列表，函数参数对象
    // 函数的参数 arguments 对象
    builtinTag = 'Arguments';
  } else if ( has([[Call]]) ) { // 函数
    builtinTag = 'Function';
  } else if ( has([[ErrorData]]) ) { // Error对象
    builtinTag = 'Error';
  } else if ( has([[BooleanData]]) ) { // Boolean 布尔对象
    builtinTag = 'Boolean';
  } else if ( has([[StringData]]) ) { // String 对象
    builtinTag = 'String';
  } else if ( has([[DateValue]]) ) { // Date 对象
    builtinTag = 'Date';
  } else if ( has([[RegExpMatcher]]) ) { // RegExp 正则对象
    builtinTag = 'RegExp';
  } else {
    builtinTag = 'Object' // 其他
  }

  // 3. 最后检测 @@toStringTag - Symbol.toStringTag 的值
  let tag = Get(O, @@toStringTag);

  if (Type(tag) !== 'string') {
    tag = builtinTag;
  }

  return `[object ${tag}]`;
}

```

从伪代码中我们知道，最后的实现中使用到了 `@@toStringTag` 即对应这里的  
`Symbol.toStringTag` 属性值,  

并且这个放在最后判断，优先级最高，即如果我们重写了 `Symbol.toStringTag` 那么  
重写之后的返回值将最优先返回。  

### Symbol.toStringTag 的 ES6 实现

正如 [7.7.6](#org1d14060) 中的伪代码所示，在 es6 中对于  
`Object.prototype.toString.call(obj)` 的实现中加入了 `@@toStringTag` 内部属  
性的检测，即对应着这里的 `Symbol.toStringTag` ，那么我们便  

可以通过改变这个值来修改它的默认行为，从而得到我们想要的类型值。  

比如：我们有一个 `Person` 构造函数，我们希望在使用 `toString()` 的时候得到结  
果是 `[object Person]`  

```js
function Person(name) {
  this.name = name
}

Person.prototype[Symbol.toStringTag] = 'Person'

let me = new Person('xxx')

Person.prototype.toString = () => '[object Test]'

console.log(me.toString()) // [object Person]
console.log(Object.prototype.toString.call(me)) // [object Person]
console.log(me.toString === Object.prototype.toString) // true

```

+RESULTS: 未重写 Person.prototype.toString 结果  

    [object Person]
    [object Person]
    true

+RESULTS: 重写 Person.prototype.toString 的结果  

    [object Test]
    [object Person]
    false

我们发现就算重写了 `Person.prototype.toString` 也不会影响  
`Symbol.toStringTag` 赋值后的运行结果，如后面调用  
`Object.prototype.toString.call(me)` 结果依旧是 `[object Person]` 。  

因为我们重写了 `Symbol.toStringTag` 属性值，因此[7.7.6](#org1d14060)实现部分：  

```js
// 3. 最后检测 @@toStringTag - Symbol.toStringTag 的值
let tag = Get(O, @@toStringTag); // 这里的结果就成了 'Person'

if (Type(tag) !== 'string') {
  tag = builtinTag;
}

return `[object ${tag}]`
```

因此得到 `[object Person]` 返回结果。  

我们还可以通过重写 `Person` 自身的 `toString()` 的实现让其拥有自己的默认行为，  
上面的第三行  

结果表明 `me.toString()` 最终调用的是 `Object.prototype.toString` 。  

### Symbol.unscopables<a id="orgf7af38d"></a>

`with` 语句在 JavaScript 世界中是最具争议的一项特性之一。  

原本设计的初衷是避免重复书写一样的代码，但是在实际使用过程中，却是让代码更难  
理解，很容易出错，也有性能上的影响。  

虽然，极力不推荐使用它，但是在 es6 中为了考虑向后兼容性问题，在非严格模式下  
依旧对它做了支持。  

比如：  

```js
let values = [1, 2, 3],
    colors = ["red", "green"],
    color = "black";

with(colors) {
  push(color);
  push(...values);
}

console.log(colors.toString())
```

+RESULTS:  

    red,green,black,1,2,3

上面代码，在 `with` 里面调用的两次 `push` 等价于 `colors.push` 调用，  

因为 `with` 将本地执行上下文绑定到了 `colors` 上。  

`values, color` 指向的均是在 `with` 语句外面创建的 `values` 和 `color` 。  

但是在 ES6 中给数组增加了一个 `values` 方法，这个方法会返回当前数组的迭代器  
对象： `Array Iterator {}`  

这就意味着在 ES6 的环境中， `values` 指向的将是数组本身的 `values()` 方法而  
不是外面声明的 `values = [1, 2, 3]` 这个数组，将破坏整个代码的运行。  

这就是 `Symbol.unscopables` 存在的原因。  

`Symbol.unscopables` 被用在 `Array.prototype` 上用来指定那些属性不能在  
`with` 中创建绑定：  

```js
// built into ECMAScript 6 by default
Array.prototype[Symbol.unscopables] = Object.assign(Object.create(null), {
  copyWithin: true,
  entries: true,
  fill: true,
  find: true,
  findIndex: true,
  keys: true,
  values: true
});

```

上面是默认情况下 ES6 内置的设定，即数组中的上列属性不允许在 `with` 中创建绑  
定，从列表能发现这些被置为 `true` 的属性都是 `es6` 中新赠的方法，这主要是为  
了兼容以前的代码只针对新增的属性这么使用。  

\#+BIGIN<sub>QUOTE</sub>  
一般情况下，不需要重新定义 `Symbol.unscopables` ，除非代码中存在 `with` 语句并且  

需要做一些特殊处理的时候，但是建议尽量避免使用 `with` 。  
\#+END<sub>QUOTE</sub>  

## 总结

1.  Symbols 是一种新的原始值类型，用来创建一些属性，这些属性只能使用对应的符号  
    或符号变量去访问。
2.  `Symbol([description])` 用来创建一个符号，推荐传入描述，便于识别。
3.  `Symbol.for(key)` 首先查找注册表(GSR)，如果 `key` 对应的符号存在直接返回，  
    如果不存在则创建新符号并加入到注册表，然后返回新创建的符号。
4.  `Symbol.keyFor(symbolValue)` 通过符号变量从注册表中找到对应的符号值，没有  
    返回 `undefined` 。
5.  符号共享通过 `Symbol.for(key)` 和 `Symbol.keyFor(symbolValue)` 可以让符号  
    达到共享的目的，因为全局注册表在所有代码运行之前就已经创建好了。
6.  符号不允许类型转换(或隐式转换)。
7.  `Object.keys()` 和 `Object.getOwnPropertyNames()` 不能获取到符号属性。
8.  `Object.getOwnPropertySymbols(obj)` 能获取到对象的所有符号属性。
9.  `Object.defineProperty()` 和 `Object.defineProperties()` 对符号属性也有效。
10. 知名符号[7.7](#org3f0983b)，以往的内部实现是不对开发者开放的，如今有了这些知名  
    符号属性，可以让开发者自信改变一些功能和接口的默认行为。

# Sets 和 Maps

-   *set* 集合是一组没有重复元素的一个序列。
-   *map* key 值得集合，指向对应的值

## ECMAScript 5 中的 Sets 和 Maps

在 es6 之前会有各种 sets/maps 的实现方式，但是大都或多或少有所缺陷。  

### 背景

比如： 使用对象属性实现  

```js
let st = Object.create(null)

set.foo = true

if (set.foo) {
  // sth
}
```

在将对象作为 set 或 map 使用的时候唯一的区别在于：  

*map* 里面的 key 有存储对应的具体内容，而不像 *set* 仅仅用来存储 true or false,  

用来标识 key 是否存在。  

```js
let map = Object.create(null)

map.foo = 'bar'

let value = map.foo

console.log(value) // 'bar'
```

+RESULTS:  

    bar

### 潜在问题

使用对象实现 set/map 的问题：  

1.  无法避免字符串 key 的唯一性问题
2.  无法避免对象作为 key 的唯一性问题

**字符串作为 key** :  

```js
let map = Object.create(null)

map[5] = 'foo'

console.log(map["5"]) // 'foo'
```

+RESULTS:  

    foo

因为对于对象来说，使用数字下表去访问的时候，实际上是将下标数值转成字符串去访问了，  

即相当于 `map[5]` 等价于 `map['5']` 因此，有上面的结果输出。  

*但是，你偏偏想使用 5 和 '5' 去标识两个 key 的时候就无法达到目的了。*  

**对象作为 key** :  

```js
let map = Object.create(null),
    key1 = {},
    key2 = {}

map[key1] = 'foo'

console.log(map[key2]) // 'foo'
```

+RESULTS:  

    foo

对象作为 `key` 值得时候，内部会发生类型转换，将对象转成 `"[object Object]"`  

因此无论用 key1 还是 key2 去访问 map ，最后的结果都是 `map["[object
    Object]"]` 去访问了  

因此，结果都是 'foo'。  

## Sets 集合

1.  创建使用 `new Set()` 创建实例。
2.  添加使用 `set.add()` 方法。
3.  集合区分数值的数字类型和字符串类型，不会发生类型强转。
4.  `-0` 和 `+0` 在集合中会被当做一样处理
5.  对象可以作为 set 的元素，且两个 `{}` 会被当做两个不同的元素处理

### set 初始化

`new Set()` 创建了一个空的 `set`  

可以在初始化的时候传入一个数组。  

> 实际上， `Set` 构造函数可以接受任意一个 `iterable` 对象作为参数。  

```js
let set = new Set([1, 2, 3, 4])

console.log(set.size) // 4
```

+RESULTS:  

    4

### 添加元素 `set.add()`

添加的元素区分类型，不会做类型转换，即 `5` 和 `'5'` 是不一样的，重复添加也只  
会执行一次，=set= 的元素是不会重复的。  

```js
let set = new Set()

set.add(5)
set.add('5')
set.add(5)

console.log(set.size, set)
```

+RESULTS:  

    2 Set { 5, '5' }

对象元素：  

```js
let set = new Set(),
    key1 = {},
    key2 = {}

set.add(key1)
set.add(key2)
set.add(key1)

console.log(set.size) // 2
```

+RESULTS:  

    2

### set apis

1.  `set.has(v)` 判断 set 中是否有元素 `v` ，返回 `true/false`
2.  `set.add(v)` 添加元素
3.  `set.size` 集合大小
4.  `set.delete(v)` 删除元素
5.  `set.clear()` 清空集合

### 集合迭代(forEach)

对集合使用 `forEach` 和对数组使用的方法一样，它接受一个函数，抓个函数又三个  
参数：  

1.  第一个参数：集合的当前值
2.  第二个参数：和第一个参数一样是当前元素的值，跟数组不一样，数组使用  
    `forEach` 这个参数是当前索引值
3.  第三个参数：被遍历的集合本身。

**Sets 没有 Key 值。**  

```js
let set = new Set(['a', 'b', 'c', 'd', 'e'])

console.log(set[0]) // undefined, 没有下标值
set.forEach(function(idx, v, ownerSet) {
  console.log(idx, v, ownerSet === set, ownerSet)
})
```

+RESULTS:  

    undefined
    a a true Set { 'a', 'b', 'c', 'd', 'e' }
    b b true Set { 'a', 'b', 'c', 'd', 'e' }
    c c true Set { 'a', 'b', 'c', 'd', 'e' }
    d d true Set { 'a', 'b', 'c', 'd', 'e' }
    e e true Set { 'a', 'b', 'c', 'd', 'e' }

结果所示：  

1.  集合的 key 就是 value。
2.  遍历的函数第三个参数 `ownerSet` 就是被遍历的 `set` 集合本身。

在使用 `forEach` 可以给它传递一个上下文参数，让绑定回调函数里面的 `this`  

```js
let set = new Set([1,2])

let processor = {
  output(value) {
    console.log('output from processor: ' + value)
  },

  process(dataSet, scope = 1) {
    const obj = {
      output(value) {
        console.log('output from obj: ' + value)
      }
    }
    dataSet.forEach(function(value) {
      this.output(value)
    }, scope === 1 ? this : obj)
  }
}

processor.process(set) // scope: processor
processor.process(set, 2) // scope: obj
```

+RESULTS:  

    output from processor: 1
    output from processor: 2
    output from obj: 1
    output from obj: 2

1.  将 `this` 传递给回调，从而 `output` 来自 `processor` 。
2.  将 `obj` 传递给回调，从而 `output` 来自 `obj` 。

结论：\*我们可以通过给 forEach 传递第二个参数来改变回调函数的执行上下文。\*  

使用箭头函数解决 `this` 指向问题：  

```js
let set = new Set([1,2])

let processor = {
  output(value) {
    console.log('output from processor: ' + value)
  },

  process(dataSet) {
    // this 总是绑定到 processor
    dataSet.forEach(value => this.output(value), {})
  }
}

processor.process(set) // scope: processor

```

+RESULTS:  

    output from processor: 1
    output from processor: 2

无论第二个参数 `{}` 传或不传结果都一样，箭头函数里的 `this` 指向不会发生改变。  

> 集合不能直接使用索引访问元素，如果需要使用到索引访问元素，那最好将集合转成数组来使用。  

### Set 和 Array 之间的转换

1.  集合转数组 `let set = new Set([1, 2, 3, 2]);` ，且会将重复的元素去掉只余  
    一个。
2.  数组转集合，最简单的就是展开符了 `let arr = [...set];`

*展开符(&#x2026;)可以作用域任何 iterable 的对象。即任何可 iterable 的对象都可以通  
过 `...` 转成数组。*  

也因为有了 `Set` 和 `...` 从而是数组的去重变得异常简单:  

```js
const eleminateDuplicates = items => [...new Set(items)]

let nums = [1, 2, 3, 2, 4, 3, 4]

console.log(eleminateDuplicates(nums).toString())
```

+RESULTS:  

    1,2,3,4

### 弱集(Weak Sets)

因为它存储对象引用的方式，集合类型也可以叫做强集合类型。  

即集合中对于对象的存储是存储了该对象的引用而不是被添加到集合是的那个变量名而  
已，类似对象的属性的值为对象一样，就算改变了这个属性的值，那个对象如果有其他  
变量指向它，那他一样存在（类似 C 的指针概念，两个指针同时指向一块内存，一个  
指针的指向发生变化并不会影响另一个指针指向这块内存）。  

比如：  

```js
let animal = {
  dog: {
    name: 'xxx',
    age: 10
  }
}

let dog1 = animal.dog

console.log(dog1.name) // 'xxx'
// 引用发生变化
animal.dog = null

// 并不影响别的变量指向 { name: 'xxx', age: 10 } 这个对象
console.log(dog1.age) // 10

// 指回去，依旧是它原来指向的那个对象
animal.dog = dog1
console.log(animal.dog.name) // 'xxx'
console.log(animal.dog.age) // 10

```

+RESULTS:  

    xxx
    10
    xxx
    10

根据引用的特性，对于集合元素也一样实用：  

```js
let set = new Set();
let key = {};

set.add(key) // 实际将对象的引用加到集合中

console.log(set) // 1
console.log(set.size) // 1

key = null // 改变了变量值而已，实际引用的那个对象还在
console.log(set.size) // 1

key = [...set][0]

console.log(key)// {}
```

+RESULTS:  

    Set { {} }
    1
    1
    {}
    undefined

这种强引用在某些情况下很可能会出现内存泄漏，比如，在浏览器环境中  

集合中保存了一些 DOM 元素的引用，而这些元素本身可能会被其他地方的  

代码从 DOM 树中移除，同时你也不想再保有这些 DOM 元素的引用了，或者说以后  

都不会用到它了，应该被释放回收才对，但是实际上集合中仍然保有这些元素的引用  
(实际已经不存在的东西)，这种情况就叫做内存泄漏(*memory leak*)。  

为了解决这种情况， ECMAScript 6 中增加了一种集合类型： *weak sets* ,弱引用只  
会保存对象的弱引用 。  

### 创建 Weak Sets(`WeakSet`)

弱引用集合构造函数： `WeakSet`  

```js
let set = new WeakSet(),
    key = {}, key1 = key

set.add(key)

console.log(set)
key = null
console.log(set.has(key))
console.log(set.has(key1))
console.log(set.has(null))
console.log(set)
```

+RESULTS:  

    WeakSet { [items unknown] }
    false
    true
    false
    WeakSet { [items unknown] }
    undefined

浏览器环境输出结果：  

![img](http://qiniu.ii6g.com/1561596922.png)  

## Set 和 WeakSet 对比<a id="org08033ce"></a>

Set 中添加对象，添加的是对该对象的引用，因此保存该对象的变量值发生变化，并不  
影响该对象在集合中的事实。  

WeakSet 中添加的是该变量的原始值？？变量值一旦改变，集合中的内容将随之改变(由  
JavaScript 引擎处理)。  

> TODO: Set 保存引用？WeekSet 保存原始值？？有啥区别？？  

这里我们将对比两种集合在不同形式下的运行结果，通过对比分析来搞清楚集合中引用  
和原始值的概念。  

### Set, WeakSet 添加对象的结果

```js
let set = new Set()
let key = { a: 1 }

set.add(key)
console.log(set)
console.log(set.has(key)) // true

let wset = new WeakSet()
let wkey = { a: 1 }

wset.add(wkey)
console.log(wset)
console.log(wset.has(wkey))
```

+RESULTS:  

    Set { { a: 1 } }
    true
    WeakSet { [items unknown] }
    true
    undefined

这里 WeakSet 结果不直观，下面是浏览器结果：  

![img](http://qiniu.ii6g.com/1561597399.png)  

从浏览器端的结果分析：  

1.  两者在内部属性 `Entries` 中都有一个我们添加的 `{a : 1}` 对象元素。
2.  WeakSet 没有 size 属性， Set 有 size 属性。

### 改变对象 key/wkey 的值

```js
let set = new Set()
let key = { a: 1 }

set.add(key)
console.log(set) // 改变之前
key = null
console.log(set) // 改变之后
console.log(set.has(key)) // true

let wset = new WeakSet()
let wkey = { a: 1 }

wset.add(wkey)
console.log(wset) // weak key 改变之前
wkey = null
console.log(wset) // weak key 改变之后
console.log(wset.has(wkey))

```

+RESULTS: emacs nodejs  

    Set { { a: 1 } }
    Set { { a: 1 } }
    false
    WeakSet { [items unknown] }
    WeakSet { [items unknown] }
    false
    undefined

浏览器环境输出结果：  

![img](http://qiniu.ii6g.com/1561597936.png)  

结果：  

1.  对于 Set 对象变量 key 值得改变并不会影响 Set 中 `{a:1}` 对象  
  
    Set 存放的是对象 `{a:1}` 的引用，即在 `set.add(key)` 之后，实际上是有两个引用指向了  
    `{a:1}` 对象，一个是 key 这个变量，一个是集合 set 中的某个位置上的变量(假设为: *fkey*)。  
    根据引用的特性， key 的释放并不会影响 `{a:1}` 这个对象本身在内存中的存在，即不会影响 fkey  
    对这个对象的影响，从而并不影响 set 的内容。

2.  WeakSet 中的 `{a:1}` 没有了  
  
    WeakSet 我们说它添加的是 wkey 的原始值，即使直接和 wkey 这个变量的原始值挂钩的，  
    执行 `wkey = null` 就是讲它的原始值发生改变，最终将影响 WeakSet 。

针对 #2 中的 WeakSet 情况，将程序改造一下:  

```js
let set = new Set()
let key = { a: 1 }
let key1 = key

set.add(key)
console.log(set) // 改变之前
key = null
console.log(set) // 改变之后
console.log(set.has(key)) // true

console.log('-------- 楚河汉界 ---------')
let wset = new WeakSet()
let wkey = { a: 1 }
let wkey1 = wkey

wset.add(wkey)
console.log(wset) // weak key 改变之前
wkey = null
console.log(wset) // weak key 改变之后
console.log(wset.has(wkey))
console.log(wset.has(wkey1))
```

+RESULTS:  

    Set { { a: 1 } }
    Set { { a: 1 } }
    false
    -------- 楚河汉界 ---------
    WeakSet { [items unknown] }
    WeakSet { [items unknown] }
    false
    true
    undefined

再来看看输出结果：  

![img](http://qiniu.ii6g.com/1561598712.png)  

我们得到了令人意外的结果：  

1.  并没有显示的 `wset.add(wkey1)` 但是最后的 `wset.has(wkey1)` 的结果却是 `true` 。
2.  wset 集合中的 `{a:1}` 依然存在。

要理解这个问题，则需要知道“强引用”和“弱引用”的区别：  

### 强引用和弱引用

我们都知道 JavaScript 的垃圾回收机制中有一个相关知识点就叫做引用计数，即一个  
对象如果有被其他变量  

引用那么这个对象的引用计数就 `+1` 如果这个变量被释放该对象的引用计数就 `-1`  
一旦引用计数为 `0` 垃圾回收机制就会将这个对象回收掉，因为没有人再使用它了。  

**强引用(`Set`)** ：相当于让该对象的引用计数 `+1` ，如 `Set` 集合保存了对象的引用导  
致引用计数 `+1` ，在拥有该对象的变量 `key` 的值怎么变化都不会导致引用计数为  
`0` 从而阻止了垃圾回收器将其回收掉。  

**弱引用(`WeakSet`)**: 对对象的引用不会计入到引用计数中，即将 wkey 加入到  
WeakSet 中，并不会引起 wkey 指向的那个对象的引用计数 `+1` ，因此只要释放了  
wkey 对其的引用，对象的引用计数就变成 0 了，因此此时只有 wkey 指向 `{a:1}`  
这个对象，改变 wkey 就会改变 WeakSet 中的内容，因为这个内容已经被回收掉了。  

/根据上面的结论，我们就知道为什么我们增加了一行 `let key1 = key` 之后，  
`{a:1}` 对象依然会在 `wset` 中因为此时 `{a:1}` 引用计数不为 `0` 并没有被释放  
掉。/  

## Maps

es6 的 `Map` 类型是一个有序的键值对列表， key 和 value 可以是任意类型，并且 key  
不会发生类型强转，也就是说 `5` 和 `"5"` 属于不同的两个键，和对象不一样(对象把他  
们当做一个键，因为对象的 key 最终表示形式为 `string` 内部有发生强制转换)。  

### Map 初始化

一个 map 实例必须通过构造函数来创建 `new Map()` ，同时可以给构造函数传递一个  
iterable 的对象，在创建的时候初始化，这个 iterable 对象会被转成 map。  

```js
let map = new Map([['name', '张三'], ['age', 25]])

console.log(map)
console.log(map.has('name')) // true
console.log(map.get('name')) // 张三
console.log(map.has('age')) // true
console.log(map.get('age')) // 25
console.log(map.size) // 2

try { // 一维数组，不符合 entry object
  let map1 = new Map([1, 2, 3])
  console.log(map1)
} catch (e) {
  console.log(e.message)
}

try { // 对象非 iterable
  let map2 = new Map({a: 1, b: 2, length: 2})
  console.log(map2)
} catch (e) {
  console.log(e.message)
}

try {
  let map3 = new Map(new Set([['name', '张三', 1], ['age', 25, 2]]))
  console.log(map3)
} catch (e) {
  console.log(e.message)
}


try {
  let map4 = new Map(new Set(['name', '张三']))
  console.log(map4)
} catch (e) {
  console.log(e.message)
}

try {
  let map5 = new Map(new Set([['name', '张三'], ['age', 25]]))
  console.log(map5)
} catch (e) {
  console.log(e.message)
}
```

+RESULTS:  

    Map { 'name' => '张三', 'age' => 25 }
    true
    张三
    true
    25
    2
    Iterator value 1 is not an entry object
    #<Object> is not iterable
    Map { 'name' => '张三', 'age' => 25 }
    Iterator value name is not an entry object
    Map { 'name' => '张三', 'age' => 25 }
    undefined

因此能被转成 `map` 的对象需要满足：  

1.  必须是 iterable
2.  必须有键值对类型的列表对象，比如二维数组。

Map 的 key 和 value 可以是任意对象。  

<a id="orgde6b501"></a>  

```js
let map = new Map()

map.set({}, 'EmptyObject')

// 虽然都是 {} 但是对象是引用类型，是不能等同的
console.log(map.get({})) // undefined

map.clear()
let emptyObj = {}
map.set(emptyObj, 'EmptyObject')
console.log(map)
console.log(map.get(emptyObj)) // 'EmptyObject'
console.log(map.size) // 1

emptyObj = null
console.log(map)
console.log(map.get(emptyObj)) // 'undefined'
console.log(map.size) // 1, 因为 Map 是强引用，emptyObj = null 并不会改变
```

+RESULTS:  

    undefined
    Map { {} => 'EmptyObject' }
    EmptyObject
    1
    Map { {} => 'EmptyObject' }
    undefined
    1
    undefined

### `map.set(key, value)` 和 `map.get(key)`

`Map` 实例可以通过 `set` 和 `get` 方法去设置键值对然后获取该值。  

```js
let map = new Map()
map.set('title', 'u es6')
map.set('year', 2019)

console.log(map)
console.log(map.get('title'))
console.log(map.get('year'))
console.log(map[0])
```

+RESULTS:  

    Map { 'title' => 'u es6', 'year' => 2019 }
    u es6
    2019
    undefined
    undefined

map 数据的内部存储格式(`{ 'key' => value }`)：  

![img](http://qiniu.ii6g.com/1561607782.png)  

### 方法

-   `map.has(key)` 检测 map 中是否存在 key
-   `map.delete(key)` 删除 key 对应的值
-   `map.clear()` 清空所有键值对
-   `map.size` map 的大小，键值对的个数

```js
let map = new Map()

map.set('name', '张三')
map.set('age', 22)

console.log('-------- init ---------')
console.log(map)
console.log(map.size) // 2
console.log(map.has('name')) // true
console.log(map.get('name')) // 张三
console.log(map.has('age')) // true
console.log(map.get('age')) // 22

console.log('-------- delete ---------')
map.delete('name')
console.log(map)
console.log(map.has('name')) // false
console.log(map.get('name')) // undefined
console.log(map.size) // 1

console.log('-------- clear ---------')
map.clear()
console.log(map)
console.log(map.has('name')) // false
console.log(map.get('name')) // undefined
console.log(map.has('age')) // false
console.log(map.get('age')) // undefined
console.log(map.size) // 0
```

+RESULTS:  

    -------- init ---------
    Map { 'name' => '张三', 'age' => 22 }
    2
    true
    张三
    true
    22
    -------- delete ---------
    Map { 'age' => 22 }
    false
    undefined
    1
    -------- clear ---------
    Map {}
    false
    undefined
    false
    undefined
    0
    undefined

### forEach

`forEach` 在 map 上的使用方式跟集合和数组类似，回调接受三个参数分别代表：  

1.  value: 代表当前循环 map 中元素键值中的值
2.  key: 代表 map 元素键值中的键
3.  map: 当前的 map 自身

因此， map 的 `forEach` 看起来与数组更像，有 `value`, `key`, `map` ，并且 value  
代表值，key 表示键（数组中的索引），map 代表自身。  

```js
let map = new Map([['name', '张三'], ['age', 22]])

map.forEach(function(value, key, ownerMap) {
  console.log(`${key}: ${value}`)
  console.log(ownerMap === map)
})
```

+RESULTS:  

    name: 张三
    true
    age: 22
    true
    undefined

和 Set 一样，也可以将 `this` 作为第二个参数传入，绑定回调函数的上下文，或者直接  
使用箭头函数，就可以省略这个参数了。  

### WeakMap

`WeakMap` 类似 `WeakSet` 一样，是一种弱引用类型。  

有了[8.3](#org08033ce)的说明，理解将让我们很容易理解 `WeakMap` 。  

<div class="org-center">
**WeakMap 弱引用，即它里面的引用类型，不计入引用计数统计，不会阻止垃圾回收器回收。**  
</div>

看下 [8.4.1](#orgde6b501) 的示例，将 `Map` 改成 `WeakMap` 看下结果：  

```js
let map = new WeakMap()

try {
  map.clear()
} catch (e) {
  console.log(e.message)
}

let emptyObj = {}
map.set(emptyObj, 'EmptyObject')
console.log(map.get(emptyObj)) // 'EmptyObject'
console.log(map.size) // undefined

emptyObj = null
console.log(map.get(emptyObj)) // 'undefined'
console.log(map.size) // undefined

map.delete(emptyObj)
let obj = {a: 1, b: 2}
map.set(obj, 'NormalObject')
console.log(map.get(obj))
map.delete(obj)
console.log(map.get(obj))

```

+RESULTS:  

    map.clear is not a function
    EmptyObject
    undefined
    undefined
    undefined
    NormalObject
    undefined

1.  WeakMap 中没有 `map.clear()`
2.  WeakMap 没有 `size` 属性，和 WeakSet 一样
3.  弱引用， `emptyObj = null` 会使 map 中的 emptyObj 被删除

# 迭代器和生成器(Iterators & Generators)<a id="orge26ee44"></a>

## 什么是迭代器(Iterators)？

迭代器：拥有特殊接口(用来遍历该对象)的一些对象。  

所有迭代器对象都有一个 `next()` 方法返回一个结果对象。  

该结果对象包含两个属性：  

1.  `value` 迭代过程中下一个值
2.  `done` , *boolean* 是否是最后一个

迭代器拥有一个内部指针指向总是指向下一个值。  

创建一个迭代器：  

1.  返回对象中必须有 `next()` 方法
2.  必须有终结条件属性 `done`

<a id="org2892a08"></a>  

```js
function createIterator(items) {
  var i = 0;

  return {
    next: function() {
      var done = ( i >= items.length);
      var value = !done ? items[i++] : undefined;

      return {
        done, value
      };
    }
  }
}

var iterator = createIterator([1, 2, 3]);

console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next()); // { value: 2, done: false }
console.log(iterator.next()); // { value: 3, done: false }
console.log(iterator.next()); // { value: undefined, done: true }
console.log(iterator.next()); // { value: undefined, done: true }
console.log(iterator.next()); // { value: undefined, done: true }

```

+RESULTS:  

    { done: false, value: 1 }
    { done: false, value: 2 }
    { done: false, value: 3 }
    { done: true, value: undefined }
    { done: true, value: undefined }
    { done: true, value: undefined }

## 什么是生成器(Generators)？

生成器：一个返回迭代器的函数。  

生成器声明方式： `function *createIterator() {}` ，使用 `*fnName` 方式。  

它的返回值也是一个迭代器，里面使用 `yield` 关键词暂停语句。  

<a id="orgac453ee"></a>  

```js
function *createIterator() {
  yield 1;
  yield 2;
  yield 3;
}

let iterator = createIterator();

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 3, done: false }
    { value: undefined, done: true }
    { value: undefined, done: true }
    { value: undefined, done: true }

跟 [9.1](#org2892a08) 结果一样。  

生成器函数与普通函数区别：  

1.  使用星号(`*`) 加名字声明
2.  返回值是一个迭代器 *iterator*
3.  只有使用迭代器调用了 `next()` 才会返回值，该值为函数中 `yield` 关键词语句对应

`yield` 告诉引擎，我在这里要暂停下，如果要我继续下去，就请用我返回的迭代器调用下  
`next()` 获取当前 `yield` 暂停地方的返回结果。  

### 循环中的 yield

`yield` 关键词可以用于任意值或语句，比如：循环中使用 `yield`  

```js
function *createIterator(items) {
  for (let i = 0; i < items.length; i++) {
    yield items[i];
  }
}

const iterator = createIterator([1, 2, 3]);

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 3, done: false }
    { value: undefined, done: true }
    { value: undefined, done: true }
    { value: undefined, done: true }

### 两个 yield 之间有多个语句

```js
function *createIterator(items) {
  for (let i = 0; i < items.length; i++) {
    console.log(i, 'i');
    yield items[i];
  }
}

const iterator = createIterator([1, 2, 3]);

console.log(iterator.next()) // { value: 1, done: false }
//console.log(iterator.next()) // { value: 2, done: false }
//console.log(iterator.next()) // { value: 3, done: false }
// console.log(iterator.next()) // { value: undefined, done: true }
// console.log(iterator.next()) // { value: undefined, done: true }
// console.log(iterator.next()) // { value: undefined, done: true }

```

`yield` 在 `console.log` 语句之后的结果分析：  

```js
console.log(i, 'i');
yield items[i];
```

| next() 个数                        | 结果                        |
| ---------------------------------- | --------------------------- |
| `console.log(iterator.next()) * 0` | :                           |
| `console.log(iterator.next()) * 1` | : 0 'i'                     |
|                                    | : { value: 1, done: false } |
| `console.log(iterator.next()) * 2` | : 0 'i'                     |
|                                    | : { value: 1, done: false } |
|                                    | : 1 'i'                     |
|                                    | : { value: 2, done: false } |
| `console.log(iterator.next()) * 3` | : 0 'i'                     |
|                                    | : { value: 1, done: false } |
|                                    | : 1 'i'                     |
|                                    | : { value: 2, done: false } |
|                                    | : 2 'i'                     |
|                                    | : { value: 3, done: false } |

`yield` 在 `console.log` 语句之前的结果分析：  

```js
yield items[i];
console.log(i, 'i');
```

| next() 个数                        | 结果                        |
| ---------------------------------- | --------------------------- |
| `console.log(iterator.next()) * 1` | : { value: 1, done: false } |
| `console.log(iterator.next()) * 2` | : { value: 1, done: false } |
|                                    | : 0 'i'                     |
|                                    | : { value: 2, done: false } |
| `console.log(iterator.next()) * 3` | : { value: 1, done: false } |
|                                    | : 0 'i'                     |
|                                    | : { value: 2, done: false } |
|                                    | : 1 'i'                     |
|                                    | : { value: 3, done: false } |

从上面三种结果得出： `yield` 在调用 `next()` 之后执行的语句范围是：当前 `yield`  
与上一个 `yield` 之间的语句。  

得出上述结果的原因：执行生成器函数本身的时候，它只是返回了一个迭代器，本身的函数  
体是不会执行的，除非调用了 `next()` 才会去执行函数体。  

证明：  

```js
function *createIterator(items) {
  console.log('generator called...')
  for (let i = 0; i < items.length; i++) {
    console.log(i, 'i');
    yield items[i];
  }
}

const iterator = createIterator([1, 2, 3]);
```

+RESULTS: 结果什么都没有，第一个 `console.log` 并没有被执行。  

    undefined

```js
function *createIterator(items) {
  console.log('generator called...')
  for (let i = 0; i < items.length; i++) {
    console.log(i, 'i');
    yield items[i];
  }
}

const iterator = createIterator([1, 2, 3]);

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS:  

    generator called...
    0 'i'
    { value: 1, done: false }
    1 'i'
    { value: 2, done: false }
    2 'i'
    { value: 3, done: false }
    { value: undefined, done: true }
    { value: undefined, done: true }
    { value: undefined, done: true }
    undefined

### 生成器函数表达式(Generator Function Expressions)

除了可以在声明式命名函数生成迭代器函数，还可以通过表达式的方式创建生成器函数：  

1.  右边带名字的 `var createIterator = function *createIterator() {}`
2.  右边不名字的 `var createIterator = function *() {}`

使用和效果和普通生成器函数 [9.2](#orgac453ee)一样。  

> 箭头函数不能用来生成生成器函数。  
>
> ```js
> let createIterator = *() => {
> yield 1;
> }
> ```
>
> 执行后错误结果：  
>
>  /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-IQ9JEI/js-script-4JzlJj:3
>    let createIterator = *() => {
>                         ^
>
>  SyntaxError: Unexpected token *
>      at Module._compile (internal/modules/cjs/loader.js:721:23)
>      at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)
>      at Module.load (internal/modules/cjs/loader.js:653:32)
>      at tryModuleLoad (internal/modules/cjs/loader.js:593:12)
>      at Function.Module._load (internal/modules/cjs/loader.js:585:3)
>      at Function.Module.runMain (internal/modules/cjs/loader.js:829:12)
>      at startup (internal/bootstrap/node.js:283:19)
>      at bootstrapNodeJSCore (internal/bootstrap/node.js:622:3)

### 对象中的生成器方法成员

ECMAScript 5 风格：  

```js
let o = {
  createIterator: function *(items) {
    for (let i = 0; i < items.length; i++) {
      yield items[i];
    }
  }
}

let iterator = o.createIterator([1, 2, 3]);

console.log(iterator.next()); // { value: 1, done: false }
```

+RESULTS:  

    { value: 1, done: false }

ECMAScript 6 方法简写风格：  

```js
let o = {
  *createIterator(items) {
    for (let i = 0; i < items.length; i++) {
      yield items[i];
    }
  }
}

let iterator = o.createIterator([1, 2, 3]);

console.log(iterator.next()); // { value: 1, done: false }

```

+RESULTS:  

    { value: 1, done: false }

## 可迭代性和 `for-of`

一个可迭代的对象必须有一个 `Symbol.iterator` 属性。  

像我们在迭代集合对象(arrays, sets, maps)和字符串的时候，在内部其实是使用了到了他  
们默认的 `Symbol.iterator` 迭代器的。  

> 所有由生成器创建的迭代器都是可以迭代的，因为生成器也有默认的 `Symbol.iterator`  
> 内部属性。  

### for-of

`for-of` 会在每次迭代的时候自动调用 `next()` 进入下一次迭代，并且将 `value` 的值  
保存到一个变量当中以供使用。  

```js
let values = [1, 2, 3];

for (let num of values) {
  console.log(num);
}
```

+RESULTS:  

    1
    2
    3

如果，在迭代过程中只需要用到该被迭代对象的元素值得时候，推荐使用 `for-of` 因为它  
依赖和检测的条件更少。  

> `for-of` 语句使用在 non-iterable 对象， `null` 或 `undefined` 上的时候会报错。  

### 访问默认迭代器

之前我们讲过，任何一个可以迭代的对象，都必须有 `Symbol.iterator` 属性，无论是内  
部实现还是用户实现也好。  

这里将探讨如果使用和访问默认迭代器：  

```js
let values = [1, 2, 3];

// 得到数组内部的迭代器
let iterator = values[Symbol.iterator]()

console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next()); // { value: 2, done: false }
console.log(iterator.next()); // { value: 3, done: false }
console.log(iterator.next()); // { value: undefined, done: true }
console.log(iterator.next()); // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 3, done: false }
    { value: undefined, done: true }
    { value: undefined, done: true }

和我们自定义方式创建的迭代器[9.1](#org2892a08)结果一样。  

检测一个对象是否是可迭代的，根据每个可迭代的对象都会有一个 `Symbol.iterator` 属  
性(内部或自定义)，且是一个函数。  

则有：  

```js
function isIterable(object) {
  return typeof object[Symbol.iterator] === 'function';
}

console.log(isIterable([1, 2, 3,])); // true
console.log(isIterable('string')); // true
console.log(isIterable(new Map())); // true
console.log(isIterable(new Set())); // true
console.log(isIterable(new WeakMap())); // false
console.log(isIterable(new WeakSet())); // false
```

+RESULTS:  

    true
    true
    true
    true
    false
    false

### 创建或重写迭代器

通过 `Symbol.iterator` 属性加上生成器函数可以很容易的让一个 non-iterable 对象变成  
iterable :  

```js
let collection = {
  items: [],
  *[Symbol.iterator]() {
    for (let item of this.items) {
      yield item;
    }
  }
}

collection.items.push(...[1, 2, 3]);

for (let x of collection) {
  // 事实上是调用了自定义实现的 `*[Symbol.iterator]() {}` 函数
  console.log(x);
}
```

+RESULTS:  

    1
    2
    3

## 内置迭代器

迭代器是 ECMASCript 6 的很重要的一部分，因此你不再需要为许多内置类型去构建自己的  
的迭代器，因为从现在开始他们自己内部就已经包含了一个默认的迭代器。  

### 集合迭代器(for-of)<a id="org001eece"></a>

从 ECMAScript 6 开始有三种类型的集合对象： arrays, maps 和 sets。并且他们都有内  
置的迭代器帮助我们遍历操作内中的元素。  

1.  `entries()` 返回一个迭代器的 key-value 键值对
2.  `values()` 返回一个迭代器的所有值的集合
3.  `keys()` 返回一个迭代器所有键的集合

**entries() 迭代器**:  

```js
let colors = ['red', 'green', 'blue'];
let tracking = new Set([123, 456, 789]);
let data = new Map();

data.set('title', 'xxx');
data.set('format', 'yyy');

console.log('------ array.entries() ---------')
for (let entry of colors.entries()) {
  console.log(entry)
}

console.log('------ set.entries() ---------')
for (let entry of tracking.entries()) {
  console.log(entry)
}

console.log('------ map.entries() ---------')
for (let entry of data.entries()) {
  console.log(entry)
}
```

+RESULTS:  

    ------ array.entries() ---------
    [ 0, 'red' ]
    [ 1, 'green' ]
    [ 2, 'blue' ]
    ------ set.entries() ---------
    [ 123, 123 ]
    [ 456, 456 ]
    [ 789, 789 ]
    ------ map.entries() ---------
    [ 'title', 'xxx' ]
    [ 'format', 'yyy' ]

1.  数组 key - key， value - value
2.  set key - value, value - value
3.  map key - key, value - value

通过 `entries()` 获取到的 array, set, map 迭代器：  

![img](http://qiniu.ii6g.com/1562493375.png)  

**values() 迭代器**:  

```js
let colors = ['red', 'green', 'blue'];
let tracking = new Set([123, 456, 789]);
let data = new Map();

data.set('title', 'xxx');
data.set('format', 'yyy');

console.log('------ array.values() ---------')
for (let value of colors.values()) {
  console.log(value)
}

console.log('------ set.entries() ---------')
for (let value of tracking.values()) {
  console.log(value)
}

console.log('------ map.entries() ---------')
for (let value of data.values()) {
  console.log(value)
}

```

+RESULTS:  

    ------ array.values() ---------
    red
    green
    blue
    ------ set.entries() ---------
    123
    456
    789
    ------ map.entries() ---------
    xxx
    yyy

**keys() 迭代器**:  

```js
let colors = ['red', 'green', 'blue'];
colors.name = 'colors';
let tracking = new Set([123, 456, 789]);
let data = new Map();

data.set('title', 'xxx');
data.set('format', 'yyy');

console.log('------ array.keys() ---------')
for (let key of colors.keys()) {
  console.log(key)
}

console.log('------ set.entries() ---------')
for (let key of tracking.keys()) {
  console.log(key)
}

console.log('------ map.entries() ---------')
for (let key of data.keys()) {
  console.log(key)
}
```

+RESULTS:  

    ------ array.keys() ---------
    0
    1
    2
    ------ set.entries() ---------
    123
    456
    789
    ------ map.entries() ---------
    title
    format

> 如上，数组中的 `name` 属性并没有输出，这是因为 `for-of` 只会针对数组的数字索引属  
> 性，对于非数字的属性会忽略掉，因此如果需要遍历到非数字属性就需要用到 `for-in` 去  
> 遍历。  

`for-in` 是根据该对象的属性遍历的，它会将对象中的所有属性遍历出来：  

```js
let colors = ['red', 'green', 'blue'];
colors.name = 'colors';

for (let key in colors) {
  console.log(key)
}

```

+RESULTS:  

    0
    1
    2
    name

**集合类型默认迭代器** <a id="orgaccce3d"></a>:  

上面所有使用到 `for-of` 加上 `entries()`, `values()`, `keys()`, 的情况都可以使用  
默认的迭代器来替代，其实这些迭代器方法最终取得也是集合的默认迭代器：  

```js
let colors = ['red', 'green', 'blue'];
colors.name = 'colors';
let tracking = new Set([123, 456, 789]);
let data = new Map();

data.set('title', 'xxx');
data.set('format', 'yyy');

console.log('------ array ---------')
for (let value of colors) { // 相当于使用了 colors.values()
  console.log(value)
}

console.log('------ set ---------')
for (let value of tracking) { // 相当于使用了 tracking.values()
  console.log(value)
}

console.log('------ map ---------')
for (let entry of data) { // 相当于 data.entries()
  console.log(entry)
}

```

+RESULTS:  

    ------ array ---------
    red
    green
    blue
    ------ set ---------
    123
    456
    789
    ------ map ---------
    [ 'title', 'xxx' ]
    [ 'format', 'yyy' ]

### for-of 循环的解构

在集合类型默认迭代器[9.4.1](#orgaccce3d)中我们讲了，在对 arrays, sets,  
maps 使用 `for-in` 的时候，其实都是分别使用了他们的默认迭代器(arrays.values(),  
sets.values(), maps.entries()) 。  

那针对 maps 其内部用到的是 `entries()` 迭代器，得到的结果是： `[key, value]` 类  
型，如果我们想要再循环体内使用，可以结合 ECMAScript 6 的解构功能，很方便的去使用  
他们：  

```js
let data = new Map([
  ['title', 'xxxx'],
  ['format', 'yyyy']
]);

for (let [key, value] of data) {
  console.log(`${key} = ${value}`);
}


```

+RESULTS:  

    title = xxxx
    format = yyyy

### 字符串迭代器

在我们字符串的使用当中经常会看到 `str[0]` 和数组一样通过下标方式去访问字符串中的  
字符。  

但是需要注意的一点是：字符串中括号索引方式的访问不是基于字符的而是基于编码单元的  
(即单个字节的)。  

比如：  

```js
var message = "A ð ®· B";

for (let i=0; i < message.length; i++) {
  console.log(message[i]);
}
```

ECMAScript 6 之前的输出结果：  

    A
    (blank)
    (blank)
    (blank)
    (blank)
    B

ECMAScript 6 之后的输出结果：  

+RESULTS:  

    A
    
    ð
    
    ®
    ·
    
    B

ECMASCript 6 之后能正确输出是因为，在字符串一章[3.1](#org952d340)新增的 16 字节的编码支  
持，且字符串的默认迭代器是基于字符而不是编码字节去遍历的，所以通过 `for` 可以得  
到正确的结果。  

同样，ES6 的 `for-of` 也一样能获得正确结果：  

```js
var message = "A ð ®· B";

for (let c of message) {
  console.log(c)
}
```

+RESULTS:  

    A
    
    ð
    
    ®
    ·
    
    B

### NodeList 迭代器(DOM元素列表迭代器)<a id="org999edd7"></a>

```js
var divs = document.getElementsByTagName("div");

for (let div of divs) {
  console.log(div.id);
}
```

浏览器实例：  

![img](http://qiniu.ii6g.com/1562550190.png)  

## 展开符(&#x2026;)和非数组类可迭代对象

展开符将集合转成数组：  

```js
let set = new Set([1, 2, 3]);
let array = [...set];
console.log(array)
```

将 maps 转成数组：  

```js
let map = new Map([
  ['name', 'xxx'],
  ['age', 100]
])

let array = [...map];
console.log(JSON.stringify(array))
```

+RESULTS:  

    [["name" (\, "xxx")] (\, ["age" (\, 100)])]

数组的合并:  

```js
let nums = [1, 2, 3];

let moreNums = [0, ...nums, ...[4, 5, 6]]

console.log(moreNums.toString())
```

+RESULTS:  

    0,1,2,3,4,5,6

NodeList[9.4.4](#org999edd7)一节中提到过在新的 HTML 标准中 `NodeList` 也有自己的默认迭代器，  
因此展开符也对 `NodeList` 有效。  

如图示例：(浏览器环境)  

![img](http://qiniu.ii6g.com/1562497834.png)  

## 高级迭代器功能

之前的章节讲述了使用迭代器和生成器如何去实现一些基本的功能，这一章节将讲述如何去  
使用迭代器和生成去去实现一些高级功能。  

### 给迭代器传递参数

之前使用迭代器，使用 `iterator.next()` 都是没有传递参数的，其实它是可以传递参数  
的，其实就跟普通的函数参数传递是一样的。  

结合生成器使用时候的特殊性： `next(v)` 中的参数 `v` 的值会当做当前 `yield` 的返  
回值返回，不管该 `yield` 后面表达式的结果是什么：  

```js
function *createIterator() {
  let first = yield 1;
  // 不传值理应是： first + 2 => 1 + 2 => 3
  // 但 next(4) 有参数，则该参数就是 yield 表达式的值，因此结果会是： 4 + 2
  let second = yield first + 2;
  // 如上，结果是 5 + 3 = 8
  yield second + 3;
}

let iterator = createIterator();

console.log(iterator.next()); // { value: 1, done: false }
console.log(iterator.next(4)); // { value: 6, done: false }
console.log(iterator.next(5)); // { value: 8, done: false }
console.log(iterator.next()); // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 6, done: false }
    { value: 8, done: false }
    { value: undefined, done: true }

上面代码执行过程：  

![img](http://qiniu.ii6g.com/1562498470.png)  

### 迭代器中触发异常

由于给 `next()` 传递的参数不管是什么内容，它都会作为当前 `yield` 表达式的返回值  
给返回。  

迭代器对象有一个方法： `iterator.throw(Error)` 可以给当前的 `yield` 处抛出一个异  
常。  

```js
function * createIterator() {
  let first = yield 1;
  let second = yield first + 2;
  yield second + 3;
}

let iterator = createIterator()

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next(4)) // { value: 6, done: false }
console.log(iterator.throw(new Error('Boom'))) // 异常

```

+RESULTS:  

    : { value: 1, done: false }
    : { value: 6, done: false }
    
    /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-IQ9JEI/js-script-bSJrfN:4
      let second = yield first + 2;
                   ^
    
    Error: Boom
        at /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-IQ9JEI/js-script-bSJrfN:12:28
        at Object.<anonymous> (/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-IQ9JEI/js-script-bSJrfN:14:2)

代码中，前面两个 `next()` 会正常执行得到结果，但当 `throw()` 调用的时候，迭代器  
会在执行 `let second =` 之前抛出异常(`yield first + 2;` 已经返回结果了)。  

如图：  

![img](http://qiniu.ii6g.com/1562499068.png)  

**捕获异常** :  

```js
function * createIterator() {
  let first = yield 1;
  let second;

  try {
    second = yield first + 2;
  } catch (e) {
    console.log(e.message)
    second = 6;
  }
  yield second + 3;
}

let iterator = createIterator()

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next(4)) // { value: 6, done: false }
console.log(iterator.throw(new Error('Boom'))) // { value: 9, done: true }

```

+RESULTS:  

    { value: 1, done: false }
    { value: 6, done: false }
    Boom
    { value: 9, done: false }

从结果会惊奇的发现，调用 `throw()` 之后，返回了下一个 `yield` 的执行结果。  

原因： `iterator.throw()` 调用之后，生成器将这个异常捕获到了，并且继续往下执行了，  
从触发了下一个 `yield` 的执行。  

> `next()` 和 `throw()` 都可以让生成器继续往下执行，只不过执行方式不一样，前者会从  
> 下一个 `yield` 位置执行返回结果，后者是在上一个 `yield` 执行之后的位置触发一个异  
> 常，如果这个异常被捕获就继续往下执行异常处理及后面的代码，如果没有被捕获就抛出一  
> 个异常中断整个生成器的执行。  

### 生成器函数中使用 return 语句

在生成器中的 return 语句表示该迭代器结束了，后面不会再有值过来了。  

```js
function *createIterator() {
  yield 1;
  return; // 这里结束迭代器
  yield 2; // 不会执行
  yield 3; // 不会执行
}

let iterator = createIterator()

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: undefined, done: true }

因此 return 语句在生成器中的效果就是终结迭代器，在它后面的 `yield` 都无效，  

还可以 return 一个值：  

```js
function *createIterator() {
  yield 1;
  return 42; // 这里结束迭代器
  yield 2; // 不会执行
  yield 3; // 不会执行
}

let iterator = createIterator()

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 42, done: true }
console.log(iterator.next()) // { value: undefined, done: true }

```

+RESULTS:  

    { value: 1, done: false }
    { value: 42, done: true }
    { value: undefined, done: true }

这里有点特殊，之前迭代器结束了，最后一个 `done: true` 的值是 `undefined` 这里使  
用 return 返回了一个值会当做迭代器结束之返回。  

> 在使用展开符和 `for-of` 时候如果有 return 语句，该语句中的 value 会被忽略掉，因  
> 为它一旦发现了 `done: true` 就会结束。  

### 委托生成器(Delegating Generators)<a id="orgce1f7da"></a>

在有些情况下，将两个迭代器的值结合成一个通常会很有用。生成器可以通过 `yield` 和  
`*` 一起使用来实现代理到其他迭代器，比如：  

```js
function *createNumIterator() {
  yield 1;
  yield 2;
}

function *createColorIterator() {
  yield 'red';
  yield 'blue';
}

function *createCombineIterator() {
  yield *createNumIterator();
  yield *createColorIterator();
  yield true;
}

var iterator = createCombineIterator();

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 'red', done: false }
console.log(iterator.next()) // { value: 'blue', done: false }
console.log(iterator.next()) // { value: true, done: false }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 'red', done: false }
    { value: 'blue', done: false }
    { value: true, done: false }
    { value: undefined, done: true }

结合 `return` 使用，比如：迭代器 B 依赖迭代器 A 的返回结果：  

```js
function *createNumIterator() {
  yield 1;
  yield 2;
  return 3; // #1
}

function *createRepeatingIterator(count) {
  for (let i = 0; i < count; i++) {
    yield 'repeat';
  }
}

function *createCombinedIterator() {
  // #2
  let result = yield *createNumIterator();
  // #2.1
  yield result;
  // #3
  // 这里得到 createNumIterator 中 return 3 返回的结果 3
  yield *createRepeatingIterator(result);
}

let iterator = createCombinedIterator();

console.log(iterator.next()) // { value: 1, done: false }
console.log(iterator.next()) // { value: 2, done: false }
console.log(iterator.next()) // { value: 3, done: false }
console.log(iterator.next()) // { value: 'repeat', done: false }
console.log(iterator.next()) // { value: 'repeat', done: false }
console.log(iterator.next()) // { value: 'repeat', done: false }
console.log(iterator.next()) // { value: undefined, done: true }
```

+RESULTS: 增加 **#2.1** 将 **#2** 结果输出后：  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 3, done: false }
    { value: 'repeat', done: false }
    { value: 'repeat', done: false }
    { value: 'repeat', done: false }
    { value: undefined, done: true }

+RESULTS: 有 `return 3;` 的返回结果  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 'repeat', done: false }
    { value: 'repeat', done: false }
    { value: 'repeat', done: false }
    { value: undefined, done: true }

+RESULTS: 没有 `return 3;` 的返回结果  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: undefined, done: true }
    { value: undefined, done: true }
    { value: undefined, done: true }
    { value: undefined, done: true }

因为如果没有 `return 3;` 那么最后 **#2** 处的的 `yield` 返回结果会是  
`createNumiterator()` 执行后返回的结果 `undefined`  

如果有 `return 3;` **#2** 处的函数又自己的返回值，作为 **#2** 处 `yield` 代理完成的  
结果保存到了 `result` 中，下一次 `next()` 会执行 **#3** 处的 `yield` 进入下一个代  
理迭代器。  

```js
function *createIterator() {
  yield * 'hello';
}

let it = createIterator()

console.log(it.next()) // { value: 'h', done: false }
console.log(it.next()) // { value: 'e', done: false }
console.log(it.next()) // { value: 'l', done: false }
console.log(it.next()) // { value: 'l', done: false }
console.log(it.next()) // { value: 'o', done: false }
console.log(it.next()) // { value: undefined, done: true }
```

+RESULTS: 因为字符串本身有自己的默认迭代器，因此 `yield * 'hello';` 结果会去调用  
默认迭代器对每个字符进行迭代。  

    { value: 'h', done: false }
    { value: 'e', done: false }
    { value: 'l', done: false }
    { value: 'l', done: false }
    { value: 'o', done: false }
    { value: undefined, done: true }

## 异步迭代器

### for-await-of<sup>2019</sup>

```js
const promise = (timeout) => new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve()
  }, timeout * 1000)
})

function delay(time) {
  setTimeout(() => {
    console.log(time)
  }, time * 1000)
}

async function test() {
  for await (const x of ['a', 'b']) {
    console.log(x)
  }
}
```

## 异步任务

一般我们使用生成器和迭代器最常用，也用起来最爽的估计就是异步任务了吧!!!  

比如：异步读取一个文件  

```js
let fs = require('fs')

console.log(__dirname);
fs.readFile(__dirname + '/config.json', (err, cnt) => {
  if (err) throw err;

  console.log(cnt);
  console.log('Done');
})
```

+RESULTS: 通过异步接口取文件内容  

    /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-IQ9JEI
    <Buffer 7b 20 22 6e 61 6d 65 22 3a 20 22 78 78 78 22 20 7d 0a>
    Done

接下来我们将讲述如何使用 `generator` 来实现异步任务。  

### 一个简单的任务执行器<a id="orgb88e39f"></a>

这个任务执行器的作用就是：  

1.  启动迭代器
2.  循环调用 `next()` 知道结束

```js
function run(taskDef) {
  // 创建迭代器，首先确保 taskDef 是一个 generator 函数
  let task = taskDef();

  // 启动迭代器
  let result = task.next();

  const step = () => {
    if (!result.done) {
      // #1
      // result = task.next();
      // #2 将上一个 yield 的结果作为下一个 yield 的返回值
      result = task.next(result.value);
      step()
    }
  }

  // 启动循环递归，知道迭代器结束
  step();
}

// 使用

function *log() {
  console.log('------- log --------')
  console.log(1);
  yield;
  console.log(2);
  yield;
  console.log(3);
}

function *logVal() {
  console.log('------- logVal --------')
  let val = yield 1;
  console.log(val); // 1

  val = yield val + 3;
  console.log(val) // 3
}


run(log)
run(logVal)
```

+RESULTS: **#2** 执行结果  

    ------- log --------
    1
    2
    3
    ------- logVal --------
    1
    4
    undefined

+RESULTS: **#1** 的执行结果  

    ------- log --------
    1
    2
    3

通过 **#2** 的改造，让每次 `yield` 的表达式值依赖上一次 `next()` 的结果值。  

### 异步任务执行器

我们可以将上一届[9.8.1](#orgb88e39f)中的 `run` 进行改造让其支持异步任务:  

```js
function run(taskDef) {
  let task = taskDef()

  let result = task.next()

  function step() {
    if (!result.done) {

      if (typeof result.value === 'function') {
        // 如果 yield 返回的是一个函数，就执行这个函数(异步任务)
        // 结束之后，进行下一次 next() -> yield
        result.value(function(err, data) {
          if (err) {
            result = task.throw(err)
            return;
          }
          result = task.next(data)
          step();
        })
      } else {
        result = task.next(result.value);
        step();
      }
    }
  }

  step();
}


let fs = require('fs')

function readFile(filename) {
  return function(callback) {
    setTimeout(() => {
      fs.readFile(__dirname + filename, callback)
    }, 1000)
  }
}

run(function *() {
  let result = yield readFile('/config.json')
  console.log(result)
  console.log('Done')
})
```

+RESULTS:  

    <Buffer 7b 20 22 6e 61 6d 65 22 3a 20 22 78 78 78 22 20 7d 0a>
    Done

## [Generator 内部抽象操作(伪码)](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)

## 小结

-   `Symbol.iterator` 用来定义对象的默认迭代器
-   `for-of` 可以用来遍历可迭代的对象，即包含 `Symbol.iterator` 函数的对象  
    1.  `entries()` 迭代器，取 `[key, value]` 键值对，如 `for-of-map` 默认就是用的  
        这个迭代器
    2.  `values()` 迭代器，取 `value` 值，如果是数组 `for-of-array` 只会去索引为数  
        值的元素，忽略非数值索引的元素，比如： `arr.name = 'xxx'` 这个 `name` 是不  
        会被遍历到的(默认用 `values()` 迭代器的有： arrays 和 sets)。
-   `...` 展开符其实内部实现也是去调用了对象内部的 `Symbol.iterator` 。
-   `Generator` 调用会生成一个迭代器，通过 `it.next()` 触发 `yield` 语句执行并得到  
    结果  
    1.  多个 generator 的嵌套调用可实现互相之间的代理(内部使用 `yield *generatorFn()` 调用生成器函数)
    2.  generator 内部使用 `return 42;` 终止迭代并返回 `{ value: 42, done: true}`  
        ，返回值由 `return` 返回值决定，但该值不会被 `for-of` 遍历到，因为 `for-of`  
        检测到 `done: true` 了就即刻结束。
    3.  可以通过 `return` 特性灵活运用 generator 代理。
    4.  由于字符串本身是有迭代器的，因此可以直接： `yield * 'hello';` 使用。
    5.  generator + iterator 实现同步任务 runner 。
    6.  generator + iterator + callback 实现异步任务 runner。

# 类(Classes)

## 类声明

### 基本类声明

```js
class PersonClass {
  constructor(name) {
    this.name = name
  }

  sayName() {
    console.log(this.name)
  }
}

let person = new PersonClass('xxx');
person.sayName(); // xxx

console.log(person instanceof PersonClass) // true
console.log(person instanceof Object) // true

console.log(typeof PersonClass); // function
console.log(typeof PersonClass.prototype.sayName); // function
```

实际上 `class` 声明只是个语法糖而已，它最终产生的 PersonClass 依旧是个函数，且这  
个函数行为和 `constructor` 一致，这就是为什么上面 `typeof PersonClass` 输出结果  
是 'function' 。  

经过 babel 转换之后的代码：  

<a id="orgccdd067"></a>  

```js
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor)
      descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}

function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps)
    _defineProperties(Constructor.prototype, protoProps);
  if (staticProps)
    _defineProperties(Constructor, staticProps); return Constructor;
}


function () {
  function PersonClass(name) {
    _classCallCheck(this, PersonClass);

    this.name = name;
  }

  _createClass(PersonClass, [{
    key: "sayName",
    value: function sayName() {
      console.log(this.name);
    }
  }]);

  return PersonClass;
}();

var person = new PersonClass('xxx');
person.sayName(); // xxx

console.log(_instanceof(person, PersonClass)); // true
console.log(_instanceof(person, Object)); // true
console.log(_typeof(PersonClass)); // function
console.log(_typeof(PersonClass.prototype.sayName)); // function
```

需要关注的点：  

1.  `constructor` 中的 `this.name` 依旧是在 PersonClass 这适用于函数的 `new` 特性  
  
    最终 `name` 会被绑定到 `new PersonClass()` 之后的实例上。

2.  `sayName()` 类中的方法都会被绑定到 `PersonClass()` 的原型上。  
  
    如： `_createClass` 里面的 `protoProps` 。

3.  静态属性会被绑定到函数名(即类名，构造函数上)  
  
    如： `_createClass` 里面的 `staticProps` 。

4.  最后将函数 PersonClass 返回。

### 类语法的好处

类和其他类型之间，有很多重要的区别：  

1.  类声明不会被提升(hoisted)，和 `let` 声明性质一样，也存在 **TDZ** 问题。

2.  所有在类声明里面的代码默认启用 strict mode ，并且无法改变。

3.  所有的方法都是不可枚举的， babel 转换之后 enumerable 默认值就是 `false`  
  
    如上一节 babel 转换之后的代码 [10.1.1](#orgccdd067) 。

4.  所有的方法都没有 `[ [Constructor]]` 内部属性，因此不能 `new` ，否则会抛出异常。

5.  不能直接调用类的构造函数。

6.  在类方法里面试图重写类名将抛出异常。

根据上面 6 个重要差异，我们就可以手动去模拟一个类了：  

```js
// 1. let 声明，不存在提升，TDZ
let PersonType = (function() {

  // 2. 必须是严格模式
  'use strict';

  // 6. 因为是用 const 声明的类名，因此在类内部不能对类名重新赋值
  const PersonType = function(name) {

    // 5. 不能直接调用，必须使用 new
    // 这里用到了一个新的属性， new.target ，只能在非箭头函数
    // 内部使用，表示：
    // 如果是通过 new 调用的 new.target 就是 PersonType 自身
    // 如果不是通过 new 调用的 new.target 就是 undefined
    // 这也就很好的区分了一个函数是通过什么方式调用的
    if (typeof new.target === 'undefined') {
      throw new Error('类名必须通过 new 调用。')
    }

    // 类实例属性
    this.name = name
  }

  // 所有方法都挂在原型上
  Object.defineProperty(PersonType.prototype, 'sayName', {
    value: function() {
      // 4. 前面说过了 new.target 作用
      if (typeof new.target !== 'undefined') {
        // 能进这里，表示用 new 调用了
        throw new Error('类方法不能通过 new 调用');
      }

      console.log(this.name)
    },

    // 3. 所有方法都不能枚举
    enumerable: false,
    writable: true,
    configurable: true
  })

  return PersonType;
}())
```

如上例，类内部是不能对 `PersonType` 重新复制的，因为它是用 `const` 方式声明的，  
但是在外部是可以重写的，因为外部是用的 `let` 声明的。  

因此：  

```js
class Foo {
  constructor() {
    Foo = 'bar'; // 错误，非法
  }
}

Foo = 'bar'; // OK
```

## 类表达式

类也可以使用表达式的方式声明。  

```js
let PersonClass = class {
  // 等价于 PersonType 的构造函数
  constructro(name) {
    this.name = name
  }

  // 等价于 PersonType.prototype.sayName
  sayName() {
    console.log(this.name)
  }
}
```

命名式表达式：跟命名式函数表达式是一样的， `class` 后面可以跟一个类名：  

`let PersonClass = class PersonClass2 {...}`  

但是 class 后面的类名，只能在类的内部使用，在外部是访问不到的，比如：  

```js
let PersonClass = class PersonClass2 {
  // 等价于 PersonType 的构造函数
  constructor(name) {
    this.name = name
    console.log(typeof PersonClass2); // 'function'
  }

  // 等价于 PersonType.prototype.sayName
  sayName() {
    console.log(this.name)
  }
}

new PersonClass('xxx').sayName();

console.log(typeof PersonClass2); // 'undefined'
```

+RESULTS:  

    function
    xxx
    undefined

`PersonClass2` 将作为类内部的函数名称。  

```js
let PersonClass = (function() {
  const PersonClass2 = function(name) {
    ...
  }

  Object.defineProperty(PersonClass2, ...)

  return PersonClass2;
}())
```

## 类作为一等公民

当一个对象可以被当做值，意味着可以：  

1.  当做参数传递给函数
2.  从一个函数返回
3.  赋值给一个变量

比如函数就是 JavaScript 中的一等公民。  

### 作为参数

```js
function createObject(classDef) {
  return new classDef()
}

let obj1 = createObject(class {
  sayHi() {
    console.log('Hi!')
  }
})

let obj2 = createObject(class PersonClass {
  sayHi() {
    console.log('Hi!')
  }
})

obj1.sayHi(); // 'Hi!'
obj2.sayHi(); // 'Hi!'


```

+RESULTS:  

    Hi!
    Hi!

匿名类和命名类作为参数传递。  

### 立即执行实现单例

```js
let person = new class {
  constructor(name) {
    this.name = name
  }

  sayName() {
    console.log(this.name)
  }
}('xxx')

person.sayName(); // 'xxx'
```

+RESULTS:  

    xxx

1.  匿名类
2.  立即执行
3.  person 为一个单例，声明时就已经决定了是一个类(匿名类，只会在这里使用一次)实例。

## 访问器属性

```js
class CustomHTMLElement {
  constructor(element) {
    this.element = element
  }

  get html() {
    return this.element.innerHTML
  }

  set html(value) {
    this.element.innerHTML = value
  }
}

var descriptor = Object.getOwnPropertyDescriptor(CustomHTMLElement.prototype, 'html')

console.log(descriptor)
console.log('get' in descriptor); // true
console.log('set' in descriptor); // true
console.log(descriptor.enumerable); // false
```

+RESULTS:  

    { get: [Function: get html],
      set: [Function: set html],
      enumerable: false,
      configurable: true }
    true
    true
    false

注意要从 `CustomHTMLElement.prototype` 原型上去取 `html` ，因为类的方法都会被挂  
到原型上。  

## 计算成员名称

```js
let methodName = 'sayName'

class PersonClass {
  constructor(name) {
    this.name = name
  }

  [methodName]() {
    console.log(this.name)
  }
}

let me = new PersonClass('xx')

me.sayName(); // 'xx'
```

+RESULTS:  

    xx

计算成员名称，可以让类或对象的成员名动态生成，这赋予了类和对象更加灵活的使用方式。  

且访问器属性名称也可以使用变量。  

```js
let propertyName = 'html'

class CustomHTMLElement {
  constructor(element) {
    this.element = element
  }

  get [propertyName]() {
    return this.element.innerHTML
  }

  set [propertyName](value) {
    this.element.innerHTML = value
  }
}

```

## 生成器方法(Generator Methods)

类内部方法还可以是生成器方法。  

```js
class MyClass {
  *createIterator() {
    yield 1
    yield 2
    yield 3
  }
}

const ins = new MyClass()

const it = ins.createIterator()

console.log(it.next()); // { value: 1, done: false }
console.log(it.next()); // { value: 2, done: false }
console.log(it.next()); // { value: 3, done: false }
console.log(it.next()); // { value: undefined, done: true }
```

+RESULTS:  

    { value: 1, done: false }
    { value: 2, done: false }
    { value: 3, done: false }
    { value: undefined, done: true }

迭代器和生成器[9](#orge26ee44)描述过，一个实现了 `Symbol.iterator` 或内置它  
的一个对象都可以被迭代，也就可以使用 `for...of` 去遍历它，最终调用的都会是  
`Symbol.iterator` 这个内部或自定义的函数。  

```js
class Collection {
  constructor() {
    this.items = []
  }

  *[Symbol.iterator]() {
    yield *this.items.values()
  }
}

var c = new Collection()

c.items.push(...[1, 2, 3])

for (let x of c) {
  console.log(x)
}
```

+RESULTS:  

    1
    2
    3

回顾[<span class="underline">代理生成器</span>](#orgce1f7da)和[<span class="underline">集合内置迭代器</span>](#org001eece)的内容，我们分析这一句：  

`yield *this.items.values()`  

1.  首先 `values()` 为集合内置的值得迭代器
2.  `yield *iterator()` 这种方式为生成器代理，即一个生成器中调用另一个生成器

也就是说当我们 `for (let x of c) {}` 的时候，首先是调用了 `Collection` 类内部实  
现的 `*[Symbol.iterator]()` 迭代器，然后在迭代器内部由调用了类成员的 `items` 数  
组的内置迭代器，也就是说这一句最终其实就是去遍历 `items` 数组，输出每个元素值。  

## 静态成员

静态成员，即只属于构造函数的属性，只能通过类名去访问的成员。  

< ECMAScript 6 之前的做法：  

```js
function Person(name) {
  this.name = name
}

Person.create = function(name) {
  return new Person(name);
}

Person.prototype.sayName = function() {
  console.log(this.name)
}

var person = Person.create('xxx')
person.sayName(); // 'xxx'
```

+RESULTS:  

    xxx

直接在函数名称上挂一个属性，因为函数也是一个对象，也可以有自己的属性，和对象一样  
可以通过 `obj[attrName]` 访问或新增属性。  

>= ECMAScript 6 开始可以使用类静态成员方式：  

通过 `static` 关键词声明一个方法，这个方法将成为类的静态属性，只能通过类名访问。  

```js
class Person {
  constructor(name) {
    this.name = name
  }

  sayName() {
    console.log(this.name)
  }

  static create(name) {
    return new Person(name);
  }
}

let p = Person.create('xx');
p.sayName(); // 'xx'
```

+RESULTS:  

    xx

## 类继承

### < ECMAScript 6 之前的类继承<a id="orga150609"></a>

一般都是使用原型的方式去实现继承  

构造函数-实例-函数三者之间的关系简图：  

![img](http://qiniu.ii6g.com/function-fn-constructor-prototype.png)  

```js
function Rectangle(l, w) {
  this.len = l
  this.width = w
}

Rectangle.prototype.getArea = function() {
  return this.len * this.width
}

function Square(l) {
  // 调用父类的构造函数，将实例属性拷贝一份到子类中
  Rectangle.call(this, l, l)
}

// #1
Square.prototype = /* Object.create(Rectangle.prototype, {
                      constructor: {
                      value: Square,
                      enumerable: false,
                      writable: true,
                      configurable: true
                      }
                      }) */

Object.create(Rectangle.prototype)
// Rectangle.prototype

var s = new Square(3)

console.log(s.getArea()); // 9
console.log(s instanceof Square); // true
console.log(s.constructor === Square.prototype.constructor); // true
console.log(Square === Square.prototype.constructor); // true
console.log(Square.prototype.constructor); // true
console.log(s instanceof Rectangle); // true
```

+RESULTS: #1 被注释，意味着没有重新定义构造函数的输出  

    9
    true
    true
    false
    [Function: Rectangle]
    true

这里 `Square` 的构造函数不再是自身了，因为它的原型被重写了，而构造函数对象又是挂  
在原型对象上的 `Square.prototype.constructor` 因此使用原型继承的时候尤其要记得重  
新定义构造函数，才能得到下面的正确继承效果：  

+RESULTS: #1 没有注释，有重新定义构造函数的输出结果  

    9
    true
    true
    true
    [Function: Square]
    true

上面代码对于初学者来说不太容易明白的一般有两点：  

1.  `Rectangle.call(this, l, l)` 这一步，这里是拷贝一份是实例属性到子类上  
  
    这里相当于让 `Square` 也有了自己的 len 和 width 实例属性。

2.  `Square.prototype` 原型赋值的一步构造函数被覆盖了，需要重新定义构造函数

注意点： 重写 Square 的原型，且需要重新定义构造函数，因为构造函数是在原型之上的，  
如果将原型覆盖了，那么 Square 将没有自己的构造函数了，将没法创建实例，因此在使用  
`Object.create()` ([Object.create伪码实现](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/#org2f761be))的时候需要把构造函数属性给加上去。  

### >= ECMAScript 6 之后的 class 类继承

在有了 `class` 语法糖之后，让 JavaScript 中的继承变得简单易懂。  

```js
class Rectangle {
  constructor(l, w) {
    this.len = l
    this.width = w
  }

  getArea() {
    return this.len * this.width
  }
}

class Square extends Rectangle {
  constructor(l) {
    super(l, l)
  }
}

var s = new Square(3)

console.log(s.getArea()); // 9
console.log(s instanceof Square); // true
console.log(s instanceof Rectangle); // true
```

+RESULTS:  

    9
    true
    true

将上面的代码 babel 转换，删除一些不关心的代码之后：  

```js
"use strict";

// ... 省略

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }

  subClass.prototype = Object.create(
    superClass && superClass.prototype,
    {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });

  if (superClass)
    _setPrototypeOf(subClass, superClass);
}

// ... 省略


var Rectangle =
    /*#__PURE__*/
    function () {
      function Rectangle(l, w) {
        _classCallCheck(this, Rectangle);

        this.len = l;
        this.width = w;
      }

      _createClass(Rectangle, [{
        key: "getArea",
        value: function getArea() {
          return this.len * this.width;
        }
      }]);

      return Rectangle;
    }();

var Square =
    /*#__PURE__*/
    function (_Rectangle) {
      _inherits(Square, _Rectangle);

      function Square(l) {
        _classCallCheck(this, Square);

        return _possibleConstructorReturn(this, _getPrototypeOf(Square).call(this, l, l));
      }

      return Square;
    }(Rectangle);

var s = new Square(3);
console.log(s.getArea()); // 9

console.log(_instanceof(s, Square)); // true

console.log(_instanceof(s, Rectangle)); // true
```

我们重点关注的应该是 `_inherits` 这个函数，其实它里面实现的就和我们 ECMAScript6  
之前的版本[10.8.1](#orga150609)一样。  

### 类 super() 使用注意点

在使用 es6 的类的 `super()` 需要注意几点：  

1.  只能在子类的方法中使用 `super()` ，如果试图在一个非继承的类(不是用 `extends`  
    实现的继承的子类)中使用都会报错。
2.  必须在构造函数中调用 `this` 之前调用 `super()` 因为 `super()` 会对 `this` 做  
    一些初始化工作，比如拷贝实例属性等等。
3.  唯一一个避免调用 `super()` 的途径就是在构造函数中返回一个对象。

**第一点**: 不能非继承调用 `super()`  

```js
class Person {
  constructor(name) {
    super(name)
    this.name = name
  }
}

const p = new Person('xxx')
```

+RESULTS: 报错结果，表明不能在非继承的子类中直接调用 `super` ，因为它被定义指向  
的是 extends 的父类那个对象。  

    /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-la0Zuf/js-script-UZ7NKG:4
        super(name)
        ^^^^^
    
    SyntaxError: 'super' keyword unexpected here
        at Module._compile (internal/modules/cjs/loader.js:721:23)
        at Object.Module._extensions..js (internal/modules/cjs/loader.js:787:10)

**第二点**: 必须在使用 this 之前调用 `super()` 初始化 this  

```js
class Person {
  constructor(name) {
    this.name = name
  }
}

class Man extends Person {
  constructor(name) {
    console.log(this.name)
    super(name);
  }

  sayName() {
    console.log(this.name)
  }
}

const m = new Man('xxx'); // undefined
```

+RESULTS: 直接报错，不能在使用 this 之后调用 super() ,必须在之前调用  

    /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-la0Zuf/js-script-c51Wqa:10
        console.log(this.name)
                    ^
    
    ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
        at new Man (/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-la0Zuf/js-script-c51Wqa:10:17)
        at /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-la0Zuf/js-script-c51Wqa:19:11

### 重写父类方法(Shadowing Class Methods)

重写父类方法，通过实例调用该方法时候，会先从当前类中查找，如果没找到就会去父类中  
找。  

因此，如果想子类拥有某种自己的行为，可以通过重写方法来实现。  

```js
class Human {
  run() {
    console.log('human running.')
  }
}

class Person extends Human {
  run() {
    console.log('person running.')
  }
}

const p = new Person()

p.run(); // 'human running.'
```

+RESULTS: 重写之后  

    person running.

+RESULTS: 重写之前  

    human running.

Babel 编译之后的代码：  

```js

var Human =
    /*#__PURE__*/
    function () {
      function Human() {
        _classCallCheck(this, Human);
      }

      _createClass(Human, [{
        key: "run",
        value: function run() {
          console.log('human running.');
        }
      }]);

      return Human;
    }();

var Person =
    /*#__PURE__*/
    function (_Human) {
      _inherits(Person, _Human);

      function Person() {
        _classCallCheck(this, Person);

        return _possibleConstructorReturn(this, _getPrototypeOf(Person).apply(this, arguments));
      }

      _createClass(Person, [{
        key: "run",
        value: function run() {
          console.log('person running.');
        }
      }]);

      return Person;
    }(Human);

var p = new Person();
p.run(); // 'human running.'
```

`_inherits` 让 Person.prototype 指向了 Human.prototype,  

两个 `_createClass` ，前一个让 `run` 挂到了 Human 的原型上，后一个又在 Person 的  
原型上重新挂了一个同名的 run 方法，但由于继承 `_inherits` 的原型  
Person.prototype 实际上是指向 Human.prototype 的，因此两个 `_createClass` 实际上  
是覆盖了前一个 `_createClass` 的 run 方法。  

### 继承静态成员

静态成员在 `extends` 继承过程中，也会被继承到子类当中，但是也只能通过构造函数访  
问。  

```js
class Rectangle {
  constructor(l, w) {
    this.len = l
    this.width = w
  }

  getArea() {
    return this.len * this.width
  }

  static create(l, w) {
    return new Rectangle(l, w)
  }
}

class Square extends Rectangle {
  constructor(l) {
    super(l, l)
  }
}

var rect = Square.create(3, 4)

console.log(rect instanceof Rectangle); // true
console.log(rect.getArea()); // true
console.log(rect instanceof Square); // false
```

+RESULTS:  

    true
    12
    false

### 动态父类

即 `extends` 后面的可以是任意类型，只要满足两个条件：  

1.  有 `[ [Constructor]]` 可以构建实例(使用 `new`)
2.  有自己的原型

普通构造函数：  

```js
function Rectangle(l, w) {
  this.len = l
  this.width = w
}

Rectangle.prototype.getArea = function() {
  return this.len * this.width
}

class Square extends Rectangle {
  constructor(l) {
    super(l, l)
  }
}

var x = new Square(3)

console.log(x.getArea()); // 9
console.log(x instanceof Rectangle); // true
```

+RESULTS:  

    9
    true

函数调用方式：只要返回值满足有构造器和原型  

```js
function Rectangle(l, w) {
  this.len = l
  this.width = w
}

Rectangle.prototype.getArea = function() {
  return this.len * this.width
}

function getBase() {
  return Rectangle
}

class Square extends getBase() {
  constructor(l) {
    super(l, l)
  }
}

var x = new Square(3)

console.log(x.getArea()); // 9
console.log(x instanceof Rectangle); // true

```

+RESULTS:  

    9
    true

根据父类可以动态决定的特性，我们可以实现一些比较有用的东西，比如：混合器类型  

```js
let SerializableMixin = {
  serialize() {
    return JSON.stringify(this)
  }
}

let AreaMixin = {
  getArea() {
    return this.length * this.width
  }
}

function mixin(...mixins) {
  let base = function() {}
  Object.assign(base.prototype, ...mixins)
  return base
}

class Square extends mixin(SerializableMixin, AreaMixin) {
  constructor(l) {
    super()
    this.length = l
    this.width = l
  }
}

const x = new Square(3)
console.log(x.getArea())
console.log(x.serialize())
```

+RESULTS:  

    9
    {"length":3,"width":3}

让 `Square` 同时具备多个混合器的能力，使用多个混合器构建一个函数类。  

> 记住：只要满足有原型和构造函数都可以放在 extends 右边作为被继承的父类。  
>
> 除下面两钟类型不能之外：  
>
> -   `null`
> -   生成器函数
>
> 因为他们没有 `[[Constructor] ]` 属性。  

### 继承内置对象

可以通过原型继承的方式来基于内置对象定义一个新的对象，该对象将有用内置对象的相同  
的功能。  

```js
function MyArray() {
  // 调用 Array 的构造函数，初始化 this
  Array.apply(this, arguments)
}

MyArray.prototype = Object.create(Array.prototype, {
  constructor: {
    value: MyArray,
    writable: true,
    configurable: true,
    enumerable: true
  }
})

var colors = new MyArray()
colors[0] = 'red'
console.log(colors.length)

colors.length = 0
console.log(colors[0])
```

+RESULTS:  

    0
    red

结果并非如我们所预期。 `length` 属性和数值属性并没有像内置数组类型一样发生变化，  
这是因为这个功能无法通过 `Array.apply()` 或赋值原型类实现。  

在 ECMAScript5 的类继承中， `this` 的值会在调用 `Array.apply` 之前会被新的类型  
(比如： `MyArray`)创建好了，然后基础类型的构造函数才会被调用，这就意味着 `this`  
只是绑定到了 `MyArray` 的本 身的实例上而已，此时并不具备数组的一些基础特性，而后  
的基础类型构造函数的调用只不过是对新类型做了一点扩展而已。  

而在 ECMAScript6 的基于类的继承当中， `this` 会优先被 `Array` 内置类型的构造函数  
调用，然后才是被新类型 `MyArray` 的构造函数修改，修饰新类型的一些内容。结果就是  
`this` 将拥有基础类型的内置功能。  

```js
class MyArray extends Array {
  // empty
}

var colors = new MyArray();
colors[0] = "red";
console.log(colors.length);         // 1

colors.length = 0;
console.log(colors[0]);             // undefined
```

+RESULTS:  

    1
    undefined

也就是说要继承基础类型，必须“先使用基础类型构造函数去创建 `this` ，然后对新类型  
做进一步扩充”，否则，如果相反的话， `this` 由新类型创建，那只会拥有新类型的一些  
基本特征，后面才调用基础类型的话只是做了一个粉饰而已。  

## Symbol.species 符号属性<a id="orga2051c7"></a>

```js
class MyArray extends Array {

}

let items = new MyArray(1, 2, 3, 4),
    subItems = items.slice(1, 3)

console.log(items instanceof MyArray); // true
console.log(subItems instanceof MyArray); // true
```

+RESULTS:  

    true
    true

通过 class-extends 的继承，不仅能让新类型实现原生类型的能力，而且也会改变一些默  
认行为，比如上面的 `subItems instanceof MyArray` 的结果会是 `true` ，这是因为  
`Symbol.species` 在继承过程中影响了它的默认行为。  

Symbol.species 符号属性用来定义一个静态的访问器属性，返回一个函数。该函数被当做一个  
构造函数使用，每当一个类的实例必须在一个实例方法中被创建的时候(而不是使用构造函  
数)。  

以下内置类型定义了 `Symbol.species` :  

-   `Array`
-   `ArrayBuffer`
-   `Map`
-   `Promise`
-   `RegExp`
-   `Set`
-   Typed Arrays

上面每个类型都有一个默认的 `Symbol.species` 属性，返回 `this` ，也就是说它总是会  
返回构造函数。  

```js
class Person {
  getSpecies() {
    const descriptor = Object.getOwnPropertyDescriptor(Person, Symbol.species)
    console.log(descriptor, '11')
  }
}

console.log(new Person().getSpecies())
```

```js
class MyClass {
  // 上面内置类型的 Symbol.species 默认实现，类似这里的实现
  static get [Symbol.species]() {
    console.log('get spcies')
    return this
  }

  constructor(value) {
    this.value = value
  }

  clone() {
    // this.constructor[Symbol.species] 会返回 MyClass 构造函数
    // 因此这里也相当于是 new MyClass(this.value)
    return new this.constructor[Symbol.species](this.value)
  }
}
```

```js
class A {
  static get [Symbol.species]() {
    return this;
  }

  constructor(value) {
    this.value = value;
  }

  clone() {
    return new this.constructor[Symbol.species](this.value);
  }
}

class B extends A {
  // empty
}

class C extends A {
  static get [Symbol.species]() {
    return A;
  }
}

let b = new B("foo"),
    a1 = instance1.clone(),
    c = new C("bar"),
    a2 = instance2.clone();

console.log(b instanceof A); // #1: true
console.log(a1 instanceof B); // #2: true
console.log(c instanceof A); // #3: true
console.log(a2 instanceof C); // #4: false
```

+RESULTS:  

    true
    true
    true
    false

\#1: true 因为 A 是 B 的父类，在 B 实例的原型链之上，因此这里结果为 true。  

\#2: true 因为 B 继承 A ，且 B 的实例 `b` 中并没有重写 `Symbol.species` 因此他会  
返回默认的 `Symbol.species` 实现也就是该类自身的构造函数。  

\#3: true 因为 C 继承 A，同 #1 。  

\#4: false 这里结果意味着 `C` 并不在实例 `a2` 的原型链上，这是因为 C 中重写了  
`Symbol.species` 改变了继承的默认行为。  

## new.target 属性

在类中 [new.target](#org52daa00) 永远不会是 `undefined` 因为类名不能直接被调用。  

利用 `new.target` 的特性：如果是通过 `new` 调用它的值就是当前类的构造函数  

我们可以将一个类变成的抽象化，让它不能被用来创建实例，只能被其他类继承：  

```js
class Shape {
  constructor() {
    if (new.target === Shape) {
      throw new Error('不能被实例化。')
    }
  }
}

class Rect extends Shape {
  // ...
}

var x = new Shape(); // 报错，不能被实例化

var y = new Rect(); // ok
```

## 小结

1.  类声明，支持普通方式，表达式方式，不提升，性质和 `let` 一样，存在 TDZ。
2.  类可以直接作为表达式的一部分，也可以跟函数一样立即执行，还可以直接当做参数传  
    递，可用来实现单例。
3.  类成员的名称和普通对象一样使用计算属性，动态决定其属性名称。
4.  类方法可以是生成器方法，返回迭代器。
5.  类的静态方法(通过 `static` 修饰的方法)会被子类继承到构造函数上。
6.  `super()` 只能在继承式的子类构造函数中调用，且必须在使用 `this` 之前调用，否  
    则会报错。
7.  父类，即 `extends` 右边可以是动态的，只需要满足它的返回结果必须有  
    `[[Constructor] ]` 和自己的原型对象。
8.  内置对象的继承，ES5的继承有缺陷，因为 `this` 绑定的先后问题  
  
    es5 先绑定新类型然后是基础类型修饰，es6 是先绑定基础类型，然后是新类型的修饰，  
    这样将是该新类型具备基础类型的功能。
9.  `Symbol.species` 只能在类方法内部使用，不能通过构造函数调用，返回当前类的构造  
    函数。
10. `new.target` 类的该属性只会是构造函数，因为类本身是不可以直接调用的，通过它  
    的特性可以让一个类抽象化，不能被实例化，只能被其他类继承。

# 提升数组能力(Array)

## 创建数组

### Array.of(&#x2026;items)

ECMAScript5 中构建数组：通过 `Array()` 构造函数，但是使用这种方式很容易产生疑惑，  

比如：  

值传递一个数值： `new Array(2)` 则会创建一个长度为 2 的数组。  

传递一个字符串数值： `new Array('2')` 则会当做一个数组元素，创建了一个元素的数组。  

传递多个参数的时候： `new Array(3, '2')` 则参数列表中的元素都会被当做数组元素。  

这对我们的使用并不是什么好事，有时候你可能只是想创建一个 `2` 元素的数组而已，但  
是实际上是一个长度为 2 的空数组。  

ECMAScript6 中则新增了 `Array.of()` 就不会有这种混淆，它只会将参数当做数组元素来  
创建数组，比如：  

`Array.of(1, 2)` ：两个元素的数组， arr[0] = 1, arr[1] = 2。  

`Array.of(2)` : 一个元素数组， arr[0] = 2。  

`Array.of('2')` ：一个元素的数组，arr[0] = '2'。  

> `Array.of()` 不使用 `Symbol.species` 决定返回值得类型，它使用的是当前构造函数(在  
> `of()` 函数里面的 `this`)来决定返回的正确数据类型。  

### Array.from(items[, mapFn[, thisArg]])

[Array.from 内部伪码实现->](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/#orgefbba01)  

将类数组的对象转换成数组类型，类数组对象：  

1.  有长度属性
2.  有数值索引

```js
let obj = {
  length: 2
}

const objArr = Array.from(obj)

console.log(objArr.length)
console.log(Array.isArray(objArr))
console.log(objArr[0])
```

+RESULTS:  

    2
    true
    undefined

对于类数组对象如果想使用数组的方法，以往都是通过 `call(arrayLike)` 方式来调用的，  
比如： `Array.prototype.slice.call(arrayLike)` 相当于 `arrayLike.slice()` 借用一  
下数组的 `slice` 方法因为该方法只要对象有数值索引和长度属性就可以了。  

**参数 mapFn** ：让转换过程中可以改变被转换元素的结果值，意思就是如果 `mapFn` 传递  
两个合法的函数，遍历过程中元素的值会进过 `mapFn` 先处理一遍然后在返回到新的数组  
列表中。  

```js
var obj = {
  length: 2,
  '0': 100,
  '1': 200
}

var arr = Array.from(obj, v => v * v);

console.log(arr[0], arr[1]); // 10000, 40000
```

+RESULTS:  

    10000 40000

**参数 thisArg** ：指定 `mapFn` 的 `this` 指向：  

```js
var helper = {
  add: v => v * v
}

var obj = {
  length: 2,
  '0': 10,
  '1': 20
}

var arr = Array.from(obj, helper.add, helper);

console.log(arr[0], arr[1]); // 100, 400
```

+RESULTS:  

    100 400

**用于可迭代的对象** :  

在[伪码](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/#orgefbba01)中可以知道 `Array.from` 可以处理有迭代器的也可以处理无迭代器的，这里也可以  
使用与自定义迭代器的对象，而不需要具备类数组对象的特征(必须有 `length` 和数值索  
引值)  

```js
var nums = {
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
    yield 3;
  }
}

let nums2 = Array.from(nums, v => v + 1);

console.log(nums2[0], nums2[1], nums2[2]); // 2, 3, 4
```

+RESULTS:  

    2 3 4

对应伪码中的实现：  

```js
// 列表类型，有自己的迭代器
if (usingIterator) {

  // 取出同步迭代器
  let iteratorRecord = GetIterator(items, sync, usingIterator);

  let k = 0, error;

  while(1) { // 循环启动迭代器，相当于自动调用了 iterator.next()

    // ... 省略

    // #1 调用 iterator.next() 启动迭代器，取下一个 yield 值
    let next = IteratorStep(iteratorRecord);

    // ... 省略

    // #2 取出当前迭代 { value: xxx, done: false } 中的 value 值
    let nextValue = IteratorValue(next);

    // ... 省略

    // #3 将迭代出的值，添加到数组 Pk 位置上。
    let defineStatus = CreateDataPropertyOrThrow(A, Pk, mappedValue);

    // ... 省略

    // #4 进入下一次循环。
    k++;
  }

}
```

如上，我们省略了部分代码，只保留我我们需要关注的地方：  

1.  `GetIterator(items, sync, usingIterator)` 会取出 items 对象的迭代器
2.  `while(1)` 一个无限循环，用来触发迭代器，相当于 `iterator.next()`
3.  `IteratorValue(next)` 取出迭代器 `{value: xx, done: false}` 中 value 的值
4.  最后将值添加到新数组 A 上， `k++` 进入下一次 `iterator.next()`

**用于类数组且可迭代的对象** :  

```js
let nums = {
  length: 2,
  '0': 100,
  '1': 200,
  *[Symbol.iterator]() {
    yield 1;
    yield 2;
    yield 3;
  }
}

var nums2 = Array.from(nums);

console.log(nums2.length, nums2[0], nums2[1], nums2[2]);
```

+RESULTS:  

    3 1 2 3

从结果看出使用的是 `Symbol.iterator` 迭代器优先，这从伪码的处理过程中也可确定优  
先级。  

```js
Array.from = function(items[, mapFn[, thisArg]]) {

  // ...

  // 取出类数组对象的迭代器，将用来取出有效的数组元素
  let usingIterator = GetMethod(items, @@iterator);

  // 列表类型，有自己的迭代器
  if (usingIterator) {
    // 迭代器判断在前

    // .... return
  }

  // 非列表类型，没有自己的迭代器，可能是个类数组对象
  let arrayLike = ToObject(items);
  // 必须具备长度属性，才能转数组，这也是类数组对象必备条件之一
  let len = ToLength(Get(arrayLike, 'length'))

  // ...

  let k = 0;

  while (k < len) {
    // 类数组对象的判断在后
    // ...
  }

  Set(A, 'length', len, true);

  return A;
}
```

## 原型上新增的方法

### flat([depth])<sup>2019</sup>

扁平化数组，降维。 `depth` 表示降多少次，如果是 `Infinity` 则把数组降维到一维数  
组。  

```js
const nums = [1, 2, 3, [4, 5]]

console.log(nums.flat()) // [ 1, 2, 3, 4, 5 ]
```

### flatMap()<sup>2019</sup>

### find(mapFn[, thisArg]) & findIndex(mapFn[, thisArg])

查找元素，[内部实现伪码](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/#orgefbba01)。  

以往并没有什么内置的方法用来查找数组中的元素，一般我们都是使用 `indexOf` 和  
`lastIndexOf` 或者利用他们实现自己的自定义方法。  

ECMAScript 6 中新增了两个专门用来查找元素的两个方法：  

-   `find(mapFn[, thisArg])` 返回满足条件的第一个元素值
-   `findIndex(mapFn[, thisArg])` 返回满足条件的第一个元素值的索引

两个方法的 `mapFn` 接受的参数与 `map()` 和 `forEach()` 一样，接收三个参数：  

1.  `value` 遍历当前值
2.  `index` 当前索引
3.  `array` 数组本身

```js
let nums = [1, 2, 3, 4];

console.log(nums.find(n => n > 2));
console.log(nums.findIndex(n => n > 2));
```

### fill(value[, start[, end]])

[fill 内部实现伪码](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/#orgefbba01)。  

从指定起始结束位置将数组元素替换成 `value` 。  

参数：  

-   `value` *required* 替换的值
-   `start` *optional*, 默认(0)， 起始位置
-   `end` *optional*, 默认(length)，结束位置

```js
let nums = [1, 2, 3, 4];

nums.fill(1); // 1, 1, 1, 1
console.log(nums.toString());

nums.fill(2, 1); // 1,2,2,2
console.log(nums.toString());

nums.fill(3, 2, 4); // 1,2,3,3
console.log(nums.toString());

// 负数，len + (-1) = 3 => fill(1, 3);
nums.fill(1, -1); // 1,2,3,1
console.log(nums.toString());

// 负数，len + (-2) = 2 => fill(1, 2);
nums.fill(1, -2); // 1,2,1,1
console.log(nums.toString());

// 负数，start: len + -2 = 2 => fill(1, 2, 1)
// 2 < 1 => start < end => 无效
nums.fill(1, -2, 1); // 1,2,1,1
console.log(nums.toString());

// start: len + -2 = 2
// end: len + -1 = 3
// => fill(1, 2, 3)
nums.fill(4, -2, -1); // 1,2,4,1
console.log(nums.toString());
```

+RESULTS:  

    1,1,1,1
    1,2,2,2
    1,2,3,3
    1,2,3,1
    1,2,1,1
    1,2,1,1
    1,2,4,1

### copyWithin(target, start[, end])

[copyWithin 内部实现伪码。](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)  

方法功能：拷贝 `count = start:0 - end:length` 之间的元素，用这些元素从  
target(`num = target:0 - len` ) 位置开始替换数组内的元素，实际被替换的元素个数由  
`num` 决定。  

```js
let nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

let res = nums.copyWithin(0, 3, 5);

console.log('>>> 拷贝元素个数 <= len - 起始位置')
console.log(res.toString(), 'res')
console.log(nums.toString(), 'nums')
console.log(nums === res, 'res === nums ?')
console.log('>>> 拷贝元素个数 > len - 起始位置')
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
res = nums.copyWithin(6, 3);
console.log(res.toString(), 'res')
console.log(nums.toString(), 'nums')
console.log(nums === res, 'res === nums ?')
```

+RESULTS:  

    >>> 拷贝元素个数 <= len - 起始位置
    4,5,3,4,5,6,7,8,9 res
    4,5,3,4,5,6,7,8,9 nums
    true 'res === nums ?'
    >>> 拷贝元素个数 > len - 起始位置
    1,2,3,4,5,6,4,5,6 res
    1,2,3,4,5,6,4,5,6 nums
    true 'res === nums ?'

1.  如果 `end - start` > `len - target` 则只替换 `len - target` 个元素
2.  如果 `end - start` < `len - target` 则只替换 `end - start` 个元素

被替换的元素个数决定因素： `Math.min(end - start, len - target)` 取最小值得个数。  

## TODO 类型化数组(Typed Arrays)

## TODO 类型化数组和普通数组的相似点

## TODO 类型化数组和普通数组的不同点

## TODO 小结

# Promises和异步编程

Nodejs 异步编程：事件触发 + 回调。  

Promise: 指定一些代码延时执行，并且可知道代码是否执行成功或失败，支持链式调用。  

为了更好的理解 Promise 如何工作，有必要了解一些与异步相关的基本概念。  

## Promise Apis

### Promise.prototype.finally(onFinally)

不管异步任务执行结果如何，都会在任务都完成之后被执行的代码。  

```js
new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve()
  }, 2000)
}).then(() => {
  console.log('p then')
}).finally(() => {
  console.log('p finally')
})

```

## 异步编程背景

JavaScript 引擎基于事件循环的单线程，单线程意味着一次只能执行一个代码片段。  

因此 JavaScript 引擎就需要去跟踪和管理这些代码片段，而这些代码片段会被一个叫“任  
务队列”的东西所持有，无论什么时候如果代码准备执行，它就会被添加到“任务队列”，当  
代码被执行完成，，事件循环就会开始执行队列中的下一个任务。  

在队列中，任务的执行顺序总是从第一个任务开始执行到最后一个人任务执行结束。  

### 事件模型

比如，用户点击了一个键盘上的按键，触发点击(`onclick`)事件，那么引擎会通过在任务  
队列的末尾添加一个新的任务来响应这个事件，这也是 JavaScript 中最基本的异步编程模  
型，被添加到队列中的事件的回调并不会立即执行直到事件被触发，且被触发执行回调时  
候会拥有自己合适的上下文执行环境。  

比如：  

```js
let button = document.getElementById("my-btn");
button.onclick = function(event) {
  console.log("Clicked");
};
```

上面的按钮点击事件，在按钮点击之前是不会被执行，一旦按钮被点击，那么赋值给  
`onclick` 的代码片段(或叫“任务”)就会立即被添加到“任务队列”的末尾，等待它前面的其  
他任务执行完成之后再执行(也就是说它不一定点击之后立即执行，前面可能还有其他任务  
在等待执行)。  

### 回调模式

在 JavaScript 中，我们最常用的异步莫过于回调的使用了，比如在读取一个文件的时候，  
读取完成之后要做一些处理，这个时候就会用到回调函数，因为读取文件相对来说是一个比  
较耗时的操作，不太可能使用同步进行处理，因此通过回调来处理异步读取文件是个非常不  
错的体验。  

比如：  

```js
readFile("example.txt", function(err, contents) {
  if (err) {
    throw err;
  }

  console.log(contents);
});
console.log("Hi!");
```

在读取 `example.txt` 文件内容之后将其立即答应出来，这里的回调函数并不会立即执行，  
而是在文件读取完成之后，会立即被添加到“任务队列”的列尾，在其他在它前面的任务执行  
完成之后会被立即执行，这和上面讲的“事件模型”是一样的原理。  

这相对来说读取一个文件，然后执行输出这种算是比较简单的应用场景，而现实中往往并不  
是这样的，现实中往往是多个事情之间有其关联性，也就是说工人在流水线上工作的时候，  
就必须依赖于上一个人工作的传递才能继续往下执行，这如果体现在代码使用回调完成这将  
会不可思议(这也就是我们常说的回调地狱问题)：  

```js
method1(function(err, result) {

  if (err) {
    throw err;
  }

  method2(function(err, result) {

    if (err) {
      throw err;
    }

    method3(function(err, result) {

      if (err) {
        throw err;
      }

      method4(function(err, result) {

        if (err) {
          throw err;
        }

        method5(result);
      });

    });

  });

});
```

method4 必须等待 method3 执行完成，  
method3 必须等待 method2 执行完成，  
&#x2026;  
一直到 method1 执行完成，这无论是在逻辑还是代码阅读性上都将会让人崩溃。  

一直到 `Promise` 的出现才比较有效的解决了这回调地狱及代码可读性的问题。  

## Promise 基础

一个 promise 实例作为一个异步操作的结果返回，而不再使用时间绑定或将回调作为参数  
传递给一个函数的方式，现在一个函数可以直接返回一个 promise ，比如：  

```js
let promise = readFile('example.txt');
```

上面的代码中读取文件操作实际上并不会立即执行，而是返回了一个 promise 可以让你决  
定如何去响应这个读取文件操作。  

### Promise 的生命周期

-   *pending*, 表示异步操作尚未完成，也被标记为 *unsettled* 。  
  
    比如 `let promise = readFile('example.txt');` 执行之后，这个 promise 状态就  
    成为了 *pending* 一旦文件读取操作完成，该 promise 就会被设置为 *settled* ，随  
    后进入下面两种状态的一种，且不可逆。
-   *Fulfilled* : 表示该 promise 代表的异步任务执行成功
-   *Rejected* : 表示该 promise 代码的异步任务执行失败了或者执行过程中出现异常等其  
    它非正常结果。

且 promise 有个内部属性 `[[PromiseState] ]` 用来记录了整个 promise 状态的变化，  
它的值由三个： *pending*, *fulfilled*, *rejected* 对应着 promise 的三种不同状态。  
该内部属性没有对外的接口，因此是无法直接去访问或操作它的，但是 promise 提供了一  
个 `then()` 方法，可以接受处理的结果(*fulfilled* 或 *rejected*)。  

`then(fulfilled, rejected)` 接受两个参数，这两个参数为函数类型，第一个会在  
promise 状态变成 *fulfilled* 的时候调用，第二个则会在 *rejected* 状态下调用。  

`fulfilled(data)` :  函数会接受 promise 成功之后传递出来的数据。  

`rejected(error)` : 函数会接受 promise 失败之后触发的异常数据。  

> 任意对象只要实现了 `then()` 方法都可以叫做一个 *thenable* ，所有的 promises 都是  
> *thenable* 的，但并不是所有的 *thenable* 都是 promises 。  

使用：  

```js
let fs = require('fs')


let promise = new Promise(function(resolve, reject) {
  fs.readFile(__dirname + '/config.json', (err, data) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  })
})

console.log(promise)
```

+RESULTS: 上面代码我们只是将读取文件操作包装成了一个 promise 但是并没有立即去读  
取文件，且此刻 promise 的状态显示为 *pending* 。  

    Promise { <pending> }

```js
let fs = require('fs')


let promise = new Promise(function(resolve, reject) {
  fs.readFile(__dirname + '/config.json', (err, data) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  })
})

// 将触发 promise 状态发生改变
promise.then(data => {
  console.log(promise)
  console.log(data)
}, err => {
  console.log(promise)
  console.log(err)
})

console.log(promise)
```

+RESULTS: promise 成功之后的输出，状态将成为 *fulfilled* (这里没输出出来，o(╯□╰)o)。  

    Promise { <pending> }
    Promise {
      <Buffer 49 27 6d 20 61 20 70 72 6f 6d 69 73 65 20 65 78 61 6d 70 6c 65 2e 2e 2e 2e 2e 2e 0a> }
    <Buffer 49 27 6d 20 61 20 70 72 6f 6d 69 73 65 20 65 78 61 6d 70 6c 65 2e 2e 2e 2e 2e 2e 0a>

+RESULTS: 读取失败之后状态为 *rejected* 的输出。  

    Promise { <pending> }
    Promise {
      <rejected> { Error: ENOENT: no such file or directory, open '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json'
        errno: -2,
        code: 'ENOENT',
        syscall: 'open',
        path:
         '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json' } }
    { [Error: ENOENT: no such file or directory, open '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json']
      errno: -2,
      code: 'ENOENT',
      syscall: 'open',
      path:
       '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json' }

promise 也提供了一个 `catch()` 接口给我们用来捕获异常，比如上面的例子还可以这样：  

```js
let fs = require('fs')


let promise = new Promise(function(resolve, reject) {
  fs.readFile(__dirname + '/config.json', (err, data) => {
    if (err) {
      reject(err)
    } else {
      resolve(data)
    }
  })
})

// 将触发 promise 状态发生改变
promise.then(data => {
  console.log(promise)
  console.log(data)
}, err => {
  console.log('error in then')
  console.log(err)
}).catch(function(err) {
  console.log('error in catch')
  console.log(err)
})

console.log(promise)

```

+RESULTS: 结果是 `then` 中和 `catch` 中都有执行  

    Promise { <pending> }
    error in then
    { [Error: ENOENT: no such file or directory, open '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json']
      errno: -2,
      code: 'ENOENT',
      syscall: 'open',
      path:
       '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-LzyRrW/config.json' }

使用 promise 有个好处就是，比如上面的遇到执行异常，它会将异常捕获并处暴露出来，  
一旦出现异常，或执行失败 promise 的状态会立即成为 *rejected* ，且无法逆转，即该  
promise 已经彻底完成(无关成功或失败)。  

而事件模型中如果发生错误，该事件就不会被触发，而在回调中你就必须时常记住去检查异  
常情况的出现可能性，并作出相应的处理。  

而在 promise 中异常会被捕获，如果你想针对异常做处理可以使用 then-reject 或  
`catch()` 都行，如果不想处理就静默结束 promise 即可，而不用关心是否会导致任务失  
败而中断业务。  

一个 fufillment 或 rejection 的任务，如果在 promise 状态已经发生改变(*settled*,  
成为 *fulfilled* 或 *rejected* )的情况下，依然添加了新的任务，那么它依旧会继续执  
行。其实这也就相当于给其赋予了一个新的任务，比如：  

```js
let promise = readFile("example.txt");

// original fulfillment handler
promise.then(function(contents) {
  console.log(contents);

  // #1 now add another
  promise.then(function(contents) {
    console.log(contents);
  });
});

```

\#1 处相当于针对 promise 又在任务队列末尾新增了一个任务，等待被执行。  

### 创建 unsettled Promises

通过 `Promise` 构造函数可以创建一个 unsettled 状态的 promise 实例：  

```js
let fs = require('fs')

function readFile(name) {
  return new Promise(function(resolve, reject) {
    console.log('...outer')
    fs.readFile(__dirname + '/config.json', (err, data) => {
      console.log('...inner')
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

// 得到了一个 pending - unsettled 的 promise
let promise = readFile()

// 触发 promise 任务，状态将变成 settled: fulfilled 或 rejected
// #1 promise.then(data => console.log(data), err => console.log(err))
console.log(promise)

```

+RESULTS: #1 注释之后的输出结果，Promise 的参数函数会立即执行。  

    ...outer
    Promise { <pending> }
    ...inner

+RESULTS: fulfilled 结果  

    Promise { <pending> }
    <Buffer 49 27 6d 20 61 20 70 72 6f 6d 69 73 65 20 65 78 61 6d 70 6c 65 2e 0a>

+RESULTS: rejected 结果  

    Promise { <pending> }
    { [Error: ENOENT: no such file or directory, open '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-fFqHec/config.json']
      errno: -2,
      code: 'ENOENT',
      syscall: 'open',
      path:
       '/private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-fFqHec/config.json' }

1.  Promise 需要一个参数作为参数
2.  该函数的参数有两个：1）resolve 任务执行成功之后调用，2）reject 任务失败调用
3.  创建成功之后传递给 Promise 的函数会立即执行，并且将会在任务队列末尾添加一个任  
    务去处理这个 promise，这被称为“任务调度”。
4.  参数函数立即执行，但是 resolve 和 reject 会被当做异步任务添加到任务队列末尾去  
    等待执行。

### 创建 settled Promises

1.  `Promise.resolve()` 会创建一个状态必定是 *fullfilled* 的 promise
2.  `Promise.reject()` 会创建一个状态必定是 *rejected* 的 promise

```js
let promise = Promise.resolve(42);

promise.then(function(value) {
  console.log(value)
})
```

+RESULTS:  

    42

`Promise.resolve()` 创建的 promise 状态永远只会是 *fulfilled* 因此， `reject` 函数  
是永远不会执行的，同理 =Promise.reject()=。  

```js
let promise = Promise.reject(100)

promise.then(null, function(value) {
  console.log(value, '1')
})
promise.catch(function(value) {
  console.log(vlaue, '2')
})
```

+RESULTS:  

    100 '1'

> 如果给 `Promise.resolve()` 或 `Promise.reject()` 传递了一个 promise 那么它什么都  
> 不会做，直接原样返回这个 promise 。  

### 非 Promise 的 Thenables

非 Promise 的 Thenable : 对象有自己的 `then(resolve,reject)` 方法，那么就可以使  
用 `Promise.resolve()` 或 `Promise.reject()` 将该 thenable 转变成一个  
`fulfilled` 或 `rejected` 的 promise，至于到底是哪个状态的要取决于 thenable 函数  
内部是执行了 `resolve()` 还是 `reject()` 。  

```js
let thenable = {
  then: function(resolve, reject) {
    resolve(42)
  }
}

// 变成了一个 Fulfilled promise
let p1 = Promise.resolve(thenable)
p1.then(function(value) {
  console.log(value)
})
```

+RESULTS:  

    42

```js
let thenable = {
  then: function(resolve, reject) {
    reject(42)
  }
}

// 变成了一个 Fulfilled promise
let p1 = Promise.resolve(thenable)
p1.catch(function(value) {
  console.log(value)
})

```

+RESULTS:  

    42

### 执行异常

Promise 会在其内部将代码的执行过程，使用 `try...catch` 捕获到异常，然后通过  
`then(null, reject)` 或 `catch(function(error){})` 将异常暴露出来。  

```js
let promise = new Promise(function(resolve, reject) {
  throw new Error('Explosion!')
})


promise.catch(function(error) {
  console.log(error)
})
```

+RESULTS:  

    Error: Explosion!
        at /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-fFqHec/js-script-7ANcUx:3:9
        at new Promise (<anonymous>)
        at /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-fFqHec/js-script-7ANcUx:2:15

也可以手动捕获异常调用 `reject()` :  

```js
let promise = new Promise(function(resolve, reject) {
  try {
    throw new Error('Explosion!')
  } catch(err) {
    reject(err)
  }
})


promise.catch(function(error) {
  console.log(error)
})

```

+RESULTS: 结果是一样的  

    Error: Explosion!
        at /private/var/folders/kt/b5x0yl_56h1drdb8xgfmbk_r0000gn/T/babel-fFqHec/js-script-oIepKJ:4:11
        at new Promise (<anonymous>)

## 全局 Promise Rejection 处理

在之前的章节我们讲过，如果 promise 中的状态变成 *rejected* ，可能是任务失败，或  
代码执行异常了，而这些异常实际上被捕获了，可以通过 `then(null, reject)` 的  
reject 来接受或使用 `catch(function(err){}` 捕获。  

正式由于这种灵活性导致我们很难决定这些异常什么时候应该被处理，哪些有被处理，哪些  
没有被处理，哪些又是什么时候被处理了???  

比如 promise 状态已经 *rejected* 完成了，但是 *rejection* 相关的处理却并没有在合  
适的时候得到处理，因为这完全取决于编程者愿不愿意或什么时候去调用 `then(null,
   reject)` 或 `catch(function(err){}` 去处理。  

在 ECMAScript6 版本中并没有涉及到该问题的解决。  

在浏览器端和 Node.js 已经更新解决了该痛点问题，但这并非是 ECMAScript 6 的一部分。  

### Node.js Rejection 处理

在 Node.js 中有两个 `process` 对象上的事件与 promise rejection 处理相关：  

-   `unhandledRejection`: 在一个事件循环中一个 promise 状态已经 *rejected* 了，但  
    是没有任何 rejection 操作被调用的时候触发。
-   `rejectionHandled`: 与上面的相反，表示状态 *rejected* 了，且有相关的 rejection  
    操作被调用。

`unahdnledRejection` 事件的回调接受两个参数，一个是 reason 失败原因，一个是该  
promise 对象本身，如：  

```js
let rejected

process.on('unhandledRejection', function(reason, promise) {
  console.log(reason.message)
  console.log(rejected === promise)
})

rejected = Promise.reject(new Error('Explosion!'))
```

+RESULTS:  

    Explosion!
    true

```js
let rejected

process.on('unhandledRejection', function(reason, promise) {
  console.log(reason.message, 'unhandledrejection')
  console.log(rejected === promise, 'unhandledrejection')
})

process.on('rejectionHandled', function(promise) {
  console.log(rejected === promise, 'rejectionHandled')
})

rejected = Promise.reject(new Error('Explosion!'))
setTimeout(() => rejected.catch(function(err) {
  console.log(err.message, 'catch')
}), 1000)

```

+RESULTS:  

    Explosion! unhandledrejection
    true 'unhandledrejection'
    Explosion! catch
    true 'rejectionHandled'

如上结果，首先触发的是 unhandledRejection 事件，1 秒之后 rejection 被  
`catch()` 处理掉了，触发 rejectionHandled 事件。  

有了上面的基础，我们这里就可以实现一个简易的 **unhandled rejections tracker** ，来  
跟踪哪些 promise 的 rejection 有被处理，哪些没有被处理，如果没有可以针对这些  
rejection 做些什么事情。  

1.  使用 `Map` 结构保存 `promise => reason` 当前 Promise 和它的 rejection 没有被  
    处理的原因。
2.  监听 `unhandledRejection` 事件，在这里面将 `promise=>reason` 添加到 map。
3.  监听 `rejectionHandled` 事件，这里执行删除，因为 rejection 已经被处理，不需要  
    再保留了。

这里使用的是强引用类型的 `Map` ，因为我们需要能够用到的 promise 引用去获取当前的  
promise 执行设置或删除处理。  

```js

// 需要使用 Map 强引用类型，因为 unhandledRejection 和 rejectionHandled
// 需要用到同一个 promise
let possiblyUnhandledRejections = new Map()

process.on('unhandledRejection', function(reason, promise) {
  possiblyUnhandledRejections.set(promise, reason)
})

process.on('rejectionHandled', function(promise) {
  possiblyUnhandledRejections.delete(promise)
})

function handleRejection(promise, reason) {
  // ... 对每个 promise 的 rejection 进行处理
}

setInterval(function() {
  // 每隔 6 秒检查一次 rejections ，如果有未处理的 rejection 就立即处理掉
  possiblyUnhandledRejections.forEach(function(reason, promise) {
    console.log(reason.message || reason)

    handleRejection(promise, reason)
  })

  // 处理完成之后清空 rejections
  possiblyUnhandledRejections.clear()
}, 6000)
```

上面的代码功能：每隔 6 秒监听一次未处理的 promise rejections 的情况，如果有未处  
理的，就立即将它处理掉，然后清空 `map` ，这样就不会存在没有被处理的 rejections  
了。  

### 浏览器 Rejection 处理

在浏览器端也是通过监听两个同名的事件来处理这些 rejections ，使用方式基本相同，只  
需要注意几点：  

-   `unhandledRejection` 和 `rejectionHandled` 两个事件是在 `window` 对象上
-   事件的处理句柄的参数只有一个 `event` ，指向的是当前事件对象，该对象内包含三个  
    我们感兴趣的内容：  
    1.  `type` : 事件类型， `unhandledRejection` 或 `rejectionHandled`
    2.  `promise` : 当前的 promise 对象
    3.  `reason` : 当前的 rejection 产生的原因

```js
let rejected;

window.onunhandledrejection = function(event) {
  console.log(event.type);                    // "unhandledrejection"
  console.log(event.reason.message);          // "Explosion!"
  console.log(rejected === event.promise);    // true
};

window.onrejectionhandled = function(event) {
  console.log(event.type);                    // "rejectionhandled"
  console.log(event.reason.message);          // "Explosion!"
  console.log(rejected === event.promise);    // true
};

rejected = Promise.reject(new Error("Explosion!"));
```

**unhandled rejections tracking** 代码和 Node.js 实现一样：  

```js
let possiblyUnhandledRejections = new Map();

// when a rejection is unhandled, add it to the map
// 与 nodejs 版本不同点：这里只有一个事件参数，而不是 reason,promise
window.onunhandledrejection = function(event) {
  possiblyUnhandledRejections.set(event.promise, event.reason);
};

// 与 nodejs 版本不同点：这里参数不再是 promise 而是事件对象
window.onrejectionhandled = function(event) {
  possiblyUnhandledRejections.delete(event.promise);
};

setInterval(function() {

  possiblyUnhandledRejections.forEach(function(reason, promise) {
    console.log(reason.message ? reason.message : reason);

    // do something to handle these rejections
    handleRejection(promise, reason);
  });

  possiblyUnhandledRejections.clear();

}, 60000);
```

## 链式 Promises

实际上，每次调用 `then()` 或 `catch()` 都是创建并返回了另一个 promise ，第二个  
promise 只会在第一个的状态已经 settled 之后(无论是 fulfilled 或 rejected)才会  
resolved。  

### 链式 Promise 语法

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

p1.then(function(value) {
  console.log(value)
}).then(function() {
  console.log('finished.')
})
```

+RESULTS:  

    42
    finished.

实际上调用第二个 `then()` 的 promise 是一个全新的 Promise 。  

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

let p2 = p1.then(function(value) {
  console.log(value)
})

p2.then(function() {
  console.log('finished.')
})

console.log(p1 === p2)
```

+RESULTS:  

    false
    42
    finished.

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

let p3 = null

let p2 = p1.then(function(value) {
  console.log(value)
  p3 = Promise.resolve(100)
  return p3
}).then(function(val) {
  console.log(val, 'p3')
  console.log(p3 === p2, 'p3 is not p2')
})

console.log(p1 === p2, 'p2 is not p1')

```

+RESULTS: 我们也可以显示的在上一个 `then()` 里面返回一个 promise，从下面的第三行  
输出可知，下一个 `then()` 处理的即上一个 `then()` 里面返回的 promise，如果没有显  
式返回一个 promise 默认会创建一个新的 Promise 返回。  

    false 'p2 is not p1'
    42
    100 'p3'
    false 'p3 is not p2'

效果是一样的，但 p1 和 p2 并非同一个 promise。  

### 异常捕获

通过链式调用可以使用 `catch()` 捕获上一个 promise 中的异常。  

<a id="org8dd197d"></a>  

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

p1.then(function(value) {
  console.log('first then.')
}).then(function(value) {
  throw new Error('Boom!')
}).then(function(value) {
  console.log('third then.')
}).catch(function(error) {
  console.log(error.message)
  return Promise.resolve('100')
}).then(function(value) {
  console.log(value, 'four then.')
})
```

+RESULTS: 在第一个 `catch()` 中返回一个 `Promise.resolve('100')` 结果，这也说明  
\`four then\` 来自 `catch()` 里面的 promise.resolve。  

    first then.
    Boom!
    100 four then.

+RESULTS: four then 有输出，这是因为之前的异常已经被上一个 `catch()` 捕获并处理  
了， promise 恢复正常状态。  

    first then.
    Boom!
    four then.

+RESULTS: 新增 first then 结果，异常之后得 thenable 不会被执行，因为该 promise  
已经终结。  

    first then.
    Boom!

+RESULTS: 新增 third then 输出和之前的一样，因为前面的发生了异常后面的就无法再  
继续了。  

    Boom!

+RESULTS:  

    Boom!

从以上结果，不难看出，如果链式 promise 当中有一处发生异常，会终结这个 promise 链，  
除非后面有一个 `catch()` 将该异常捕获并处理掉了，才能继续在链后面追加 `then()`  
。  

> 通常情况下，最好是在链式调用的结束有一个 rejection 处理(`reject` 或 `catch`)，确  
> 保链式调用中出现的异常能得到适当的处理。  

### Promise 链式调用中返回值

其实在[上一节的实例](#org8dd197d)中，我们就已经用到了在 `thenable` 中返回一个值，该例中是直接返  
回了一个 `Promise.resolve()` 其本身就是返回了一个新的 Promise 对象，其实我们还可  
以直接返回一个普通的表达式或者其他类型的值，它的结果最终也会被封装成一个新的  
Promise 实例返回出来。  

返回值：  

1.  普通类型值或表达式
2.  `Promise.resolve()` 或 `Promise.reject()`
3.  或者直接 `new Promise()` 返回一个全新的 promise
4.  还可以返回另一个已经存在的 promise 实例
5.  前面出现的异常即可以用 rejection 来接收，也可以使用 `catch()` 来接受，实际根  
    据需要作出选择

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

p1.then(function(value) {
  console.log(value) // 42
  return value + 1
}).then(function(value) {
  console.log(value) // 43
  return Promise.resolve(value + 1)
}).then(function(value) {
  console.log(value); // 44
  throw new Error('Boom!')
}).catch(function(error) {
  console.log(error.message); // Boom!
  let p2 = new Promise(function(resolve, reject) {
    resolve(100)
  })
  return p2
}).then(function(value) {
  console.log(value); // 100
  return Promise.reject('end here.')
}).then(null, function(reason) {
  // 上一个的异常可以使用 rejection 接受
  console.log(reason); // end here.
  return Promise.reject('end end here.')
}).catch(function(error) {
  // 也可以用 catch 来接受
  console.log(error)
})
```

+RESULTS:  

    42
    43
    44
    Boom!
    100
    end here.
    end end here.

返回值也可以在一个 rejection，比如 `catch()` 中使用。  

## 响应多个 Promises

在之前的章节中，我们所使用的实例都是一次只能接受处理一个 promise，但是，如果你想  
要同时去接收多个 promise 且下一步的行为由这些多个 promise 共同决定的时候，就需要  
考虑使用下面这两个方法。  

-   `Promise.all()` 所有的 promise 状态完成了，才会被视为 resolved。
-   `Promise.race()` 多个 promise 只要有一个状态完成了，那么 `race()` 就被视为已经  
    完成

### Promise.all(iterable)

参数 iterable 是一个元素为 promise 的列表，该接口的含义是只有 iterable 中所有的  
promise 状态都为 resolved 了，这个接口返回的 promise 才会是 resolved ，否则只要  
有一个 rejected 了，返回的 promise 就会是 rejected。  

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

let p2 = new Promise(function(resolve, reject) {
  resolve(43)
})

let p3 = new Promise(function(resolve, reject) {
  resolve(44)
})


let p4 = Promise.all([p1 , p2, p3])
p4.then(function(value) {
  // 结果是由 p1, p2, p3 的结果值组成的数组
  console.log(Array.isArray(value)); // true
  console.log(value.toString()); // 42, 43, 44
})
```

+RESULTS:  

    true
    42,43,44

> `Promise.all()` 是：一荣俱荣(resolved)，一损俱损(rejected)，大家都在一条船上，一根  
> 绳上的蚂蚱，谁也别想偷懒。  

只要有一个 rejected 的了，那么立即 rejected 不会得到其他的 promise 完成：  

```js
let p1 = new Promise(function(resolve, reject) {
  resolve(42)
})

let p2 = new Promise(function(resolve, reject) {
  reject(43)
})

let p3 = new Promise(function(resolve, reject) {
  resolve(44)
})


let p4 = Promise.all([p1 , p2, p3])
p4.catch(function(value) {
  // 结果是由 p1, p2, p3 的结果值组成的数组
  console.log(Array.isArray(value)); // true
  console.log(value.toString()); // 42, 43, 44
})

```

+RESULTS: 因为只要有一个 rejected 了，就会立即 rejected 因此异常的结果值只会是所  
有 promises 中的一个。  

    false
    43

### Promise.race(iterable)

iterable 中的所有 promises 属于竞争关系，利己主义者，并且不管第一个状态完成的状  
态是 fulfilled 或 rejected 只要是 settled 那么 `race()` 就会立即 settled。  

*race() 中的每个 promise 都是自私鬼，宁愿自己失败也要赶在第一时间将大伙消灭(主体  
promise 都结束了)*  

```js
let p1 = Promise.resolve(42)

let p2 = new Promise(function(resolve, reject) {
  resolve(43)
})

let p3 = new Promise(function(resolve, reject) {
  resolve(44)
})


let p4 = Promise.race([p1 , p2, p3])
p4.then(function(value) {
  console.log(value);
})

```

+RESULTS:  

    42

```js
let delay = (fn, timeout) => setTimeout(fn, timeout)

let p1 = new Promise(function(resolve, reject) {
  delay(() => resolve(42), 100)
})


let p2 = new Promise(function(resolve, reject) {
  resolve(43)
})

let p3 = new Promise(function(resolve, reject) {
  delay(() => resolve(44), 50)
})


let p4 = Promise.race([p1 , p2, p3])
p4.then(function(value) {
  console.log(value); // 43
})


```

+RESULTS:  

    43

### 异步任务执行器

在之前的章节[9.8.1](#orgb88e39f)中我们有使用 iterator + generator 实现一个简易的异  
步任务执行函数，会在上一个任务完成之后立即启动下一个任务，如此往复直到所有任务都  
完成为止。  

在这里我们将使用 Promise 来实现它：  

```js
let fs = require('fs')

function run(taskDef) {
  let task = taskDef();

  let result = task.next();

  function step() {
    if (!result.done) {
      // 这里不用判断值是什么类型，promise.resolve 统统转成 promise
      let promise = Promise.resolve(result.value)
      promise.then(function(value) {
        result = task.next(value)
        step()
      }).catch(function(error) {
        result = task.throw(error)
        step();
      })
    }
  }

  step();
}


function readFile(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, function(err, contents) {
      if (err) {
        reject(err)
      } else {
        resolve(contents)
      }
    })
  })
}

run(function *() {
  let contents = yield readFile(__dirname + '/config.json')
  // do something with response data
  console.log(contents)
  console.log('Done')
})
```

Promise 版本需要注意的点：  

1.  `readFile` 即任务函数必须返回一个 Promise 对象
2.  在 `step()` 里面讲迭代器的值无论什么类型，让它变成一个 promise ，通过  
    `then()` 去接受执行结果， `catch()` 去捕获并处理异常。

Promise 版本相对于 iterator + generator 版本有点：  

1.  不用关心迭代器中 value 的值是什么类型，只要转成 promise
2.  能有效的处理异常，使用 `catch()` 捕获异常，不用中断程序
3.  不用使用回调传递(readFile 返回一个带有回调的函数，这个回调会被传递到迭代器的  
    value 值，但实际最后被使用的是 readFile 中的 `fs.readFile()`)，而使用 Promise  
    就不需要关心回调是如何被传递和执行了。

### 未来异步任务执行器(async&#x2026;await)

在 ECMAScript 2017(es8) 中引入了一个新的语法糖： `async...await` 这让异步任务变  
得异常简单，其内部实现也是基于 Promise 来实现的。  

```js
let fs = require('fs')

function readFile(filename) {
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, function(err, data) {
      if (err) {
        reject(err)
      } else {
        resolve(data)
      }
    })
  })
}

(async function() {
  let contents = await readFile(__dirname + '/config.json')
  console.log(contents)
  console.log('Done')
})()
```

+RESULTS:  

    <Buffer 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 0a 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 78 ... >
    Done

## 小结

-   Promise 有三个状态： pending(创建之初时), fulfilled(执行成功) 和 rejected(执行  
    失败或异常)，且状态一旦改变就无法逆转。
-   `promise.then(resolve, reject)` 用回调来接收上一个 promise 执行成功或失败的结  
    果
-   `catch(rejection)` 失败或异常处理可以用 `then(null, reject)` 来接受之外也可以  
    使用 `catch` ，并且建议在每个链式 promise 调用结尾保证总有一个 `catch()` 来保  
    证异常能被捕获到并得到处理

-   `Promise.all(iterable)` 所有的 promise resolved 才能 resolved
-   `Promise.race(iterable)` 所有的 promise 之间处于竞争关系，只要有一个首先  
    settled 之后该 `race()` 就结束，状态由第一个 settled 的 promise 决定。
-   Promise 链式调用，中每一个 `then()` 中都会默认返回一个新的 promise 给后面的  
    `then()` 也可以显示返回，如果显示返回的是一个普通值或表达式则会被封装成一个  
    promise，如果是一个 promise 则会被原样返回。
-   结合 promise 和 generator 将让异步任务执行器更加容易
-   es8 中的 async&#x2026;await 语法糖将让异步任务执行更加简易

# Proxies 和 Reflection Api

ECMAScript 5 和 ECMAScript 6 出现的目的都是为了简化 JavaScript 的使用，在  
ECMAScript 5 之前在 JavaScript 环境中包含一些拥有不能枚举(nonenumerable)和不能写  
入(nonwritable)的对象属性，但是开发者却不能给自己声明的对象添加不能枚举和不能写  
入的属性，因为并没有任务接口能使用，知道 ECMAScript 5 出现之后增加了  
`Object.defineProperty()` 方法，可以让开发者为自己的对象属性修改其描述符对象，从  
而增加不可写或不可枚举的属性等。  

```js

const obj = {}
Object.defineProperty(obj, 'count', {
  value: '100',
  enumerable: false, // 不可枚举
  writable: false, // 不可赋值改变
  configurable: true,
})

obj.count = 3
console.log(obj.count, 'count')

for (let prop in obj) {
  console.log(prop, 'prop')
}
```

+RESULTS:  

    100 count

1.  输出 100 表示 `obj.count = 3` 并没有生效
2.  for..in 中没有输出，说明 `count` 不能被枚举

ECMAScript 6 中赋予了开发者更多干涉 JavaScript 引擎工作的能力，它通过 *proxies*  
将一些内部操作暴露出来， *proxies* 是一些包可以中断或拦截引擎的一些操作包装器。  
这一章节将开始于 *proxies* 相关的知识和使用。  

## 数组问题(Array Problem)

比如，长度的问题，我们可以通过控制参数组的长度来达到控制数组内容的目的。  

```js
let colors = ['red', 'green', 'blue']

console.log(colors.length); // 3

colors[3] = 'black'

console.log(colors.length); // 4
console.log(colors[3]) // 'black'

colors.length = 2; // 相当于截取了数组，后面的元素将被丢弃
console.log(colors.length); // 2
console.log(colors[3]); // undefined
console.log(colors[2]); // undefined
console.log(colors[1]); // 'green'
```

+RESULTS:  

    3
    4
    black
    2
    undefined
    undefined
    green

> 这一非标准的行为也是为什么数组在 ECMAScript 6 中被视为异类了。  

## 什么是 Proxies 和 Reflection<a id="org0c2ba4d"></a>

我们可以通过 `new Proxy()` 创建一个 *proxy* 用来代替另一个对象(假设叫：  
*target*)使用。这个 proxy 会虚拟化这个 target 以至于 proxy 和 target 能好似一个  
东西一样被使用。  

就相当于给 target 生了个孪生兄弟，用法功能都差不多，甚至可以当做是一个人。  

Proxies 允许你可以中断低级对象操作(偏底层的操作, low-level object operations)，  
这些操作可以被 *trap* 函数(一个可响应特定操作的函数)中断  

`Relect` 对象，是一组方法的集合，为一些低级操作提供了默认行为(这些行为可以通过  
proxies 重写)。对于每一个 proxy trap 都有一个 `Relect` 方法与之对应，且这些方法  
和他们的 proxy traps 有一样的名字且传递了一样的参数。  

下表列出了一些默认行为和 proxy trap 的对应关系：  

| proxy trap                | 重写的行为                                                   | 默认行为                             |
| ------------------------- | ------------------------------------------------------------ | ------------------------------------ |
| get [13.3.3](#org38c7be9) | 读取一个对象属性值                                           | `Reflect.get()`                      |
| set [13.3.2](#org999196c) | 设置属性值                                                   | `Reflect.set()`                      |
| has                       | 是否包含                                                     | `Reflect.has()`                      |
| deleteProperty            | `delete obj.name` 删除对象属性操作                           | `Reflect.deleteProperty()`           |
| getPrototypeOf            | `Object.getPrototypeOf()`                                    | `Reflect.getPrototypeOf()`           |
| setPrototypeOf            | `Object.setPrototypeOf()`                                    | `Reflect.setPrototypeOf()`           |
| isExtensible              | `Object.isExtensible()`                                      | `Reflect.isExtensible()`             |
| preventExtensions         | `Object.preventExtensions()`                                 | `Reflect.preventExtensions()`        |
| getOwnPropertyDescriptor  | `Object.getOwnPropertyDescriptor()`                          | `Reflect.getOwnPropertyDescriptor()` |
| defineProperty            | `Object.definePropery()`                                     | `Reflect.definePropery()`            |
| ownKeys                   | `Object.keys()`, `Object.getOwnPropertyNames()`, `Object.getOwnPropertySymbols()` | `Reflect.ownKeys()`                  |
| apply                     | `fn.apply(thisArg, argsArr)`                                 | `Reflect.apply()`                    |
| construct                 | `new Ctor()`                                                 | `Reflect.construct()`                |

每一个 trap 重写了 JavaScript 对象的内置行为，允许中断和修改这些行为。如果依然需  
要用到内置行为，可以使用对应的 reflection api 方法。  

> 原来 ECMAScript 6 规范中有一个叫 `enumerate` 的 trap，被设计用来改变 `for...in`  
> 和 `Object.keys()` 枚举对象属性的行为。但是在 ECMAScript 7 中随即被移除，原因是  
> 实现起来比较困难，因此以后都不会有 `enumerate` 了。  

## 使用 Proxies 和 Reflection

### Proxy 简单应用

使用 `new Proxy(target, handler)` 创建一个 proxy 时候需要传递两个参数：  

-   `target` 需要被代理的那个对象
-   `handler` 一个定义了一个或多个 proxy traps 的对象

proxy 将使用所有操作的默认行为，除非在 `handler` 中定义了对应的 proxy trap。  

```js
let target = {}

let proxy = new Proxy(target, {})

proxy.name = 'proxy'

console.log(proxy.name); // 'proxy'
console.log(target.name); // 'proxy'

target.name = 'target';
console.log(proxy.name); // 'target'
console.log(target.name); // 'target'
```

+RESULTS: target 和 proxy 对象之间互相影响  

    proxy
    proxy
    target
    target

在这个例子上， proxy 代理了 target 对象的所有默认行为(因为传入了一个空的 `{}` 对  
象给 `Proxy()` )。也就是说对 target 和 proxy 对象的所有行为都会在两个对象上有所  
体现，形同操作对方本身一样。  

~~像这个简单的 proxy 例子，代理了 target 但是却没有提供任何 traps，这并没有任何意义~~  

### 用 `set(trapTarget, key, value, receiver)` trap 验证属性<a id="org999196c"></a>

假设你想创建一个属性值必须是数值类型的对象，这意味着每一个新增的属性必须要有一个  
验证机制去确保它是一个数值类型，否则就要抛出异常。  

为了实现这个功能，我们可以使用 proxy 的 `set` trap 去重写赋值的默认行为。  

`set` trap 接受四个参数：  

1.  `trapTarget` 那个被代理的对象 target，也是即将被新增属性的那个对象
2.  `key` 新增属性的 key 值(字符串或符号类型)
3.  `value` 新增属性的值，将要被检测的内容
4.  `receiver` 该操作的目标对象(一般就是 target 的代理实例 proxy)

`set` => 赋值操作 => `Reflect.set()`  

在“[什么是 Proxies 和 Reflection](#org0c2ba4d)”一节就将过 proxy trap 和 reflect 对应的操作函数  
名称和参数都是一模一样的，也就是说 `Reflect.set()` 也将接受 `set` trap 一样的四  
个参数： trapTarget, key, value, receiver 且含义一样。  

`Reflect.set()` 的返回值为 true/false ，成功为 true 失败为 false，且在 `set`  
trap 中也应该要返回一个 boolean 值表示该 trap 是否成功或失败了，一般直接返回  
`Reflect.set()` 的返回值即可。  

```js
let target = {
  name: 'target'
}

let proxy = new Proxy(target, {
  set(trapTarget, key, value, receiver) {
    console.log(trapTarget === target, 'trapTarget is target')

    if (!trapTarget.hasOwnProperty(key)) {
      if (isNaN(value)) {
        throw new TypeError('属性必须是 `number` 类型！')
      }
    }

    return Reflect.set(trapTarget, key, value, receiver)
  }
})


// 添加一个属性
proxy.count = 1
console.log(proxy.count)
console.log(target.count)

proxy.name = 'proxy'
console.log(proxy.name)
console.log(target.name)
```

+RESULTS:  

    true 'trapTarget is target'
    1
    1
    true 'trapTarget is target'
    proxy
    proxy
    undefined

如上面的例子，操作 proxy 就像直接操作 target 一样，所有的操作都能在 target 上面  
有所体现，但是使用 proxy & reflect 和直接操作 target 的好处是，允许我们拦截这一  
底层操作，从而对其进行一些额外的处理。  

### `get(trapTarget, key, receiver)` trap<a id="org38c7be9"></a>

获取对象属性值的操作代理。  

```js
let proxy = new Proxy({}, {
  get(trapTarget, key, receiver) {
    if (!(key in receiver)) {
      throw new TypeError('错误：属性 ' + key + ' 不存在。')
    }

    return Reflect.get(trapTarget, key, receiver)
  }
})


// proxy.name = 'proxy'
try {
  console.log(proxy.name)
} catch (e) {
  console.log(e.message)
}

proxy.name = 'proxy'
console.log(proxy.name)
```

+RESULTS:  

    错误：属性 name 不存在。
    proxy

### `has(trapTarget, key)` trap <a id="org46d3f0c"></a>

-   `trapTarget` 被代理的那个对象(比如： `target`)
-   `key` 被检测的属性的名称

`in` 操作符可以用来检测一个属性是否存在于指定对象或者它的原型上，如果能找到返回 *true*  

```js
let target = {
  value: 42
}

console.log('value' in target)
console.log('toString' in target)
```

+RESULTS:  

    true
    true

`in` 操作符在 Proxy 中对应的是 `has` -> `Reflect.has(trapTarget, key)` 接口。  

```js
let target = {
  name: 'target',
  value: 42
}

let proxy = new Proxy(target, {
  has(trapTarget, key) {
    return key === 'value' ? false : Reflect.has(trapTarget, key)
  }
})

console.log('value' in proxy)
console.log('name' in proxy)
console.log('toString' in proxy)
```

+RESULTS:  

    false
    true
    true

### `deleteProperty(trapTarget, key)` trap 删除对象属性(*delete* 关键词的使用) <a id="orgb519cd2"></a>

`delete` 操作符会将对象中的属性从这个对象中移除，如果成功返回 `true` 否则返回  
`false` ，在严格模式下试图删除一个 *non-configurable* 的属性会报错，非严格模式下  
会返回 `false` 。  

```js
let target = {
  name: 'target',
  value: 42
}

Object.defineProperty(target, 'name', {
  configurable: false
})

console.log('value' in target) // true

let res1 = delete target.value

console.log(res1) // true
console.log('value' in target) // false

let res2 = delete target.name // error 严格模式
console.log(res2, "严格模式")

console.log('name' in target, "删除失败") // true 删除失败
```

通过 proxy 的 `deleteProperty` -> `deleteProperty(trapTarget, key)` 代理 delete  
行为：  

-   `trapTarget` 被代理的对象
-   `key` 被删除的属性名称

```js
let target = {
  name: 'target',
  value: 42
}

let proxy = new Proxy(target, {
  deleteProperty(trapTarget, key) {
    return key === 'value' ? false : Reflect.deleteProperty(trapTarget, key)
  }
})

console.log('value' in proxy)

let res1 = delete proxy.value
console.log(res1)

console.log('value' in proxy, '删除失败') // true, 删除失败

console.log('name' in proxy) // true
console.log(delete proxy.name, 'name' in proxy) // true false
```

+RESULTS:  

    true
    false
    true '删除失败'
    true
    true false

## 原型代理Traps(Prototype Proxy Traps)<a id="org9c538fc"></a>

与原型有关的 traps :  

1.  `getPrototypeOf(trapTarget)` -> `Object.getPrototypeOf(trapTarget)` ->  
    `Reflect.getPrototypeOf(trapTarget)`
2.  `setPrototypeOf(trapTarget, proto)` -> `Object.setPrototypeOf(trapTarget, proto)` ->  
    `Reflect.setPrototypeOf(trapTarget, proto)`

### 原型代理 Traps 工作原理

在使用原型 trap 的时候有一些严格的规定：  

1.  `getPrototypeOf` trap 必须返回一个对象或者 `null` ,如果是其他值就会发生运行时  
    错误
2.  `setPrototypeOf` 在失败的时候必须返回 `false` ，如果不是那么默认会被当做成功  
    处理

```js
let target = {}

let proxy = new Proxy(target, {
  getPrototypeOf(trapTarget) {
    return null
  },
  setPrototypeOf(trapTarget, proto) {
    return false
  }
})

let targetProto = Object.getPrototypeOf(target)
let proxyProto = Object.getPrototypeOf(proxy)

console.log(targetProto === Object.prototype) // true
console.log(proxyProto === Object.prototype) // false
console.log(proxyProto) // null

Object.setPrototypeOf(target, {}) // succeed
try {
  Object.setPrototypeOf(proxy, {}) // error
} catch (error) {
  console.log(error.message)
}
```

+RESULTS:  

    true
    false
    null
    'setPrototypeOf' on proxy: trap returned falsish

使用默认行为(`Reflect.get/setPrototypeOf()`)  

```js
let target = {}

let proxy = new Proxy(target, {
  getPrototypeOf(trapTarget) {
    return Reflect.getPrototypeOf(trapTarget)
  },
  setPrototypeOf(trapTarget, proto) {
    return Reflect.setPrototypeOf(trapTarget, proto)
  }
})

let targetProto = Object.getPrototypeOf(target)
let proxyProto = Object.getPrototypeOf(proxy)

console.log(targetProto === Object.prototype) // true
console.log(proxyProto === Object.prototype) // false
console.log(proxyProto) // null

Object.setPrototypeOf(target, {}) // succeed
try {
  Object.setPrototypeOf(proxy, {}) // error
} catch (error) {
  console.log(error.message)
}

```

+RESULTS:  

    true
    true
    {}

### 为什么有两种方法?(Reflect 和 Object 上都有 get/setPrototypeOf)

**相同点** ：  

最终都是操作的内部属性： `[[GetPrototypeOf] ]` 和 `[[setPrototypeOf] ]`  

**不同点** :  

|           | `getPrototypeOf`         | `setPrototypeOf`                   |
| --------- | ------------------------ | ---------------------------------- |
| `Object`  | 参数会被强转成对应的对象 | 失败抛异常，成功返回 trapTarget    |
| `Reflect` | 参数只能是对象，否则报错 | 失败返回 `false` , 成功返回 `true` |
|           |                          |                                    |

参数不同点：  

```js
let res = Object.getPrototypeOf(1)

console.log(res === Number.prototype) // true

try {
  Reflect.getPrototypeOf(1)
} catch (e) {
  console.log(e.message)
}
```

+RESULTS:  

    true
    Reflect.getPrototypeOf called on non-object

返回值不同点：  

```js
let target1 = {}
let res1 = Object.setPrototypeOf(target1, {})

console.log(res1 === target1) // true

let target2 = {}
let res2 = Reflect.setPrototypeOf(target2, {})
console.log(res2 === target2) // false
console.log(res2) // true
```

+RESULTS:  

    true
    false
    true

## 对象扩展性 Traps(Object Extensibility Traps)<a id="orgfd5f8b6"></a>

在 ECMAScript 5 中新增了两个方法： `Object.preventExtensions()` 和  
`Object.isExtensible()` 用来阻止对象被扩展和检测对象的扩展性，这两个 api 都只  
有一个参数 `trapTarget` 表示作用的对象，返回值都是 `boolean` 前者表示阻止是否  
成功，后者表示对象是否可扩展，在 proxy-reflect 中也有相应的 api 与之对应，且  
参数和返回值均一样。  

`Object.preventExtensions()` 阻止给对象增加属性：  

```js
let target = {
  value: 42
}

let res = Object.isExtensible(target)

target.name = 'xxx'
console.log(res, target) // true

Object.preventExtensions(target)

target.age = '100'

try {
  Object.defineProperty(target, 'height', {
    value: '166'
  })
} catch(e) {
  console.log(e.message)
}
res = Object.isExtensible(target)
console.log(res, target) // false
```

+RESULTS: `age` 并没有被添加, `height` 添加报错  

    true { value: 42, name: 'xxx' }
    Cannot define property height, object is not extensible
    false { value: 42, name: 'xxx' }
    undefined

代理：  

```js
let target = {}

let proxy = new Proxy(target, {
  isExtensible(trapTarget) {
    console.log('is extensible ...')
    return Reflect.isExtensible(trapTarget)
  },

  preventExtensions(trapTarget) {
    console.log('preventing extension')
    return Reflect.preventExtensions(trapTarget)
  }
})


console.log(Object.isExtensible(target), 'before') // true
console.log(Object.isExtensible(proxy), 'before') // true

Object.preventExtensions(proxy)

console.log(Object.isExtensible(target), 'after') // false
console.log(Object.isExtensible(proxy), 'after') // false

```

+RESULTS: 因为使用了 Reflect.xxx 所以作用在 proxy 上的操作也将体现在 target 上  

    true 'before'
    is extensible ...
    true 'before'
    preventing extension
    false 'after'
    is extensible ...
    false 'after'

如果总是允许代理对象能被扩展，只需要在代理的 `preventExtensions` trap 中直接返回  
`false` 就行了，但是并不影响 `target` 除非调用了 `reflect` 。  

Reflect 和 Object 上的区别：  

|           | `isExtensible`               | `preventExtensions`          |
| --------- | ---------------------------- | ---------------------------- |
| `Reflect` | 参数非对象，触发异常         | 参数非对象，触发异常         |
| `Object`  | 参数非对象，总是返回 `false` | 参数非对象，会返回该参数自身 |

```js
let res1 = Object.isExtensible(1)

console.log(res1) // false

try {
  Reflect.isExtensible(1)
} catch(e) {
  console.log(e.message)
}

let res2 = Object.preventExtensions(1)
console.log(res2) // true

try {
  Reflect.preventExtensions(1)
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    false
    Reflect.isExtensible called on non-object
    1
    Reflect.preventExtensions called on non-object

## 属性描述符 Traps(Property Descriptor Traps)<a id="org4910730"></a>

ECMAScript 5 更新中包含了可以通过 `Object.defineProperty(obj, key, descObj)` 自  
定义属性的功能，这让开发者可以自己定义一些特定功能的对象属性，比如：只读、只写、  
或不可枚举等等特性，然后可以通过 `Object.getOwnPropertyDescriptor()` 来获取对象  
属性的描述符对象。  

[Object.defineProperty() 详细使用](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)  

### 属性描述符代理<a id="orgb70d1c1"></a>

在 proxy-reflect 中对应着：  

-   `defineProperty` -> `Reflect.defineProperty(trapTarget, key, descriptor)`
-   `getOwnPropertyDescriptor` -> `Reflect.getOwnPropertyDescriptor(trapTarget, key)`

返回值：  

`defineProperty` 成功返回 `true`, 失败返回 `false`  

`getOwnPropertyDescriptor` 成功返回描述符  

```js
let target = {}

let proxy = new Proxy(target, {
  definePropery(trapTarget, key, descriptor) {
    return Reflect.defineProperty(trapTarget, key, descriptor)
  },

  getOwnPropertyDescriptor(trapTarget, key) {
    return Reflect.getOwnPropertyDescriptor(trapTarget, key)
  }
})

Object.defineProperty(proxy, 'name', {
  value: 'proxy'
})

console.log(proxy.name) // 'proxy'

let descriptor = Object.getOwnPropertyDescriptor(proxy, 'name')

console.log(descriptor.value) // 'proxy'
```

+RESULTS:  

    proxy
    proxy

阻止给对象扩展符号属性：  

```js
let target = {}

let proxy = new Proxy(target, {
  defineProperty(trapTarget, key, descriptor) {
    if (typeof key === 'symbol') {
      return false;
    }

    return Reflect.defineProperty(trapTarget, key, descriptor)
  }
})

Object.defineProperty(proxy, 'name', {
  value: 'proxy'
})

console.log(proxy.name) // 'proxy'
let nameSymbol = Symbol('name');

// error
try {
  Object.defineProperty(proxy, nameSymbol, {
    value: 'symbol-proxy'
  })
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    proxy
    'defineProperty' on proxy: trap returned falsish for property 'Symbol(name)'

因为 `Object.defineProperty()` 返回 `false` 的话会触发异常表示扩展失败。  

如果想要扩展失败隐藏异常，可以在 trap 中不满足条件的时候也让它返回 `true`  

```js
let target = {}

let proxy = new Proxy(target, {
  defineProperty(trapTarget, key, descriptor) {
    if (typeof key === 'symbol') {
      return true;
    }

    return Reflect.defineProperty(trapTarget, key, descriptor)
  }
})

Object.defineProperty(proxy, 'name', {
  value: 'proxy'
})

console.log(proxy.name) // 'proxy'
let nameSymbol = Symbol('name');

// error
Object.defineProperty(proxy, nameSymbol, {
  value: 'symbol-proxy'
})
```

+RESULTS: 运行结果无错误提示，因为 `key === 'symbol'` 条件中依旧返回了 `true`  

    proxy

<div class="org-center">
标准中失败抛异常：  

![img](http://qiniu.ii6g.com/1565166438.png)  
</div>

### 描述符对象约束(Descriptor Object Restrictions)

在[上一节](#orgb70d1c1)中描述了属性描述符代理的使用，在使用过程中对描述符对象的定义有一定的约束  
条件，比如 `defineProperty(trapTarget, key, descriptor)` 第三个参数就并非是完整  
的传入的描述符对象 `Object.defineProperty(obj, key, descObj)` 。  

在 trap 的 `descriptor` 会忽略掉除下面属性以外的属性,  

-   `enumerable`
-   `configurable`
-   `value`
-   `writable`
-   `get`
-   `set`

除了上面 6 个属性之外，其他的属性都会被忽略掉，即使你调用  
`Object.defineProperty` 的时候传入了更多的属性。  

```js
let proxy = new Proxy({}, {
  defineProperty(trapTarget, key, descriptor) {
    console.log(descriptor.value) // 'proxy'
    console.log(descriptor.name) // undefined

    return Reflect.defineProperty(trapTarget, key, descriptor);
  }
})

Object.defineProperty(proxy, 'name', {
  value: 'proxy',
  name: 'custom'
})
```

+RESULTS: 结果显示实际传入的 `{value: 'proxy', name: 'custom'}` 在 trap 中并没有  
`name` 。  

    proxy
    undefined

这是因为 trap 中的 `descriptor` 参数并非是 `{value: 'proxy', name: 'custom'}` 对  
象的引用，而是一个全新的对象，只会包含标准的 6 个属性值，其他的均不会收藏。  

同样， `Reflect.defineProperty()` 也一样会忽略掉非标准的属性。  

在 `getOwnPropertyDescriptor()` 方法中也有此类约束，这个方法要求它的返回值必须是  
`null`, `undefined` 或一个对象，如果是一个对象的时候，就会遵循这个约束，即返回的  
对象中只能包含标准的属性(`enumerable`, `configurable`, `value`, `writable`,  
`get`, `set`)  

```js
let proxy = new Proxy({}, {
  getOwnPropertyDescriptor(trapTarget, key) {
    return {
      name: 'proxy'
    }
  }
})

try {
  let descriptor = Object.getOwnPropertyDescriptor(proxy, 'name')
} catch(e) {
  console.log(e)
}
```

+RESULTS:  

    TypeError: 'getOwnPropertyDescriptor' on proxy: trap reported non-configurability for property 'name' which is either non-existant or configurable in the proxy target

### 重复的描述符方法<a id="org8c34cb8"></a>

与之前描述的一样在 `Object` 和 `Reflect` 都同时有 `defineProperty()` 和  
`getOwnPropertyDescriptor()` 方法，但双方都有一点差异。  

1.  `Object.defineProperty(target)` 返回 `target` 对象
2.  `Reflect.defineProperty(trapTarget, key, descriptor)` 返回 `true` 或 `false`  
    表示成功或失败

```js
let target = {}

let res1 = Object.defineProperty(target, 'name', {
  value: 'target',
  configurable: true
})

console.log(res1 === target) // true

let res2 = Reflect.defineProperty(target, 'name', { value: 'reflect' })

console.log(res2) // true
```

+RESULTS:  

    true
    true

1.  `Object.getOwnPropertyDescriptor(obj, key)` 如果 `obj` 是原始类型会强制转换成  
    对象后再获取描述符对象，没有就返回 `undefined`
2.  `Reflect.getOwnPropertyDescriptor(obj, key)` 和上面的不一样，如果为非对象类型  
    则会触发异常。

```js
let res1 = Object.getOwnPropertyDescriptor(2, 'name')
console.log(res1) // undefined

try {
  let res2 = Reflect.getOwnPropertyDescriptor(2, 'name')
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    undefined
    Reflect.getOwnPropertyDescriptor called on non-object

## `ownKeys` Trap<a id="org59878e2"></a>

ownKeys -> `Reflect.ownKeys(trapTarget)`  

这个 trap 的用途是用来中断 `[[OwnPropertyKeys] ]` 的操作，然后允许在 trap 里面重  
写“返回一个值的数组”的动作。  

有四个内置方法用到这个数组(`ownKeys`)  

-   `Object.keys()`  会过滤掉 `ownKeys` 中的符号类型 key
-   `Object.getOwnPropertyNames()` 会过滤掉 `ownKeys` 中的符号类型 key
-   `Object.getOwnPropertySymbols()` 会过滤掉 `ownKeys` 中的字符串类型 key
-   `Object.assign()` 用 `ownKeys` 来决定哪些属性会被拷贝，字符串和符号 key 都会用  
    到

对应默认行为的 trap 是： `Reflect.ownKeys()` 返回一个所有自身属性的 key，包含符  
号属性。  

接受一个对象参数，且返回数组或类数组对象否则会报错，使用 ownKeys trap 可以让我们  
在对该对象使用诸如 `Object.keys()`, `Object.getOwnPropertyNames()`, 等等这些方法  
的时候去过滤一些我们不想让人获取到的一些属性，比如以下划线开头的内部方法(一般使  
用下划线开头的放表示内部方法)。  

```js
let proxy = new Proxy({}, {
  ownKeys(trapTarget) {
    return Reflect
      .ownKeys(trapTarget)
    // 过滤掉 _xxx() {} 的方法
      .filter(key => typeof key !== 'string' || key[0] !== '_')
  }
})

let nameSymbol = Symbol('name')
proxy.name = 'proxy'
proxy._name = 'private'
proxy[nameSymbol] = 'symbol'

let names = Object.getOwnPropertyNames(proxy), // 会过滤符号key
    keys = Object.keys(proxy), // 会过滤符号 key
    symbols = Object.getOwnPropertySymbols(proxy)

console.log(names.length) // 1
console.log(names[0]) // 'name'

console.log(keys.length) // 1
console.log(keys[0]) // 'name'

console.log(symbols.length) // 1
console.log(symbols[0]) // "Symbol(name)"
```

+RESULTS: 前两个为 1 是因为 `Object.getOwnPropertyNames()` 和 `Object.keys()` 默  
认会过滤掉符号属性。  

    1
    name
    1
    name
    1
    Symbol(name)

> `ownKeys` 对 `for-in` 循环中也有效，它会调用 ownKeys trap 来决定哪些键可以被遍历。  

## 函数代理(apply和construct traps)<a id="org3033f8b"></a>

在所有的 traps 中，只有 `apply` 和 `construct` trap 必须要求 `trapTarget` 是一个  
函数。  

这两个 trap 分别对应 `[[Call] ]` 和 `[[Construct] ]` 低级操作，而这两个内部属性  
对应的是函数的两种调用方式(1. 函数方式调用，2. 通过 `new` 调用)，通过 `apply` 和  
`construct` 这两个 trap 可以拦截这两种调用操作。  

`apply` -> `Reflect.apply(trapTarget, thisArg, argumentsList)`  
`construct` -> `Reflect.construct(trapTarget, argumentsList[, newTarget])`  

1.  `trapTarget` 被代理的那个函数对象
2.  `thisArg` 调用 apply 时指定的作用域对象
3.  `argumentsList` 传递给函数的参数列表
4.  `newTarget` 指向函数内部 `new.target` 的值

示例：  

```js
let target = function() {
  return 42
}

let proxy = new Proxy(target, {
  apply(trapTarget, thisArg, argList) {
    console.log(thisArg, 'applied')
    return Reflect.apply(trapTarget, thisArg, argList)
  },

  construct(trapTarget, argList, newTarget) {
    console.log(newTarget, 'newTarget')
    return Reflect.construct(trapTarget, argList)
  }
})

console.log(typeof proxy) // function
console.log(proxy()) // 42

var ins = new proxy()
console.log(ins instanceof proxy)
console.log(ins instanceof target)

proxy.apply({a:1})
target.apply({a:1})
```

+RESULTS: apply 和 construct 分别代理了函数的两种不用使用方式(`apply` 和 `new`)。  

    function
    undefined 'applied'
    42
    [Function: target] 'newTarget'
    true
    true
    { a: 1 } 'applied'
    undefined

从结果可知 `newTarget` 参数指向的是被代理的那个原始对象 `trapTarget` 。  

下面将介绍如何使用这两个代理做一些事情，比如验证参数或验证函数调用方式。  

### 验证函数参数

检查函数参数的合法性，或限定函数只能以普通方式调用不能通过 `new` 调用。  

```js
function sum(...values) {
  return values.reduce((prev, next) => prev + next, 0)
}

let sumProxy = new Proxy(sum, {
  apply(trapTarget, thisArg, argList) {
    argList.forEach(arg => {
      if (typeof arg !== 'number') {
        throw new TypeError('所有参数必须是数字。')
      }
    })

    return Reflect.apply(trapTarget, thisArg, argList)
  },

  construct(trapTarget, argList) {
    throw new TypeError('这个函数不能被 new 实例化。')
  }
})

console.log(sumProxy(1, 2, 3, 4))

try {
  console.log(sumProxy(1, '2', 3, 4))
} catch(e) {
  console.log(e.message)
}

try {
  let res = new sumProxy()
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    10
    所有参数必须是数字。
    这个函数不能被 new 实例化。

上面例子也可以反过来只允许 `new` 实例化，不能被直接调用。  

### 无 `new` 直接调用构造函数检测

根据 `construct` trap 的第三个可选参数 `newTarget` 这个值指向的是函数的  
`new.target` 值([new.target](#org52daa00))。  

这个值由两种值： 1. 函数调用时值为 `undefined` , 2. `new` 实例化时为当前构造函数  
本身。  

使用 apply 和 construct 两个 trap 结合使用，可以做到让一个函数无 `new` 情况下直  
接调用构造函数就可以实例化：  

```js
function Nums(...values) {
  if (new.target === 'undefined') {
    throw new TypeError('该函数必须通过 `new` 调用。')
  }

  this.values = values
}

let NumsProxy = new Proxy(Nums, {
  apply: function(trapTarget, thisArg, argList) {
    console.log(argList.toString())
    return Reflect.construct(trapTarget, argList)
  }
})

let ins = NumsProxy(1, 2, 3, 4)
console.log(ins.values)
```

+RESULTS:  

    1,2,3,4
    [ 1, 2, 3, 4 ]

### 重写抽象基类(Abstract Base Class)构造函数

让一个类智能被继承，不能被实例化，可以通过构造函数内部的 `new.target` 来检测。  

```js
class AbstractNums {
  constructor(...values) {
    if (new.target === AbstractNums) {
      throw new TypeError('该类不能被实例化，只能被继承。')
    }

    this.values = values
  }
}

class Nums extends AbstractNums {

}

let ins = new Nums(1, 2, 3, 4)
console.log(ins.values.toString())

try {
  new AbstractNums(1, 2, 3, 4)
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    1,2,3,4
    该类不能被实例化，只能被继承。

通过代理实现屏蔽这里的异常，即让 `AbstractNums` 构造函数中的检测失败。  

```js
class AbstractNums {
  construct(...values) {
    if (new.target === AbstractNums) {
      throw new TypeError('该类不能被实例化，只能被继承。')
    }
    this.values = values

    console.log(this.values.toString(), 'this.values')
  }
}

let AbstractNumsProxy = new Proxy(AbstractNums, {
  construct: function(trapTarget, argList) {
    console.log(argList.toString(), 'proxy');
    // 因为第三个参数即  new.target 值，这里第三个参数传递个空函数
    return Reflect.construct(trapTarget, argList, function() {})
  }
})

/// 这里就不会报错了
let ins = new AbstractNumsProxy(1, 2, 3, 4)
console.log(ins.values, 'eee')
```

### 可调用的类的构造函数

类的使用，在代理出现之前是无法直接调用的，因为其内部的 `[[Call] ]` 属性被绑定到  
异常上，只要发生调用就会触发异常。  

但是有了代理之后，我们可以通过代理去实现一个可直接调用的类去创建一个实例，实际上  
还是代理里面去创建了实例。  

```js
class Person {
  constructor(name) {
    this.name = name
  }
}

let PersonProxy = new Proxy(Person, {
  apply: function(trapTarget, thisArg, argList) {
    return new trapTarget(...argList)
  }
})

let me = PersonProxy('xxx')
console.log(me.name) // xxx
console.log(me instanceof Person) // true
console.log(me instanceof PersonProxy) // true
```

+RESULTS:  

    xxx
    true
    true

## 可撤销的代理(Revocable)<a id="org0e4d674"></a>

通常情况下，代理一旦被创建就无法与 `target` 解绑，但是有一些特殊情况，比如代理可  
能不再需要了，需要将其解绑掉。  

在这之前通过 `new Proxy()` 创建的都是不可撤销的代理，如果需要创建可撤销的代理得  
使用 `Proxy.revocable()` 接口。  

参数和 `Proxy()` 一样，需要一个被代理对象和一个代理 traps 对象：  
`Proxy.revocable(target, trapObj)`  

调用之后的返回值是一个包含两个属性的对象：  

1.  `proxy` 一个可被撤销的代理
2.  `revoke` 用来撤销代理的函数

任何时候执行了 `revoke()` 那就表示 `proxy` 不再可用，任意试图去通过 proxy trap  
去中断低级操作的行为都将触发异常，因为 `proxy` 已经被撤销了没法用了。  

```js
let target = {
  name: 'target'
}

let { proxy, revoke } = Proxy.revocable(target, {})

console.log(proxy.name)

revoke();

try {
  console.log(proxy.name)
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    target
    Cannot perform 'get' on a proxy that has been revoked

## 解决数组问题

proxy-reflect 的出现同样赋予了开发者跟踪数组变化的能力，比如数组长度变化可以做一  
些特殊处理。  

对数组的访问和设置，可以使用之前讲过的 get-trap([13.3.3](#org38c7be9)) 和 set-trap([13.3.2](#org999196c))，  
用来监听数组的访问、长度或内容的变化。  

### 监听数组长度的变化

通过数组对象的代理，可以监听数组对象长度或值的变化，从而触发一些自定义的行为。  

```js
const toUnit32 = v => Math.floor(Math.abs(Number(v))) % Math.pow(2, 32)
const isArrayIndex = key => {
  let numericKey = toUnit32(key)
  return String(numericKey) == key && numericKey < (Math.pow(2, 32) - 1)
}

function createArray(length = 0) {
  return new Proxy({ length }, {
    set(trapTarget, key, value) {
      let currLen = Reflect.get(trapTarget, 'length')

      if (isArrayIndex(key)) {
        let numericKey = Number(key)

        if (numericKey >= currLen) {
          Reflect.set(trapTarget, 'length', numericKey + 1)
        }
      }

      return Reflect.set(trapTarget, key, value)
    }
  })
}

let colors = createArray(3)

console.log(colors.length)
colors[0] = 'red'
colors[1] = 'green'
colors[2] = 'blue'

console.log(colors.length)

colors[3] = 'black'

console.log(colors.length)
console.log(colors[3])
```

+RESULTS:  

    3
    3
    4
    black
    undefined

### 删除数组元素<a id="orgab2d3e4"></a>

在以往，要删除数组元素(缩减数组)，可以通过数组长度的设置来达到目的，数组多余的元素会被抛弃掉。  

```js
let nums = [1, 2, 3]
console.log(nums.toString())
nums.length = 1
console.log(nums.toString())
nums.length = 3
console.log(nums.toString())
```

+RESULTS:  

    1,2,3
    1
    1,,

使用代理也可以达到这个目的，并且可以监听数组的变化：  

```js
const toUnit32 = v => Math.floor(Math.abs(Number(v))) % Math.pow(2, 32)
const isArrayIndex = key => {
  let numericKey = toUnit32(key)
  return String(numericKey) == key && numericKey < (Math.pow(2, 32) - 1)
}

function createArray(length = 0) {
  return new Proxy({ length }, {
    set(trapTarget, key, value) {
      let currLen = Reflect.get(trapTarget, 'length')

      if (isArrayIndex(key)) {
        let numericKey = Number(key)
        if (numericKey >= currLen) {
          Reflect.set(trapTarget, 'length', numericKey + 1)
        }
      } else if (key == 'length') {
        if (value < currLen) {
          for (let i = currLen - 1; i >= value; i--) {
            Reflect.deleteProperty(trapTarget, i)
          }
        }
      }

      return Reflect.set(trapTarget, key, value)
    }
  })
}

let colors = createArray(3)

console.log(colors.length)
colors[0] = 'red'
colors[1] = 'green'
colors[2] = 'blue'
colors[3] = 'black'

console.log(colors.length)

colors.length = 2

console.log(colors.length)
console.log(colors[3]) // undefined
console.log(colors[2]) // undefined
console.log(colors[1]) // 'green'
console.log(colors[0]) // 'black'
```

+RESULTS:  

    3
    4
    2
    undefined
    undefined
    green
    red

上面代码中实现了两种变化：  

1.  `key` 为数组下标，即数组元素值的变化，会将长度基于它的索引加 1
2.  `length` 属性值的变化，如果新的长度值小于原有的元素长度，多余的元素会被删除掉

### 实现数组类<a id="orgb50f6a3"></a>

最简单的实现方式是按照普通类定义然后在构造函数中返回一个代理。  

```js
class Thing {
  constructor() {
    return new Proxy(this, {})
  }
}

let myTh = new Thing()
console.log(myTh instanceof Thing) // true
```

返回的 `new Proxy(this, {})` 有两个参数：  

1.  `this` 为 `Thing` 类的实例
2.  `{}` 为 `Thing` 实例的代理 trap 对象

`myTh` 是 `Thing` 实例的代理对象。  

这里的实现和“删除数组元素[13.10.2](#orgab2d3e4)”一节中基本一样，不同点在于 `new
    Proxy()` 在类的构造函数中返回。  

```js
const toUnit32 = v => Math.floor(Math.abs(Number(v))) % Math.pow(2, 32)
const isArrayIndex = key => {
  let numericKey = toUnit32(key)
  return String(numericKey) == key && numericKey < (Math.pow(2, 32) - 1)
}

class MyArray {
  constructor(length = 0) {
    return new Proxy({ length }, {
      set(trapTarget, key, value) {
        let currLen = Reflect.get(trapTarget, 'length')

        if (isArrayIndex(key)) {
          let numericKey = Number(key)
          if (numericKey >= currLen) {
            Reflect.set(trapTarget, 'length', numericKey + 1)
          }
        } else if (key == 'length') {
          if (value < currLen) {
            for (let i = currLen - 1; i >= value; i--) {
              Reflect.deleteProperty(trapTarget, i)
            }
          }
        }

        return Reflect.set(trapTarget, key, value)
      }
    })
  }
}

let colors = new MyArray(3)

console.log(colors.length)
colors[0] = 'red'
colors[1] = 'green'
colors[2] = 'blue'
colors[3] = 'black'

console.log(colors.length)

colors.length = 2

console.log(colors.length)
console.log(colors[3]) // undefined
console.log(colors[2]) // undefined
console.log(colors[1]) // 'green'
console.log(colors[0]) // 'black'

```

+RESULTS:  

    3
    4
    2
    undefined
    undefined
    green
    red

## Proxy 作为原型使用，从而实例共享代理

### 原型 `get` trap

原型代理在使用上有一定的限制，它只能响应原型至上的操作，比如：  

```js
let target = {}

let newTarget = Object.create(new Proxy(target, {
  defineProperty(trapTarget, name, descriptor) {
    // 正常的话这里返回 false 会触发异常
    return false;
  }
}))

Object.defineProperty(newTarget, 'name', {
  value: 'newTarget'
})

console.log(newTarget.name) // 'newTarget'
console.log(newTarget.hasOwnProperty('name')) // true
```

+RESULTS:  

    newTarget
    true

上面的代理并没有响应 `name` 属性增加操作，因为 `new Proxy()` 在  
`Object.create(proxy)` 作为参数传递结果会是新创建对象的原型，也就是说  
`newTarget` 的原型是 `new Proxy()` 的代理，而原型代理是没法响应对象本身的变化。  

但是在有些情况下原型代理还是很有用的，比如获取对象属性操作，因为对象的获取遵循原  
型链查找，如果对象本身找不到该属性就会往上查找原型对象，此时如果原型对象是代理的  
话就可以监听到该属性值的获取操作，从而做出响应。  

```js
let target = {}

let thing = Object.create(new Proxy(target, {
  get(trapTarget, key, receiver) {
    throw new ReferenceError(`${key} doesn't exist.`)
  }
}))

thing.name = 'thing'

console.log(thing.name) // 'thing'

try {
  console.log(thing.unknown) // error
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    thing
    unknown doesn't exist.

给 `thing` 新增了一个 `name` 属性，获取的时候拿到的是该对象本身的 `name` 属性，  
因此正常，但是当获取 `thiing.unknown` 的时候对象本身没找到会到原型上去找，而原型  
是一个代理对象， `get` trap 中阻止了任何原型属性的获取操作，因此报错异常。  

### 原型 `set` trap

对象操作的 `set` 和 `get` 一样首先查找本身，如果没有就往原型查找，因此这里也可以  
通过 `set` trap 去对原型属性的设置操作做一定的响应和拦截。  

```js
let target = {}

let thing = Object.create(new Proxy(target, {
  set(trapTarget, key, value, receiver) {
    console.log('key: ' + key, 'value: ' + value)
    return Reflect.set(trapTarget, key, value, receiver)
  }
}))

console.log(thing.hasOwnProperty('name')) // false

thing.name = 'thing' // 这里会触发 `set` 代理，因为 thing 中没有 `name` 属性
console.log(thing.name) // 'thing'
console.log(thing.hasOwnProperty('name')) // true

thing.name = 'boo' // 这个时候 thing 中已经有 `name` 了，因此不会触发 `set` trap

console.log(thing.name)
```

+RESULTS:  

    false
    key: name value: thing
    thing
    true
    boo

### 原型 `has` trap

`key in obj` 对于 `in` 操作符，它不仅会检测对象本身，还会检查原型链，与其对应的  
proxy-trap 为 `has` trap，即我们可以通过这个 trap 来对 `in` 操作做一定的处理，比  
如让它针对被代理的对象在原型上的查找都失效。  

```js
let target = {}

let thing = Object.create(new Proxy(target, {
  has(trapTarget, key) {
    // return false 让原型的查找失效
    return Reflect.has(trapTarget, key)
  }
}))

console.log('name' in thing) // 触发代理，因为 target 没 name 属性，会去查找原型

thing.name = 'thing'

console.log('name' in thing) // 不会触发
```

+RESULTS:  

    false
    true

### 代理作为原型作用域类上面

类是不能直接使用代理作为原型，因为累的原型属性是 *non-writable* 的，但是我们可以  
通过类的继承来变相实现代理原型.  

构造函数风格的原型代理：  

```js
function NoSuchProperty() {
  // ...
}

NoSuchProperty.prototype = new Proxy({}, {
  get(trapTarget, key, receiver) {
    throw new ReferenceError(`${key} doesn't exist`)
  }
})

let thing = new NoSuchProperty()

try {
  let res = thing.name
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    name doesn't exist

有了上面的 `NoSuchProperty` 构造函数之后，就可以让一个类去继承它，从而让类的原型  
成为代理。  

```js
function NoSuchProperty() {
  // ...
}

NoSuchProperty.prototype = new Proxy({}, {
  get(trapTarget, key, receiver) {
    throw new ReferenceError(`${key} doesn't exist`)
  }
})

class Square extends NoSuchProperty {
  constructor(length, width) {
    super()
    this.length = length
    this.width = width
  }
}

let shape = new Square(2, 6)
let area1 = shape.length * shape.width
console.log(area1)

try {
  // error, no `wdth` property, 会去原型查找
  let area2 = shape.length * shape.wdth
} catch(e) {
  console.log(e.message)
}
```

+RESULTS:  

    12
    wdth doesn't exist

上面的实例中 `new Proxy()` 代理实际上是 `NoSuchProperty` 的原型，而非 `Square`  
的，但是依然有效是因为原型链特征的原因，原型链查找不单单是查找父级对象还会往上一  
直查找原型，直到 `Object.prototype` 结束查找。  

上例中各对象原型间的关系：  

```js
function NoSuchProperty() {
  // ...
}

let proxy = new Proxy({}, {
  get(trapTarget, key, receiver) {
    throw new ReferenceError(`${key} doesn't exist`)
  }
})

NoSuchProperty.prototype = proxy

class Square extends NoSuchProperty {
  constructor(length, width) {
    super()
    this.length = length
    this.width = width
  }
}

let shape = new Square(2, 6)
let shapeProto = Object.getPrototypeOf(shape)
console.log(proxy === shapeProto) // false

let secondLevelProto = Object.getPrototypeOf(shapeProto)

console.log(secondLevelProto === proxy) // true

```

+RESULTS:  

    false
    true

## 小结

`Proxy` : 允许拦截底层操作，给这些操作定义一些非标准的行为，比如监听数组长度变化，  
对象属性的删除操作。  

`Reflect` : 针对每个 proxy trap 执行它们的默认行为，每一个 proxy trap 都有一个相  
对应且同名的 `Reflect` 方法与之对应，如[对应表](#org6bf2c25)。  

`revocable proxy` : 允许解绑的 proxy 。  

原型代理：可以让一个代理成为一个对象的原型，从而可以对该对象的原型的操作进行拦  
截，比如 `get`, `set`, `has` proxy traps。  

# 代码模块化

## 什么是模块？

模块与普通的 *scripts* 使用有很大的不同：  

1.  模块代码默认严格模式运行，并且不能改变
2.  当前模块创建的全局变量只针对于该模块而言，作用域仅限于该模块内
3.  一个模块的 `this` 值为 `undefined`
4.  模块内的代码不允许包含 html 格式的注释
5.  模块内必须有导出，提供给模块外部使用
6.  模块内通过 `import` 可以导入其他模块代码

模块赋予了指定需要的代码导入导出的能力.  

## 基本导出(`export`)

你可以使用 `export` 关键字去将模块内的指定内容导出给其他模块使用，比如：  

```js

// 导出变量
export var color = 'red'
export let name = 'xx'
export const magicNumber = 7

// 导出函数
export function sum(n1, n2) {
  return n1 + n2
}

// 导出类
export class Rect {
  constructor(len, width) {
    this.len = len
    this.width = width
  }
}

function subtract(n1, n2) {
  return n1 - n2
}

function multiply(n1, n2) {
  return n1 * n2
}

// 先定义后导出
export { multiply }
```

1.  变量、函数、类的导出都必须明确指定一个名字，因为外部使用的时候需要通过这个名  
    字去使用
2.  `multiply` 并没有在定义的时候导出，也就是说不需要总是导出定义也可以只导出引用
3.  `subtract` 并没有被导出，就意味着模块外无法访问它，但是模块内部只要满足作用域  
    就可以访问

## 基本导入(`import`)

一旦拥有使用 `exports` 导出的模块了，那么就可以在其他模块通过 `import` 关键词来  
导入这些内容，比如：  

`import { identifier1, identifier2 } from './example.js';`  

可以从 *example.js* (一个文件视为一个模块)，将 `identifier1` 导入。  

模块导入语法导入的变量默认使用的是 `const` 定义的，也就意味着导入之后不能改变变  
量的值。  

但是可以通过 `import { a as b } from './c.js';` 语法来重新定义命令名称。  

导入有多种方式，比如：只导入一个，导入多个，导入全部等等。  

### 导入单个

```js
import { sum } from './example.js'

console.log(sum(1, 2))

// import 导入默认 const 不能改变
sum = 1; // error
```

导入时候的路径必须与使用导入模块的文件路径想匹配，即必须要能找到模块文件的正确路  
径。  

### 导入多个

```js
import { sum, multiply, magicNumber } from './example.js'

console.log(sum(1, magicNumber)) // 8
console.log(multiply(1, 2)); // 2
```

### 导入所有

可以通过  

`import * as example from './example.js';`  

将 *example.js* 模块导出的所有绑定导出到 `example` 对象中，然后可以通过  
`example.sum()` 方式去访问模块中的内容。  

对同一个模块使用多个 `import` 最终模块都会只执行一次，它会在第一次导入的时候就存  
在于内存中等待复用，其他后面的使用的 `import` 语句都只是服用内存中的模块。  

不仅仅一个模块中多次使用 `import` 导入一个模块多次只会执行一次，就是多个模块同时  
多次导入同一个模块也只会在内存中保存一份引用，且所有模块对该模块的导入都只会使用  
这一份引用。  

也就是说在一个应用实例中，单个模块只会有一份，尽管会被多个模块多次导入。  

> 模块语法限制：  
>
> `export` 和 `import` 不能在函数或语句表达式中使用，比如：  
>
> `if (flag) { export flag; }` 语法错误。  
>
> 导出只能在模块的顶级作用域才能使用，函数或块级作用域中不允许使用。  
>
> 同样， `import` 只能在文件顶部执行导入。  

## 重命名导入导出

导出重命名：  

```js

// example.js
function sum(n1, n2) {
  return n1 + n2
}

export { sum as add }

// a.js
import { add } from './example.js'
```

导入重命名：  

```js
// example.js
function sum(n1, n2) {
  return n1 + n2
}

export { sum }

// a.js
import { sum as add } from './example.js'
```

## 模块默认值

导出默认值：  

```js
// example.js
// 导出默认值不需要变量名
export default function(n1, n2) {
  return n1 + n2
}

// 变量名方式
function sum(n1, n2) {
  return n1 + n2
}

export {
  sum as default
}


```

导入默认值：  

```js
// a.js
import sum from './example.js'

console.log(sum(1, 2)); // 3
```

将 *example.js* 中 `export default` 内容导出且赋予名称为 `sum` 。  

混合使用：  

```js
// a.js
export let color = 'red'

export default function(n1, n2) {
  return n1 + n2
}

// b.js
import sum, { color } from './example.js'

console.log(sum(1, 2)); // 3
console.log(color); // 'red'
```

导出默认重命名：  

`import { default as sum, color } from './example.js'`  

## 导入之后导出

即从一个模块导出一个内容，然后在当前模块中又将这个内容导出。  

```js
import { sum } from './a.js'

export { sum }

// 简写
export { sum } from './a.js'

// 导入-导出-重命名
export { sum as add } from './a.js'

// 导入所有导出所有
export * from './a.js'
```

## 无导出的模块导入

即被导入的模块中并没有要导出的内容，这个时候只需要导入这个模块并且执行它即可。  

```js
// a.js
Array.prototype.pushAll = function(items) {
  // ...
}

// b.js
import './a.js'

let colors = ['red', 'green', 'blue']
let items = []

items.pushAll(colors)
```

上面的代码会将 *a.js* 的内容直接在 *b.js* 中导入执行，这样 `Array` 上有了  
`pushAll` 方法。  

> 无导出的模块通常用来创建 polyfills 和 shims，模块代码只希望导入时立即执行。  

## 加载模块

### 浏览器中使用模块

ECMAScript 6中虽然定义了模块语法，但并没有定义如何去加载他们。  

1.  通过 `<script>` 标签的 `src` 属性加载一个脚本文件执行里面的代码
2.  通过嵌入 `<script>` 标签，在标签里面直接书写 js 代码
3.  加载 js 代码放到一个 `worker` 里面执行

为了完全支持模块，浏览器不得不更新这些机制。  

`script`标签中使用模块，`script` 标签的默认行为是当 `type` 属性不指定或指定为一个 JavaScript 脚本类型的时  
候(比如： `text/javascript`)，会加载一个 JavaScript 作为脚本去执行它而非模块。  

script 标签会执行 `src` 加载的文件内的代码或者 `<script>` 与 `</script>` 之间的  
代码。  

为了支持模块， `type` 类型新增了一个 `"module"` 类型值，通过设置 `type="module"`  
告诉浏览器，该脚本包含的是一个模块代码。  

```html
<script type="module" src="module.js"></script>

<script type="module">
  import { sum } from './example.js';
  var result = sum(1,2);
</script>
```

第一个 `<script>` 标签加载了一个 `src` 指定的外部文件，唯一不同的是指定的类型为  
`"module"` 。  

第二个 `<scrpt>` 标签直接嵌入了一段代码通过 `import` 导入了一个外部脚本文件，因  
此 `result` 变量不会被加入到 `window` 对象上去，因为它只在这个 `<script>` 模块中  
生效。  

测试实例：  

```html
<!DOCTYPE html>
<html>
  <head>
    <title></title>
    <meta charset="utf-8">
  </head>
  <body>
    <h1>a.html</h1>
    <script src="./a.js" type="module"></script>
    <script>
      var globalResult = 1000;
    </script>
    <script type="module">
      import { sum } from './a.js';
      var result = sum(1,2);
      console.log('module result 1', result);
    </script>
    <script>
      console.log('global result', window.globalResult);
      console.log('module result 2', window.result); // undefined
    </script>
  </body>
</html>
```

chrome 浏览器执行结果：  

![img](http://qiniu.ii6g.com/1565600666.png)  

从结果所示：  

1.  `type='module'` 的 `script` 最后被加载执行，因为其默认应用了 `defer` 属性
2.  模块内部的变量不会添加到 `window` 对象上

### Web浏览器中的模块加载序列

`<script type="module">` 的标签默认应用了 `defer` 属性，意味着它会被下载但不会被  
立即执行，只有当 DOM 被完全解析完成之后才会被执行，多个模块的时候会按照它们在  
DOM 结构中的顺序来执行，不区分是 `src` 引入模块文件还是直接嵌入代码方式。  

```html
<body>
  <h1>a.html</h1>
  <script src="./a.js" type="module"></script>
  <script>
    var globalResult = 1000;
  </script>
  <script type="module">
    import { sum } from './a.js';
    var result = sum(1,2);
    console.log('module result 1', result);
    const testEl1 = document.getElementById('test');
    console.log(testEl1, 'test el 1');
  </script>
  <script>
    console.log('global result', window.globalResult);
    console.log('module result 2', window.result); // undefined
    const testEl2 = document.getElementById('test');
    console.log(testEl2, 'test el 2');
  </script>
  <div id="test"></div>
</body>
```

结果：  

![img](http://qiniu.ii6g.com/1565683852.png)  

可以看到在普通的 `script` 标签中 'test el 2' 结果是 `undefined` 因为这个时候  
*div#test* 并没有并创建，因为它在所有的 `script` 之后。  

但是 'test el 1' 得到了正确的结果能获取到 *div#test* 元素，这恰恰说明了类型为  
'module' 的 `script` 标签在 DOM 解析完成之后执行。  

> 多个 `script#module` 标签，会同步下载文件以及每个 `script` 里面的 `import` 的文  
> 件，但是不会立即执行，只有当 document 解析完成之后才会去执行它们，执行顺序为先  
> script 后 script 中的 import, 然后下一个 script 及其里面的 import，如此知道执行  
> 完成。  

### 浏览器中的异步模块加载

`<script type="module" async src="module1.js"></script>`  

`async` 表示 *module1.js* 一旦下载完成就会被立即执行，且不影响其他脚本的下载和执  
行，哪个下载完成谁就先执行。  

### Worker 加载模块

我们都知道 JavaScript 是单线程的，但是有时候我们又需要做一些繁琐的工作，却不希望  
影响到主线程的运行，这个时候就可以用到 `Worker` 它相当于重新起了一个线程给指定的  
脚本去执行，并且不会阻塞主线程，还提供了与之通信的接口。  

脚本 Worker : `new Worker('script.js');`  

模块 Worker : `new Worker('module.js', { type: 'module' });`  

模块和脚本 `Worker` 差异：  

1.  脚本 Worker 只能加载同源脚本文件，即不支持跨域，但是模块 Worker 没有找个限制
2.  脚本 Worker 可以使用 `self.importScripts()` 方法去加载其他的脚本，而在模块  
    Worker 中只能使用 `import` 去加载其他脚本文件

### 加载文件路径限制

在模块引入的时候的路径只能是 `/`, `./`, `../` 这种相对路径或者直接是包含域名的绝  
对路径，比如： *<http://x.x.x.x/path/to/file.js>* (需要配置 CORS 允许跨域访问)。  

其他情况不被允许，比如：  

`import { first } from 'a.js';` // error  

`import { second } from 'path/a.js';` // error  

上面两种都不会被浏览器下载，因为模块文件的路径不合法，尽管在 `script` 的 `src`  
属性值中可以这么使用，这也是 `script` 和 `import` 的一个区别。  

# 异常处理

## try&#x2026;catch 简写<sup>2019</sup>

`try {} catch {}` 现在可以省略 `catch(e)` ，直接将 `catch` 变成一个关键字。  

# 附录 A： 更小的变更

## Integers 整型数据

JavaScript 使用了 IEEE 754 编码系统来表示整型和浮点数，这在以往引起不少困惑。  

ECMAScript 6 中与数值有关的更新让整型的表示和使用更加便利。  

### Number.isInteger()

判断数值是否是整型数值：  

```js
const isInt = v => Number.isInteger(v)

console.log(isInt('1'))
console.log(isInt(1))
console.log(isInt(1.0))
console.log(isInt(1.8))
console.log(isInt(''))
console.log(isInt('a'))
```

+RESULTS:  

    false
    true
    true
    false
    false
    false

`1.0` 会被当做整型值 `1` 存储，因此这里得到的结果是 `true` ,  
`Number.isInteger()` 如果遇到数值型数据，在判断的时候会依据这些数值型数据在内存  
中的存储形式来决定最终结果(浮点、整型存储方式是不一样的)。  

### 安全整型值

IEEE754 的安全整型值范围为： -2<sup>53</sup> ~ 2<sup>53</sup>，超出这个范围的值都被视为非安全数  
值。  

```js
console.log(Math.pow(2, 53))
console.log(Math.pow(2, 53) + 1)
```

+RESULTS:  

    9007199254740992
    9007199254740992

第二个 `+1` 之后超出了范围，得的结果相当于没有执行加法操作的结果值。  

`Number.isSafeInteger()` 检测是否是安全整型值。  

`Number.MAX_SAFE_INTEGER` 得到当前机器上的最大安全整型值。  

`Number.MIN_SAFE_INTEGER` 得到当前机器上的最小安全整型值。  

```js
var inside = Number.MAX_SAFE_INTEGER,
    outside = inside + 1

console.log(Number.isInteger(inside)) // true
console.log(Number.isSafeInteger(inside)) // true

console.log(Number.isInteger(outside)) // true
console.log(Number.isSafeInteger(outside)) // false
```

+RESULTS:  

    true
    true
    true
    false

## 新 Math 方法

| 方法名                  | 功能                   |
| ----------------------- | ---------------------- |
| `Math.acosh(x)`         |                        |
| `Math.asinh(x)`         |                        |
| `Math.atanh(x)`         |                        |
| `Math.cbrt(x)`          |                        |
| `Math.clz32(x)`         |                        |
| `Math.cosh(x)`          |                        |
| `Math.expm1(x)`         |                        |
| `Math.fround(x)`        | x 最近的单精度浮点数   |
| `Math.hypot(...values)` | 参数列表平方和的平方根 |
| `Math.imul(x, y)`       |                        |
| `Math.log1p(x)`         | 1 + x 的自然对数       |
| `Math.log10(x)`         | 10 为底 x 的对数       |
| `Math.log2(x)`          | 2 为底 x 的对数        |
| `Math.sign(x)`          | 检查数值符号           |
|                         | -1 : x 负数            |
|                         | 0 : x 为 +0 或 -0      |
|                         | 1 : x 正数             |
| `Math.sigh(x)`          | x 的双曲正弦           |
| `Math.tanh(x)`          | x 的双曲正切           |
| `Math.trunc(x)`         | 浮点数取整             |

```js
console.log(Math.acosh(30), 'cos')
console.log(Math.sinh(1), 'sinh')
console.log(Math.tanh(30), 'tanh')
console.log(Math.trunc(30.112), 'trunc') // 30
```

## Unicode 标识符

用 Unicode 标识符做变量名称：  

```js
var \u0061 = 'abc'

console.log(\u0061)

// 等价于
console.log(a)
```

+RESULTS:  

    abc
    abc

## 正规化 `__proto__` 属性

# 附录 B：理解 ECMAScript 7 (2016)

为了更好的记录规范，最终将采用版本号+年份方式来记录，比如  

ECMAScript 6 为 ECMAScript 2015，表示 2015 年发布的标准。  

ECMAScript 7 为 ECMAScript 2016，表示 2016 年发布的标准  

ECMAScript 7 发布与 2016年3月，它值包好了三个新增内容：  

1.  `**` 幂运算操作符，等同于 `Math.pow(x, y)` 方法
2.  `Array.prototype.includes()` 方法，用来检测数组是否包含某个元素，返回  
    `true/false`
3.  支持函数域的严格模式

## `**` 幂运算操作符

```js
let res = 5 ** 2

console.log(res) // 25
console.log(res === Math.pow(5, 2)) // true
```

+RESULTS:  

    25
    true

**优先级** : 高于所有的二元元算法，低于一元运算符。  

```js
let res = 2 * 5 ** 2;

// ** 高于 *
console.log(res) // 50

console.log(5 ** -2) // 0.04

```

+RESULTS:  

    50
    0.04

但是不允许一元运算符出现在 `**` 的左侧，因为这样就没法判定哪个优先级更高，容易造  
成混淆，如果非要使用就必须使用 `()` 括起来。  

```js
let res1 = -(5 ** 2) // -25
let res2 = (-5) ** 2 // 25

console.log(res1, res2)
```

+RESULTS:  

    -25 25

`++` 和 `--` 在 `**` 中表达式中的使用：  

```js
let n1 = 2,
    n2 = 2


console.log(++n1 ** 2) // 9
console.log(n1) // 3

console.log(n2-- ** 2) // 4
console.log(n2) // 1
```

+RESULTS:  

    9
    3
    4
    1

但是不允许直接在数字上使用 `++` 和 `--`  

```js
let res = ++5 ** 2
console.log(res)
```

+RESULTS:  

    ReferenceError: Invalid left-hand side expression in prefix operation

## `Array.prototype.includes(val[, startIdx])`

[includes 内部实现伪码。](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)  

查找 `val` 是否在数组中， `startIdx` 指定查找的其实索引，找到返回 `true` 否则返  
回 `false` 。  

`includes()` 会将 `NaN` 视为同一个值，也就是说在比较的时候 `NaN` 和 `NaN` 比较的  
结果是真值，而 `indexOf()` 中使用的是 `===` 判断， `NaN === NaN` 结果是 `false`  

所以使用 `includes()` 更合理更安全，如果不需要被查找元素的索引值的话。  

```js
let vals = [1, NaN, 2]

console.log(vals.indexOf(NaN))
console.log(vals.includes(NaN))
```

+RESULTS:  

    -1
    true

实现内部对于零值的比较实用的是抽象操作 [SameValueZero](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)内中对 `NaN` 的判断并非是等  
式判断而是通过 `isNaN()` 方式的判断，对于零值有正负零值的判断(`1/0 ===
   Infinity`, `1/-0 === Infinity`)，更多详情请查看[实现伪码](https://blog.ii6g.com/2019/07/08/ecma_pseudo_code/)。  

## 函数域的严格模式

即可以在函数顶部使用 `"use strict";` 来指定当前函数执行模式为严格模式，不影响函  
数外的代码。  

# 相关链接

-   [new-es2018-features-every-javascript-developer-should-know](https://css-tricks.com/new-es2018-features-every-javascript-developer-should-know/)

# 新增内容列表

## Object 和 Reflect 重复函数比较

|                                      | `Object`         | `Reflect`            |
| ------------------------------------ | ---------------- | -------------------- |
| `getOwnPropertyDescriptor(obj, key)` | obj 原始类型强转 | obj 原始类型会抛异常 |

## 代理和映射<a id="org6bf2c25"></a>

| Proxy Traps                                            | Reflect Apis                                         | 原生功能                         | 描述                                              |
| ------------------------------------------------------ | ---------------------------------------------------- | -------------------------------- | ------------------------------------------------- |
| `get` [13.3.3](#org38c7be9)                            | `Reflect.get(trapTarget, key, receiver)`             | 对象属性读取                     | 访问对象属性的时候触发                            |
| `set` [13.3.2](#org999196c)                            | `Reflect.set(trapTarget, key, value, receiver)`      | 对象属性赋值操作                 | 改变对象属性的值时触发                            |
| `has` [13.3.4](#org46d3f0c)                            | `Reflect.has(trapTarget, key)`                       | `key in obj`                     | 检测存在性                                        |
| `deleteProperty` [13.3.5](#orgb519cd2)                 | `Reflect.deleteProperty(trapTarget, key)`            | `delete obj.name`                | 删除属性                                          |
| `getPrototypeOf` [13.4](#org9c538fc)                   | `Reflect.getPrototypeOf(trapTarget)`                 | 获取对象原型                     | `Object.getPrototypeOf()`                         |
| `setPrototypeOf` [13.4](#org9c538fc)                   | `Reflect.setPrototypeOf(trapTarget, proto)`          | 设置对象原型                     | `Object.setPrototypeOf()`                         |
| `isExtensible` [13.5](#orgfd5f8b6)                     | `Reflect.isExtensible(trapTarget)`                   | 扩展性                           | `Object.isExtensible()`                           |
| `preventExtensions` [13.5](#orgfd5f8b6)                | `Reflect.preventExtensions(trapTarget)`              | 扩展对象                         | `Object.preventExtensions()`                      |
| `definePropery` [13.6.3](#org8c34cb8)                  | `Reflect.definePropery(trapTarget, key, descriptor)` | 属性描述符代理                   | `Object.defineProperty(obj, key, desc)`           |
| `getOwnPropertyDescriptor`  [13.6.3](#org8c34cb8)      | `Reflect.getOwnPropertyDescriptor(trapTarget, key)`  | 获取属性描述符对象               | `Object.getOwnPropertyDescriptor(trapTarget, key` |
| `ownKeys` [13.7](#org59878e2)                          | `Reflect.ownKeys(trapTarget)`                        | 返回自身属性                     | `Object.keys()`, `Object.getOwnPropertyNames()`   |
|                                                        |                                                      | `Object.keys()`                  | 不包含符号属性                                    |
|                                                        |                                                      | `=Object.getOwnPropertyNames()=` | 不包含符号属性                                    |
|                                                        |                                                      | `Object.getOwnPropertySymbols()` | 不包含符号属性                                    |
|                                                        |                                                      | `Object.assign()`                | 包含符号属性                                      |
| `apply`  [13.8](#org3033f8b)                           | `Reflect.apply(trapTarget, thisArg, argumentsList)`  | 函数的调用                       | -                                                 |
| `construct` [13.8](#org3033f8b)                        | `Reflect.construct(trapTarget, argList[, newTarget]` | 函数实例化(`new`)                | -                                                 |
| `Proxy.revocable(target, trapObj)` [13.9](#org0e4d674) | -                                                    | 可撤销的代理                     | 返回代理实例和 `revoke()` 撤销函数                |
|                                                        |                                                      |                                  |                                                   |

表中参数说明：  

| 参数名       | 类型     | 说明               |
| ------------ | -------- | ------------------ |
| `trapTarget` | `Object` | 被代理的对象       |
| `key`        | -        | 要操作的对象属性名 |
| `value`      | -        | 对象属性值         |
| `receiver`   | `Proxy`  | 代理对象           |

## 符号

| 符号方法                    | 类型          | JavaScript 特性                               | 描述                                                         |
| --------------------------- | ------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `Symbol.hasInstance`        | `boolean`     | `instanceof`                                  | [7.7.1](#org7e71710) 实例(原型链)检测                        |
| `Symbol.isConcatSpreadable` | `boolean`     | `Array.prototype.concat`                      | [7.7.2](#org67eb564) 检测参数合法性                          |
| `Symbol.iterator`           | `function`    | 调用后得到迭代器                              | 遍历对象或数组(等可迭代的对象)的时候会用到                   |
| `Symbol.asyncIterator`      | `function`    | 调用后得到异步迭代器(返回一个 `Promise` )     | 遍历对象或数组(等可迭代的对象)的时候会用到                   |
| `Symbol.match`              | `function`    | `String.prototype.match`                      | [7.7.3](#org139fb83) 正则表达式对象内部属性                  |
| `Symbol.matchAll`           | `function`    | `String.prototype.matchAll`                   | [7.7.3](#org139fb83) 正则表达式对象内部属性                  |
| `Symbol.replace`            | `function`    | `String.prototype.replace`                    | [7.7.3](#org139fb83) 正则表达式对象内部属性                  |
| `Symbol.search`             | `function`    | `String.prototype.search`                     | [7.7.3](#org139fb83) 正则表达式对象内部属性                  |
| `Symbol.split`              | `function`    | `String.prototype.split`                      | [7.7.3](#org139fb83) 正则表达式对象内部属性                  |
| `Symbol.species`            | `constructor` | `new this.constructor[Symbol.species](value)` | [symbol-species](#orga2051c7) 返回构造函数，类内部使用，不能构造函数调用 |
| `Symbol.toPrimitive`        | `function`    | -                                             | [7.7.4](#orgae3ed38) 返回一个对象的原始值                    |
| `Symbol.toStringTag`        | `string`      | `Object.prototype.toString()`                 | [7.7.5](#orgc7b5259) 返回一个对象的字符串描述                |
| `Symbol.unscopables`        | `object`      | `with`                                        | [7.7.8](#orgf7af38d) 不能出现在 `with` 语句中的一个对象      |

## 函数

| 分类     | 函数名                                             | 描述                                                         | 其他                                                         |
| -------- | -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| Promise  | `Promise.all(iterable)`                            | 所有的 promise resolved                                      |                                                              |
|          | `Promise.race(iterable)`                           | 只要有一个 promise settled 那么 race 立即 settled(无论是 rejected 还是 fulfilled) |                                                              |
| Array    | `Array.of(...items)`                               | 将参数了列表中的值组合成数组                                 | 和构造函数不一样，该方法会将参数只当做元素处理，而不会像 `Array()` 传一个参数当做长度处理。 |
|          | `Array.from(items[, mapFn[, thisArg]])`            | 将满足条件的对象转成数组                                     | 条件：1. 必须有长度属性，2. 要有数值索引元素。可迭代的对象会直接访问迭代器。 |
|          | `Array.prototype.find(mapFn[, thisArg])`           | 查找 mapFn 返回 true 条件的元素，返回该元素值                | -                                                            |
|          | `Array.prototype.findIndex(mapFn[, thisArg])`      | 查找 mapFn 返回 true 条件的元素，返回该元素索引              | -                                                            |
|          | `Array.prototype.fill(value[, start[, end]])`      | 用 value 替换区间 [start, end) 之间的元素值                  | 返回值是原数组(元素被替换之后的)                             |
|          | `Array.prototype.copyWithin(target, start[, end])` | 拷贝区间 [start, end) 的元素替换 [target, len) 区间的元素    | 实际替换的区间长度由 min(end - start, len - target) 决定。   |
| Function |                                                    |                                                              |                                                              |
| Object   | `Object.is(v1, v2)`                                | v1 是否是 v2                                                 | 弥补 `===` 不能判断 +0，-0 和 NaN，NaN                       |
|          | `Object.assign(target, ...sources)`                | 合并对象，浅拷贝，赋值运算                                   |                                                              |
|          | `Object.getPrototypeOf(obj)`                       | 取原型对象                                                   |                                                              |
|          | `Object.setPrototypeOf(obj, protoObj)`             | 设置原型对象                                                 |                                                              |
|          | `Object.getOwnPropertySymbols(obj)`                | 获取对象所有符号属性                                         | `Object.keys`, `Object.getOwnPropertyNames` 不能取符号属性   |
|          | `Object.getOwnPropertyDescriptor(obj, key)`        | 获取对象的描述符对象                                         |                                                              |
|          | `Object.preventExtensions()`                       | 阻止对象呗扩展                                               | -                                                            |
|          | `Object.isExtensible()`                            | 对象是否可被扩展                                             | -                                                            |
| String   | `str.codePointAt(n)`                               | Unicode编码值                                                | str.charCodeAt(n)                                            |
|          | `str.fromCodePoint(s)`                             | 根据编码转字符                                               | str.fromCharCode(s)                                          |
|          | `str.normalize()`                                  | 将字符的不同表示方式统一成一种表示形式                       | undefined, "NFC", "NFD", "NFKC", or "NFKD"                   |
|          | `str.repeat(n)`                                    | 将字符串重复 n 遍，作为新字符串返回                          | 'x'.repeat(3) => 'xxx'                                       |
