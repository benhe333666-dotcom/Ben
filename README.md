# AI 热点时间线

一个可直接部署的 AI 热点新闻网站：从公开 RSS、Atom、可解析官方新闻页与新闻搜索 RSS 聚合 AI 相关新闻，按时间轴展示热度、来源、主题与发布时间。默认每小时更新一次数据。

## 本地运行

```bash
npm install
npm run update
npm run dev
```

打开本地地址后即可查看网站。`npm run update` 会生成 `public/news.json`，前端只读取这个静态文件。

## 部署方式

最省心的方式是 GitHub Pages：

1. 将本目录推送到 GitHub 仓库的 `main` 分支。
2. 在仓库 `Settings -> Pages` 中选择 `GitHub Actions`。
3. `.github/workflows/deploy-pages.yml` 会在每小时第 7 分钟抓取新闻、构建并部署。

### 绑定自己的域名

如果用 GitHub Pages：

1. 在 DNS 服务商里添加一条记录：
   - 根域名，例如 `example.com`：添加 `A` 记录到 GitHub Pages 官方 IP，或按 GitHub 当前页面提示配置。
   - 子域名，例如 `ai.example.com`：添加 `CNAME` 到 `<你的 GitHub 用户名>.github.io`。
2. 在仓库 `Settings -> Pages -> Custom domain` 填入你的域名。
3. 因为本项目使用 GitHub Actions 发布，域名以仓库 `Settings -> Pages -> Custom domain` 的设置为准，`CNAME` 文件不是必须项。
4. 等 DNS 生效后，开启 `Enforce HTTPS`。

也可以部署到 Vercel、Netlify 或 Cloudflare Pages，构建命令使用：

```bash
npm run deploy:check
```

输出目录是 `dist`。如果平台没有定时构建，需要配置平台自带 Cron 或外部构建 Hook，每小时触发一次构建。

## 更新机制

当前是“静态部署 + 定时生成 + 前端自动检查”的结构：

- 后台：定时任务运行 `npm run update`，重新抓取公开新闻源并生成 `public/news.json`。
- 部署：GitHub Actions 默认每小时构建并发布一次。
- 前端：页面打开后每 60 秒自动检查一次 `news.json`，有新数据时会无感刷新列表。

如果要更接近实时，可以把 workflow cron 改成每 10-15 分钟一次，或改用 Cloudflare Workers Cron / Vercel Cron / 自己的服务器来生成 `news.json`。真正秒级实时需要后端服务或 WebSocket，不适合纯 GitHub Pages 静态站。

## 新闻源配置

新闻源在 `scripts/sources.mjs` 中维护。当前包含：

- 官方源：OpenAI、Anthropic、Google AI、Hugging Face、Microsoft AI、NVIDIA AI
- 媒体源：TechCrunch AI、VentureBeat AI、MIT Technology Review AI、The Decoder
- 全网搜索：Google News 中文 AI、Global AI、AI Regulation、AI Chips
- 研究源：arXiv cs.AI

默认是合规友好的公开源聚合，不会绕过验证码、付费墙或站点反爬策略。想增加来源时，优先添加站点公开 RSS/Atom 地址；没有订阅源但页面结构稳定时，可以参考 Anthropic 的官方新闻页解析方式。

## 可调整参数

运行更新脚本时可通过环境变量调节：

```bash
MAX_ITEMS=200 WINDOW_HOURS=168 npm run update
```

- `MAX_ITEMS`：最多保留多少条新闻，默认 `140`
- `WINDOW_HOURS`：保留最近多少小时，默认 `240`
- `REQUEST_TIMEOUT_MS`：单个来源超时，默认 `12000`

## 视觉与动效

`DESIGN.md` 定义了界面的视觉规范。前端使用 React + Vite + GSAP，将 HyperFrames 的“先布局后动效”思路用于时间轴入场动画，同时保留静态部署的可靠性。
