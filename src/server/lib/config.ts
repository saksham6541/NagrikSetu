export const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
export const JWT_TTL_HOURS = parseInt(process.env.JWT_TTL_HOURS || "24", 10);
export const PORT = parseInt(process.env.PORT || "3000", 10);
export const UPLOADS_DIR = "uploads";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";
