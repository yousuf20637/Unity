import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return NextResponse.json({ error: 'Missing GMAIL_USER or GMAIL_APP_PASSWORD env vars' }, { status: 500 });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"Apex Talent Group" <${user}>`,
      to: user,
      subject: 'Test email — Apex Talent Group',
      html: '<p>Email is working correctly.</p>',
    });

    return NextResponse.json({ success: true, sentTo: user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
