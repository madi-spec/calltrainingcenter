import { Router } from 'express';
import { authMiddleware, tenantMiddleware, requireRole } from '../lib/auth.js';
import { createAdminClient } from '../lib/supabase.js';
import { extractText, chunkText, parseChunk, synthesizeParsedData, generateAgentPrompt } from '../services/kbParser.js';

const router = Router();

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
const MAX_FILES = 3;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// All routes require admin
router.use(authMiddleware, tenantMiddleware, requireRole('admin', 'super_admin'));

/**
 * POST /api/knowledge-base/upload
 * Receive base64 files, extract text, create kb_uploads record
 */
router.post('/upload', async (req, res) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }
    if (files.length > MAX_FILES) {
      return res.status(400).json({ error: `Maximum ${MAX_FILES} files allowed` });
    }

    const rawText = {};
    const fileMeta = [];

    for (const file of files) {
      if (!file.name || !file.data || !file.type) {
        return res.status(400).json({ error: 'Each file must have name, data (base64), and type' });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return res.status(400).json({ error: `Unsupported file type: ${file.type}. Allowed: PDF, DOCX, TXT` });
      }

      const buffer = Buffer.from(file.data, 'base64');
      if (buffer.length > MAX_FILE_SIZE) {
        return res.status(400).json({ error: `File ${file.name} exceeds 5MB limit` });
      }

      const text = await extractText(buffer, file.type);
      rawText[file.name] = text;
      fileMeta.push({ name: file.name, type: file.type, size: buffer.length, textLength: text.length });
    }

    // Calculate chunks
    const allText = Object.values(rawText).join('\n\n--- FILE BOUNDARY ---\n\n');
    const chunks = chunkText(allText);

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('kb_uploads')
      .insert({
        organization_id: req.organization.id,
        created_by: req.user.id,
        status: 'uploaded',
        files: fileMeta,
        raw_text: rawText,
        parse_progress: { total_chunks: chunks.length, parsed_chunks: 0 }
      })
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      upload: {
        id: data.id,
        files: fileMeta,
        totalChunks: chunks.length,
        status: data.status
      }
    });
  } catch (error) {
    console.error('KB upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge-base/:id/parse
 * Parse next chunk with Claude, return progress
 */
router.post('/:id/parse', async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: upload, error: fetchError } = await adminClient
      .from('kb_uploads')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (fetchError || !upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const progress = upload.parse_progress || { total_chunks: 0, parsed_chunks: 0 };

    if (progress.parsed_chunks >= progress.total_chunks) {
      // All chunks parsed — run synthesis
      await adminClient
        .from('kb_uploads')
        .update({ status: 'parsing', updated_at: new Date().toISOString() })
        .eq('id', upload.id);

      const synthesized = await synthesizeParsedData(upload.parsed_data, upload.raw_text);

      await adminClient
        .from('kb_uploads')
        .update({
          status: 'parsed',
          parsed_data: synthesized,
          parse_progress: { ...progress, synthesized: true },
          updated_at: new Date().toISOString()
        })
        .eq('id', upload.id);

      return res.json({
        success: true,
        complete: true,
        progress: { ...progress, synthesized: true },
        parsed_data: synthesized
      });
    }

    // Parse the next chunk
    await adminClient
      .from('kb_uploads')
      .update({ status: 'parsing', updated_at: new Date().toISOString() })
      .eq('id', upload.id);

    const allText = Object.values(upload.raw_text).join('\n\n--- FILE BOUNDARY ---\n\n');
    const chunks = chunkText(allText);
    const chunkIndex = progress.parsed_chunks;

    const existingData = upload.parsed_data || { packages: [], guidelines: [], training_topics: [] };
    const chunkResult = await parseChunk(chunks[chunkIndex], chunkIndex, chunks.length, existingData);

    // Accumulate results
    const accumulated = {
      packages: [...(existingData.packages || []), ...(chunkResult.packages || [])],
      guidelines: [...(existingData.guidelines || []), ...(chunkResult.guidelines || [])],
      training_topics: [...(existingData.training_topics || []), ...(chunkResult.training_topics || [])]
    };

    const newProgress = {
      total_chunks: progress.total_chunks,
      parsed_chunks: chunkIndex + 1
    };

    await adminClient
      .from('kb_uploads')
      .update({
        parsed_data: accumulated,
        parse_progress: newProgress,
        status: newProgress.parsed_chunks >= newProgress.total_chunks ? 'uploaded' : 'parsing',
        updated_at: new Date().toISOString()
      })
      .eq('id', upload.id);

    res.json({
      success: true,
      complete: false,
      progress: newProgress,
      chunkResult: {
        packages: chunkResult.packages?.length || 0,
        guidelines: chunkResult.guidelines?.length || 0,
        training_topics: chunkResult.training_topics?.length || 0
      }
    });
  } catch (error) {
    console.error('KB parse error:', error);

    // Mark as failed
    const adminClient = createAdminClient();
    await adminClient
      .from('kb_uploads')
      .update({
        status: 'failed',
        parse_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge-base/:id/status
 * Get parse progress + parsed_data
 */
router.get('/:id/status', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('kb_uploads')
      .select('id, status, files, parsed_data, parse_progress, parse_error, generation_log, created_at, updated_at')
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({ success: true, upload: data });
  } catch (error) {
    console.error('KB status error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/knowledge-base/:id/data
 * Save admin's edits to parsed_data
 */
router.put('/:id/data', async (req, res) => {
  try {
    const { parsed_data } = req.body;
    if (!parsed_data) {
      return res.status(400).json({ error: 'parsed_data is required' });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('kb_uploads')
      .update({
        parsed_data,
        status: 'reviewing',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, upload: data });
  } catch (error) {
    console.error('KB data update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/knowledge-base/:id/generate
 * Write parsed_data to all normalized tables + agent prompt
 */
router.post('/:id/generate', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const orgId = req.organization.id;

    const { data: upload, error: fetchError } = await adminClient
      .from('kb_uploads')
      .select('*')
      .eq('id', req.params.id)
      .eq('organization_id', orgId)
      .single();

    if (fetchError || !upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const parsed = upload.parsed_data;
    if (!parsed) {
      return res.status(400).json({ error: 'No parsed data to generate from' });
    }

    await adminClient
      .from('kb_uploads')
      .update({ status: 'generating', generation_log: [], updated_at: new Date().toISOString() })
      .eq('id', upload.id);

    const log = [];
    const addLog = async (step, status, detail) => {
      log.push({ step, status, detail, timestamp: new Date().toISOString() });
      await adminClient
        .from('kb_uploads')
        .update({ generation_log: log, updated_at: new Date().toISOString() })
        .eq('id', upload.id);
    };

    // --- Step 1: Clean existing data ---
    await addLog('clean', 'running', 'Removing existing org data...');

    // Delete in reverse dependency order
    await adminClient.from('scenario_templates').delete().eq('organization_id', orgId);

    const { data: existingPkgs } = await adminClient
      .from('service_packages')
      .select('id')
      .eq('organization_id', orgId);

    if (existingPkgs?.length) {
      const pkgIds = existingPkgs.map(p => p.id);
      await adminClient.from('package_selling_points').delete().in('package_id', pkgIds);
      await adminClient.from('package_objections').delete().in('package_id', pkgIds);
    }

    const { data: existingCourses } = await adminClient
      .from('courses')
      .select('id')
      .eq('organization_id', orgId);

    if (existingCourses?.length) {
      const courseIds = existingCourses.map(c => c.id);
      await adminClient.from('course_modules').delete().in('course_id', courseIds);
    }

    await adminClient.from('courses').delete().eq('organization_id', orgId);
    await adminClient.from('service_packages').delete().eq('organization_id', orgId);
    await adminClient.from('sales_guidelines').delete().eq('organization_id', orgId);
    await addLog('clean', 'done', 'Existing data removed');

    // --- Step 2: Insert packages ---
    const packageIdMap = {};
    if (parsed.packages?.length) {
      await addLog('packages', 'running', `Inserting ${parsed.packages.length} packages...`);

      for (const pkg of parsed.packages) {
        const { data: inserted, error: pkgErr } = await adminClient
          .from('service_packages')
          .insert({
            organization_id: orgId,
            name: pkg.name,
            description: pkg.description,
            initial_price: pkg.initial_price,
            recurring_price: pkg.recurring_price,
            service_frequency: pkg.service_frequency,
            included_services: pkg.included_services || [],
            included_pests: [],
            display_order: Object.keys(packageIdMap).length
          })
          .select()
          .single();

        if (pkgErr) {
          console.error('Package insert error:', pkgErr);
          continue;
        }

        packageIdMap[pkg.name] = inserted.id;

        // Insert selling points
        if (pkg.selling_points?.length) {
          const points = pkg.selling_points.map((point, idx) => ({
            package_id: inserted.id,
            point: typeof point === 'string' ? point : point.text || point.point || String(point),
            display_order: idx
          }));
          await adminClient.from('package_selling_points').insert(points);
        }

        // Insert objections
        if (pkg.objections?.length) {
          const objections = pkg.objections.map((obj, idx) => ({
            package_id: inserted.id,
            objection_text: obj.objection || obj.objection_text || '',
            recommended_response: obj.response || obj.recommended_response || '',
            display_order: idx
          }));
          await adminClient.from('package_objections').insert(objections);
        }
      }
      await addLog('packages', 'done', `Inserted ${Object.keys(packageIdMap).length} packages`);
    }

    // --- Step 3: Insert guidelines ---
    if (parsed.guidelines?.length) {
      await addLog('guidelines', 'running', `Inserting ${parsed.guidelines.length} guidelines...`);

      const guidelineRows = parsed.guidelines.map((g, idx) => ({
        organization_id: orgId,
        guideline_type: g.guideline_type || 'process',
        title: g.title || `Guideline ${idx + 1}`,
        content: g.content || '',
        examples: g.examples || [],
        display_order: idx
      }));

      await adminClient.from('sales_guidelines').insert(guidelineRows);
      await addLog('guidelines', 'done', `Inserted ${guidelineRows.length} guidelines`);
    }

    // --- Step 4: Insert courses → modules → scenario templates ---
    if (parsed.courses?.length) {
      await addLog('courses', 'running', `Inserting ${parsed.courses.length} courses...`);

      for (const course of parsed.courses) {
        const { data: insertedCourse, error: courseErr } = await adminClient
          .from('courses')
          .insert({
            organization_id: orgId,
            name: course.name,
            description: course.description,
            category: course.category || 'custom',
            icon: course.icon || '📚'
          })
          .select()
          .single();

        if (courseErr) {
          console.error('Course insert error:', courseErr);
          continue;
        }

        // Insert modules
        if (course.modules?.length) {
          for (let mi = 0; mi < course.modules.length; mi++) {
            const mod = course.modules[mi];

            const { data: insertedModule, error: modErr } = await adminClient
              .from('course_modules')
              .insert({
                course_id: insertedCourse.id,
                name: mod.name,
                description: mod.description,
                difficulty: mod.difficulty || 'medium',
                scenario_count: mod.scenario_count || 10,
                sequence_number: mi + 1,
                pass_threshold: 70,
                required_completions: 1
              })
              .select()
              .single();

            if (modErr) {
              console.error('Module insert error:', modErr);
              continue;
            }

            // Insert scenario templates
            if (mod.scenarios?.length) {
              const templateRows = mod.scenarios.map((sc, si) => ({
                organization_id: orgId,
                module_id: insertedModule.id,
                base_situation: sc.base_situation,
                csr_objectives: sc.csr_objectives || [],
                scoring_focus: sc.scoring_focus || [],
                customer_goals: sc.customer_goals || '',
                resolution_conditions: sc.resolution_conditions || '',
                difficulty: sc.difficulty || mod.difficulty || 'medium',
                display_order: si
              }));

              await adminClient.from('scenario_templates').insert(templateRows);
            }
          }
        }
      }
      await addLog('courses', 'done', `Inserted ${parsed.courses.length} courses with modules and scenarios`);
    }

    // --- Step 5: Generate agent prompt ---
    await addLog('agent_prompt', 'running', 'Generating AI agent prompt...');
    const agentPromptSection = generateAgentPrompt(parsed, req.organization.settings || {});

    // Save to org settings
    const currentSettings = req.organization.settings || {};
    const currentCustomPrompts = currentSettings.customPrompts || {};
    const updatedSettings = {
      ...currentSettings,
      customPrompts: {
        ...currentCustomPrompts,
        kbAgentContext: agentPromptSection
      }
    };

    await adminClient
      .from('organizations')
      .update({ settings: updatedSettings })
      .eq('id', orgId);

    await addLog('agent_prompt', 'done', 'Agent prompt saved to organization settings');

    // --- Mark complete ---
    await adminClient
      .from('kb_uploads')
      .update({
        status: 'completed',
        generation_log: log,
        updated_at: new Date().toISOString()
      })
      .eq('id', upload.id);

    // Mark org as products configured
    await adminClient
      .from('organizations')
      .update({ products_configured: true })
      .eq('id', orgId);

    res.json({
      success: true,
      generation_log: log,
      summary: {
        packages: Object.keys(packageIdMap).length,
        guidelines: parsed.guidelines?.length || 0,
        courses: parsed.courses?.length || 0
      }
    });
  } catch (error) {
    console.error('KB generate error:', error);

    const adminClient = createAdminClient();
    await adminClient
      .from('kb_uploads')
      .update({
        status: 'failed',
        parse_error: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/knowledge-base/history
 * List past uploads for org
 */
router.get('/history', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('kb_uploads')
      .select('id, status, files, parse_progress, created_at, updated_at')
      .eq('organization_id', req.organization.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, uploads: data });
  } catch (error) {
    console.error('KB history error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * Delete upload record
 */
router.delete('/:id', async (req, res) => {
  try {
    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('kb_uploads')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', req.organization.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('KB delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
