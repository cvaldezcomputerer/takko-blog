export const prerender = false;

export const POST = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ message: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await request.json();
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

    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is missing');
      return new Response(JSON.stringify({ message: 'Server configuration error' }), { status: 500 });
    }

    // Send email via Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Takko Blog Contact <onboarding@resend.dev>', // Use onboarding@resend.dev until you verify your domain
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
      return new Response(JSON.stringify({ message: 'Failed to send message.' }), { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), { status: 500 });
  }
};