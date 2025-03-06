import { Context } from "telegraf";

export const helpCommand = (ctx: Context) => {
  ctx.reply(
    "Bạn có thể dùng các lệnh sau:\n/start - Bắt đầu bot\n/help - Hướng dẫn sử dụng\n/adduser - Thêm người dùng\n/checkin - Check-in",
  );
};
