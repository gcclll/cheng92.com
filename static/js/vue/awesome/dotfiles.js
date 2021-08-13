(function() {
  const { createApp, h, reactive } = Vue;

  let plans = [
    {
      name: "dotfiles",
      user: "daviwil",
      brief: `The path to GNUrvana`,
      site: 'https://config.daviwil.com/'
    },
    {
      name: 'dotfiles',
      user: 'dwt1',
      gitlab: true,
      brief: 'from mu4e - gitlab',
      site: 'https://gitlab.com/dwt1/dotfiles',
      preview: 'http://qiniu.ii6g.com/img/20210812083039.png'
    }
  ];

  plans = plans.map((plan) =>
    Object.assign(
      generateStatusAndStars(plan.user || plan.name, plan.name, plan.gitlab),
      plan
    )
  );

  createApp(h(createTable(plans)))
    .use(ElementPlus)
    .mount("#dotfiles");
})();
