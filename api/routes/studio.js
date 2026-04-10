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

const DEFAULT_TOPICS = [
  { name: 'Sales & Qualification', description: 'Discovery flow, qualification questions, closing techniques', icon: '💰', display_order: 1 },
  { name: 'Objection Handling', description: 'Price objections, competitor comparisons, rebuttals', icon: '🛡️', display_order: 2 },
  { name: 'Retention & Cancellation Saves', description: 'Save techniques, discount policies, re-service guarantees', icon: '🔄', display_order: 3 },
  { name: 'Customer Service & De-escalation', description: 'Complaint handling, empathy, escalation rules', icon: '🎧', display_order: 4 },
  { name: 'Product Knowledge', description: 'Service packages, pricing, warranties, service areas', icon: '📦', display_order: 5 },
  { name: 'Competitive Intel', description: 'Competitor positioning, differentiators, win-back strategies', icon: '⚔️', display_order: 6 },
];

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

    // Auto-create default topics
    if (data) {
      await supabase.from('studio_topics').insert(
        DEFAULT_TOPICS.map(t => ({
          session_id: data.id,
          organization_id: req.organization.id,
          name: t.name,
          description: t.description,
          icon: t.icon,
          source: 'default',
          display_order: t.display_order
        }))
      );
    }

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

    // Also fetch documents, topics, and coverage stats
    const [{ data: docs }, { data: topics }, coverageStats] = await Promise.all([
      supabase.from('kb_documents').select('*').eq('session_id', data.id).order('created_at'),
      supabase.from('studio_topics').select('*').eq('session_id', data.id).order('display_order'),
      getKnowledgeCoverageStats(req.organization.id)
    ]);

    res.json({ ...data, documents: docs || [], topics: topics || [], coverageStats });
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

      try {
        let buffer, base64Data;

        if (file.storagePath) {
          // File uploaded to Supabase Storage — download it
          console.log('[Studio] Downloading from storage:', file.storagePath);
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('studio-documents')
            .download(file.storagePath);

          if (downloadError) {
            console.error('[Studio] Storage download error:', downloadError);
            throw new Error(`Storage download failed: ${downloadError.message}`);
          }

          // fileData is a Blob — convert to Buffer
          if (fileData.arrayBuffer) {
            const arrayBuffer = await fileData.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
          } else if (Buffer.isBuffer(fileData)) {
            buffer = fileData;
          } else {
            // Fallback: read as stream
            const chunks = [];
            for await (const chunk of fileData.stream()) {
              chunks.push(chunk);
            }
            buffer = Buffer.concat(chunks);
          }
          console.log('[Studio] Downloaded', buffer.length, 'bytes');
          base64Data = buffer.toString('base64');
        } else if (file.data) {
          // Legacy: base64 data sent directly
          buffer = Buffer.from(file.data, 'base64');
          base64Data = file.data;
        } else {
          throw new Error('No file data or storage path provided');
        }

        const result = await ingestDocument(orgId, sessionId, docRecord, buffer, base64Data);
        results.push({
          filename: file.name,
          documentId: docRecord.id,
          classification: result.document.doc_classification,
          itemsExtracted: result.items.length,
          summary: result.summary
        });
      } catch (ingestError) {
        console.error('[Studio] Ingest error for', file.name, ':', ingestError.message);
        results.push({ filename: file.name, documentId: docRecord.id, error: ingestError.message });
      }
    }

    // Generate welcome message after all docs processed
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
    const { message, topic_id } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });

    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const orgId = req.organization.id;
    const topicId = topic_id || null;

    // Detect generation intent from the user's message
    const generateTriggers = /\b(generate|create the (courses?|training|program|content)|i'?m ready|ready to generate|let'?s go|build (it|the|my)|do it|make (it|the|my))\b/i;
    const wantsGeneration = generateTriggers.test(message);

    if (wantsGeneration) {
      console.log('[Studio] Generation intent detected, topicId:', topicId || 'session-level');

      // Determine generation context — topic-scoped or session-level
      let topic = null;
      let genTopicId = null;
      let genTopicName = null;
      let interviewCtx = {};

      if (topicId) {
        const { data } = await supabase.from('studio_topics').select('*').eq('id', topicId).single();
        topic = data;
        if (topic) {
          genTopicId = topic.id;
          genTopicName = topic.name;
          interviewCtx = topic.interview_context || {};
        }
      }

      if (!topic) {
        // Session-level generation (no topics, or General thread)
        const { data: session } = await supabase.from('studio_sessions').select('interview_context').eq('id', sessionId).single();
        interviewCtx = session?.interview_context || {};
      }

      // Store user's message
      await supabase.from('studio_messages').insert({
        session_id: sessionId, topic_id: genTopicId,
        role: 'user', content: message, message_type: 'chat'
      });

      // Update topic status if applicable
      if (topic) {
        await supabase.from('studio_topics')
          .update({ status: 'generating', updated_at: new Date().toISOString() })
          .eq('id', genTopicId);
      } else {
        await supabase.from('studio_sessions')
          .update({ status: 'generating', updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      }

      const label = genTopicName ? `"${genTopicName}"` : 'your training program';
      await supabase.from('studio_messages').insert({
        session_id: sessionId, topic_id: genTopicId,
        role: 'assistant', content: `Great — generating ${label} now. This takes 1-2 minutes...`,
        message_type: 'generation'
      });

      try {
        const version = await generateTrainingProgram(
          orgId, sessionId, interviewCtx, null, genTopicId, genTopicName
        );

        if (topic) {
          await supabase.from('studio_topics').update({
            status: 'generated', generated_version_id: version.id, updated_at: new Date().toISOString()
          }).eq('id', genTopicId);
        } else {
          await supabase.from('studio_sessions').update({
            status: 'reviewing', updated_at: new Date().toISOString()
          }).eq('id', sessionId);
        }

        const stats = version.generation_stats || {};
        const doneMsg = `Done! Created ${stats.courses || 0} course${(stats.courses || 0) !== 1 ? 's' : ''}, ${stats.scenarios || 0} scenarios, and ${stats.scripts || 0} scripts${genTopicName ? ` for "${genTopicName}"` : ''}.${version.quality_score ? ` Quality score: ${Math.round(version.quality_score)}/100.` : ''}\n\nCheck the preview panels to review.${topic ? ' Click **Publish** on the topic tab when you\'re happy.' : ''}`;

        await supabase.from('studio_messages').insert({
          session_id: sessionId, topic_id: genTopicId,
          role: 'assistant', content: doneMsg, message_type: 'generation',
          metadata: { versionId: version.id, stats }
        });

        return res.json({ message: doneMsg, generated: true, versionId: version.id });
      } catch (genError) {
        console.error('[Studio] Generation failed:', genError.message);

        if (topic) {
          await supabase.from('studio_topics')
            .update({ status: 'interviewing', updated_at: new Date().toISOString() })
            .eq('id', genTopicId);
        } else {
          await supabase.from('studio_sessions')
            .update({ status: 'interviewing', updated_at: new Date().toISOString() })
            .eq('id', sessionId);
        }

        const errorMsg = `Generation failed: ${genError.message}. Let's keep talking — you can try again when you're ready.`;
        await supabase.from('studio_messages').insert({
          session_id: sessionId, topic_id: genTopicId,
          role: 'assistant', content: errorMsg, message_type: 'chat'
        });

        return res.json({ message: errorMsg, generated: false });
      }
    }

    // Normal chat — send to interview agent
    const result = await processMessage(sessionId, message, topicId);
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
    const topicId = req.query.topic_id;

    let query = supabase
      .from('studio_messages')
      .select('*')
      .eq('session_id', req.params.id)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (topicId && topicId !== 'general') {
      query = query.eq('topic_id', topicId);
    } else {
      query = query.is('topic_id', null);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// TOPIC MANAGEMENT
// ============================================================

router.get('/sessions/:id/topics', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('session_id', req.params.id)
      .order('display_order');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('[Studio] List topics error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/topics', async (req, res) => {
  try {
    const { name, description, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Topic name required' });

    const supabase = createAdminClient();

    // Get next display_order
    const { data: existing } = await supabase
      .from('studio_topics')
      .select('display_order')
      .eq('session_id', req.params.id)
      .order('display_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.display_order || 0) + 1;

    const { data, error } = await supabase
      .from('studio_topics')
      .insert({
        session_id: req.params.id,
        organization_id: req.organization.id,
        name,
        description: description || '',
        icon: icon || '📝',
        source: 'custom',
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Create topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.patch('/sessions/:id/topics/:tid', async (req, res) => {
  try {
    const { name, description, icon, status, display_order } = req.body;
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    if (status !== undefined) updates.status = status;
    if (display_order !== undefined) updates.display_order = display_order;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('studio_topics')
      .update(updates)
      .eq('id', req.params.tid)
      .eq('session_id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[Studio] Update topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/sessions/:id/topics/:tid', async (req, res) => {
  try {
    const supabase = createAdminClient();
    // Only allow deleting custom topics
    const { data: topic } = await supabase
      .from('studio_topics')
      .select('source')
      .eq('id', req.params.tid)
      .single();

    if (topic?.source === 'default') {
      return res.status(400).json({ error: 'Cannot delete default topics' });
    }

    const { error } = await supabase
      .from('studio_topics')
      .delete()
      .eq('id', req.params.tid)
      .eq('session_id', req.params.id);

    if (error) throw error;
    res.json({ deleted: true });
  } catch (error) {
    console.error('[Studio] Delete topic error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

router.post('/sessions/:id/topics/:tid/generate', async (req, res) => {
  try {
    const supabase = createAdminClient();
    const sessionId = req.params.id;
    const topicId = req.params.tid;
    const orgId = req.organization.id;

    // Get topic and its interview context
    const { data: topic } = await supabase
      .from('studio_topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (!topic) return res.status(404).json({ error: 'Topic not found' });

    // Update topic status
    await supabase.from('studio_topics').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', topicId);

    // Generate with topic context
    const version = await generateTrainingProgram(
      orgId, sessionId, topic.interview_context || {}, null, topicId, topic.name
    );

    // Link version to topic
    await supabase.from('studio_topics').update({
      status: 'generated',
      generated_version_id: version.id,
      updated_at: new Date().toISOString()
    }).eq('id', topicId);

    // Store generation message in topic thread
    await supabase.from('studio_messages').insert({
      session_id: sessionId,
      topic_id: topicId,
      role: 'assistant',
      content: `Training content for "${topic.name}" generated! Created ${version.generation_stats.courses} course, ${version.generation_stats.scenarios} scenarios, and ${version.generation_stats.scripts} scripts. Check the preview panels to review.`,
      message_type: 'generation',
      metadata: { versionId: version.id, stats: version.generation_stats }
    });

    res.json(version);
  } catch (error) {
    console.error('[Studio] Topic generate error:', error.message);
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
      .order('script_type')
      .order('created_at');

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
