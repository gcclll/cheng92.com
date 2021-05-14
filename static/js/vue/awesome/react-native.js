(function() {
  const { createApp, h } = Vue;

  let plans = [
    {
      name: "NativeBase",
      user: "GeekyAnts",
      free: true,
      brief: `Essential cross-platform UI components for React Native`,
      zhBrief: `React Native的基本跨平台UI组件`,
      site: `https://nativebase.io/`,
    },
    {
      name: 'react-native-walkthrough',
      user: 'instamobile',
      brief: `React Native Walkthrough User Onboarding Flow to start your react native app development`,
      zhBrief: `React Native演练用户入职流程开始您的React Native应用程序开发`,
      site: `https://www.instamobile.io/app-templates/react-native-walkthrough-flow/`
    },
    {
      name: 'teaset',
      user: 'rilyu',
      brief: `A UI library for react native, provides 20+ pure JS(ES6) components, focusing on content display and action control.`,
      zhBrief: `一个用于react native的UI库，提供20多个纯JS（ES6）组件，专注于内容显示和动作控制。`
    }, {
      name: 'galio',
      user: 'galio-org',
      brief: `Galio is a beautifully designed, Free and Open Source React Native Framework`,
      zhBrief: `Galio是一个设计精美，免费和开源的React Native框架`,
      free: true,
      site: 'https://galio.io/'
    }, {
      name: 'argon-react-native',
      user: 'creativetimofficial',
      free: true,
      brief: `Argon React Native`,
      site: `https://www.creative-tim.com/product/argon-react-native`,
    }, {
      name: 'ct-material-kit-pro-react-native',
      user: 'creativetimofficial',
      brief: `Material Kit PRO React Native is a fully coded app template built over Galio.io, React Native and Expo`,
      zhBrief: `Material Kit PRO React Native是基于Galio.io，React Native和Expo构建的完全编码的应用程序模板`,
      site: `https://www.creative-tim.com/product/material-kit-react-native/?partner=91096`
    }, {
      name: 'react-native-elements',
      free: true,
      brief: `Cross-Platform React Native UI Toolkit`,
      zhBrief: `跨平台React Native UI工具包`,
      site: `https://reactnativeelements.com/`
    }, {
      name: 'lottie',
      user: 'airbnb',
      brief: `Lottie forAndroid, iOS, Web, React Native, and Windows`,
      site: `https://airbnb.io/lottie/#/`
    }, {
      name: 'react-native-vector-icons',
      user: 'oblador',
      brief: `Customizable Icons for React Native with support for image source and full styling.`,
      zhBrief: `React Native的可自定义图标，支持图像源和完整样式。`,
      site: `https://oblador.github.io/react-native-vector-icons/`
    }, {
      name: 'ignite',
      user: 'infinitered',
      free: true,
      brief: `Infinite Red's cutting edge React Native project boilerplate, along with a CLI, component/model generators, and more!`,
      zhBrief: `Infinite Red最先进的React Native项目样板，以及CLI，组件/模型生成器等！`,
    }, {
      name: 'react-native-maps',
      brief: `React Native Mapview component for iOS + Android`,
      zhBrief: `适用于iOS + Android的React Native Mapview组件`
    }, {
      name: 'react-native-gifted-chat',
      user: 'FaridSafi',
      brief: `💬 The most complete chat UI for React Native`,
      zhBrief: `React React Native最完整的聊天UI`,
      site: 'https://gifted.chat/'
    }, {
      name: 'react-native-ui-kitten',
      user: 'akveo',
      brief: `💥 React Native UI Library based on Eva Design System 🌚✨Dark Mode`,
      zhBrief: `💥基于Eva设计系统的React Native UI库🌚✨黑暗模式`,
      site: `https://akveo.github.io/react-native-ui-kitten/#/home`
    }, {
      name: 'react-native-paper',
      user: 'callstack',
      brief: `Material Design for React Native (Android & iOS)`,
      zhBrief: `React Native的材质设计（Android和iOS）`,
      site: `https://reactnativepaper.com/`
    }, {
      name: 'xinthink',
      user: 'react-native-material-kit',
      brief: `Bringing Material Design to React Native`,
      zhBrief: `将材料设计带入React Native`,
      site: `http://rnmk.xinthink.com/`
    }, {
      name: 'xotahal',
      user: 'react-native-material-ui',
      brief: `Highly customizable material design components for React Native`,
      zhBrief: `适用于React Native的高度可定制的材料设计组件`,
    }, {
      name: 'wix',
      user: 'react-native-ui-lib',
      brief: `UI Components Library for React Native`,
      site: `https://wix.github.io/react-native-ui-lib/`
    }, {
      name: 'nachos-ui',
      brief: `Nachos UI is a React Native component library.`,
      site: `https://avocode.com/nachos-ui`
    }, {
      name: 'ui',
      user: 'shoutem',
      brief: `Customizable set of components for React Native applications`,
      zhBrief: `用于React Native应用程序的可定制组件集`,
      site: `https://shoutem.com/`
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
    .mount("#react-native");
})();
