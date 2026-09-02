const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const sendResetPasswordEmail = async ({
  email,
  full_name,
  resetUrl
}) => {
  await transporter.sendMail({
    from: `"Digital Scoring" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Reset Password",
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Reset Password</h2>

        <p>
          Halo ${full_name || "User"},
        </p>

        <p>
          Kami menerima permintaan untuk melakukan reset password
          akun Anda.
        </p>

        <p>
          Klik tombol berikut untuk membuat password baru:
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#1976d2;
              color:white;
              text-decoration:none;
              border-radius:6px;
            "
          >
            Reset Password
          </a>
        </p>

        <p>
          Link ini hanya berlaku selama 15 menit.
        </p>

        <p>
          Jika Anda tidak meminta reset password,
          abaikan email ini.
        </p>
      </div>
    `
  });
};

module.exports = {
  sendResetPasswordEmail
};