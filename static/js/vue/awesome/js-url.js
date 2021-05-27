(function() {
  const { createApp, h } = Vue;

  let plans = [
    {
      name: "URI.js",
      user: "medialize",
      preview: 'http://qiniu.ii6g.com/img/20210526161558.png',
      brief: 'Javascript URL mutation library',
      site: `http://medialize.github.io/uri.js/`,
    },
    {
      name: 'domurl',
      user: 'Mikus',
      brief: 'Lightweight URL manipulation with JavaScript'
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
    .mount("#js-url");
})();
