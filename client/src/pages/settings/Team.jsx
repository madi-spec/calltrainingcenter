import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  Search,
  MoreVertical,
  Mail,
  Shield,
  Edit2,
  Trash2,
  X,
  Clock,
  Send,
  XCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import EmptyState from '../../components/ui/EmptyState';

const ROLES = [
  { id: 'trainee', name: 'Trainee', description: 'Can complete training and view own progress' },
  { id: 'manager', name: 'Manager', description: 'Can assign training and view team reports' },
  { id: 'admin', name: 'Admin', description: 'Full access except billing' },
  { id: 'super_admin', name: 'Super Admin', description: 'Full access including billing' }
];

export default function Team() {
  const { authFetch, profile, hasPermission } = useAuth();
  const { showSuccess, showError } = useNotifications();

  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({ email: '', role: 'trainee', branch_id: '' });
  const [inviting, setInviting] = useState(false);

  const canInvite = hasPermission('users:invite');
  const canEditRoles = hasPermission('users:change_role');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users
        const usersResponse = await authFetch('/api/users');
        if (usersResponse.ok) {
          const usersData = await usersResponse.json();
          setUsers(usersData.users || []);
        }

        // Fetch pending invitations
        const invitationsResponse = await authFetch('/api/invitations');
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          setInvitations(invitationsData.invitations || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authFetch]);

  const filteredUsers = users.filter((u) =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);

    try {
      const response = await authFetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData)
      });

      if (response.ok) {
        showSuccess('Invitation Sent', `Invitation sent to ${inviteData.email}`);
        setShowInviteModal(false);
        setInviteData({ email: '', role: 'trainee', branch_id: '' });

        // Refresh invitations list
        const invitationsResponse = await authFetch('/api/invitations');
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          setInvitations(invitationsData.invitations || []);
        }
      } else {
        const data = await response.json();
        throw new Error(data.error || data.message || 'Failed to send invitation');
      }
    } catch (error) {
      showError('Error', error.message);
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId) => {
    try {
      const response = await authFetch(`/api/invitations/${invitationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
        showSuccess('Invitation Cancelled', 'The invitation has been cancelled');
      } else {
        throw new Error('Failed to cancel invitation');
      }
    } catch (error) {
      showError('Error', error.message);
    }
  };

  const handleResendInvitation = async (invitationId) => {
    try {
      const response = await authFetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST'
      });

      if (response.ok) {
        showSuccess('Invitation Resent', 'The invitation has been resent');
      } else {
        throw new Error('Failed to resend invitation');
      }
    } catch (error) {
      showError('Error', error.message);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const response = await authFetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });

      if (response.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        );
        showSuccess('Role Updated', 'User role has been updated');
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to update role');
      }
    } catch (error) {
      showError('Error', error.message);
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/10 text-purple-400';
      case 'admin':
        return 'bg-red-500/10 text-red-400';
      case 'manager':
        return 'bg-blue-500/10 text-blue-400';
      default:
        return 'bg-muted/10 text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground mt-1">
            Invite and manage team members
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-foreground font-medium rounded-lg transition-colors"
          >
            <UserPlus className="w-5 h-5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {ROLES.map((role) => {
          const count = users.filter((u) => u.role === role.id).length;
          return (
            <div key={role.id} className="bg-card rounded-lg p-4 border border-border">
              <p className="text-muted-foreground text-sm capitalize">{role.name}s</p>
              <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg border border-border"
        >
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-foreground">
                Pending Invitations ({invitations.length})
              </h2>
            </div>
          </div>
          <div className="divide-y divide-border">
            {invitations.map((invitation) => (
              <div key={invitation.id} className="p-4 flex items-center justify-between hover:bg-muted">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-foreground font-medium">{invitation.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getRoleBadgeColor(invitation.role)}`}>
                          <Shield className="w-3 h-3" />
                          {invitation.role.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleResendInvitation(invitation.id)}
                    className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                    title="Resend invitation"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    title="Cancel invitation"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Team List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-lg border border-border overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Member</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Role</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Branch</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-muted-foreground">Sessions</th>
                <th className="py-4 px-6"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 font-medium">
                            {user.full_name?.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-foreground font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      {canEditRoles && user.id !== profile?.id ? (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className="px-3 py-1 bg-muted border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          {ROLES.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getRoleBadgeColor(user.role)}`}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-muted-foreground">
                      {user.branch?.name || 'No branch'}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        user.status === 'active' ? 'bg-green-500/10 text-green-400' :
                        user.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-muted/10 text-muted-foreground'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-secondary-foreground">
                      {user.total_sessions || 0}
                    </td>
                    <td className="py-4 px-6">
                      {user.id !== profile?.id && (
                        <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                          <MoreVertical className="w-5 h-5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={Users}
                      title="No team members found"
                      description="Invite team members to get started with training"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg p-6 max-w-md w-full border border-border"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-foreground mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    value={inviteData.email}
                    onChange={(e) => setInviteData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="colleague@company.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-foreground mb-2">
                  Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <select
                    value={inviteData.role}
                    onChange={(e) => setInviteData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {ROLES.filter((r) => r.id !== 'super_admin').map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-muted-foreground hover:text-secondary-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-foreground font-medium rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
