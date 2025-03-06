import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";
import { deleteSession, getSession } from "./stores/session";
import { addUser, addUserCommand } from "./commands/adduser";
import { checkin, checkinCommand } from "./commands/checkin";
import { userMiddleware } from "./middlewares/user-middleware";
import { listCommand } from "./constant";
import "../src/schedules/auto-checkin-schedule";

dotenv.config();

// Khởi tạo bot với token từ .env
const bot = new Telegraf(process.env.BOT_TOKEN || "");

bot.use(userMiddleware);

// Thiết lập các lệnh cho bot
bot.telegram.setMyCommands(listCommand);

// Định nghĩa danh sách lệnh và handler tương ứng
const commands = {
  start: startCommand,
  help: helpCommand,
  adduser: addUserCommand,
  checkin: checkinCommand,
};

// Tự động đăng ký lệnh
Object.entries(commands).forEach(([cmd, handler]) => bot.command(cmd, handler));

// Lắng nghe tin nhắn văn bản
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // Lấy session của user từ Redis
  const session = await getSession(userId);

  switch (session?.action) {
    case "adduser":
      await addUser(ctx);
      await deleteSession(userId);
      break;

    case "checkin":
      await checkin(ctx);
      await deleteSession(userId);
      break;

    default:
      await ctx.reply("Tôi có thể giúp gì cho bạn?");
      break;
  }
});

// Bắt đầu bot
bot.launch();
console.log("🚀 Bot đang chạy...");

// Xử lý lỗi khi bot dừng
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
