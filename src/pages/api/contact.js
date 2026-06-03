export const prerender = false;

import { env } from "cloudflare:workers";

/**
 * @typedef {object} ContactRequestBody
 * @property {string} name
 * @property {string} email
 * @property {string} subject
 * @property {string} message
 * @property {string} [trap]
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** @param {ContactRequestBody} body @returns {string | null} */
function validateBody({ name, email, subject, message }) {
  if (!name || !email || !subject || !message) return 'Missing required fields';
  if (!EMAIL_REGEX.test(email)) return 'Invalid email address';
  return null;
}

/** @param {ContactRequestBody} body @param {string} apiKey */
function sendEmail({ name, email, subject, message }, apiKey) {
  return fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: 'Takko Blog <contact@contact.bloggydoggy.com>',
      to: 'blogggydogggy@gmail.com',
      reply_to: email,
      subject: `[Contact Form] ${subject}`,
      html: `
        <h3>New message from ${name}</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <div style="margin-top: 20px; padding: 20px; background-color: #f3f4f6; border-radius: 8px;">
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      `,
    }),
  });
}

/** @type {import('astro').APIRoute} */
export const POST = async ({ request }) => {
  try {
    const body = /** @type {ContactRequestBody} */ (await request.json());

    if (body.trap) {
      return new Response(JSON.stringify({ message: 'Message sent successfully!' }), { status: 200 });
    }

    const validationError = validateBody(body);
    if (validationError) {
      return new Response(JSON.stringify({ message: validationError }), { status: 400 });
    }

    const apiKey = env.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ message: 'Missing RESEND_API_KEY environment variable' }), { status: 500 });
    }

    const res = await sendEmail(body, apiKey);
    if (res.ok) {
      return new Response(JSON.stringify({ message: 'Message sent successfully!' }), { status: 200 });
    }

    const errorData = /** @type {{ message?: string }} */ (await res.json());
    return new Response(JSON.stringify({ message: errorData.message || JSON.stringify(errorData) }), { status: 500 });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
};
