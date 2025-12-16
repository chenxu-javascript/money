import WeChatBot from "./wechat.js";
import StockIPOFetcher from "./fetcher.js";

/**
 * 主程序
 */
async function main() {
  console.log("========================================");
  console.log("🚀 新股打新提醒程序启动");
  console.log(
    `📅 执行时间: ${new Date().toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
    })}`
  );
  console.log("========================================\n");

  // 从环境变量获取 Webhook 地址
  const webhookUrl =
    process.env.WECHAT_WEBHOOK ||
    "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=a5ee5eb6-6817-481d-86c2-fbe5dad042e1";

  if (!webhookUrl || webhookUrl.includes("your-key-here")) {
    console.error("❌ 请设置正确的企业微信 Webhook 地址");
    process.exit(1);
  }

  try {
    // 创建实例
    const bot = new WeChatBot(webhookUrl);
    const fetcher = new StockIPOFetcher();

    // 获取新股数据
    const stocks = await fetcher.fetchIPOData();

    if (stocks.length === 0) {
      console.log("ℹ️  当前没有可申购的新股");
      await bot.sendMarkdown(
        `## 📊 新股打新提醒\n\n` +
          `> 当前没有可申购的新股\n\n` +
          `⏰ 查询时间：${new Date().toLocaleString("zh-CN", {
            timeZone: "Asia/Shanghai",
          })}`
      );
      return;
    }

    // 构建消息内容
    const message = buildMessage(stocks);
    console.log("\n📤 准备发送消息...\n");
    console.log(message);

    // 发送消息
    const result = await bot.sendMarkdown(message);

    if (result.success) {
      console.log("\n✅ 提醒发送成功！");
    } else {
      console.error("\n❌ 提醒发送失败！");
    }
  } catch (error) {
    console.error("❌ 程序执行出错:", error);
    process.exit(1);
  }

  console.log("\n========================================");
  console.log("✅ 程序执行完成");
  console.log("========================================");
}

/**
 * 构建消息内容
 */
function buildMessage(stocks) {
  let message = `## 📊 新股打新提醒\n\n`;
  message += `> 共有 **${stocks.length}** 只新股可申购\n\n`;

  // 今天可申购的
  const today = stocks.filter((s) => s.daysUntil === 0);
  if (today.length > 0) {
    message += `### 🔥 今天可申购 (${today.length}只)\n\n`;
    today.forEach((stock) => {
      message += formatStockInfo(stock, true);
    });
    message += "\n";
  }

  // 未来几天可申购的
  const upcoming = stocks.filter((s) => s.daysUntil > 0);
  if (upcoming.length > 0) {
    message += `### 📅 未来可申购 (${upcoming.length}只)\n\n`;
    upcoming.forEach((stock) => {
      message += formatStockInfo(stock, false);
    });
    message += "\n";
  }

  message += `---\n\n`;
  message += `⏰ 查询时间：${new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
  })}\n`;
  message += `💡 提示：请及时登录证券账户进行申购`;

  return message;
}

/**
 * 格式化股票信息
 */
function formatStockInfo(stock, isToday) {
  const urgentFlag = isToday ? "🚨 " : "";
  const daysText =
    stock.daysUntil === 0 ? "**今天**" : `${stock.daysUntil}天后`;

  return (
    `${urgentFlag}**${stock.name}** (${stock.code})\n` +
    `> 申购代码：<font color="info">${stock.subscribeCode}</font>\n` +
    `> 发行价格：<font color="warning">${stock.issuePrice}元</font>\n` +
    `> 申购日期：<font color="comment">${stock.subscribeDate}</font> (${daysText})\n\n`
  );
}

// 执行主程序
main().catch((error) => {
  console.error("未处理的错误:", error);
  process.exit(1);
});
