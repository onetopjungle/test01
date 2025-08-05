import axios from "axios";
import { listAddress } from "../constant";
import { deleteSession, setSession } from "../stores/session";
import { queryDb, runDb } from "../stores/database";
import { Context } from "telegraf";
import { isValidJWTFormat } from "../utils";

// Lệnh checkin
export const checkinCommand = async (ctx: Context) => {
  const userId = ctx.from?.id;
  if (!userId) return;

  await setSession(userId, { action: "checkin" });

  try {
    const row = await queryDb(
      `SELECT *
       FROM users
       WHERE user_id = ?`,
      [userId],
    );

    if (!row?.access_token) {
      return ctx.reply(
        "⚠️ Bạn chưa có access token. Vui lòng gửi token của bạn để tiếp tục.",
      );
    }

    if (!row?.meta_data) {
      return ctx.reply(
        "⚠️ Bạn chưa có config. Vui lòng set config của bạn để tiếp tục.",
      );
    }

    // Kiểm tra token hết hạn
    const tokenParts = row.access_token.split(".");
    if (tokenParts.length !== 3) {
      return ctx.reply(
        "❌ Access token không hợp lệ. Vui lòng gửi lại token hợp lệ.",
      );
    }

    const payload = JSON.parse(Buffer.from(tokenParts[1], "base64").toString());
    if (payload.exp < Date.now() / 1000) {
      return ctx.reply("⏳ Token đã hết hạn. Vui lòng gửi token mới.");
    }

    const response = await requestCheckin(row.meta_data, row.access_token);
    await deleteSession(userId);
    if (response?.data?.message) {
      return ctx.reply(response?.data?.message);
    } else {
      await runDb(
        `UPDATE users
         SET access_token = ?
         WHERE user_id = ?`,
        [null, userId],
      );
      console.log("Lỗi check-in không trả về message");
      return ctx.reply("❌ Lỗi khi check-in");
    }
  } catch (err) {
    console.error("❌ Lỗi khi check-in:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Đã có lỗi xảy ra khi check-in. Vui lòng thử lại sau.");
  }
};

export const checkin = async (ctx: any) => {
  const userId = ctx.from?.id;
  const messageText = ctx.message?.text;

  if (!isValidJWTFormat(messageText)) {
    await deleteSession(userId);
    return ctx.reply("🚫 Access token không hợp lệ. Vui lòng nhập lại.");
  }

  try {
    await runDb(
      `UPDATE users
       SET access_token = ?
       WHERE user_id = ?`,
      [messageText, userId],
    );

    const row = await queryDb(
      `SELECT *
       FROM users
       WHERE user_id = ?`,
      [userId],
    );

    if (!row?.meta_data) {
      return ctx.reply(
        "⚠️ Bạn chưa có config. Vui lòng set config của bạn để tiếp tục.",
      );
    }

    const response = await requestCheckin(row.meta_data, messageText);
    if (response?.response?.status === 400) {
      await deleteSession(userId);
      await runDb(
        `UPDATE users
         SET access_token = ?
         WHERE user_id = ?`,
        [null, userId],
      );
      return ctx.reply(
        "❌ Check-in thất bại! Token không hợp lệ hoặc đã hết hạn.",
      );
    }

    await deleteSession(userId);
    if (response?.data?.message) {
      return ctx.reply(response?.data?.message);
    } else {
      await runDb(
        `UPDATE users
         SET access_token = ?
         WHERE user_id = ?`,
        [null, userId],
      );
      console.log("Lỗi check-in không trả về message");
      return ctx.reply("❌ Lỗi khi check-in");
    }
  } catch (err) {
    console.error("❌ Lỗi khi check-in:", err);
    await deleteSession(userId);
    return ctx.reply("⚠️ Có lỗi xảy ra khi check-in. Vui lòng thử lại sau.");
  }
};

// Gọi API checkin
export const requestCheckin = async (metaData: string, accessToken: string) => {
  try {
    const parsed = parseSimpleCurl(metaData);

    if (!parsed || !parsed.url) {
      console.error("❌ Không parse được cURL hoặc thiếu URL.");
      return null;
    }

    const center = { lat: 21.0315416, lng: 105.7872872 };
    const pickAddress = getRandomNearbyLocation(center.lat, center.lng, 100);

    // const pickAddress =
    //   listAddress[Math.floor(Math.random() * listAddress.length)]; // fix cứng address

    const headers = {
      ...parsed.headers,
      Authorization: accessToken,
      "x-timestamp": `${Date.now() + 7 * 60 * 60 * 1000}`,
    };

    // Nếu cURL có body → ưu tiên dùng
    let data: any = undefined;

    if (parsed.body) {
      try {
        // Nếu là JSON → parse object
        if (parsed.headers["Content-Type"]?.includes("application/json")) {
          data = JSON.parse(parsed.body);
        } else {
          // Nếu là form → parse thủ công
          data = Object.fromEntries(
            parsed.body.split("&").map((pair) => {
              const [key, value] = pair.split("=");
              return [key, decodeURIComponent(value || "")];
            }),
          );
        }
      } catch (e) {
        console.warn("⚠️ Không parse được body từ metaData, bỏ qua:", e);
      }
    }

    data = {
      ...data,
      ...pickAddress,
    };

    const response = await axios({
      method: parsed.method?.toLowerCase() || "post",
      url: parsed.url,
      headers,
      data,
    });

    return response.data;
  } catch (error) {
    console.error("❌ Lỗi khi gửi request từ meta:", error);
    return error;
  }
};

export function parseSimpleCurl(curl: string): {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | undefined;
} {
  const lines = curl
    .split(/\\\n|\\\r\n|[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: string | undefined;
  } = {
    url: "",
    method: "POST",
    headers: {},
    body: undefined,
  };

  for (const line of lines) {
    if (line.startsWith("curl")) {
      const urlMatch = line.match(/curl\s+'([^']+)'/);
      if (urlMatch) result.url = urlMatch[1];
      const methodMatch = line.match(/-X\s+(\w+)/);
      if (methodMatch) result.method = methodMatch[1].toUpperCase();
    } else if (line.startsWith("-H")) {
      const headerMatch = line.match(/-H\s+'([^:]+):\s*(.+)'/);
      if (headerMatch) {
        const key = headerMatch[1];
        const value = headerMatch[2];
        result.headers[key] = value;
      }
    } else if (line.startsWith("--data-raw")) {
      const bodyMatch = line.match(/--data-raw\s+'(.+)'/);
      if (bodyMatch) result.body = bodyMatch[1];
    }
  }

  return result;
}

function getRandomNearbyLocation(
  lat: number,
  lng: number,
  radiusInMeters = 100,
) {
  const radiusInDegrees = radiusInMeters / 111320;

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;

  const deltaLat = w * Math.cos(t);
  const deltaLng = (w * Math.sin(t)) / Math.cos(lat * (Math.PI / 180));

  const newLat = lat + deltaLat;
  const newLng = lng + deltaLng;

  return { latitude: newLat, longitude: newLng };
}
