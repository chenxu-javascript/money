import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前文件的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, "../config/stocks.json");

/**
 * 新股数据抓取类
 */
class StockIPOFetcher {
  constructor() {
    // 东方财富新股申购日历API
    this.eastmoneyApi =
      "http://datainterface.eastmoney.com/EM_DataCenter/JS.aspx";
  }

  /**
   * 从东方财富获取新股数据
   */
  async fetchFromEastMoney() {
    try {
      const today = new Date();
      const dateStr = this.formatDate(today);

      // 东方财富新股申购数据接口
      const url = `${this.eastmoneyApi}?type=NS&sty=NSSGSJ&st=0&sr=-1&p=1&ps=50&js=var data=%7B%22data%22%3A%5B(x)%5D%7D&token=894050c76af8597a853f5b408b759f5d&cmd=C._NEWSTOCK_IPSGS`;

      console.log(`📋 [调试] 请求东方财富 API: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "http://data.eastmoney.com/",
        },
        timeout: 10000,
      });

      console.log(`📋 [调试] 东方财富响应状态码: ${response.status}`);
      if (response.data) {
        console.log(
          `📋 [调试] 收到东方财富数据，长度: ${response.data.length} 字符`,
        );
        return this.parseEastMoneyData(response.data);
      }

      console.log("📋 [调试] 东方财富返回数据为空");
      return [];
    } catch (error) {
      console.error("❌ 从东方财富获取数据失败:", error.message);
      if (error.response) {
        console.error(`📋 [调试] 响应状态码: ${error.response.status}`);
        console.error(
          `📋 [调试] 响应头: ${JSON.stringify(error.response.headers)}`,
        );
      }
      if (error.config) {
        console.error(`📋 [调试] 请求 URL: ${error.config.url}`);
      }
      return [];
    }
  }

  /**
   * 从中财网爬取新股数据
   */
  async fetchFromCFINet() {
    try {
      const url = "https://newstock.cfi.cn/";

      console.log(`📋 [调试] 尝试从中财网爬取: ${url}`);

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          Referer: "https://newstock.cfi.cn/",
        },
        timeout: 15000,
      });

      if (!response.data) {
        console.log("📋 [调试] 中财网返回数据为空");
        return [];
      }

      console.log(
        `📋 [调试] 成功获取中财网数据，长度: ${response.data.length} 字符`,
      );
      return this.parseCFINetData(response.data);
    } catch (error) {
      console.error("❌ 从中财网获取数据失败:", error.message);
      if (error.response) {
        console.error(`📋 [调试] 响应状态码: ${error.response.status}`);
      }
      return [];
    }
  }

  /**
   * 解析中财网数据 - 只提取"即将发行的新股 - 新股发行一览表"中今天及未来3天的数据
   */
  parseCFINetData(html) {
    try {
      const $ = cheerio.load(html);
      const stocks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      console.log("📋 [调试] 开始解析中财网HTML数据...");

      // 表格结构（新股发行一览表）：
      // 0: 股票名称
      // 1: 新股申购日
      // 2: 申购代码
      // 3: 发行价
      // 4: 发行量/股
      // 5: 申购限额
      // 6: 申购测算
      // 7: 发行市盈率
      // 8: 中签率
      // 9: 中签号
      // 10: 招股书

      let foundCount = 0;
      let totalCount = 0;

      $("table.t_content tbody tr").each((index, element) => {
        try {
          const tds = $(element).find("td");
          if (tds.length < 5) return; // 跳过不完整的行

          totalCount++;

          // 第一列是股票名称（包含链接）
          const nameElement = $(tds[0]).find("a").first();
          const name = nameElement.text().trim();

          // 过滤掉北交所的数据，只要沪深新股
          if (name.includes("(北)")) {
            return;
          }

          // 第二列是申购日期
          let applyDateText = $(tds[1]).text().trim();
          // 检查是否包含"今天"
          const isToday = applyDateText.includes("今天");

          if (!name || !applyDateText) return;

          // 解析日期格式: "01月26日周一" 或 "01月19日今天"
          let subscribeDate = null;
          if (isToday) {
            subscribeDate = this.formatDate(today);
          } else {
            // 提取月份和日期
            const dateMatch = applyDateText.match(/(\d{2})月(\d{2})日/);
            if (dateMatch) {
              const month = dateMatch[1];
              const day = dateMatch[2];
              const year = today.getFullYear();
              subscribeDate = `${year}-${month}-${day}`;
            }
          }

          if (!subscribeDate) return;

          const subDate = new Date(subscribeDate);
          subDate.setHours(0, 0, 0, 0);
          const daysDiff = (subDate - today) / (1000 * 60 * 60 * 24);
          const daysUntil = Math.floor(daysDiff);

          // 只获取今天及未来3天内的打新
          if (daysUntil >= 0 && daysUntil <= 3) {
            // 第三列是申购代码
            const subscribeCode = $(tds[2]).text().trim();

            // 过滤掉科创板和创业板，只保留主板
            // 科创板：申购代码为 "沪:78XXX" (688代码) 或 "沪:79XXX" (689代码)，或名称包含"(科)"
            // 创业板：申购代码为 "深:30XXX" (300代码) 或 "深:301XXX" (301代码)，或名称包含"(创)"
            // 主板：申购代码为 "沪:73XXX" 或 "沪:780XXX" (601代码) 或 "深:00XXXX" (000/001代码)

            // 检查科创板
            if (
              name.includes("(科)") ||
              subscribeCode.match(/沪:(78[89]|79)/)
            ) {
              return;
            }

            // 检查创业板
            if (name.includes("(创)") || subscribeCode.match(/深:30[01]/)) {
              return;
            }

            // 第四列是发行价
            const issuePrice = $(tds[3]).text().trim();

            // 第五列是发行量/股
            const issueVolume = $(tds[4]).text().trim();

            // 第六列是申购限额
            const purchaseLimit = $(tds[5]).text().trim();

            // 第八列是发行市盈率
            const peRatio = $(tds[7]).text().trim();

            // 第九列是中签率
            const winningRate = $(tds[8]).text().trim();

            // 第十列是中签号公布日
            const winningNumberDate = $(tds[9]).text().trim();

            console.log(
              `📋 [调试] 解析新股: ${name}, 申购日期: ${subscribeDate}, 申购代码: ${subscribeCode}, 发行价: ${issuePrice}, daysUntil: ${daysUntil}`,
            );

            console.log(`  ✅ 符合条件 - ${name}, daysUntil: ${daysUntil}`);

            stocks.push({
              name: name,
              code: "", // 中财网表格中没有直接的股票代码
              subscribeCode: subscribeCode,
              issuePrice: issuePrice || "待定",
              issueVolume: issueVolume,
              purchaseLimit: purchaseLimit,
              peRatio: peRatio,
              winningRate: winningRate,
              winningNumberDate: winningNumberDate,
              subscribeDate: subscribeDate,
              daysUntil: daysUntil,
            });
            foundCount++;
          } else if (daysUntil < 0) {
            console.log(`  ❌ 不符合条件 - ${name}, 日期已过期`);
          }
        } catch (rowError) {
          // 跳过解析出错的行
          console.log(`📋 [调试] 解析行出错: ${rowError.message}`);
        }
      });

      // 按申购日期排序
      stocks.sort(
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate),
      );

      console.log(
        `📋 [调试] 从中财网解析出 ${foundCount} 只新股（扫描了 ${totalCount} 行）`,
      );
      if (stocks.length > 0) {
        console.log(
          `📋 [调试] 最终新股数据: ${JSON.stringify(stocks, null, 2)}`,
        );
      }

      return stocks;
    } catch (error) {
      console.error("❌ 解析中财网数据失败:", error.message);
      return [];
    }
  }

  /**
   * 从同花顺获取新股数据（备用方案）
   */
  async fetchFromTongHuaShun() {
    try {
      // 同花顺新股申购接口
      const url = "http://data.10jqka.com.cn/ipo/xgsg/";

      console.log(`📋 [调试] 请求同花顺 API: ${url}`);
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "http://data.10jqka.com.cn/",
        },
        timeout: 10000,
      });

      console.log(`📋 [调试] 同花顺响应状态码: ${response.status}`);
      if (response.data) {
        console.log(
          `📋 [调试] 收到同花顺数据，长度: ${response.data.length} 字符`,
        );
        return this.parseTongHuaShunData(response.data);
      }

      console.log("📋 [调试] 同花顺返回数据为空");
      return [];
    } catch (error) {
      console.error("❌ 从同花顺获取数据失败:", error.message);
      if (error.response) {
        console.error(`📋 [调试] 响应状态码: ${error.response.status}`);
      }
      if (error.config) {
        console.error(`📋 [调试] 请求 URL: ${error.config.url}`);
      }
      return [];
    }
  }

  /**
   * 解析东方财富数据
   */
  parseEastMoneyData(rawData) {
    try {
      // 提取 JSON 数据
      const jsonMatch = rawData.match(/var data=(\{.*\})/);
      if (!jsonMatch) {
        console.log("📋 [调试] 未找到 JSON 数据匹配");
        return [];
      }

      const data = JSON.parse(jsonMatch[1]);
      if (!data.data || data.data.length === 0) {
        console.log("📋 [调试] 没有新股数据");
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log(`📋 [调试] 今天日期: ${this.formatDate(today)}`);

      const stocks = [];

      for (const item of data.data) {
        // 数据格式: 股票代码,股票名称,申购代码,发行价,申购日期,中签号公布日,中签率,发行市盈率...
        const fields = item.split(",");

        if (fields.length < 5) continue;

        const stockCode = fields[0]?.replace(/"/g, "");
        const stockName = fields[1]?.replace(/"/g, "");
        const subscribeCode = fields[2]?.replace(/"/g, "");
        const issuePrice = fields[3]?.replace(/"/g, "");
        const subscribeDate = fields[4]?.replace(/"/g, "");

        if (!subscribeDate || subscribeDate === "-") continue;

        // 解析日期 (格式: 2024-01-15)
        const subDate = new Date(subscribeDate);
        subDate.setHours(0, 0, 0, 0);
        const daysDiff = (subDate - today) / (1000 * 60 * 60 * 24);

        console.log(
          `📋 [调试] 股票: ${stockName}(${stockCode}), 申购日期: ${subscribeDate}, 天数差: ${daysDiff}`,
        );

        // 只获取今天及未来的打新
        if (subDate >= today) {
          const daysUntil = Math.floor(daysDiff);
          console.log(`  ✅ 符合条件 - ${stockName}, daysUntil: ${daysUntil}`);
          stocks.push({
            name: stockName,
            code: stockCode,
            subscribeCode: subscribeCode,
            issuePrice: issuePrice || "待定",
            subscribeDate: subscribeDate,
            daysUntil: daysUntil,
          });
        } else {
          console.log(`  ❌ 不符合条件 - ${stockName}, 日期已过期`);
        }
      }

      // 按申购日期排序
      stocks.sort(
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate),
      );

      console.log(`📋 [调试] 最终筛选出 ${stocks.length} 只新股数据`);
      stocks.forEach((s) => {
        console.log(
          `  - ${s.name}(${s.code}): ${s.subscribeDate} (daysUntil: ${s.daysUntil})`,
        );
      });

      return stocks;
    } catch (error) {
      console.error("❌ 解析东方财富数据失败:", error.message);
      console.error("📋 [调试] 原始数据片段:", rawData.substring(0, 500));
      return [];
    }
  }

  /**
   * 解析同花顺数据
   */
  parseTongHuaShunData(html) {
    try {
      const $ = cheerio.load(html);
      const stocks = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 查找表格数据
      $("table tbody tr").each((index, element) => {
        const tds = $(element).find("td");
        if (tds.length < 5) return;

        const subscribeDate = $(tds[4]).text().trim();
        if (!subscribeDate || subscribeDate === "-") return;

        // 解析日期
        const subDate = new Date(subscribeDate);
        subDate.setHours(0, 0, 0, 0);

        // 只获取今天及未来的打新
        if (subDate >= today) {
          stocks.push({
            name: $(tds[1]).text().trim(),
            code: $(tds[0]).text().trim(),
            subscribeCode: $(tds[2]).text().trim(),
            issuePrice: $(tds[3]).text().trim() || "待定",
            subscribeDate: subscribeDate,
            daysUntil: Math.ceil((subDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      });

      // 按申购日期排序
      stocks.sort(
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate),
      );

      return stocks;
    } catch (error) {
      console.error("❌ 解析同花顺数据失败:", error.message);
      return [];
    }
  }

  /**
   * 获取新股数据（优先东方财富，失败则尝试同花顺，再尝试中财网，再从配置文件读取）
   */
  async fetchIPOData() {
    console.log("🔍 开始获取新股数据...");
    const startTime = Date.now();

    let stocks = await this.fetchFromEastMoney();

    if (stocks.length === 0) {
      console.log("⚠️  东方财富数据为空，尝试从同花顺获取...");
      stocks = await this.fetchFromTongHuaShun();
    }

    // 尝试从中财网爬取
    if (stocks.length === 0) {
      console.log("⚠️  同花顺数据也为空，尝试从中财网爬取...");
      stocks = await this.fetchFromCFINet();
    }

    // 如果网络数据都失败，尝试从配置文件读取
    if (stocks.length === 0) {
      console.log("⚠️  网络爬取失败，尝试从配置文件读取...");
      stocks = this.loadFromConfigFile();
    }

    // 最后一个兜底：使用本地测试数据验证逻辑
    if (stocks.length === 0) {
      console.log("📋 [调试] 配置文件为空，使用本地测试数据进行验证...");
      stocks = this.getMockTestData();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ 成功获取 ${stocks.length} 只新股数据 (耗时: ${duration}s)`);
    console.log(
      `📋 [调试] 返回给主程序的最终数据: ${JSON.stringify(stocks, null, 2)}`,
    );
    return stocks;
  }

  /**
   * 从配置文件读取新股数据
   */
  loadFromConfigFile() {
    try {
      console.log(`📋 [调试] 尝试从配置文件读取: ${configPath}`);

      if (!fs.existsSync(configPath)) {
        console.log(
          `📋 [调试] 配置文件不存在: ${configPath}，请创建该文件或使用测试数据`,
        );
        return [];
      }

      const fileContent = fs.readFileSync(configPath, "utf-8");
      const config = JSON.parse(fileContent);

      if (!config.stocks || config.stocks.length === 0) {
        console.log("📋 [调试] 配置文件中没有新股数据");
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stocks = [];
      for (const item of config.stocks) {
        if (!item.subscribeDate) continue;

        const subDate = new Date(item.subscribeDate);
        subDate.setHours(0, 0, 0, 0);
        const daysDiff = (subDate - today) / (1000 * 60 * 60 * 24);

        console.log(
          `📋 [调试] 配置文件中的股票: ${item.name}(${item.code}), 申购日期: ${item.subscribeDate}, 天数差: ${daysDiff}`,
        );

        // 只获取今天及未来的打新
        if (subDate >= today) {
          const daysUntil = Math.floor(daysDiff);
          console.log(`  ✅ 符合条件 - ${item.name}, daysUntil: ${daysUntil}`);
          stocks.push({
            name: item.name,
            code: item.code,
            subscribeCode: item.subscribeCode,
            issuePrice: item.issuePrice || "待定",
            subscribeDate: item.subscribeDate,
            daysUntil: daysUntil,
          });
        } else {
          console.log(`  ❌ 不符合条件 - ${item.name}, 日期已过期`);
        }
      }

      // 按申购日期排序
      stocks.sort(
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate),
      );

      console.log(`📋 [调试] 从配置文件加载了 ${stocks.length} 只新股`);
      return stocks;
    } catch (error) {
      console.error("❌ 从配置文件读取数据失败:", error.message);
      return [];
    }
  }

  /**
   * 获取测试数据（用于验证逻辑）
   * 包含：今天的申购、明天的申购、后天的申购
   */
  getMockTestData() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);

    const mockStocks = [
      {
        name: "测试新股A",
        code: "999001",
        subscribeCode: "999001",
        issuePrice: "10.50",
        subscribeDate: this.formatDate(today),
        daysUntil: 0, // 今天
      },
      {
        name: "测试新股B",
        code: "999002",
        subscribeCode: "999002",
        issuePrice: "15.30",
        subscribeDate: this.formatDate(tomorrow),
        daysUntil: 1, // 明天
      },
      {
        name: "测试新股C",
        code: "999003",
        subscribeCode: "999003",
        issuePrice: "20.80",
        subscribeDate: this.formatDate(dayAfter),
        daysUntil: 2, // 后天
      },
    ];

    console.log(
      `📋 [调试] 生成的测试数据: ${JSON.stringify(mockStocks, null, 2)}`,
    );
    return mockStocks;
  }

  /**
   * 格式化日期
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export default StockIPOFetcher;
