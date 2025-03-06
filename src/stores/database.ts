import db from "../database/sqlite/db";

// Hàm hỗ trợ để chạy truy vấn lấy một dòng
export const queryDb = (sql: string, params: any[] = []) => {
  return new Promise<any>((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
};

// Hàm hỗ trợ để chạy truy vấn lấy nhiều dòng
export const queryAllDb = (sql: string, params: any[] = []) => {
  return new Promise<any[]>((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
};

// Hàm hỗ trợ để chạy truy vấn insert/update/delete
export const runDb = (sql: string, params: any[] = []) => {
  return new Promise<void>((resolve, reject) => {
    db.run(sql, params, (err) => (err ? reject(err) : resolve()));
  });
};

// Hàm hỗ trợ chạy transaction cho nhiều câu lệnh SQL
export const transactionDb = async (
  queries: { sql: string; params?: any[] }[],
) => {
  return new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      try {
        for (const query of queries) {
          db.run(query.sql, query.params || []);
        }
        db.run("COMMIT", () => resolve());
      } catch (err) {
        db.run("ROLLBACK", () => reject(err));
      }
    });
  });
};
