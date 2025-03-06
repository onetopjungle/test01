import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";
import { deleteSession, getSession } from "./stores/session";
import { addUser, addUserCommand } from "./commands/adduser";
import { checkin, checkinCommand } from "./commands/checkin";
import { userMiddleware } from "./middlewares/user";

dotenv.config();

// Khởi tạo bot với token từ .env
const bot = new Telegraf(process.env.BOT_TOKEN || "");

bot.use(userMiddleware);

// Thiết lập các lệnh cho bot
bot.telegram.setMyCommands([
  { command: "start", description: "Bắt đầu bot" },
  { command: "help", description: "Hiển thị hướng dẫn" },
  { command: "adduser", description: "Thêm người dùng mới vào database" },
  { command: "checkin", description: "Checkin" },
]);

// Lệnh /start
bot.start(startCommand);

// Lệnh /help
bot.help(helpCommand);

// Lệnh /adduser
bot.command("adduser", addUserCommand);

// Lệnh /checkin
bot.command("checkin", checkinCommand);

// Lắng nghe tin nhắn văn bản
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message.text;

  // Lấy session người dùng từ Redis
  const session = await getSession(userId);

  switch (session?.action) {
    case "adduser":
      await addUser(ctx, userId, messageText);
      break;

    case "checkin":
      await checkin(ctx);
      break;

    default:
      // Trường hợp không nằm trong session nào
      ctx.reply("Tôi có thể giúp gì cho bạn?");
      break;
  }

  await deleteSession(userId);
});

// Bắt đầu bot
bot.launch();
console.log("🚀 Bot đang chạy...");

// Xử lý lỗi khi bot dừng
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
