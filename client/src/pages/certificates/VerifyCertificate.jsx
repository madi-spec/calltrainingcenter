import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  Award,
  Calendar,
  User,
  BookOpen,
  Building2,
  Trophy,
  Search
} from 'lucide-react';

export default function VerifyCertificate() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchCode, setSearchCode] = useState('');

  useEffect(() => {
    if (code) {
      verifyCertificate(code);
    } else {
      setLoading(false);
    }
  }, [code]);

  const verifyCertificate = async (verificationCode) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/certificates/verify/${verificationCode}`);
      const data = await response.json();

      if (!response.ok || !data.verified) {
        setError(data.message || 'Certificate not found');
        setCertificate(null);
      } else {
        setCertificate(data.certificate);
      }
    } catch (err) {
      setError('Failed to verify certificate. Please try again.');
      setCertificate(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchCode.trim()) {
      navigate(`/verify-certificate/${searchCode.trim()}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying certificate...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Award className="w-12 h-12 text-primary-500" />
            <h1 className="text-4xl font-bold text-foreground">
              Certificate Verification
            </h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Verify the authenticity of training certificates
          </p>
        </motion.div>

        {/* Search Form */}
        {!code && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg p-8 border border-border mb-8"
          >
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-secondary-foreground mb-2">
                  Enter Verification Code
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    id="code"
                    value={searchCode}
                    onChange={(e) => setSearchCode(e.target.value)}
                    placeholder="XXXX-XXXX-XXXX"
                    className="flex-1 px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-foreground rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    <Search className="w-5 h-5" />
                    Verify
                  </button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the verification code found on the certificate to check its authenticity.
              </p>
            </form>
          </motion.div>
        )}

        {/* Verification Result */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg p-8 border border-red-500/50"
          >
            <div className="text-center">
              <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Certificate Not Found
              </h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button
                onClick={() => {
                  setSearchCode('');
                  setError(null);
                  navigate('/verify-certificate');
                }}
                className="px-6 py-3 bg-muted hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
              >
                Try Another Code
              </button>
            </div>
          </motion.div>
        )}

        {certificate && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            {/* Verification Success Banner */}
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-6">
              <div className="flex items-center gap-4">
                <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">
                    Certificate Verified
                  </h2>
                  <p className="text-green-400">
                    This is a valid certificate issued by Sell Every Call
                  </p>
                </div>
              </div>
            </div>

            {/* Certificate Details Card */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    {certificate.course?.icon ? (
                      <span className="text-3xl">{certificate.course.icon}</span>
                    ) : (
                      <Award className="w-8 h-8 text-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-foreground mb-1">
                      {certificate.course?.name || 'Course Certificate'}
                    </h3>
                    {certificate.course?.badge_name && (
                      <div className="flex items-center gap-2 text-yellow-300">
                        <Trophy className="w-4 h-4" />
                        <span className="font-semibold">
                          {certificate.course.badge_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="p-8 grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">Recipient</span>
                    </div>
                    <p className="text-foreground font-semibold text-lg">
                      {certificate.user?.first_name} {certificate.user?.last_name}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {certificate.user?.email}
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-sm font-medium">Course</span>
                    </div>
                    <p className="text-foreground font-semibold">
                      {certificate.course?.name}
                    </p>
                    {certificate.course?.category && (
                      <span className="inline-block mt-1 px-2 py-1 bg-primary-500/20 text-primary-400 rounded text-xs">
                        {certificate.course.category}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm font-medium">Issue Date</span>
                    </div>
                    <p className="text-foreground font-semibold">
                      {new Date(certificate.issued_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>

                  {certificate.score > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-medium">Overall Score</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-3xl font-bold text-primary-400">
                          {certificate.score}%
                        </div>
                        <div className="flex-1 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full transition-all"
                            style={{ width: `${certificate.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Verification Code */}
              <div className="px-8 pb-8">
                <div className="bg-background rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Verification Code</p>
                  <p className="font-mono text-lg text-primary-400 font-bold">
                    {certificate.verification_code}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Info */}
            <div className="bg-card/50 rounded-lg p-6 border border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                This certificate was verified on {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}. For questions about this certificate, please contact the issuing organization.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-muted hover:bg-muted text-foreground rounded-lg font-medium transition-colors"
              >
                Print Verification
              </button>
              <button
                onClick={() => {
                  setSearchCode('');
                  setCertificate(null);
                  navigate('/verify-certificate');
                }}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-foreground rounded-lg font-medium transition-colors"
              >
                Verify Another
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
