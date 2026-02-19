export const prerender = false;

/**
 * @typedef {object} ContactRequestBody
 * @property {string} name
 * @property {string} email
 * @property {string} subject
 * @property {string} message
 * @property {string} [trap]
 */

/** @type {import('astro').APIRoute} */
export const POST = async ({ request, locals }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = /** @type {ContactRequestBody} */ (await request.json());
    const { name, email, subject, message, trap } = body;

    // Honeypot check: Silent drop
    if (trap) {
      // Return 200 OK so the bot thinks it succeeded, but do NOT send the email.
      return new Response(JSON.stringify({ message: 'Message sent successfully!' }), { status: 200 });
    }

    // Basic validation
    if (!name || !email || !subject || !message) {
      return new Response(JSON.stringify({ message: 'Missing required fields' }), { status: 400 });
    }

    // Server-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ message: 'Invalid email address' }), { status: 400 });
    }

    // Try to get the key from Cloudflare runtime env (locals) first, then fallback to import.meta.env
    const RESEND_API_KEY = locals?.runtime?.env?.RESEND_API_KEY || import.meta.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ message: 'Missing RESEND_API_KEY environment variable' }), { status: 500 });
    }

    // Send email via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
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

    if (res.ok) {
      return new Response(JSON.stringify({ message: 'Message sent successfully!' }), { status: 200 });
    } else {
      const errorData = /** @type {{ message?: string }} */ (await res.json());
      return new Response(JSON.stringify({ message: errorData.message || JSON.stringify(errorData) }), { status: 500 });
    }
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ message }), { status: 500 });
  }
};
