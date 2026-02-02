import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import DemoVideoModal from '../components/DemoVideoModal';
import {
  Phone,
  Zap,
  CheckCircle2,
  ArrowRight,
  Play,
  Users,
  DollarSign,
  Activity,
  Clock,
  Mic,
  UserCog,
  Sparkles,
  Target,
  BarChart3,
  Settings
} from 'lucide-react';

function Landing() {
  const [isDemoOpen, setIsDemoOpen] = useState(false);

  const problems = [
    {
      icon: Users,
      title: 'Awkward Role-Play',
      description: "Managers don't have time, and role-playing with coworkers never feels real enough to build genuine skills."
    },
    {
      icon: DollarSign,
      title: 'Learning on Real Calls',
      description: 'Every fumbled cancellation call costs you $300-500 in lifetime value. Mistakes are expensive.'
    },
    {
      icon: Activity,
      title: 'Inconsistent Training',
      description: "New hires sink or swim. Top performers can't transfer their skills to the rest of the team."
    }
  ];

  const solutions = [
    {
      number: 1,
      title: 'Realistic Voice Calls',
      description: 'Your CSR talks to an AI customer who responds naturally, gets frustrated when dismissed, and calms down when heard.'
    },
    {
      number: 2,
      title: 'Personalized to Your Company',
      description: 'AI customers mention your company name, your pricing, your guarantees. Training feels real because it references real details.'
    },
    {
      number: 3,
      title: 'Instant AI Coaching',
      description: "After every call, detailed feedback shows what worked, what didn't, and exactly what to say differently next time."
    },
    {
      number: 4,
      title: 'Unlimited Practice',
      description: 'CSRs can repeat difficult scenarios until they master them. No manager time required. Practice at 2am if they want.'
    },
    {
      number: 5,
      title: 'Custom Scenarios',
      description: 'Build scenarios from your actual call recordings. Had a brutal complaint last week? Turn it into a training exercise.'
    },
    {
      number: 6,
      title: 'Team Analytics',
      description: 'See who\'s improving, who needs help, and track skills like empathy, product knowledge, and save rate over time.'
    }
  ];

  const scenarios = [
    { difficulty: 'hard', title: 'The Cancellation Save', description: 'Long-time customer found a competitor $30/month cheaper.' },
    { difficulty: 'hard', title: 'Furious Callback', description: 'Customer paid 5 days ago and just found roaches in the kitchen.' },
    { difficulty: 'hard', title: 'Warranty Dispute', description: 'Termite customer thinks their warranty covers everything.' },
    { difficulty: 'medium', title: 'Price Shopper', description: 'New homeowner got a $99 quote from a competitor.' },
    { difficulty: 'medium', title: 'Upsell Opportunity', description: 'Happy customer mentions a mosquito problem before a party.' },
    { difficulty: 'medium', title: 'Missed Appointment', description: 'Tech was 75 minutes late. Customer missed an event waiting.' },
    { difficulty: 'medium', title: 'Wildlife Emergency', description: 'Panicked homeowner has a squirrel in their attic right now.' },
    { difficulty: 'easy', title: 'New Customer Inquiry', description: 'First-time buyer, ants in the kitchen. Never had pest control.' }
  ];

  const plans = [
    {
      name: 'Starter',
      tier: 'Try It',
      price: 149,
      description: 'Perfect for testing with a small team',
      features: [
        { text: '5 training hours/month', note: null },
        { text: '3 team members', note: null },
        { text: '8 standard scenarios', note: null },
        { text: 'Basic coaching scorecards', note: null },
        { text: 'Email support', note: null }
      ],
      cta: 'Start Free Trial',
      ctaStyle: 'ghost'
    },
    {
      name: 'Pro',
      tier: 'Build Your Team',
      price: 349,
      description: 'Everything you need to train a winning team',
      features: [
        { text: '12 training hours/month', note: null },
        { text: '10 team members', note: null },
        { text: 'All scenarios + custom builder', note: null },
        { text: 'Team trends & leaderboards', note: null },
        { text: 'Priority support', note: null }
      ],
      cta: 'Start Free Trial',
      ctaStyle: 'primary',
      popular: true
    },
    {
      name: 'Enterprise',
      tier: 'Scale It',
      price: 699,
      description: 'For multi-location operations',
      features: [
        { text: '25 training hours/month', note: null },
        { text: 'Unlimited team members', note: null },
        { text: 'All scenarios + custom development', note: null },
        { text: 'Full analytics + API access', note: null },
        { text: 'Dedicated success manager', note: null }
      ],
      cta: 'Contact Sales',
      ctaStyle: 'ghost'
    }
  ];

  const testimonials = [];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'hard': return 'bg-red-500/10 text-red-400';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400';
      case 'easy': return 'bg-green-500/10 text-green-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-50/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold">SellEveryCall</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Features</a>
              <a href="#scenarios" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Scenarios</a>
              <a href="#pricing" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">Pricing</a>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/auth/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                Log In
              </Link>
              <Link
                to="/auth/signup"
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 rounded-lg font-medium text-white text-sm transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-orange-400/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-500 text-sm mb-8 shadow-sm">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                <Zap className="w-2.5 h-2.5 text-white" />
              </div>
              AI-Powered CSR Training
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight">
              Train Like It's Real.
              <br />
              <span className="bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
                Win When It Is.
              </span>
            </h1>
            <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Give your CSRs unlimited practice with AI customers that push back, complain, and try to cancel—so your team is ready for anything.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                to="/auth/signup"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 rounded-xl font-semibold text-white transition-all shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 flex items-center justify-center gap-2"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => setIsDemoOpen(true)}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-900 transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* Stats */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-12 pt-12 border-t border-gray-200">
              <div className="text-center">
                <div className="text-5xl font-semibold text-gray-900 tracking-tight">47%</div>
                <div className="text-sm text-gray-500 mt-1">Higher save rate</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-semibold text-gray-900 tracking-tight">3.2x</div>
                <div className="text-sm text-gray-500 mt-1">Faster ramp-up</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-semibold text-gray-900 tracking-tight">89%</div>
                <div className="text-sm text-gray-500 mt-1">CSR preference</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-24 px-4 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10 pointer-events-none" />
        <div className="max-w-5xl mx-auto relative">
          <div className="mb-12">
            <p className="text-pink-400 text-xs font-semibold uppercase tracking-wider mb-4">The Problem</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-5">
              Every lost customer started<br />with a phone call
            </h2>
            <p className="text-lg text-gray-400 max-w-xl">
              Your CSRs handle angry customers, price shoppers, and cancellation threats every day. But how do they practice for those moments?
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {problems.map((problem, index) => (
              <motion.div
                key={problem.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500/20 to-orange-400/20 rounded-xl flex items-center justify-center mb-5">
                  <problem.icon className="w-6 h-6 text-pink-400" />
                </div>
                <h3 className="text-lg font-semibold mb-3">{problem.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{problem.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 max-w-xl">
            <p className="text-pink-500 text-xs font-semibold uppercase tracking-wider mb-4">The Solution</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-5">
              AI customers that train your team
            </h2>
            <p className="text-lg text-gray-500">
              SellEveryCall creates realistic voice conversations with AI customers who behave like real callers—complete with emotions, objections, and attitudes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {solutions.map((solution, index) => (
              <motion.div
                key={solution.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-white border border-gray-200 rounded-2xl p-8 hover:border-purple-300 hover:shadow-lg hover:-translate-y-0.5 transition-all"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-orange-400 rounded-lg flex items-center justify-center text-white text-sm font-semibold mb-5">
                  {solution.number}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{solution.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{solution.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scenarios Section */}
      <section id="scenarios" className="py-24 px-4 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 max-w-xl mx-auto">
            <p className="text-pink-500 text-xs font-semibold uppercase tracking-wider mb-4">Training Scenarios</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-5">
              8 built-in scenarios ready to go
            </h2>
            <p className="text-lg text-gray-500">
              Start training immediately with scenarios designed by industry experts.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {scenarios.map((scenario, index) => (
              <motion.div
                key={scenario.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="bg-gray-50 border border-gray-200 rounded-xl p-6 hover:border-purple-300 transition-colors"
              >
                <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold uppercase tracking-wide mb-4 ${getDifficultyColor(scenario.difficulty)}`}>
                  {scenario.difficulty}
                </span>
                <h3 className="font-semibold text-gray-900 mb-2">{scenario.title}</h3>
                <p className="text-sm text-gray-500">{scenario.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-4 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 max-w-xl mx-auto">
            <p className="text-pink-500 text-xs font-semibold uppercase tracking-wider mb-4">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-gray-900 mb-5">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-gray-500">
              Platform access plus training hours. Scale as you grow.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-white rounded-2xl p-10 ${
                  plan.popular
                    ? 'border-2 border-transparent bg-gradient-to-br from-pink-500 to-orange-400 p-[2px]'
                    : 'border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1.5 bg-gradient-to-r from-pink-500 to-orange-400 rounded-full text-xs font-semibold text-white">
                      Most Popular
                    </span>
                  </div>
                )}
                <div className={plan.popular ? 'bg-white rounded-[14px] p-8 h-full' : ''}>
                  <div className="mb-8">
                    <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-1">{plan.name}</p>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-1">{plan.tier}</h3>
                    <p className="text-sm text-gray-500">{plan.description}</p>
                  </div>
                  <div className="mb-8">
                    <span className="text-5xl font-semibold text-gray-900 tracking-tight">${plan.price}</span>
                    <span className="text-gray-500">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700">{feature.text}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/auth/signup"
                    className={`block w-full py-3.5 rounded-lg font-semibold text-center transition-all ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-gradient-to-r from-pink-500 to-orange-400 hover:from-pink-600 hover:to-orange-500 text-white shadow-lg shadow-pink-500/25'
                        : 'bg-white hover:bg-gray-50 border border-gray-200 text-gray-900'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Hour Blocks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white border border-gray-200 rounded-2xl p-10 max-w-5xl mx-auto"
          >
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-10">
              <div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Need more training hours?</h3>
                <p className="text-gray-500">Purchase hour blocks anytime. They never expire.</p>
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-semibold text-gray-900">5-Hour Block</h4>
                  <span className="text-xs text-gray-500">~60 training calls</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Starter</span><span className="font-semibold text-gray-900">$145</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pro</span><span className="font-semibold text-gray-900">$125</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Enterprise</span><span className="font-semibold text-gray-900">$115</span></div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-semibold text-gray-900">10-Hour Block</h4>
                  <span className="text-xs text-gray-500">~120 calls · 4% off</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Starter</span><span className="font-semibold text-gray-900">$279</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pro</span><span className="font-semibold text-gray-900">$239</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Enterprise</span><span className="font-semibold text-gray-900">$219</span></div>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-semibold text-gray-900">25-Hour Block</h4>
                  <span className="text-xs text-gray-500">~300 calls · 7% off</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Starter</span><span className="font-semibold text-gray-900">$675</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Pro</span><span className="font-semibold text-gray-900">$575</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Enterprise</span><span className="font-semibold text-gray-900">$525</span></div>
                </div>
              </div>
            </div>

            {/* Rollover Banner */}
            <div className="mt-10 bg-gradient-to-r from-pink-500/10 to-orange-400/10 border border-pink-500/20 rounded-xl p-6 flex items-start gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-1">Annual plans: All hours upfront</h4>
                <p className="text-sm text-gray-600">
                  Monthly plans reset each month. Annual plans give you all your hours immediately—perfect for heavy onboarding months or pre-season training pushes. Purchased hour blocks never expire on any plan.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-gradient-to-r from-pink-500 via-orange-400 to-yellow-400 relative overflow-hidden">
        <div className="max-w-2xl mx-auto text-center relative">
          <h2 className="text-3xl md:text-4xl font-semibold text-white mb-5 tracking-tight">
            Ready to stop losing customers to bad calls?
          </h2>
          <p className="text-lg text-white/90 mb-10">
            Start your free trial today. No credit card required. See results in your first week.
          </p>
          <Link
            to="/auth/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-50 rounded-xl font-semibold text-gray-900 transition-colors shadow-lg"
          >
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-orange-400 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <span className="font-semibold">SellEveryCall</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Train like it's real. Win when it is.
              </p>
              <p className="text-sm text-gray-400 leading-relaxed mt-2">
                AI-powered CSR training built for service companies.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-5">Product</h4>
              <div className="space-y-3">
                <a href="#features" className="block text-sm text-gray-400 hover:text-white transition-colors">Features</a>
                <a href="#scenarios" className="block text-sm text-gray-400 hover:text-white transition-colors">Scenarios</a>
                <a href="#pricing" className="block text-sm text-gray-400 hover:text-white transition-colors">Pricing</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-5">Resources</h4>
              <div className="space-y-3">
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Help Center</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Blog</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Case Studies</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-5">Company</h4>
              <div className="space-y-3">
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">About</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Contact</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Privacy</a>
                <a href="#" className="block text-sm text-gray-400 hover:text-white transition-colors">Terms</a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              © {new Date().getFullYear()} SellEveryCall. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Video Modal */}
      <DemoVideoModal isOpen={isDemoOpen} onClose={() => setIsDemoOpen(false)} />
    </div>
  );
}

export default Landing;
