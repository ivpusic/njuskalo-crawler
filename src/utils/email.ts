import * as nodemailer from 'nodemailer';
import { config } from '../config';

const transporter = nodemailer.createTransport({
  service: config.emailTransport,
  auth: {
    user: config.emailAuthUsername,
    pass: config.emailAuthPassword,
  }
});

export const sendEmail = async function send(receiver: string | string[], subject: string, html: string): Promise<nodemailer.SentMessageInfo> {
  const mailOptions = {
    from: config.emailFrom,
    to: receiver,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
}
