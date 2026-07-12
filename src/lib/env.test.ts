import { getOptionalEnv, hasPostgresUrl } from "./env";

describe("env helpers", () => {
  const originalEnv = {
    POSTGRES_URL: process.env.POSTGRES_URL,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
    SESSION_SECRET: process.env.SESSION_SECRET,
    APP_BASE_URL: process.env.APP_BASE_URL
  };

  afterEach(() => {
    process.env.POSTGRES_URL = originalEnv.POSTGRES_URL;
    process.env.BLOB_READ_WRITE_TOKEN = originalEnv.BLOB_READ_WRITE_TOKEN;
    process.env.ADMIN_PASSWORD_HASH = originalEnv.ADMIN_PASSWORD_HASH;
    process.env.SESSION_SECRET = originalEnv.SESSION_SECRET;
    process.env.APP_BASE_URL = originalEnv.APP_BASE_URL;
  });

  it("treats blank optional environment variables as undefined", () => {
    process.env.POSTGRES_URL = "";
    process.env.BLOB_READ_WRITE_TOKEN = "";
    process.env.ADMIN_PASSWORD_HASH = "";
    process.env.SESSION_SECRET = "";
    process.env.APP_BASE_URL = "";

    expect(getOptionalEnv()).toEqual({
      POSTGRES_URL: undefined,
      BLOB_READ_WRITE_TOKEN: undefined,
      ADMIN_PASSWORD_HASH: undefined,
      SESSION_SECRET: undefined,
      APP_BASE_URL: undefined
    });
    expect(hasPostgresUrl()).toBe(false);
  });

  it("rejects a 31-character session secret and accepts 32 characters", () => {
    process.env.APP_BASE_URL = "http://localhost:3000";
    process.env.SESSION_SECRET = "a".repeat(31);
    expect(() => getOptionalEnv()).toThrow();

    process.env.SESSION_SECRET = "a".repeat(32);
    expect(getOptionalEnv().SESSION_SECRET).toBe("a".repeat(32));
  });
});
