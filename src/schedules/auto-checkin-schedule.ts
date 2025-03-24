import cron from "node-cron";
import { queryAllDb } from "../stores/database";
import { requestCheckin } from "../commands/checkin";
import { deleteSession, setSession } from "../stores/session";
import { sendMessage } from "../services/bot-service";

const getRandomMinute = () => Math.floor(Math.random() * 60);
let randomMorningMinute = getRandomMinute();
let randomEveningMinute = getRandomMinute();

let morningJob: cron.ScheduledTask | null = null;
let eveningJob: cron.ScheduledTask | null = null;

const scheduleRandomCheckin = () => {
  console.log("✅ [CRON] Bot đã khởi động lịch trình check-in!");
  updateCheckinSchedule();
};

const updateCheckinSchedule = async () => {
  randomMorningMinute = getRandomMinute();
  randomEveningMinute = getRandomMinute();

  console.log("🔄 [CẬP NHẬT] Giờ check-in mới:");
  console.log(`🌞 Sáng: 08:${randomMorningMinute.toString().padStart(2, "0")}`);
  console.log(`🌙 Tối: 18:${randomEveningMinute.toString().padStart(2, "0")}`);

  if (morningJob) morningJob.stop();
  if (eveningJob) eveningJob.stop();

  morningJob = cron.schedule(`${randomMorningMinute} 8 * * 1-5`, async () => {
    console.log("🌞 Đang check-in buổi sáng...");
    await autoCheckin();
    console.log("✅ [Sáng] Check-in xong.");
  });

  eveningJob = cron.schedule(`${randomEveningMinute} 18 * * 1-5`, async () => {
    console.log("🌙 Đang check-in buổi tối...");
    await autoCheckin();
    console.log("✅ [Tối] Check-in xong.");
  });

  await notifyUsersForAutoCheckin(
      `08:${randomMorningMinute.toString().padStart(2, "0")}`,
      `18:${randomEveningMinute.toString().padStart(2, "0")}`,
  );
};

cron.schedule("0 17 * * 0-5", async () => {
  updateCheckinSchedule();
});

const autoCheckin = async () => {
  try {
    const users = await queryAllDb(
        "SELECT user_id, access_token FROM users WHERE is_auto_checkin = 1",
    );
    if (!users || users.length === 0) return;

    await Promise.all(
        users.map(async (user) => {
          await setSession(user.user_id, { action: "checkin" });
          if (!user.access_token) {
            return sendMessage(user.user_id, "🔑 Bạn chưa có Access Token!");
          }
          try {
            const response = await requestCheckin(user.access_token);
            await deleteSession(user.user_id);
            await sendMessage(
                user.user_id,
                response?.data?.message
                    ? "😏 Xong rồi! Khỏi cảm ơn"
                    : "❌ Ối dồi ôi, có biến rồi!",
            );
          } catch (error) {
            console.error(`❌ [CHECK-IN] User ${user.user_id}: `, error);
          }
        }),
    );
  } catch (error) {
    console.error("❌ [CHECK-IN] Lỗi khi chạy auto check-in:", error);
  }
};

const notifyUsersForAutoCheckin = async (
    morningTime: string,
    eveningTime: string,
) => {
  try {
    const users = await queryAllDb(
        "SELECT user_id FROM users WHERE is_auto_checkin = 1",
    );
    if (!users || users.length === 0) return;
    await Promise.all(
        users.map((user) =>
            sendMessage(
                user.user_id,
                `🔄 Giờ check-in mới:\n🌞 Sáng: ${morningTime}\n🌙 Tối: ${eveningTime}`,
            ),
        ),
    );
  } catch (error) {
    console.error("❌ [NOTIFY] Lỗi khi gửi thông báo:", error);
  }
};

scheduleRandomCheckin();
