import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Download, Award, Calendar, Trophy, ExternalLink, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function MyCertificates() {
  const navigate = useNavigate();
  const { authFetch } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await authFetch('/api/certificates');

      if (!response.ok) throw new Error('Failed to fetch certificates');

      const data = await response.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (certificateId, verificationCode) => {
    try {
      const response = await authFetch(`/api/certificates/${certificateId}/download`);

      if (!response.ok) throw new Error('Failed to download certificate');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${verificationCode}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading certificate:', err);
      alert('Failed to download certificate');
    }
  };

  const handleVerify = (verificationCode) => {
    window.open(`/verify-certificate/${verificationCode}`, '_blank');
  };

  const handleShare = (verificationCode) => {
    const url = `${window.location.origin}/verify-certificate/${verificationCode}`;
    navigator.clipboard.writeText(url);
    alert('Verification link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20 px-4 pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Award className="w-10 h-10 text-yellow-400" />
            My Certificates
          </h1>
          <p className="text-gray-400">
            Your earned certificates and achievements
          </p>
        </motion.div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {certificates.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Trophy className="w-20 h-20 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              No certificates yet
            </h3>
            <p className="text-gray-500 mb-6">
              Complete courses to earn certificates
            </p>
            <button
              onClick={() => navigate('/courses')}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Browse Courses
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {certificates.map((cert, index) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-primary-500 transition-all"
              >
                {/* Certificate Header - Gradient Background */}
                <div className="bg-gradient-to-br from-primary-600 to-primary-800 p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12" />

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                        {cert.course?.icon ? (
                          <span className="text-2xl">{cert.course.icon}</span>
                        ) : (
                          <Award className="w-6 h-6 text-white" />
                        )}
                      </div>
                      {cert.score && (
                        <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                          <span className="text-white font-bold text-sm">
                            {cert.score}%
                          </span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">
                      {cert.course?.name || 'Course Certificate'}
                    </h3>

                    {cert.course?.category && (
                      <span className="inline-block px-2 py-1 bg-white/20 backdrop-blur-sm rounded text-xs text-white">
                        {cert.course.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Certificate Details */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                    <Calendar className="w-4 h-4" />
                    Issued on {new Date(cert.issued_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>

                  <div className="bg-gray-900 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">Verification Code</p>
                    <p className="font-mono text-sm text-primary-400 font-semibold">
                      {cert.verification_code}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownload(cert.id, cert.verification_code)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <button
                      onClick={() => handleVerify(cert.verification_code)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      title="Verify Certificate"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleShare(cert.verification_code)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      title="Share Certificate"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
