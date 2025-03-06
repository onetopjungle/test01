import cron from "node-cron";
import { queryAllDb } from "../stores/database";
import { requestCheckin } from "../commands/checkin";
import { deleteSession, setSession } from "../stores/session";
import { sendMessage } from "../services/bot-service";

// Hàm để tạo cron job chạy ngẫu nhiên vào mỗi ngày từ thứ 2 đến thứ 6
const scheduleRandomCheckin = () => {
  // Tạo thời gian ngẫu nhiên vào buổi sáng (8:00 - 9:00)
  const randomMorningMinute = getRandomMinute();
  console.log(
    `⏰ Check-in ngẫu nhiên vào buổi sáng lúc 8:${randomMorningMinute < 10 ? "0" + randomMorningMinute : randomMorningMinute}`,
  );
  cron.schedule(`${randomMorningMinute} 1 * * 1-5`, async () => {
    console.log("Đang check-in buổi sáng...");
    await autoCheckin();
    console.log("✅ Check-in buổi sáng xong.");
  });

  // Tạo thời gian ngẫu nhiên vào buổi tối (18:00 - 19:00)
  const randomEveningMinute = getRandomMinute();
  console.log(
    `⏰ Check-in ngẫu nhiên vào buổi tối lúc 18:${randomEveningMinute < 10 ? "0" + randomEveningMinute : randomEveningMinute}`,
  );
  cron.schedule(`${randomEveningMinute} 11 * * 1-5`, async () => {
    console.log("Đang check-in buổi tối...");
    await autoCheckin();
    console.log("✅ Check-in buổi tối xong.");
  });

  // logs cron job chạy ngẫu nhiên vào mỗi 00:00 từ thứ 2 đến thứ 6
  cron.schedule("0 17 * * 1-5", async () => {
    console.log(
      `⏰ Check-in ngẫu nhiên vào buổi sáng lúc 8:${randomMorningMinute < 10 ? "0" + randomMorningMinute : randomMorningMinute}`,
    );
    console.log(
      `⏰ Check-in ngẫu nhiên vào buổi tối lúc 18:${randomEveningMinute < 10 ? "0" + randomEveningMinute : randomEveningMinute}`,
    );
  });
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
      if (payload.exp < Date.now() / 1000) {
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
