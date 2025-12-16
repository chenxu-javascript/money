# 📊 新股打新提醒机器人

自动抓取新股申购数据，通过企业微信机器人推送提醒。工作日每天 10:30 自动执行。

## ✨ 功能特点

- 🔍 自动抓取东方财富、同花顺新股数据
- 📱 企业微信机器人推送提醒
- ⏰ GitHub Actions 定时执行（工作日 10:30）
- 🎯 区分今日可申购和未来可申购
- 📅 显示剩余天数和关键信息

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone <your-repo-url>
cd money
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置企业微信 Webhook

#### 获取 Webhook 地址

1. 在企业微信群中添加机器人
2. 获取 Webhook 地址（格式：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）

#### 本地测试

创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入你的 Webhook 地址：

```env
WECHAT_WEBHOOK=https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your-key-here
```

### 4. 本地运行测试

```bash
npm start
```

### 5. 配置 GitHub Actions

#### 设置 Secret

1. 进入 GitHub 仓库的 Settings
2. 选择 Secrets and variables → Actions
3. 点击 New repository secret
4. 添加以下 Secret：
   - Name: `WECHAT_WEBHOOK`
   - Value: 你的企业微信 Webhook 地址

#### 启用 Actions

1. 进入仓库的 Actions 标签
2. 启用 GitHub Actions
3. 工作流将在工作日每天 10:30 自动执行

#### 手动触发

也可以在 Actions 页面手动触发执行：

1. 选择 "新股打新提醒" workflow
2. 点击 "Run workflow"
3. 选择分支并运行

## 📁 项目结构

```
money/
├── .github/
│   └── workflows/
│       └── reminder.yml      # GitHub Actions 工作流配置
├── src/
│   ├── index.js              # 主程序入口
│   ├── wechat.js             # 企业微信推送模块
│   └── fetcher.js            # 新股数据抓取模块
├── package.json              # 项目依赖配置
├── .env.example              # 环境变量示例
├── .gitignore                # Git 忽略文件
└── README.md                 # 项目说明文档
```

## 🛠️ 技术栈

- **Node.js** - 运行环境
- **Axios** - HTTP 请求库
- **Cheerio** - HTML 解析（用于同花顺数据）
- **GitHub Actions** - 自动化执行

## 📝 数据来源

1. **主要数据源**: 东方财富网新股申购数据
2. **备用数据源**: 同花顺新股申购数据

## ⏰ 定时任务说明

- **执行时间**: 工作日（周一至周五）每天 10:30 (北京时间)
- **Cron 表达式**: `30 2 * * 1-5` (UTC 时间 02:30)
- **时区转换**: UTC+8 (北京时间)

## 📮 消息格式示例

```
## 📊 新股打新提醒

> 共有 3 只新股可申购

### 🔥 今天可申购 (1只)

🚨 **某某科技** (301234)
> 申购代码：301234
> 发行价格：88.88元
> 申购日期：2025-12-16 (今天)

### 📅 未来可申购 (2只)

**另一科技** (688123)
> 申购代码：688123
> 发行价格：66.66元
> 申购日期：2025-12-17 (1天后)

---

⏰ 查询时间：2025-12-16 10:30:00
💡 提示：请及时登录证券账户进行申购
```

## 🔧 自定义配置

### 修改执行时间

编辑 [.github/workflows/reminder.yml](.github/workflows/reminder.yml) 文件中的 cron 表达式：

```yaml
schedule:
  # 修改为你想要的时间 (UTC 时间)
  - cron: "30 2 * * 1-5"
```

### 调整推送内容

编辑 [src/index.js](src/index.js) 中的 `buildMessage` 函数来自定义消息格式。

## ❓ 常见问题

### Q1: 为什么没有收到推送？

- 检查 GitHub Actions 是否执行成功
- 确认 WECHAT_WEBHOOK 配置正确
- 查看 Actions 日志中的错误信息

### Q2: 如何修改推送时间？

修改 `.github/workflows/reminder.yml` 中的 cron 表达式，注意时区转换。

### Q3: 数据抓取失败怎么办？

程序会自动尝试备用数据源（同花顺），如果都失败会在日志中显示错误信息。

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

⭐ 如果这个项目对你有帮助，欢迎点个 Star！
