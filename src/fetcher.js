import axios from "axios";
import * as cheerio from "cheerio";

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

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "http://data.eastmoney.com/",
        },
        timeout: 10000,
      });

      if (response.data) {
        return this.parseEastMoneyData(response.data);
      }

      return [];
    } catch (error) {
      console.error("❌ 从东方财富获取数据失败:", error.message);
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

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Referer: "http://data.10jqka.com.cn/",
        },
        timeout: 10000,
      });

      if (response.data) {
        return this.parseTongHuaShunData(response.data);
      }

      return [];
    } catch (error) {
      console.error("❌ 从同花顺获取数据失败:", error.message);
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
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[1]);
      if (!data.data || data.data.length === 0) return [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);

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

        // 只获取今天及未来的打新
        if (subDate >= today) {
          stocks.push({
            name: stockName,
            code: stockCode,
            subscribeCode: subscribeCode,
            issuePrice: issuePrice || "待定",
            subscribeDate: subscribeDate,
            daysUntil: Math.ceil((subDate - today) / (1000 * 60 * 60 * 24)),
          });
        }
      }

      // 按申购日期排序
      stocks.sort(
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate)
      );

      return stocks;
    } catch (error) {
      console.error("❌ 解析东方财富数据失败:", error.message);
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
        (a, b) => new Date(a.subscribeDate) - new Date(b.subscribeDate)
      );

      return stocks;
    } catch (error) {
      console.error("❌ 解析同花顺数据失败:", error.message);
      return [];
    }
  }

  /**
   * 获取新股数据（优先东方财富，失败则尝试同花顺）
   */
  async fetchIPOData() {
    console.log("🔍 开始获取新股数据...");

    let stocks = await this.fetchFromEastMoney();

    if (stocks.length === 0) {
      console.log("⚠️  东方财富数据为空，尝试从同花顺获取...");
      stocks = await this.fetchFromTongHuaShun();
    }

    console.log(`✅ 成功获取 ${stocks.length} 只新股数据`);
    return stocks;
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
