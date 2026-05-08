import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePermission } from '@/lib/permissionCheck';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'applications.view');
  if (!check.ok) return check.response;

  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabase.auth.admin.getUserById(id),
    supabase.from('candidate_profiles').select('*').eq('user_id', id).single(),
  ]);

  if (!userData?.user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const email = userData.user.email ?? '';
  const { data: applications } = await supabase
    .from('applications')
    .select('*')
    .eq('email', email)
    .order('created_at', { ascending: false });

  return NextResponse.json({
    id: userData.user.id,
    email,
    fullName: (userData.user.user_metadata?.full_name as string) ?? '',
    createdAt: userData.user.created_at,
    profile: profile ?? null,
    applications: applications ?? [],
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const check = await requirePermission(request, 'applications.delete');
  if (!check.ok) return check.response;

  const { id } = await params;
  const supabase = createAdminClient();

  // Delete profile and auth user
  await supabase.from('candidate_profiles').delete().eq('user_id', id);
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
