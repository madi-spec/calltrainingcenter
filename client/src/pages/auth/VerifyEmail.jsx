import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowRight } from 'lucide-react';

export default function VerifyEmail() {
  const location = useLocation();
  const email = location.state?.email || 'your email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="bg-card rounded-2xl shadow-xl p-8 border border-border">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500/10 rounded-full mb-6">
            <Mail className="w-10 h-10 text-primary-500" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
          <p className="text-muted-foreground mb-6">
            We've sent a verification link to{' '}
            <span className="text-secondary-foreground font-medium">{email}</span>
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-left">
              <h3 className="text-sm font-medium text-secondary-foreground mb-2">Next steps:</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center text-xs text-primary-400">1</span>
                  Open your email inbox
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center text-xs text-primary-400">2</span>
                  Click the verification link in our email
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-500/20 rounded-full flex items-center justify-center text-xs text-primary-400">3</span>
                  Start training your team
                </li>
              </ol>
            </div>

            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or{' '}
              <button className="text-primary-400 hover:text-primary-300">
                resend verification
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-2 text-primary-400 hover:text-primary-300"
            >
              Already verified? Sign in
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
