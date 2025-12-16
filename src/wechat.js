import axios from "axios";

/**
 * 企业微信机器人推送类
 */
class WeChatBot {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  /**
   * 发送文本消息
   * @param {string} content - 消息内容
   * @param {Array<string>} mentionedList - @的用户列表（手机号）
   * @param {Array<string>} mentionedMobileList - @的用户列表（手机号）
   */
  async sendText(content, mentionedList = [], mentionedMobileList = []) {
    const data = {
      msgtype: "text",
      text: {
        content: content,
        mentioned_list: mentionedList,
        mentioned_mobile_list: mentionedMobileList,
      },
    };

    return await this.send(data);
  }

  /**
   * 发送 Markdown 消息
   * @param {string} content - Markdown 格式的消息内容
   */
  async sendMarkdown(content) {
    const data = {
      msgtype: "markdown",
      markdown: {
        content: content,
      },
    };

    return await this.send(data);
  }

  /**
   * 发送消息到企业微信
   * @param {Object} data - 消息数据
   */
  async send(data) {
    try {
      const response = await axios.post(this.webhookUrl, data, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.data.errcode === 0) {
        console.log("✅ 消息发送成功");
        return { success: true, data: response.data };
      } else {
        console.error("❌ 消息发送失败:", response.data);
        return { success: false, error: response.data };
      }
    } catch (error) {
      console.error("❌ 发送消息时出错:", error.message);
      return { success: false, error: error.message };
    }
  }
}

export default WeChatBot;
