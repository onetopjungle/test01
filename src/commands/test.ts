import { Context } from "telegraf";
import { deleteSession, setSession } from "../stores/session";
import { queryDb } from "../stores/database";

export const testCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "test" });

  try {
    const row = await queryDb(
      `SELECT * FROM users WHERE user_id = ? AND role = 0`,
      [userId],
    );

    if (!row || row.length === 0) {
      await deleteSession(userId);
      return ctx.reply("🚫 Bạn không có quyền dùng tính năng này.");
    }

    // await autoCheckinTest();
  } catch (err) {
    console.error("❌ DB Error:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Lỗi khi truy vấn database. Vui lòng thử lại sau.");
  }
  await ctx.reply(`✅ Test command!`);
};

// const autoCheckinTest = async () => {
//   try {
//     const users = await queryAllDb(
//       "SELECT user_id, access_token FROM users WHERE is_auto_checkin = 1",
//     );
//     if (!users || users.length === 0) return;
//
//     await Promise.all(
//       users.map(async (user) => {
//         await setSession(user.user_id, { action: "checkin" });
//         if (!user.access_token) {
//           return sendMessage(user.user_id, "🔑 Bạn chưa có Access Token!");
//         }
//         try {
//           const response = await requestCheckin(user.access_token);
//           await deleteSession(user.user_id);
//           await sendMessage(
//             user.user_id,
//             response?.data?.message
//               ? "😏 Xong rồi! Khỏi cảm ơn"
//               : "❌ Ối dồi ôi, có biến rồi!",
//           );
//         } catch (error) {
//           console.error(`❌ [CHECK-IN] User ${user.user_id}: `, error);
//         }
//       }),
//     );
//   } catch (error) {
//     console.error("❌ [CHECK-IN] Lỗi khi chạy auto check-in:", error);
//   }
// };
