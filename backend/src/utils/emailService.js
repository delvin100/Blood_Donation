const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Sends a password reset email using NodeMailer.
 * @param {string} email - Recipient's email.
 * @param {string} resetLink - The reset link to include in the email.
 * @param {string} userName - (Optional) Recipient's name.
 */
exports.sendResetEmail = async (email, resetLink, userName = 'User') => {
    const mailOptions = {
        from: `"eBloodBank Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - eBloodBank',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h1 style="color: white; margin: 0;">eBloodBank</h1>
                </div>
                <div style="padding: 30px; line-height: 1.6; color: #333;">
                    <h2>Hello ${userName},</h2>
                    <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
                    <p>To reset your password, please click the button below:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="background-color: #dc2626; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                    </div>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
                    <p>This link will expire in 1 hour.</p>
                </div>
                <div style="background-color: #f9f9f9; padding: 20px; text-align: center; color: #888; font-size: 12px;">
                    © 2026 eBloodBank Security Protocol. All rights reserved.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Password reset email sent to ${email} via NodeMailer.`);
    } catch (error) {
        console.error('Error sending email via NodeMailer:', error);
        throw new Error('Failed to send reset email via NodeMailer.');
    }
};
