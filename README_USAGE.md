# 新股打新提醒系统 - 使用指南

## 快速开始

有三种方式获取新股数据：

### 1️⃣ **自动方式**（推荐）

程序会自动按优先级尝试：

1. 东方财富 API（已失效）
2. 同花顺 API（已失效）
3. 东方财富网页爬取（需要浏览器自动化）
4. **配置文件**（推荐手动维护）
5. 测试数据（仅用于验证逻辑）

### 2️⃣ **配置文件方式**（最稳定）

编辑 `config/stocks.json`，按以下格式添加新股数据：

```json
{
  "description": "新股申购数据配置文件",
  "lastUpdated": "2026-01-19",
  "stocks": [
    {
      "name": "新股名称A",
      "code": "001234",
      "subscribeCode": "780001",
      "issuePrice": "15.50",
      "subscribeDate": "2026-01-19"
    },
    {
      "name": "新股名称B",
      "code": "005678",
      "subscribeCode": "785678",
      "issuePrice": "22.30",
      "subscribeDate": "2026-01-20"
    }
  ]
}
```

然后运行：

```bash
npm start
```

### 3️⃣ **从东方财富网页手动查询**

访问 https://data.eastmoney.com/xg/xg/default.html

在表格中找到：

- 股票代码 (SECURITY_CODE)
- 股票简称 (SECURITY_NAME)
- 申购代码 (APPLY_CODE)
- 发行价格 (ISSUE_PRICE)
- 申购日期 (APPLY_DATE)

然后更新 `config/stocks.json`

## 数据字段说明

| 字段          | 说明     | 示例       |
| ------------- | -------- | ---------- |
| name          | 股票名称 | 新华保险   |
| code          | 股票代码 | 001336     |
| subscribeCode | 申购代码 | 780336     |
| issuePrice    | 发行价格 | 15.50元    |
| subscribeDate | 申购日期 | 2026-01-19 |

## 日志说明

程序运行时会输出详细日志：

```
📋 [调试] 今天日期: 2026-01-19
📋 [调试] 股票: 新华保险(001336), 申购日期: 2026-01-19, 天数差: 0
📋 [调试] ✅ 符合条件 - 新华保险, daysUntil: 0
📋 [调试] 过滤条件 daysUntil === 0 的结果: 1 只
```

- `天数差: 0` = 今天可申购
- `天数差: 1` = 明天可申购
- `❌ 不符合条件` = 日期已过期或未来太远

## 常见问题

**Q: 为什么说"今天有申购，但推送显示没有申购"？**

A: 检查以下几点：

1. 申购日期格式是否为 `YYYY-MM-DD`
2. 系统时区是否正确（使用上海时区）
3. 查看日志中的 `天数差` 值是否为 0
4. 确认 `daysUntil === 0` 的条件是否真正满足

**Q: 如何获取真实的新股数据？**

A: 有两种方式：

1. **手动复制**：从 https://data.eastmoney.com/xg/xg/default.html 表格中复制
2. **API接口**：等待东方财富 API 恢复，或使用 Puppeteer 爬取动态网页

**Q: 能自动从网页爬取吗？**

A: 可以，但需要安装 Puppeteer：

```bash
npm install puppeteer
```

然后你可以修改 `fetchFromEastMoneyWeb()` 方法使用 Puppeteer。

## 测试运行

使用测试数据验证整个流程（包括今天、明天、后天的申购）：

```bash
# config/stocks.json 为空时，会自动使用测试数据
npm start
```

输出应该包含：

- 📊 今天可申购 (1只)
- 📅 未来可申购 (2只)
- ✅ 消息发送成功
