export const isValidJWTFormat = (accessToken: string): boolean => {
  const regex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
  return regex.test(accessToken); // Kiểm tra xem token có đúng định dạng không
};
