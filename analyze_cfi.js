const axios = require("axios");
const cheerio = require("cheerio");

(async () => {
  try {
    const response = await axios.get("https://newstock.cfi.cn/", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $ = cheerio.load(response.data);

    // 查看所有表格
    const tables = $("table");
    console.log("📊 找到的表格数量:", tables.length);

    // 查看每个表格的类名和标题
    tables.each((idx, table) => {
      const classes = $(table).attr("class");
      const id = $(table).attr("id");
      const thead = $(table)
        .find("thead tr th")
        .map((i, el) => $(el).text().trim())
        .get();
      const tbody = $(table).find("tbody tr").length;

      console.log(`\n表格 ${idx + 1}:`);
      console.log("  id:", id);
      console.log("  class:", classes);
      console.log("  表头数量:", thead.length);
      console.log("  表头:", thead);
      console.log("  数据行数:", tbody);

      // 显示前2行数据
      if (tbody > 0) {
        console.log("  前2行示例:");
        $(table)
          .find("tbody tr")
          .slice(0, 2)
          .each((ridx, row) => {
            const cells = $(row)
              .find("td")
              .map((i, el) => $(el).text().trim().substring(0, 20))
              .get();
            console.log("    ", cells);
          });
      }
    });
  } catch (err) {
    console.error("错误:", err.message);
  }
})();
