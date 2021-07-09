(function() {
  const { createApp, h, reactive } = Vue;

  let plans = [
    {
      name: "chalk",
      user: 'chalk',
      preview: '/js/vue/imgs/chalk.png',
      brief: `🖍 Terminal string styling done right`,
    },
    {
      name: "meow",
      user: 'sindresorhus',
      preview: 'https://github.com/sindresorhus/meow/raw/main/meow.gif',
      brief: "🐈 CLI app helper" ,
    },
    {
      name: "yargs",
      brief: "yargs the modern, pirate-themed successor to optimist.",
    },
    {
      user: "sindresorhus",
      name: "ora",
      brief: "Elegant terminal spinner",
    },
    {
      user: "sindresorhus",
      name: "get-stdin",
      brief: "Get stdin as a string or buffer",
    },
    {
      user: "sindresorhus",
      name: "log-update",
      brief: `Log by overwriting the previous output in the terminal. Useful for rendering progress bars, animations, etc.`,
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
    .mount("#nodejs-cmd-line-utils");
})();
