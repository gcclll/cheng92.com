(function() {
  const { h } = Vue;
  const { ElTag, ElImage, ElTable, ElTableColumn, ElLink, ElPopover } = ElementPlus;

  const createLink = (row) => () => {
    return h('div', {
      style: { position: 'relative' }
    }, [
      h(
        ElLink,
        {
          href: row.link, target: "_blank", style: {
            'max-width': '90px'
          }
        },
        {
          default: () => row.name,
        }
      ),
      row.free ? h(ElTag, {
        type: 'success', effect: 'dark', size: 'mini', style: {
          position: 'absolute',
          height: '12px',
          'line-height': '10px',
          'font-size': '9px'
        }
      }, {
        default: () => 'free'
      }) : null
    ])
  }


  function renderBrief(row) {
    return h(
      "span",
      null,
      row.site
        ? [
          h(
            ElLink,
            {
              href: row.site,
              target: "_blank",
            },
            {
              default: () => h("i", { class: "el-icon-link" }),
            }
          ),
          h("span", row.brief),
        ]
        : row.brief
    );
  }

  window.tableMetas = [
    {
      prop: "name",
      label: "Name",
      width: 160,
      slots: {
        default: ({ row }) =>
          row.preview
            ? h(
              ElPopover,
              {
                placement: "right",
                trigger: "hover",
                width: 700,
              },
              {
                reference: createLink(row),
                default: () =>
                  h(ElImage, { src: row.preview, fit: "contain" }),
              }
            )
            : createLink(row)(),
      },
    },
    {
      prop: "brief",
      label: "Brief",
      width: 220,
      slots: {
        default: ({ row }) =>
          row.zhBrief
            ? h(
              ElPopover,
              {
                placement: "top",
                trigger: "hover",
                width: 300,
              },
              {
                reference: () => renderBrief(row),
                default: () => h("span", row.zhBrief),
              }
            )
            : renderBrief(row),
      },
    },
    {
      prop: "status",
      label: "Status",
      width: 120,
      slots: {
        default: ({ row }) => h("img", { src: row.status }),
      },
    },
    {
      prop: "stars",
      label: "Stars",
      sortable: true,
      width: 130,
      slots: {
        default: ({ row }) => h("img", { src: row.stars }),
      },
    },
  ];

  window.createTable = createTable;
  function createTable(data) {
    return function TableComponent() {
      return h(
        ElTable,
        {
          data,
          style: { width: "100%" },
        },
        {
          default: () => {
            return window.tableMetas.map(({ slots, ...prop }) =>
              h(ElTableColumn, prop, slots)
            );
          },
        }
      );
    };
  }
})();

function generateStatusAndStars(user, name = user, gitlab = false) {
  return {
    status: `https://img.shields.io/travis/${user}/${name}`,
    stars: `https://img.shields.io/github/stars/${user}/${name}?style=social`,
    link: `https://${gitlab ? 'gitlab' : 'github'}.com/${user}/${name}`,
  };
}
