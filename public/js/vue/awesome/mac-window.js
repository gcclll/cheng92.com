(function() {
  const { createApp, h } = Vue;

  let plans = [
    _100('Amethyst', 'ianyh', `窗口管理器（自动保持窗口大小的窗口）`, `https://ianyh.com/amethyst/`, '', true),
    _100('contexts', 'contexts', '窗口管理工具，可通过快捷键或窗口拖动快速实现分屏', 'https://contexts.co/'),
    _100('Divvy', 'Divvy', '凭借其惊人的 Divvy Grid 系统，窗口管理处于最佳状态。', 'http://mizage.com/divvy/'),
    _100('moon', 'moon', '多任务多窗口的软件。', 'https://manytricks.com/moom/'),
    _100('Magnet', 'Magnet','一个窗口管理器，可以保持工作空间的组织', 'http://magnet.crowdcafe.com/'),
    _100('Shiftlt', 'fikovnik', '窗口位置和大小管理软件', 'https://github.com/fikovnik/ShiftIt', '', true),
    _100('slate', 'jigish', '窗口管理器，可用 JavaScript 写配置', 'https://github.com/jigish/slate', '', true),
    _100('SizeUp', 'SizeUp', '强大的，以键盘为中心的窗口管理', 'https://www.irradiatedsoftware.com/sizeup/'),
    _100('spectable', 'eczarny', '简单的移动和调整大小的窗口，和可定制的键盘快捷键。', 'https://www.spectacleapp.com/', '', true),
    _100('Total Spaces', 'Total Spaces', '像 ubuntu 一样提供窗口管理，为工作区创建热键，使您可以轻松移动。', 'http://totalspaces.binaryage.com/')
  ];

  plans = plans.map((plan) =>
    Object.assign(
      generateStatusAndStars(plan.user || plan.name, plan.name),
      plan
    )
  );

  createApp(h(createTable(plans)))
    .use(ElementPlus)
    .mount("#mac-window");
})();
