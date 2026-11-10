# Page Templates

可复制/可生成的**特殊页面骨架**。它们不是稳定组件 API；默认可运行页面在
`@lynxland/uikit-preset-console`，这里展示如何从 preset 逐层退出。

| Template | 用途 |
|---|---|
| [Collection](collection-page.md) | 手装 URL + 过滤 + 排序 + 分页的列表页 |
| [CRUD](crud-page.md) | 列表 + create/edit/delete 的默认 CRUD |
| [Record](record-page.md) | 详情 hero + URL tabs |
| [Form](form-page.md) | 独立表单页 / 命令表单 |
| [Events](events-page.md) | backlog × live stream |
| [Custom UI adapter](custom-ui-adapter.md) | 接入自有设计系统 |

复制后把 import 改成你的本地路径；`surfaces` 与 `preset` 都支持 copy-owned
（`uikit eject preset-console`），但 `ui-shadcn`/`ui-plain` 保持 npm 依赖。
