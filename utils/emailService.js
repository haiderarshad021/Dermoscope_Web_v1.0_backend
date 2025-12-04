const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // 1. Create Transporter
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'haider22.dev@gmail.com',
            pass: 'xsfy ylpc triv pmqz' // App Password provided by user
        }
    });

    // 2. Define Email Options
    const mailOptions = {
        from: '"Dermoscope Support" <haider22.dev@gmail.com>',
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html // Optional: for rich text emails
    };

    // 3. Send Email
    await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
