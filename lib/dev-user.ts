// DEV MODE: Mock user for development without authentication
// Replace this with a real Supabase user ID once auth is enabled

export const DEV_USER_ID = "00000000-0000-0000-0000-000000000001";
export const DEV_USER_PHONE = "9999999999";

export function getDevUser() {
  return {
    id: DEV_USER_ID,
    phone: DEV_USER_PHONE,
  };
}
