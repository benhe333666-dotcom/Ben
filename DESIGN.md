# AI 热点时间线设计说明

## Style Prompt

深色编辑部科技仪表盘。界面第一屏就是产品本体：新闻时间轴、热度侧栏、筛选与刷新控制。整体克制、密集但不拥挤，像为 AI 从业者和投资研究者准备的实时情报台。使用温润墨绿色背景、青绿色高亮和少量琥珀色热度提示，避免营销页、大英雄区、紫蓝霓虹和重复卡片堆叠。

## Colors

- 背景：`#07110f`
- 背景纹理：`#10221d`
- 主面板：`#0d1b18`
- 次级面板：`#122620`
- 边线：`#25443b`
- 主文字：`#eaf7ee`
- 次级文字：`#97afa6`
- 新鲜/在线强调：`#9befc7`
- 热度强调：`#f2c166`
- 风险/监管强调：`#ff8a6b`

## Typography

- 中文与 UI：`Inter`, `PingFang SC`, `Microsoft YaHei`, system-ui, sans-serif
- 数字与时间：`IBM Plex Mono`, `SFMono-Regular`, ui-monospace, monospace
- 标题紧凑、信息卡正文清晰，按钮和筛选控件必须定义字号，不依赖浏览器默认值。

## Motion

- 用 GSAP/HyperFrames 风格的时间线入场：新闻项按时间轻微上移淡入，最新项有一次克制的强调。
- 动效只服务于层级和新鲜感，不做无意义漂浮装饰。
- 尊重 `prefers-reduced-motion`。

## What NOT to Do

- 不做营销 landing page，不把首屏浪费在大口号。
- 不使用紫蓝大渐变、装饰光球、虚假 3D 物件或巨大的 hero 卡片。
- 不做嵌套卡片；新闻卡片半径不超过 8px。
- 不把真实新闻内容写死在页面代码里，数据必须来自 `public/news.json`。
