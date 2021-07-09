const Root = Didact.createElement(
  "div",
  {
    style:
      "background:rgba(255,0,0,.8);height:120px;width:100%;text-align:center;",
  },
  Didact.createElement(Comp)
);

function Comp() {
  const [state, setState] = Didact.useState({ count: 0 });

  return Didact.createElement(
    "div",
    { style: "padding-top: 30px;" },
    ...[
      Didact.createElement(
        "button",
        {
          onClick() {
            setState(() => state.count++);
          },
          style: "margin-right:10px;",
        },
        "+"
      ),
      Didact.createElement(
        "button",
        {
          onClick() {
            setState(() => state.count--);
          },
        },
        "-"
      ),
      Didact.createElement(
        "span",
        {
          style: "padding: 5px 20px;color:white;",
        },
        `count = ` + state.count
      ),
    ]
  );
}

Didact.render(Root, document.getElementById("qvJvTTqyJw"));
