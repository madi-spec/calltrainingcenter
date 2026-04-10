import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { ingestDocument, extractFromUrl, extractFromText } from '../services/documentIngestion.js';
import { processMessage, generateWelcomeMessage } from '../services/interviewAgent.js';
import { getKnowledgeItems, getKnowledgeCoverageStats, updateKnowledgeItem, deleteKnowledgeItem } from '../services/knowledgeGraph.js';
import { validateKnowledgeGraph } from '../services/contentValidator.js';
import { generateTrainingProgram } from '../services/contentGenerator.js';
import { publishVersion, getVersionDetails } from '../services/programPublisher.js';

const router = Router();

// All routes require admin
router.use(authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'));

// ============================================================
// SESSION MANAGEMENT
// ============================================================

router.post('/sessions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .insert({
        organization_id: req.organization.id,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Create session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*, creator:users(name, email), published_version:program_versions(version_number, quality_score)')
      .eq('organization_id', req.organization.id)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[Studio] List sessions error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_sessions')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Session not found' });

    // Also fetch documents and coverage stats
    const [{ data: docs }, coverageStats] = await Promise.all([
      supabase.from('kb_documents').select('*').eq('session_id', data.id).order('created_at'),
      getKnowledgeCoverageStats(req.organization.id)
    ]);

    res.json({ ...data, documents: docs || [], coverageStats });
  } catch (error) {
    console.error('[Studio] Get session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from('studio_sessions')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ archived: true });
  } catch (error) {
    console.error('[Studio] Archive session error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// DOCUMENT UPLOAD & INGESTION
// ============================================================

router.post('/sessions/:id/documents', async (req, res) => {
  try {
    const { files } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;
    const results = [];

    for (const file of files) {
      // Create document record
      const { data: docRecord, error: docError } = await supabase
        .from('kb_documents')
        .insert({
          organization_id: orgId,
          session_id: sessionId,
          filename: file.name,
          file_type: file.type,
          file_size: file.size || 0,
          source_type: 'upload'
        })
        .select()
        .single();

      if (docError) {
        results.push({ filename: file.name, error: docError.message });
        continue;
      }

      // Decode and ingest
      try {
        const buffer = Buffer.from(file.data, 'base64');
        const result = await ingestDocument(orgId, sessionId, docRecord, buffer, file.data);
        results.push({
          filename: file.name,
          documentId: docRecord.id,
          classification: result.document.doc_classification,
          itemsExtracted: result.items.length,
          summary: result.summary
        });
      } catch (ingestError) {
        results.push({ filename: file.name, documentId: docRecord.id, error: ingestError.message });
      }
    }

    // Generate welcome/update message after all docs processed
    const welcome = await generateWelcomeMessage(sessionId);

    res.json({ documents: results, message: welcome.message, coverageStats: welcome.coverageStats });
  } catch (error) {
    console.error('[Studio] Upload error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/documents/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'No URL provided' });

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    // Create document record
    const { data: docRecord } = await supabase
      .from('kb_documents')
      .insert({
        organization_id: orgId,
        session_id: sessionId,
        filename: new URL(url).hostname,
        file_type: 'text/html',
        source_type: 'url',
        source_url: url
      })
      .select()
      .single();

    const { text, metadata } = await extractFromUrl(url);
    const buffer = Buffer.from(text, 'utf-8');

    const result = await ingestDocument(orgId, sessionId, docRecord, buffer, null);

    res.json({
      documentId: docRecord.id,
      classification: result.document.doc_classification,
      itemsExtracted: result.items.length,
      summary: result.summary
    });
  } catch (error) {
    console.error('[Studio] URL scrape error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/documents/paste', async (req, res) => {
  try {
    const { text, title } = req.body;
    if (!text) return res.status(400).json({ error: 'No text provided' });

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    const { data: docRecord } = await supabase
      .from('kb_documents')
      .insert({
        organization_id: orgId,
        session_id: sessionId,
        filename: title || 'Pasted content',
        file_type: 'text/plain',
        file_size: text.length,
        source_type: 'paste'
      })
      .select()
      .single();

    const buffer = Buffer.from(text, 'utf-8');
    const result = await ingestDocument(orgId, sessionId, docRecord, buffer, null);

    res.json({
      documentId: docRecord.id,
      classification: result.document.doc_classification,
      itemsExtracted: result.items.length
    });
  } catch (error) {
    console.error('[Studio] Paste error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/documents', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('kb_documents')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CHAT / INTERVIEW
// ============================================================

router.post('/sessions/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const result = await processMessage(req.params.id, message);
    res.json(result);
  } catch (error) {
    console.error('[Studio] Chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/chat', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const { data, error } = await supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// KNOWLEDGE GRAPH
// ============================================================

router.get('/sessions/:id/knowledge', async (req, res) => {
  try {
    const domain = req.query.domain || undefined;
    const items = await getKnowledgeItems(req.organization.id, { domain });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/knowledge/stats', async (req, res) => {
  try {
    const [stats, issues] = await Promise.all([
      getKnowledgeCoverageStats(req.organization.id),
      validateKnowledgeGraph(req.organization.id)
    ]);
    res.json({ ...stats, validationIssues: issues });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/sessions/:id/knowledge/:itemId', async (req, res) => {
  try {
    const { title, content, domain, admin_verified } = req.body;
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (content !== undefined) updates.content = content;
    if (domain !== undefined) updates.domain = domain;
    if (admin_verified !== undefined) updates.admin_verified = admin_verified;

    const item = await updateKnowledgeItem(req.params.itemId, updates);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id/knowledge/:itemId', async (req, res) => {
  try {
    await deleteKnowledgeItem(req.params.itemId);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GENERATION & VERSIONS
// ============================================================

router.post('/sessions/:id/generate', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;

    // Get session for interview context
    const { data: session } = await supabase
      .from('studio_sessions')
      .select('interview_context')
      .eq('id', sessionId)
      .single();

    // Update session status
    await supabase.from('studio_sessions').update({
      status: 'generating',
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);

    // Generate
    const version = await generateTrainingProgram(
      orgId, sessionId, session?.interview_context || {}
    );

    // Update session status
    await supabase.from('studio_sessions').update({
      status: 'reviewing',
      updated_at: new Date().toISOString()
    }).eq('id', sessionId);

    // Store generation message in chat
    await supabase.from('studio_messages').insert({
      session_id: sessionId,
      role: 'assistant',
      content: `Training program v${version.generation_stats.courses ? version.generation_stats.courses : '?'} generated! Created ${version.generation_stats.courses} courses, ${version.generation_stats.scenarios} scenarios, and ${version.generation_stats.scripts} scripts.${version.quality_score ? ` Average quality score: ${Math.round(version.quality_score)}/100.` : ''} Check the preview panels to review.`,
      message_type: 'generation',
      metadata: { versionId: version.id, stats: version.generation_stats }
    });

    res.json(version);
  } catch (error) {
    console.error('[Studio] Generate error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('program_versions')
      .select('*')
      .eq('session_id', req.params.id)
      .order('version_number', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId', async (req, res) => {
  try {
    const details = await getVersionDetails(req.params.vId);
    res.json(details);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/scripts', async (req, res) => {
  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('generated_scripts')
      .select('*')
      .eq('version_id', req.params.vId)
      .order('script_type, created_at');

    if (req.query.type) query = query.eq('script_type', req.query.type);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/courses', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('courses')
      .select('*, modules:course_modules(*)')
      .eq('version_id', req.params.vId)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/sessions/:id/versions/:vId/scenarios', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('scenario_templates')
      .select('*, module:course_modules(id, name)')
      .eq('version_id', req.params.vId)
      .order('created_at');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/versions/:vId/publish', async (req, res) => {
  try {
    const result = await publishVersion(req.organization.id, req.params.id, req.params.vId);
    res.json(result);
  } catch (error) {
    console.error('[Studio] Publish error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
