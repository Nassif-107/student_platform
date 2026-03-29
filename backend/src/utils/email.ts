import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Check if SMTP is configured via environment variables
const SMTP_CONFIGURED = !!(env.SMTP_HOST && env.SMTP_USER);

/**
 * Send an email.
 *
 * - When SMTP env vars are present AND nodemailer is installed → sends via SMTP.
 * - When SMTP env vars are present but nodemailer is missing → logs a helpful message.
 * - Otherwise (dev mode) → logs the email to the console.
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  if (SMTP_CONFIGURED) {
    try {
      // Attempt dynamic import — succeeds only when nodemailer is installed
      // @ts-expect-error nodemailer is an optional dependency
      const nodemailer = await import('nodemailer');

      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: (env.SMTP_PORT ?? 587) === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: env.SMTP_FROM ?? env.SMTP_USER,
        to: options.to,
        subject: options.subject,
        html: options.html,
      });

      logger.info(
        `[Email] Sent to ${options.to} — subject: "${options.subject}"`,
      );
    } catch (err: unknown) {
      // If nodemailer is not installed, the import will throw
      const isModuleNotFound =
        err instanceof Error &&
        ('code' in err && (err as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND');

      if (isModuleNotFound) {
        logger.info(
          `[Email] SMTP configured but nodemailer not installed. Install with: pnpm add nodemailer @types/nodemailer`,
        );
        logger.info(
          JSON.stringify({
            to: options.to,
            subject: options.subject,
            note: 'Email would be sent via SMTP',
          }),
        );
      } else {
        logger.error('[Email] Failed to send email:', err);
        throw err;
      }
    }

    return;
  }

  // Dev mode: SMTP not configured — just log the email
  logger.info(
    JSON.stringify({
      to: options.to,
      subject: options.subject,
    }),
    '[Email] Dev mode — email logged (SMTP not configured)',
  );

  if (env.NODE_ENV !== 'production') {
    logger.debug('[Email] HTML content:\n' + options.html);
  }
}
