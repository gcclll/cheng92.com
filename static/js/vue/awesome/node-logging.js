(function() {
  const { createApp, h, reactive } = Vue;

  let plans = [
    {
      name: "pino",
      user: "pinojs",
      brief: `🌲 super fast, all natural json logger 🌲`,
      preview: "https://github.com/pinojs/pino/raw/master/pretty-demo.png",
    },
    {
      name: "winston",
      user: "winstonjs",
      brief: "A logger for just about everything.",
    },
    {
      name: "console-log-level",
      user: "watson",
      brief: "The most simple logger imaginable",
    },
    {
      user: "guigrpa",
      name: "storyboard",
      brief: "End-to-end, hierarchical, real-time, colorful logs and stories",
    },
    {
      user: "klaussinani",
      name: "signale",
      brief: "Highly configurable logging utility",
    },
    {
      user: "unjs",
      name: "consola",
      preview:
        "https://user-images.githubusercontent.com/904724/73267133-af6b2f00-41d8-11ea-9f16-4a8243d19c43.png",
      brief: `Elegant Console Logger for Node.js and Browser 🐨`,
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
    .mount("#nodejs-logging");
})();
