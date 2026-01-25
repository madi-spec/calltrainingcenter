import { useState } from 'react';
import { Loader2, Plus, Trash2, Mail, UserPlus, Users, Send, CheckCircle2 } from 'lucide-react';

export default function TeamSetupStep({ data, allStepData, onComplete, authFetch }) {
  const [invites, setInvites] = useState(data.invites || [{ email: '', role: 'trainee' }]);
  const [sending, setSending] = useState(false);
  const [sentInvites, setSentInvites] = useState([]);

  const roles = [
    { value: 'trainee', label: 'Trainee', description: 'Can access training and view own progress' },
    { value: 'manager', label: 'Manager', description: 'Can view team progress and assign training' },
    { value: 'admin', label: 'Admin', description: 'Full access to settings and billing' }
  ];

  const updateInvite = (index, field, value) => {
    const updated = [...invites];
    updated[index] = { ...updated[index], [field]: value };
    setInvites(updated);
  };

  const addInvite = () => {
    setInvites([...invites, { email: '', role: 'trainee' }]);
  };

  const removeInvite = (index) => {
    if (invites.length > 1) {
      setInvites(invites.filter((_, i) => i !== index));
    }
  };

  const handleSendInvites = async () => {
    const validInvites = invites.filter(inv => inv.email && inv.email.includes('@'));
    if (validInvites.length === 0) {
      onComplete({ invites: [] });
      return;
    }

    setSending(true);
    const sent = [];

    try {
      for (const invite of validInvites) {
        const response = await authFetch('/api/invitations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: invite.email,
            role: invite.role
          })
        });

        if (response.ok) {
          sent.push(invite.email);
        }
      }

      setSentInvites(sent);
      onComplete({ invites: validInvites, sentCount: sent.length });
    } catch (error) {
      console.error('Failed to send invites:', error);
      onComplete({ invites: validInvites, sentCount: sent.length });
    } finally {
      setSending(false);
    }
  };

  const handleSkip = () => {
    onComplete({ invites: [], skipped: true });
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-primary-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-primary-300 mb-1">Build Your Team</h4>
            <p className="text-sm text-gray-400">
              Invite your team members to start training. You can always add more people later
              from the Team Settings page.
            </p>
          </div>
        </div>
      </div>

      {/* Invite Form */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Invite Team Members</h3>

        <div className="space-y-4">
          {invites.map((invite, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-1">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={invite.email}
                    onChange={(e) => updateInvite(index, 'email', e.target.value)}
                    disabled={sentInvites.includes(invite.email)}
                    className={`w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500 ${
                      sentInvites.includes(invite.email) ? 'opacity-50' : ''
                    }`}
                    placeholder="email@example.com"
                  />
                  {sentInvites.includes(invite.email) && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                  )}
                </div>
              </div>

              <select
                value={invite.role}
                onChange={(e) => updateInvite(index, 'role', e.target.value)}
                disabled={sentInvites.includes(invite.email)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:ring-2 focus:ring-primary-500"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => removeInvite(index)}
                disabled={invites.length === 1 || sentInvites.includes(invite.email)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}

          <button
            onClick={addInvite}
            className="flex items-center gap-2 px-4 py-2 text-primary-400 hover:bg-primary-500/10 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add another person
          </button>
        </div>

        {/* Role Descriptions */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Role Permissions</h4>
          <div className="grid md:grid-cols-3 gap-4">
            {roles.map(role => (
              <div key={role.value} className="p-3 bg-gray-700/50 rounded-lg">
                <h5 className="font-medium text-gray-200 mb-1">{role.label}</h5>
                <p className="text-xs text-gray-400">{role.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sent Summary */}
      {sentInvites.length > 0 && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {sentInvites.length} invitation{sentInvites.length !== 1 ? 's' : ''} sent successfully
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleSkip}
          disabled={sending}
          className="text-gray-400 hover:text-gray-300 transition-colors"
        >
          Skip for now
        </button>

        <button
          onClick={handleSendInvites}
          disabled={sending || invites.every(inv => !inv.email || sentInvites.includes(inv.email))}
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending...
            </>
          ) : sentInvites.length > 0 ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Continue
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Send Invitations
            </>
          )}
        </button>
      </div>
    </div>
  );
}
