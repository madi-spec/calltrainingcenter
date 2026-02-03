/**
 * Certificate Generator Service
 *
 * Generates professional PDF certificates for course completions.
 * Includes QR codes for verification.
 */

import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createAdminClient } from '../lib/supabase.js';
import { sendCertificateEmail } from '../lib/email.js';

/**
 * Generate a unique verification code
 */
function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < 12; i++) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * Calculate overall score from course progress
 */
async function calculateCourseScore(userId, courseId) {
  const adminClient = createAdminClient();

  // Get all modules for the course
  const { data: modules } = await adminClient
    .from('course_modules')
    .select('id')
    .eq('course_id', courseId);

  if (!modules || modules.length === 0) return 0;

  // Get user's progress for all modules
  const { data: progress } = await adminClient
    .from('user_module_progress')
    .select('best_close_rate')
    .eq('user_id', userId)
    .in('module_id', modules.map(m => m.id));

  if (!progress || progress.length === 0) return 0;

  // Calculate average close rate
  const totalRate = progress.reduce((sum, p) => sum + (p.best_close_rate || 0), 0);
  return Math.round(totalRate / progress.length);
}

/**
 * Generate certificate PDF and save to database
 * @param {Object} params
 * @param {string} params.userId - User ID
 * @param {string} params.courseId - Course ID
 * @param {string} params.userName - User's full name
 * @param {string} params.courseName - Course name
 * @param {string} params.organizationName - Organization name
 * @param {string} params.userEmail - User's email (optional, for sending certificate)
 * @returns {Promise<Object>} Certificate record with verification code
 */
export async function generateCertificate({ userId, courseId, userName, courseName, organizationName, userEmail }) {
  const adminClient = createAdminClient();

  try {
    // Check if certificate already exists
    const { data: existing } = await adminClient
      .from('certificates')
      .select('*')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      console.log('[CERTIFICATE] Certificate already exists:', existing.id);
      return existing;
    }

    // Calculate score
    const score = await calculateCourseScore(userId, courseId);

    // Generate verification code
    let verificationCode;
    let codeUnique = false;

    while (!codeUnique) {
      verificationCode = generateVerificationCode();
      const { data: duplicate } = await adminClient
        .from('certificates')
        .select('id')
        .eq('verification_code', verificationCode)
        .single();

      codeUnique = !duplicate;
    }

    // Generate QR code data URL
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:5173'}/verify-certificate/${verificationCode}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 200,
      margin: 1
    });

    // Create PDF
    const pdfBuffer = await createCertificatePDF({
      userName,
      courseName,
      organizationName,
      verificationCode,
      qrCodeDataUrl,
      score,
      issuedDate: new Date()
    });

    // Upload PDF to Supabase Storage (or save locally for now)
    // For now, we'll store as base64 in the database or use a file path
    // In production, you'd upload to Supabase Storage or S3
    const pdfBase64 = pdfBuffer.toString('base64');
    const pdfUrl = `data:application/pdf;base64,${pdfBase64}`;

    // Save certificate record
    const { data: certificate, error } = await adminClient
      .from('certificates')
      .insert({
        user_id: userId,
        course_id: courseId,
        verification_code: verificationCode,
        pdf_url: pdfUrl,
        score
      })
      .select()
      .single();

    if (error) throw error;

    console.log('[CERTIFICATE] Generated certificate:', certificate.id);

    // Send email with certificate if email is provided
    if (userEmail && pdfBuffer) {
      try {
        await sendCertificateEmail({
          to: userEmail,
          userName,
          courseName,
          organizationName,
          verificationCode,
          pdfBuffer
        });
        console.log('[CERTIFICATE] Email sent successfully');
      } catch (emailError) {
        console.error('[CERTIFICATE] Failed to send email:', emailError);
        // Don't fail certificate generation if email fails
      }
    }

    return certificate;

  } catch (error) {
    console.error('[CERTIFICATE] Error generating certificate:', error);
    throw error;
  }
}

/**
 * Create the PDF certificate document
 */
