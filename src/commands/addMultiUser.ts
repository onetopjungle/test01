import { Context } from "telegraf";
import { setSession, deleteSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";
import { sendMessage } from "../services/bot-service";

// 📌 Lệnh thêm nhiều user
export const addMultiUserCommand = async (ctx: any) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "add_multi_user" });

  try {
    const row = await queryDb(
      `SELECT * FROM users WHERE user_id = ? AND role = 0`,
      [userId],
    );

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Bạn không có quyền tạo người dùng.");
    }

    return ctx.reply(
      "👀 Vui lòng nhập danh sách ID người dùng mới (cách nhau bằng dấu phẩy).",
    );
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
};

// 📌 Thêm nhiều user mới
export const addMultiUser = async (ctx: any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text?.trim();

  // Kiểm tra ID hợp lệ (có thể có nhiều ID, mỗi ID là số từ 5 đến 10 chữ số)
  if (!messageText || !/^\d{5,10}(\s*,\s*\d{5,10})*$/.test(messageText)) {
    await deleteSession(userId);
    return ctx.reply(
      "🚫 Danh sách ID người dùng không hợp lệ. Vui lòng nhập các ID người dùng cách nhau bằng dấu phẩy, mỗi ID từ 5 đến 10 chữ số.",
    );
  }

  const newUserIds = messageText
    .split(",")
    .map((id: string) => parseInt(id.trim(), 10));

  try {
    // Kiểm tra và thêm từng người dùng vào cơ sở dữ liệu
    let userAddSuccess = [];

    ctx.reply("Đang thêm người dùng...");
    for (const newUserId of newUserIds) {
      const existingUser = await queryDb(
        `SELECT * FROM users WHERE user_id = ?`,
        [newUserId],
      );

      if (existingUser && existingUser.length > 0) {
        console.log(`⚠️ Người dùng ${newUserId} đã tồn tại.`);
        ctx.reply(`⚠️ Người dùng ${newUserId} đã tồn tại.`);
        continue; // Nếu người dùng đã tồn tại thì bỏ qua
      }

      await runDb(`INSERT INTO users (user_id, role) VALUES (?, 1)`, [
        newUserId,
      ]);
      userAddSuccess.push(newUserId);
      await sendMessage(newUserId, `🎉 Chào mừng bạn đến với tổ lười 🫠.`);
    }

    await deleteSession(userId);
    return ctx.reply(
      `✅ Đã thêm ${userAddSuccess.length} người dùng thành công.`,
    );
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi thêm người dùng. Vui lòng thử lại.");
  }
};
