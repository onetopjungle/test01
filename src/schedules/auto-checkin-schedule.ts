import cron from "node-cron";
import { queryAllDb } from "../stores/database";
import { requestCheckin } from "../commands/checkin";
import { deleteSession, setSession } from "../stores/session";
import { sendMessage } from "../services/bot-service";

// 🕰️ Giải thích múi giờ:
// Server đang chạy theo GMT, nhưng Việt Nam là GMT+7. Do đó, ta cần -7 giờ để đồng bộ với giờ Việt Nam.

// 🎲 Hàm tạo phút ngẫu nhiên từ 0 - 59
const getRandomMinute = () => Math.floor(Math.random() * 60);

// ⏳ Lưu trữ phút ngẫu nhiên cho sáng và tối
let randomMorningMinute = getRandomMinute();
let randomEveningMinute = getRandomMinute();

// 📅 Khởi động lịch check-in tự động
const scheduleRandomCheckin = () => {
  console.log("✅ [CRON] Bot đã khởi động lịch trình check-in!");
  console.log(`⏰ [Hôm nay check-in lúc]:`);
  console.log(`🌞 Sáng: 08:${randomMorningMinute.toString().padStart(2, "0")}`);
  console.log(`🌙 Tối: 18:${randomEveningMinute.toString().padStart(2, "0")}`);

  // 🕗 Cron job check-in sáng
  cron.schedule(`${randomMorningMinute} 1 * * 1-5`, async () => {
    console.log("🌞 Đang check-in buổi sáng...");
    await autoCheckin();
    console.log("✅ [Sáng] Tất cả người dùng đã check-in xong.");
  });

  // 🕕 Cron job check-in tối
  cron.schedule(`${randomEveningMinute} 11 * * 1-5`, async () => {
    console.log("🌙 Đang check-in buổi tối...");
    await autoCheckin();
    console.log("✅ [Tối] Tất cả người dùng đã check-in xong.");
  });

  // 🔄 Cập nhật thời gian check-in mới mỗi ngày lúc 00:00 (GMT+7)
  cron.schedule("0 17 * * 0-5", () => {
    randomMorningMinute = getRandomMinute();
    randomEveningMinute = getRandomMinute();
    console.log("🔄 [CẬP NHẬT] Giờ check-in mới cho ngày hôm nay:");
    console.log(
      `🌞 Sáng: 08:${randomMorningMinute.toString().padStart(2, "0")}`,
    );
    console.log(
      `🌙 Tối: 18:${randomEveningMinute.toString().padStart(2, "0")}`,
    );
  });
};

// 🤖 Hàm tự động check-in cho tất cả user
const autoCheckin = async () => {
  try {
    const users = await queryAllDb(`SELECT user_id, access_token FROM users`);

    if (!users || users.length === 0) {
      console.log("⚠️ [CHECK-IN] Không có người dùng nào để check-in.");
      return;
    }

    // 🚀 Check-in cho từng user song song
    const checkinPromises = users.map(async (user: any) => {
      await setSession(user.user_id, { action: "checkin" });

      if (!user.access_token) {
        return sendMessage(
          user.user_id,
          "🔑 Bạn chưa có Access Token! Vui lòng nhập Access Token của bạn.",
        );
      }

      // 🔍 Kiểm tra thời hạn Access Token
      const payload = JSON.parse(
        Buffer.from(user.access_token.split(".")[1], "base64").toString(),
      );
      if (payload.exp < (Date.now() + 7 * 60 * 60 * 1000) / 1000) {
        return sendMessage(
          user.user_id,
          "⏳ Access Token của bạn đã hết hạn! 🔄 Vui lòng nhập Access Token mới.",
        );
      }

      try {
        const response = await requestCheckin(user.access_token);
        await deleteSession(user.user_id);
        return sendMessage(
          user.user_id,
          `✅ [CHECK-IN-AUTO] Cho user ${user.user_id}:\n📌 Kết quả: ${
            response?.data?.message || "Thành công!"
          }`,
        );
      } catch (error) {
        console.error(`❌ [CHECK-IN-AUTO] Cho user ${user.user_id}: `, error);
      }
    });

    await Promise.all(checkinPromises);
    console.log("✅ [CHECK-IN-AUTO] Đã check-in hoàn tất cho tất cả user.");
  } catch (error) {
    console.error("❌ [CHECK-IN-AUTO] Lỗi khi chạy auto check-in:", error);
  }
};

// 🚀 Bắt đầu cron job
scheduleRandomCheckin();
