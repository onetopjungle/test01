import { Context } from "telegraf";

export const startCommand = (ctx: Context) => {
  ctx.replyWithMarkdownV2(
    `👋 *Xin chào ${ctx.from?.first_name || "bạn"}\\!*  

Tôi là bot của bạn 🤖\\. Tôi có thể giúp bạn với các thao tác sau:

🚀 \`/start\` \\- Bắt đầu bot  
ℹ️ \`/help\` \\- Xem hướng dẫn sử dụng  
👤 \`/adduser\` \\- Thêm người dùng  
📍 \`/checkin\` \\- Check\\-in  

Hãy nhập một lệnh để bắt đầu nhé\\! 🎯`,
  );
};
