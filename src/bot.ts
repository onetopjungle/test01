import { Telegraf } from "telegraf";
import dotenv from "dotenv";
import { startCommand } from "./commands/start";
import { helpCommand } from "./commands/help";
import { deleteSession, getSession } from "./stores/session";
import { addUser, addUserCommand } from "./commands/addUser";
import { checkin, checkinCommand } from "./commands/checkin";
import { userMiddleware } from "./middlewares/user-middleware";
import { listCommand } from "./constant";
import "../src/schedules/auto-checkin-schedule";
import { deleteUser, deleteUserCommand } from "./commands/deleteUser";
import { onAutoCheckinCommand } from "./commands/onAutoCheckin";
import { offAutoCheckinCommand } from "./commands/offAutoCheckin";
import { addMultiUser, addMultiUserCommand } from "./commands/addMultiUser";
import { updateToken, updateTokenCommand } from "./commands/updateToken";
import { testCommand } from "./commands/test";

dotenv.config();

// Kiểm tra BOT_TOKEN trước khi khởi động bot
if (!process.env.BOT_TOKEN) {
  console.error("❌ [Bot] Không tìm thấy BOT_TOKEN trong .env!");
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);
console.log("🚀 [Bot] Đang khởi động...");

bot.use(userMiddleware);

// Thiết lập danh sách lệnh cho bot
bot.telegram.setMyCommands(listCommand);
console.log("✅ [Bot] Danh sách lệnh đã được thiết lập.");

// Định nghĩa danh sách lệnh và handler tương ứng
const commands = {
  start: startCommand,
  help: helpCommand,
  checkin: checkinCommand,
  add_user: addUserCommand,
  add_multi_user: addMultiUserCommand,
  delete_user: deleteUserCommand,
  on_auto_checkin: onAutoCheckinCommand,
  off_auto_checkin: offAutoCheckinCommand,
  update_token: updateTokenCommand,
  test_feature: testCommand,
};

// Đăng ký lệnh
Object.entries(commands).forEach(([cmd, handler]) => {
  bot.command(cmd, async (ctx) => {
    // console.log(`📢 [Command] /${cmd} được gọi bởi ${ctx.from?.id}`);
    await handler(ctx);
  });
});

// Lắng nghe tin nhắn văn bản
bot.on("text", async (ctx) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  // console.log(
  //   `📩 [Message] Nhận tin nhắn từ user ${userId}: "${ctx.message.text}"`,
  // );

  // Lấy session từ Redis
  const session = await getSession(userId);

  if (session) {
    switch (session.action) {
      case "add_user":
        // console.log("➕ [Session] Thực hiện thêm user...");
        await addUser(ctx);
        await deleteSession(userId);
        break;

      case "add_multi_user":
        // console.log("➕ [Session] Thực hiện thêm user...");
        await addMultiUser(ctx);
        await deleteSession(userId);
        break;

      case "checkin":
        // console.log("📍 [Session] Thực hiện check-in...");
        await checkin(ctx);
        await deleteSession(userId);
        break;

      case "delete_user":
        await deleteUser(ctx);
        await deleteSession(userId);
        break;

      case "update_token":
        await updateToken(ctx);
        await deleteSession(userId);
        break;

      default:
        await ctx.reply("⚠️ Không nhận diện được hành động. Vui lòng thử lại.");
        break;
    }
  } else {
    // console.log("❓ [Bot] User không có session, hiển thị hướng dẫn.");
    await ctx.reply("👋 Xin chào! Nhập /help để xem danh sách lệnh.");
  }
});

// Bắt đầu bot
bot
  .launch()
  .then(() => console.log("🤖 [Bot] Đã sẵn sàng nhận lệnh!"))
  .catch((err) => console.error("❌ [Bot] Lỗi khi khởi động:", err));

// Xử lý lỗi khi bot dừng
process.once("SIGINT", () => {
  console.log("🛑 [Bot] Nhận SIGINT, đang dừng...");
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  console.log("🛑 [Bot] Nhận SIGTERM, đang dừng...");
  bot.stop("SIGTERM");
});
