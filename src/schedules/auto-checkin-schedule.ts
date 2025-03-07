import cron from "node-cron";
import { queryAllDb } from "../stores/database";
import { requestCheckin } from "../commands/checkin";
import { deleteSession, setSession } from "../stores/session";
import { sendMessage } from "../services/bot-service";

// Hàm để tạo cron job chạy ngẫu nhiên vào mỗi ngày từ thứ 2 đến thứ 6
const scheduleRandomCheckin = () => {
  // Cron job reset lại giờ checkin mỗi ngày lúc 00:00 (GMT+7)
  cron.schedule("0 17 * * 1-5", () => {
    // 00:00 giờ Việt Nam (GMT+7)
    const randomMorningMinute = getRandomMinute();
    const randomEveningMinute = getRandomMinute();

    console.log(
      `🔄 Cập nhật thời gian mới:`,
      `\n⏰ Sáng: 8:${randomMorningMinute < 10 ? "0" + randomMorningMinute : randomMorningMinute}`,
      `\n⏰ Tối: 18:${randomEveningMinute < 10 ? "0" + randomEveningMinute : randomEveningMinute}`,
    );

    // Xóa các job cũ trước khi tạo job mới
    cron.getTasks().forEach((task) => task.stop());

    // Tạo cron job mới với thời gian random
    cron.schedule(`${randomMorningMinute} 1 * * 1-5`, async () => {
      console.log("Đang check-in buổi sáng...");
      await autoCheckin();
      console.log("✅ Check-in buổi sáng xong.");
    });

    cron.schedule(`${randomEveningMinute} 11 * * 1-5`, async () => {
      console.log("Đang check-in buổi tối...");
      await autoCheckin();
      console.log("✅ Check-in buổi tối xong.");
    });
  });

  console.log("✅ Cron job cập nhật thời gian check-in đã được khởi động!");
};

const autoCheckin = async () => {
  try {
    const users = await queryAllDb(`SELECT user_id, access_token FROM users`);

    if (!users || users.length === 0) {
      console.log("⚠️ Không có user nào để check-in.");
      return;
    }

    // Dùng Promise.all để chạy các yêu cầu song song
    const checkinPromises = users.map(async (user: any) => {
      await setSession(user.user_id, { action: "checkin" });

      if (!user.access_token) {
        return sendMessage(
          user.user_id,
          "👀 Bạn chưa có access token. Vui lòng nhập access token",
        );
      }

      // Kiểm tra token hết hạn
      const payload = JSON.parse(
        Buffer.from(user.access_token.split(".")[1], "base64").toString(),
      );
      if (payload.exp < (Date.now() + 7 * 60 * 60 * 1000) / 1000) {
        return sendMessage(
          user.user_id,
          "👀 Access token hết hạn. Vui lòng nhập access token mới.",
        );
      }

      try {
        const response = await requestCheckin(user.access_token);
        await deleteSession(user.user_id);
        return sendMessage(
          user.user_id,
          `✅ Check-in cho user ${user.user_id}:\nKết quả: ${response?.data?.message || "Thành công!"}`,
        );
      } catch (error) {
        console.error(`❌ Lỗi check-in cho user ${user.user_id}:`, error);
      }
    });

    await Promise.all(checkinPromises);
    console.log("✅ Tất cả các user đã check-in xong.");
  } catch (error) {
    console.error("❌ Lỗi khi chạy auto check-in:", error);
  }
};

// Hàm để tạo thời gian ngẫu nhiên trong khoảng 0 - 59 phút
const getRandomMinute = () => {
  return Math.floor(Math.random() * 60); // Giới hạn từ 0 đến 59 phút
};

// Đặt lịch cron job cho ngày bắt đầu
scheduleRandomCheckin();
