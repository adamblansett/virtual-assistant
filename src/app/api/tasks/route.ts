import { NextRequest, NextResponse } from 'next/server';
import { AppStorage } from '@/lib/storage/db';
import { TaskItem, TaskItemSchema } from '@/types';

export async function GET() {
  try {
    const tasks = AppStorage.listTasks();
    return NextResponse.json({ tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to list tasks' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Toggle completion or create
    if (body.action === 'toggle' && body.id) {
      const existing = AppStorage.getTask(body.id);
      if (!existing) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      existing.status = existing.status === 'completed' ? 'todo' : 'completed';
      existing.updatedAt = new Date().toISOString();
      AppStorage.saveTask(existing);
      return NextResponse.json({ success: true, task: existing });
    }

    const newTask: TaskItem = TaskItemSchema.parse({
      id: `tsk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      title: body.title,
      description: body.description,
      priority: body.priority || 'medium',
      status: body.status || 'todo',
      dueDate: body.dueDate,
      source: body.source || 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    AppStorage.saveTask(newTask);
    return NextResponse.json({ success: true, task: newTask });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save task' }, { status: 400 });
  }
}