async function createCertificatePDF({ userName, courseName, organizationName, verificationCode, qrCodeDataUrl, score, issuedDate }) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'LETTER',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const centerX = pageWidth / 2;

      // Draw border
      doc
        .rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(2)
        .stroke('#2563eb');

      doc
        .rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .stroke('#cbd5e1');

      // Title
      doc
        .fontSize(36)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text('CERTIFICATE OF COMPLETION', 0, 100, {
          align: 'center',
          width: pageWidth
        });

      // Decorative line
      doc
        .moveTo(centerX - 150, 150)
        .lineTo(centerX + 150, 150)
        .lineWidth(2)
        .stroke('#2563eb');

      // "This certifies that"
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('This certifies that', 0, 180, {
          align: 'center',
          width: pageWidth
        });

      // User name (larger, bold)
      doc
        .fontSize(32)
        .font('Helvetica-Bold')
        .fillColor('#1e293b')
        .text(userName, 0, 220, {
          align: 'center',
          width: pageWidth
        });

      // "has successfully completed"
      doc
        .fontSize(16)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('has successfully completed', 0, 270, {
          align: 'center',
          width: pageWidth
        });

      // Course name
      doc
        .fontSize(24)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text(courseName, 0, 310, {
          align: 'center',
          width: pageWidth
        });

      // Organization
      doc
        .fontSize(14)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(`at ${organizationName}`, 0, 350, {
          align: 'center',
          width: pageWidth
        });

      // Score badge (if score > 0)
      if (score > 0) {
        const badgeX = centerX - 50;
        const badgeY = 390;

        // Circle background
        doc
          .circle(badgeX + 50, badgeY + 30, 40)
          .fillAndStroke('#2563eb', '#1e40af');

        // Score text
        doc
          .fontSize(24)
          .font('Helvetica-Bold')
          .fillColor('#ffffff')
          .text(`${score}%`, badgeX, badgeY + 15, {
            width: 100,
            align: 'center'
          });

        // "Overall Score" label
        doc
          .fontSize(10)
          .font('Helvetica')
          .fillColor('#64748b')
          .text('Overall Score', badgeX, badgeY + 70, {
            width: 100,
            align: 'center'
          });
      }

      // Date
      const formattedDate = issuedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      doc
        .fontSize(12)
        .font('Helvetica')
        .fillColor('#64748b')
        .text(`Issued on ${formattedDate}`, 0, pageHeight - 120, {
          align: 'center',
          width: pageWidth
        });

      // QR Code (bottom left)
      // Remove data URL prefix to get just base64
      const qrBase64 = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');
      const qrBuffer = Buffer.from(qrBase64, 'base64');

      doc.image(qrBuffer, 60, pageHeight - 180, {
        width: 100,
        height: 100
      });

      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('Scan to verify', 60, pageHeight - 70, {
          width: 100,
          align: 'center'
        });

      // Verification code (bottom right)
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Verification Code:', pageWidth - 250, pageHeight - 150, {
          width: 200,
          align: 'right'
        });

      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2563eb')
        .text(verificationCode, pageWidth - 250, pageHeight - 130, {
          width: 200,
          align: 'right'
        });

      // Footer - powered by
      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#94a3b8')
        .text('Powered by Sell Every Call', 0, pageHeight - 60, {
          align: 'center',
          width: pageWidth
        });

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get certificate by verification code
 */
export async function getCertificateByCode(verificationCode) {
  const adminClient = createAdminClient();

  const { data: certificate, error } = await adminClient
    .from('certificates')
    .select(`
      *,
      user:users(first_name, last_name, email),
      course:courses(name, category, badge_name)
    `)
    .eq('verification_code', verificationCode.toUpperCase().replace(/\s/g, ''))
    .single();

  if (error) {
    console.error('[CERTIFICATE] Error fetching certificate:', error);
    return null;
  }

  return certificate;
}

/**
 * Get all certificates for a user
 */
export async function getUserCertificates(userId) {
  const adminClient = createAdminClient();

  const { data: certificates, error } = await adminClient
    .from('certificates')
    .select(`
      *,
      course:courses(name, category, icon, badge_name, badge_icon)
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) {
    console.error('[CERTIFICATE] Error fetching user certificates:', error);
    throw error;
  }

  return certificates || [];
}
