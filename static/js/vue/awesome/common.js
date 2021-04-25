
; (function() {
  const { h } = Vue
  const { ElImage, ElTable, ElTableColumn, ElLink, ElPopover } = ElementPlus;

  const createLink = (row) => () => h(ElLink, { href: row.link, target: "_blank" }, {
    default: () => row.name
  })

  window.tableMetas = [
    {
      prop: "name",
      label: "Name",
      width: 160,
      slots: {
        default: ({ row }) =>
          row.preview ? h(ElPopover, {
            placement: 'right',
            trigger: 'hover',
            width: 700
          }, {
            reference: createLink(row),
            default: () => h(ElImage, { src: row.preview, fit: 'contain' })
          }) : createLink(row)()
      },
    },
    { prop: "brief", label: "brief", width: 220 },
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

  window.createTable = createTable
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
    }
  }


}())

function generateStatusAndStars(user, name = user) {

  return {
    status: `https://img.shields.io/travis/${user}/${name}`,
    stars: `https://img.shields.io/github/stars/${user}/${name}?style=social`,
    link: `https://github.com/${user}/${name}`
  }
}
