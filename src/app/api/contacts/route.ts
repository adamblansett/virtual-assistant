import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { ContactItem, ContactItemSchema } from '@/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const contacts = query ? AppStorage.searchContacts(query) : AppStorage.listContacts();
    return NextResponse.json({ contacts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list contacts' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.id) {
      const existing = AppStorage.getContact(body.id);
      if (existing) {
        const updated: ContactItem = ContactItemSchema.parse({
          ...existing,
          ...body,
          updatedAt: new Date().toISOString()
        });
        AppStorage.saveContact(updated);
        return NextResponse.json({ success: true, contact: updated });
      }
    }

    const newContact: ContactItem = ContactItemSchema.parse({
      id: body.id || `ct_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: body.name,
      email: body.email,
      phone: body.phone,
      company: body.company,
      relationship: body.relationship || 'colleague',
      isVIP: body.isVIP ?? false,
      lastContacted: body.lastContacted,
      followUpCadenceDays: body.followUpCadenceDays,
      notes: body.notes || []
    });

    AppStorage.saveContact(newContact);
    return NextResponse.json({ success: true, contact: newContact });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save contact' }, { status: 400 });
  }
}
