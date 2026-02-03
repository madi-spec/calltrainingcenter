/**
 * Certificates API Routes
 *
 * Handles certificate generation, retrieval, and verification.
 */

import { Router } from 'express';
import { authMiddleware, tenantMiddleware, optionalAuthMiddleware } from '../lib/auth.js';
import { generateCertificate, getCertificateByCode, getUserCertificates } from '../services/certificateGenerator.js';
import { createAdminClient } from '../lib/supabase.js';

const router = Router();

/**
 * GET /api/certificates
 * Get all certificates for the authenticated user
 */
router.get('/', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const certificates = await getUserCertificates(req.user.id);
    res.json({ success: true, certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/certificates/:id
 * Get a specific certificate by ID
 */
router.get('/:id', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: certificate, error } = await adminClient
      .from('certificates')
      .select(`
        *,
        course:courses(name, category, icon, badge_name, badge_icon)
      `)
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({ success: true, certificate });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/certificates/verify/:code
 * Public endpoint to verify a certificate by verification code
 */
router.get('/verify/:code', async (req, res) => {
  try {
    const certificate = await getCertificateByCode(req.params.code);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
        message: 'Invalid verification code or certificate does not exist'
      });
    }

    // Return certificate info without PDF data (to reduce payload)
    const { pdf_url, ...certificateInfo } = certificate;

    res.json({
      success: true,
      verified: true,
      certificate: {
        ...certificateInfo,
        hasPdf: !!pdf_url
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/certificates/generate
 * Generate a certificate for a completed course
 * (Usually called automatically by the system, but can be manually triggered)
 */
router.post('/generate', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({ error: 'courseId is required' });
    }

    const adminClient = createAdminClient();

    // Verify course completion
    const { data: courseProgress } = await adminClient
      .from('user_course_progress')
      .select('status')
      .eq('user_id', req.user.id)
      .eq('course_id', courseId)
      .single();

    if (!courseProgress || courseProgress.status !== 'completed') {
      return res.status(400).json({
        error: 'Course not completed',
        message: 'You must complete the course before generating a certificate'
      });
    }

    // Get course details
    const { data: course } = await adminClient
      .from('courses')
      .select('name')
      .eq('id', courseId)
      .single();

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Generate certificate
    const userName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || req.user.email;
    const organizationName = req.organization.name;

    const certificate = await generateCertificate({
      userId: req.user.id,
      courseId,
      userName,
      courseName: course.name,
      organizationName
    });

    res.json({ success: true, certificate });
  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/certificates/:id/download
 * Download certificate PDF
 */
router.get('/:id/download', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const adminClient = createAdminClient();

    const { data: certificate, error } = await adminClient
      .from('certificates')
      .select('pdf_url, verification_code')
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .single();

    if (error) throw error;
    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    if (!certificate.pdf_url) {
      return res.status(404).json({ error: 'Certificate PDF not available' });
    }

    // If PDF is a data URL, extract and send
    if (certificate.pdf_url.startsWith('data:application/pdf;base64,')) {
      const base64Data = certificate.pdf_url.replace('data:application/pdf;base64,', '');
      const pdfBuffer = Buffer.from(base64Data, 'base64');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.verification_code}.pdf"`);
      res.send(pdfBuffer);
    } else {
      // If it's a URL, redirect to it
      res.redirect(certificate.pdf_url);
    }
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
