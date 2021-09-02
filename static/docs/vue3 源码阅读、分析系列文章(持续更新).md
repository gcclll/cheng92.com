**持续更新中！！！！**

> 声明：
> 1. 以下所有文章，均为原创，是在阅读(抄)源码过程中的点滴记录，文笔有限，只是个人记录，分享出来希望有所用处。
> 2. 抄写的仓库：[https://github.com/gcclll/stb-vue-next.git](https://github.com/gcclll/stb-vue-next.git) 该仓库为学习时，从 0 开始，vue-next 的第一个 commit 开始抄下来的源码仓库，目前学习目的已达，所以不再更新了，到停便时通过了所有有关的官方用例。
> 3. 所有流程图，脑图链接：[https://github.com/gcclll/cheng92.com/tree/master/public/img/vue3](https://github.com/gcclll/cheng92.com/tree/master/public/img/vue3)  且可直接通过  [https://www.cheng92.com/img/vue3/ + 文件名直接访问](https://www.cheng92.com/img/vue3/reactivity/reactivity.svg), 图绝大部分是 svg 格式，建议新标签页打开很清楚，因为用的是 drawer.io 画的。
> 4. vue3 及其生态有关的会持续更新，学无止境，互勉！！！
> 5. 更多可进入本人博客 [https://www.cheng92.com/vue/](https://www.cheng92.com/vue/) ，水平有限(前端白菜一枚，若有幸得访还请轻踩轻喷，感激不尽!!)

## vue-next 每次大更新记录、分析
- [Vue3 更新日志 01(3.0.5 ~ 3.1.5)](https://www.cheng92.com/vue/vue-update-log-01/)
- [Vue3 更新日志 02 - 3.2.x](https://www.cheng92.com/vue/vue-update-log-02-320/)

## vue-next 单个功能，特性源码分析
- [ Vue3 功能拆解① PatchFlags](https://www.cheng92.com/vue/vue-teardown-1-patch-flags/)
- [Vue3 功能拆解② Scheduler 渲染机制](https://www.cheng92.com/vue/vue-teardown-2-sheduler/)
- [Vue3 功能拆解③ 组件更新机制](https://www.cheng92.com/vue/vue-teardown-3-update-flow/)
- [Vue3 功能拆解④ 组件 props & attrs](https://www.cheng92.com/vue/vue-teardown-4-props-attrs/)
- [Vue3 功能拆解⑤ directives 指令系统](https://www.cheng92.com/vue/vue-teardown-5-directives/)
- [Vue3 功能拆解⑥ directives 事件绑定机制](https://www.cheng92.com/vue/vue-teardown-6-event-listen/)
- [Vue3 功能拆解⑦ assets url 转换规则](https://www.cheng92.com/vue/vue-teardown-7-asset-transform/)
- [Vue3 功能拆解⑧ script setup 来龙去脉](https://www.cheng92.com/vue/vue-teardown-8-script-setup/)
- [Vue3 功能拆解⑨ Transition 组件机制](https://www.cheng92.com/vue/vue-teardown-9-transition/)
- [Vue3 功能拆解⑩ SFC style](https://www.cheng92.com/vue/vue-teardown-10-sfc-style/)
- [Vue3 功能拆解⑪ expose options&api](https://www.cheng92.com/vue/vue-teardown-11-expose/)
- [Vue3 功能拆解⑫ 组件选项处理 options(如：methods, data, ...)](https://www.cheng92.com/vue/vue-teardown-12-options/)
- [Vue3 功能拆解⑬ style v-deep, v-slotted](https://www.cheng92.com/vue/vue-teardown-13-v-deep-in-style/)
- [Vue3 功能拆解⑭ AST Node Types 各种节点类型详解](https://www.cheng92.com/vue/vue-teardown-14-ast-node-types/)
- [Vue3 功能拆解⑮ effect scope](https://www.cheng92.com/vue/vue-teardown-15-effect-scope/)

## vue-next 源码阅读(含脑图，流程图)
- [Vue3 源码头脑风暴之 1 ☞reactivity](https://www.cheng92.com/vue/vue-mind-map-reactivity/)
- [Vue3 源码头脑风暴之 2 ☞compiler-core - ast parser](https://www.cheng92.com/vue/vue-mind-map-compiler-core-parser/)
- [ Vue3 源码头脑风暴之 3 ☞compiler-core - transform + codegen](https://www.cheng92.com/vue/vue-mind-map-compiler-core-transform-generate/)
- [Vue3 源码头脑风暴之 4 ☞compiler-dom](https://www.cheng92.com/vue/vue-mind-map-compiler-dom/)
- [Vue3 源码头脑风暴之 5 ☞ compiler-sfc](https://www.cheng92.com/vue/vue-mind-map-compiler-sfc/)
- [ Vue3 源码头脑风暴之 6 ☞compiler-ssr](https://www.cheng92.com/vue/vue-mind-map-compiler-ssr/)
- [Vue3 源码头脑风暴之 7 ☞ runtime-core(1)](https://www.cheng92.com/vue/vue-mind-map-runtime-core-1/)
- [Vue3 源码头脑风暴之 7 ☞ runtime-core(2) - render](https://www.cheng92.com/vue/vue-mind-map-runtime-core-2-render/)
- [Vue3 源码头脑风暴之 7 ☞ runtime-core(3) - render component](https://www.cheng92.com/vue/vue-mind-map-runtime-core-3-component/)
- [Vue3 源码头脑风暴之 8 ☞ runtime-dom](https://www.cheng92.com/vue/vue-mind-map-runtime-dom/)
- [Vue3 源码头脑风暴之 9 ☞ server-renderer](https://www.cheng92.com/vue/vue-mind-map-server-renderer/)

## vue-next 源码阅读(不含脑图系列(已停更))
 - [Vue3.0源码系列（一）响应式原理 - Reactivity](https://www.cheng92.com/vue/vue3-source-code-reactivity/)
 - [Vue3.0 源码系列（二）编译器核心 - Compiler core 1: parse.ts](https://www.cheng92.com/vue/vue3-source-code-compiler-core-parse_ts/)
 - [Vue3.0 源码系列（二）编译器核心 - Compiler core 2: ast.ts](https://www.cheng92.com/vue/vue3-source-code-compiler-core-ast_ts/)
 - [Vue3.0 源码系列（二）编译器核心 - Compiler core 3: compile.ts](https://www.cheng92.com/vue/vue3-source-code-compiler-core-compile_ts/)
 
## vue-next 周边源码阅读(含脑图，流程图)
> 这部分均是在研究 vue-next 源码时候，顺带着做了点浅显的研究
- [vuex for vue3 源码分析(附.脑图)](https://www.cheng92.com/vue/vue-vuex/)
- [vue-router-next for vue3 源码分析(附.脑图)](https://www.cheng92.com/vue/vue-router-next/)
- [Vue3 -> Vite 脚手架](https://www.cheng92.com/vue/vue-vite/)
- [Vue Vuex Persist Store(数据持久化) - 简化版](https://www.cheng92.com/vue/vue-vuex-persist/)

## 其它相关文章
 - [Vue3 自问自答系列❓❓❓](https://www.cheng92.com/vue/vue-core-code-link/)
 - [ Vue3.0源码系列 -- 知识点及问题汇总](https://www.cheng92.com/vue/vue3-source-picking-shell/)
 - 
