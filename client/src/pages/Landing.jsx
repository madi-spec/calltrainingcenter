import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone,
  Target,
  TrendingUp,
  Users,
  Zap,
  Shield,
  BarChart3,
  Award,
  CheckCircle2,
  ArrowRight,
  Play,
  Star
} from 'lucide-react';

function Landing() {
  const features = [
    {
      icon: Phone,
      title: 'AI-Powered Role Play',
      description: 'Practice with realistic AI customers that adapt to your responses and challenge your skills.'
    },
    {
      icon: Target,
      title: 'Instant Feedback',
      description: 'Get detailed performance analysis and coaching tips after every call simulation.'
    },
    {
      icon: TrendingUp,
      title: 'Track Progress',
      description: 'Monitor improvement over time with comprehensive analytics and skill assessments.'
    },
    {
      icon: Users,
      title: 'Team Management',
      description: 'Assign training, track team performance, and identify coaching opportunities.'
    },
    {
      icon: Zap,
      title: 'Custom Scenarios',
      description: 'Create training scenarios tailored to your products, services, and common objections.'
    },
    {
      icon: Shield,
      title: 'Safe Environment',
      description: 'Let reps make mistakes and learn without risking real customer relationships.'
    }
  ];

  const benefits = [
    'Reduce new hire ramp time by 40%',
    'Increase close rates by 25%',
    'Cut training costs by 60%',
    'Practice anytime, anywhere',
    'Consistent training quality',
    'Real-time performance insights'
  ];

  const testimonials = [
    {
      quote: "Our team's confidence on calls has skyrocketed. The AI scenarios feel incredibly real.",
      author: 'Sarah M.',
      role: 'Sales Manager',
      company: 'Home Services Co.'
    },
    {
      quote: "We cut our training time in half while improving first-call resolution rates.",
      author: 'Mike R.',
      role: 'Operations Director',
      company: 'Comfort Air HVAC'
    },
    {
      quote: "The instant feedback helps our reps improve faster than any traditional training method.",
      author: 'Jennifer L.',
      role: 'Training Coordinator',
      company: 'ProPest Solutions'
    }
  ];

  const plans = [
    {
      name: 'Starter',
      price: 99,
      description: 'Perfect for small teams getting started',
      features: ['10 training hours/month', 'Up to 5 users', 'Basic scenarios', 'Email support'],
      cta: 'Start Free Trial'
    },
    {
      name: 'Professional',
      price: 299,
      description: 'For growing teams that need more',
      features: ['50 training hours/month', 'Up to 25 users', 'Custom scenarios', 'Branch management', 'Priority support'],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Enterprise',
      price: 799,
      description: 'For large organizations',
      features: ['200 training hours/month', 'Unlimited users', 'Advanced analytics', 'API access', 'Dedicated support', 'Custom integrations'],
      cta: 'Contact Sales'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold">SellEveryCall</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Testimonials</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth/login" className="text-gray-400 hover:text-white transition-colors">
                Log In
              </Link>
              <Link
                to="/auth/signup"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered CSR Training Platform
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
              Train Your Team to Sell Every Call
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Transform your customer service reps into confident closers with AI-powered call simulations, instant feedback, and personalized coaching.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth/signup"
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition-all hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>
            <p className="text-gray-500 text-sm mt-4">No credit card required. 14-day free trial.</p>
          </motion.div>

          {/* Hero Image/Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-transparent z-10 pointer-events-none" />
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
              <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="p-8 text-center">
                <div className="flex items-center justify-center gap-8 flex-wrap">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-400">87%</div>
                    <div className="text-gray-500 text-sm">Avg. Score Improvement</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400">2.5x</div>
                    <div className="text-gray-500 text-sm">Faster Onboarding</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-400">40%</div>
                    <div className="text-gray-500 text-sm">Higher Close Rates</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Train Winners</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              A complete platform for training, tracking, and improving your customer service team's performance.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 hover:border-blue-500/50 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why Companies Choose SellEveryCall
              </h2>
              <p className="text-gray-400 mb-8">
                Traditional training methods are expensive, inconsistent, and hard to scale. Our AI-powered platform delivers measurable results at a fraction of the cost.
              </p>
              <div className="grid sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-gray-700 rounded-2xl p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <div className="text-3xl font-bold">250%</div>
                  <div className="text-gray-400">Average ROI</div>
                </div>
              </div>
              <p className="text-gray-400">
                Companies using SellEveryCall see an average 250% return on investment within the first 6 months through improved conversion rates and reduced training costs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Sales Teams Everywhere</h2>
            <p className="text-gray-400">See what our customers have to say</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6">"{testimonial.quote}"</p>
                <div>
                  <div className="font-semibold">{testimonial.author}</div>
                  <div className="text-sm text-gray-400">{testimonial.role}, {testimonial.company}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-400">Start free, upgrade when you're ready</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-gray-800/50 border rounded-2xl p-8 ${
                  plan.popular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-blue-500 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-gray-400 text-sm mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                      <span className="text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/auth/signup"
                  className={`block w-full py-3 rounded-xl font-semibold text-center transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/20 rounded-3xl p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Team?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Join hundreds of companies using SellEveryCall to build confident, high-performing customer service teams.
            </p>
            <Link
              to="/auth/signup"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl font-semibold text-lg transition-all hover:scale-105"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">SellEveryCall</span>
            </div>
            <div className="flex items-center gap-6 text-gray-400 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} SellEveryCall. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
