import axios from "axios";

/**
 * Bark 推送类
 */
class BarkBot {
    constructor(barkUrl) {
        this.barkUrl = barkUrl;
    }

    /**
     * 发送 Bark 消息
     * @param {string} title - 消息标题
     * @param {string} body - 消息内容
     */
    async send(title, body) {
        if (!this.barkUrl) return { success: false, error: "未配置 Bark URL" };

        try {
            const response = await axios.post(this.barkUrl, {
                title: title,
                body: body,
            }, {
                headers: {
                    "Content-Type": "application/json; charset=utf-8"
                }
            });

            if (response.data.code === 200) {
                console.log("✅ Bark 消息发送成功");
                return { success: true, data: response.data };
            } else {
                console.error("❌ Bark 消息发送失败:", response.data);
                return { success: false, error: response.data };
            }
        } catch (error) {
            console.error("❌ 发送 Bark 消息时出错:", error.message);
            return { success: false, error: error.message };
        }
    }
}

export default BarkBot;
