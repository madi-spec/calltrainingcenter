import { createAdminClient } from '../lib/supabase.js';
import { buildGraphSummary } from './knowledgeGraph.js';

export async function publishVersion(orgId, sessionId, versionId) {
  const supabase = createAdminClient();

  const { data: version, error: versionError } = await supabase
    .from('program_versions')
    .select('id, status, org_id')
    .eq('id', versionId)
    .single();

  if (versionError || !version) {
    throw new Error(`Version not found: ${versionError?.message ?? 'no record'}`);
  }
  if (version.org_id !== orgId) {
    throw new Error('Version does not belong to this organization');
  }
  if (version.status === 'published') {
    throw new Error('Version is already published');
  }
  if (version.status === 'generating') {
    throw new Error('Version is still generating');
  }

  const { error: archiveError } = await supabase
    .from('program_versions')
    .update({ status: 'archived' })
    .eq('org_id', orgId)
    .eq('status', 'published');

  if (archiveError) {
    throw new Error(`Failed to archive existing versions: ${archiveError.message}`);
  }

  const { error: publishError } = await supabase
    .from('program_versions')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', versionId);

  if (publishError) {
    throw new Error(`Failed to publish version: ${publishError.message}`);
  }

  const { error: sessionError } = await supabase
    .from('studio_sessions')
    .update({ status: 'published', published_version_id: versionId })
    .eq('id', sessionId);

  if (sessionError) {
    throw new Error(`Failed to update studio session: ${sessionError.message}`);
  }

  const kbAgentContext = await buildGraphSummary(orgId);

  const { data: org, error: orgFetchError } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .single();

  if (orgFetchError) {
    throw new Error(`Failed to fetch organization: ${orgFetchError.message}`);
  }

  const settings = org.settings ?? {};
  const customPrompts = settings.customPrompts ?? {};
  const updatedSettings = {
    ...settings,
    customPrompts: { ...customPrompts, kbAgentContext }
  };

  const { error: orgUpdateError } = await supabase
    .from('organizations')
    .update({ settings: updatedSettings, products_configured: true })
    .eq('id', orgId);

  if (orgUpdateError) {
    throw new Error(`Failed to update organization settings: ${orgUpdateError.message}`);
  }

  const { error: coursesError } = await supabase
    .from('courses')
    .update({ is_active: true })
    .eq('version_id', versionId);

  if (coursesError) {
    throw new Error(`Failed to activate courses: ${coursesError.message}`);
  }

  return { published: true, versionId };
}

export async function getVersionDetails(versionId) {
  const supabase = createAdminClient();

  const [versionResult, coursesResult, scriptsResult, scenariosResult] = await Promise.all([
    supabase
      .from('program_versions')
      .select('*')
      .eq('id', versionId)
      .single(),

    supabase
      .from('courses')
      .select('*, course_modules(*)')
      .eq('version_id', versionId),

    supabase
      .from('generated_scripts')
      .select('*')
      .eq('version_id', versionId),

    supabase
      .from('scenario_templates')
      .select('*, course_modules(name)')
      .eq('version_id', versionId)
  ]);

  if (versionResult.error) {
    throw new Error(`Failed to fetch version: ${versionResult.error.message}`);
  }

  return {
    version: versionResult.data,
    courses: coursesResult.data ?? [],
    scripts: scriptsResult.data ?? [],
    scenarios: scenariosResult.data ?? []
  };
}
