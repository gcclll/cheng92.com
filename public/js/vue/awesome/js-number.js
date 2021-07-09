(function() {
  const { createApp, h } = Vue;

  let plans = [
    {
      name: "Numeral-js",
      user: "adamwdraper",
      brief: `A javascript library for formatting and manipulating numbers.`,
      zhBrief: `格式化数字，数字运算`,
      site: `http://numeraljs.com/`,
    },
    {
      name: "number-precision",
      user: "nefe",
      brief: `🚀1K tiny & fast lib for doing addition, subtraction, multiplication and division operations precisely`,
      zhBrief: `1k，小且快的数字加减乘数运算的库`,
    },
    {
      name: "bignumber.js",
      user: "MikeMcl",
      brief: `A JavaScript library for arbitrary - precision decimal and non - decimal arithmetic`,
      zhBrief: `一个JavaScript库，用于任意精度的十进制和非十进制算术`,
      site: `https://mikemcl.github.io/bignumber.js/`,
    },
    {
      name: "decimal.js",
      user: "MikeMcl",
      brief: "An arbitrary-precision Decimal type for JavaScript",
      zhBrief: `JavaScript的任意精度的十进制类型`,
      site: `http://mikemcl.github.io/decimal.js/`,
    },
    {
      name: "big.js",
      user: "MikeMcl",
      brief:
        "A small, fast JavaScript library for arbitrary-precision decimal arithmetic.",
      zhBrief: `一个小型，快速的JavaScript库，用于任意精度的十进制算术运算。`,
      site: `http://mikemcl.github.io/big.js/`,
    },
    {
      name: "chancejs",
      brief: "Chance - Random generator helper for JavaScript",
      zhBrief: `JavaScript的随机结果生成器(支持各种类型的数据随机值)`,
      site: `https://chancejs.com/`,
    },
    {
      name: "odometer",
      user: "HubSpot",
      brief: "Smoothly transitions numbers with ease. #hubspot-open-source",
      zhBrief: `数字平滑增加动画的库，结合 CSS 实现`,
      preview: "/img/gifs/number-smooth-transition.gif",
      site: `https://github.hubspot.com/odometer/docs/welcome/`,
    },
    {
      name: "accounting.js",
      user: "openexchangerates",
      brief: `About A lightweight JavaScript library for number, money and currency formatting - fully localisable, zero dependencies.`,
      zhBrief: `关于用于数字，货币和货币格式的轻量级JavaScript库-完全可本地化，零依赖性。`,
      site: `http://openexchangerates.github.io/accounting.js`,
    },
    {
      name: "money.js",
      user: "openexchangerates",
      brief: `money.js is a tiny(1kb) javascript currency conversion library, for web & nodeJS`,
      zhBrief: `money.js是一个轻量的（1kb）JavaScript货币转换库，适用于Web和NodeJS`,
      site: `http://openexchangerates.github.io/money.js`,
    },
    {
      name: "Fraction.js",
      user: "infusion",
      brief: `Fraction is a rational number library written in JavaScript`,
      zhBrief: `Fraction是用JavaScript编写的有理数库`,
      site: `http://www.xarg.org/2014/03/rational-numbers-in-javascript/`,
    },
    {
      name: "Complex.js",
      user: "infusion",
      brief: `A complex number library`,
      zhBrief: `负数操作的库`,
    },
    {
      name: "Polynomial.js",
      user: "infusion",
      brief: `A JavaScript library to work with polynomials`,
    },
    {
      name: "Quaternion.js",
      user: "infusion",
      brief: `A JavaScript Quaternion library`,
      zhBrief: `一个使用多项式的JavaScript库`,
    },
  ];

  plans = plans.map((plan) =>
    Object.assign(
      generateStatusAndStars(plan.user || plan.name, plan.name),
      plan
    )
  );

  createApp(h(createTable(plans)))
    .use(ElementPlus)
    .mount("#js-number");
})();
