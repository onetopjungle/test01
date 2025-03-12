import { Context } from "telegraf";

export const helpCommand = (ctx: Context) => {
  ctx.replyWithMarkdownV2(
    `🤖 *Hướng dẫn sử dụng bot:*
    
Bạn có thể dùng các lệnh sau:

🚀 \`/start\` \\- Bắt đầu bot  
ℹ️ \`/help\` \\- Xem hướng dẫn sử dụng  
👤 \`/adduser\` \\- Thêm người dùng  
📍 \`/checkin\` \\- Check\\-in  

💡 *Mẹo:* Bạn có thể nhập trực tiếp lệnh để bot thực hiện nhanh chóng\\!`,
  );
};
