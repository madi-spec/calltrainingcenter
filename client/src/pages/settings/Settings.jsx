import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  CreditCard,
  Users,
  GitBranch,
  Bot,
  Bell,
  Shield,
  ChevronRight,
  Database
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Settings() {
  const { profile, hasPermission } = useAuth();

  const settingsSections = [
    {
      title: 'Profile',
      description: 'Manage your personal information and preferences',
      icon: User,
      href: '/settings/profile',
      color: 'text-blue-400 bg-blue-500/10'
    },
    {
      title: 'Organization',
      description: 'Update company branding and details',
      icon: Building2,
      href: '/admin',
      color: 'text-purple-400 bg-purple-500/10',
      permission: 'settings:edit'
    },
    {
      title: 'Billing',
      description: 'Manage subscription, view invoices, and usage',
      icon: CreditCard,
      href: '/settings/billing',
      color: 'text-green-400 bg-green-500/10',
      permission: 'billing:view'
    },
    {
      title: 'Team',
      description: 'Invite users and manage team members',
      icon: Users,
      href: '/settings/team',
      color: 'text-yellow-400 bg-yellow-500/10',
      permission: 'users:view_team'
    },
    {
      title: 'Branches',
      description: 'Configure branch locations and settings',
      icon: GitBranch,
      href: '/settings/branches',
      color: 'text-pink-400 bg-pink-500/10',
      permission: 'branches:view'
    },
    {
      title: 'AI Configuration',
      description: 'Customize AI coaching and scoring settings',
      icon: Bot,
      href: '/settings/ai',
      color: 'text-cyan-400 bg-cyan-500/10',
      permission: 'settings:ai'
    },
    {
      title: 'Knowledge Base',
      description: 'Upload documents to generate training content',
      icon: Database,
      href: '/settings/knowledge-base',
      color: 'text-emerald-400 bg-emerald-500/10',
      permission: 'settings:edit'
    },
    {
      title: 'Notifications',
      description: 'Configure email and in-app notifications',
      icon: Bell,
      href: '/settings/notifications',
      color: 'text-orange-400 bg-orange-500/10'
    }
  ];

  const visibleSections = settingsSections.filter((section) => {
    if (!section.permission) return true;
    return hasPermission(section.permission);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your account and organization settings
        </p>
      </div>

      {/* Profile Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 rounded-xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-primary-400">
              {profile?.full_name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-100">{profile?.full_name}</h2>
            <p className="text-gray-400">{profile?.email}</p>
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary-500/10 text-primary-400 text-sm rounded-full capitalize">
              <Shield className="w-3 h-3" />
              {profile?.role}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Settings Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {visibleSections.map((section, index) => (
          <motion.div
            key={section.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link
              to={section.href}
              className="block bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${section.color}`}>
                    <section.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-100 group-hover:text-primary-400 transition-colors">
                      {section.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-1">
                      {section.description}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-primary-400 transition-colors" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
