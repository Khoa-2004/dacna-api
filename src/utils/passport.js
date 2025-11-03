import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { pool } from "../db.js";

dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName;
        const avatar = profile.photos?.[0]?.value;
        const providerId = profile.id;

        if (!email) {
          return done(new Error("Google không trả về email"), null);
        }

        // Tìm trong DB
        let [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
          email,
        ]);

        // Chưa có thì tạo mới
        if (rows.length === 0) {
          const username = email.split("@")[0];
          await pool.query(
            `INSERT INTO users (username, email, pw, roles, auth_provider, auth_provider_id, verified)
             VALUES (?, ?, '', 'customer', 'google', ?, 1)`,
            [username, email, providerId]
          );

          // Lấy lại user sau khi insert
          ;[rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
            email,
          ]);

          console.log("✅ User mới đã được tạo:", email);
        } else {
          console.log("🔁 User đã tồn tại:", email);
        }

        const user = rows[0];

        // Đưa vào session
        done(null, {
          id: user.id,
          email: user.email,
          name: user.username || name,
          avatar,
          role: user.roles,
          provider: user.auth_provider,
        });
      } catch (err) {
        console.error("❌ Lỗi khi xử lý OAuth2:", err);
        done(err, null);
      }
    }
  )
);

// lưu vào session
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

export default passport;
