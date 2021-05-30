(function() {
  const { createApp, h, reactive } = Vue;

  let plans = [
    {
      name: "stylelint",
      user: "stylelint",
      brief: `A mighty, modern linter that helps you avoid errors and enforce conventions in your styles.`,
      site: 'https://stylelint.io/'
    },
    {
      name: 'stylelint-config-sass-guidelines',
      user: 'bjankord',
      brief: `⚙ A stylelint config inspired by`,
      site: `https://sass-guidelin.es/`,
      preview: 'http://qiniu.ii6g.com/img/20210529180609.png'
    },
    {
      name: 'stylelint-order',
      user: 'hudochenkov',
      brief: 'A plugin pack of order related linting rules for stylelint.',
      zhBrief: '规范css样式书写顺序的',
      preview: 'http://qiniu.ii6g.com/img/20210529180844.png'
    }, {
      name: 'stylelint-config-idiomatic-order',
      user: 'ream88',
      brief: 'css 书写顺序规范样板',
      preview: 'http://qiniu.ii6g.com/img/20210529181010.png'
    },
    {
      name: 'stylelint-config-hudochenkov/blob/master/order.js',
      user: 'hudochenkov',
      brief: 'css 书写顺序规范样板，stylelint-order 作者。',
    },
    {
      name: 'stylelint-config-recess-order',
      user: 'stormwarning',
      brief: 'css 书写顺序规范样板',
      preview: 'http://qiniu.ii6g.com/img/20210529181224.png'
    },
    {
      name: 'stylelint-config-property-sort-order-smacss',
      user: 'cahamilton',
      brief: 'css 书写顺序规范样板',
      preview: 'http://qiniu.ii6g.com/img/20210529181317.png'
    }
  ];

  plans = plans.map((plan) =>
    Object.assign(
      generateStatusAndStars(plan.user || plan.name, plan.name),
      plan
    )
  );

  createApp(h(createTable(plans)))
    .use(ElementPlus)
    .mount("#stylelint");
})();
