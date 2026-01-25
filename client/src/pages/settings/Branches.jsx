import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Phone,
  Clock,
  Users,
  X,
  Save
} from 'lucide-react';
import { useOrganization } from '../../context/OrganizationContext';
import { useNotifications } from '../../context/NotificationContext';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Pacific/Honolulu'
];

export default function Branches() {
  const { branches, createBranch, updateBranch, deleteBranch, refreshBranches } = useOrganization();
  const { showSuccess, showError } = useNotifications();

  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    timezone: 'America/New_York',
    is_primary: false
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const handleOpenModal = (branch = null) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name || '',
        address: branch.address || '',
        phone: branch.phone || '',
        timezone: branch.timezone || 'America/New_York',
        is_primary: branch.is_primary || false
      });
    } else {
      setEditingBranch(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        timezone: 'America/New_York',
        is_primary: false
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingBranch) {
        await updateBranch(editingBranch.id, formData);
        showSuccess('Branch Updated', 'Branch has been updated successfully');
      } else {
        await createBranch(formData);
        showSuccess('Branch Created', 'New branch has been created');
      }
      handleCloseModal();
    } catch (error) {
      showError('Error', error.message || 'Failed to save branch');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branchId) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;

    setDeleting(branchId);
    try {
      await deleteBranch(branchId);
      showSuccess('Branch Deleted', 'Branch has been deleted');
    } catch (error) {
      showError('Error', error.message || 'Failed to delete branch');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Branch Management</h1>
          <p className="text-gray-400 mt-1">
            Configure locations and organize your team
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Branch
        </button>
      </div>

      {/* Branches Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.length > 0 ? (
          branches.map((branch, index) => (
            <motion.div
              key={branch.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-gray-800 rounded-xl p-6 border ${
                branch.is_primary ? 'border-primary-500' : 'border-gray-700'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    branch.is_primary ? 'bg-primary-500/10' : 'bg-gray-700'
                  }`}>
                    <GitBranch className={`w-5 h-5 ${
                      branch.is_primary ? 'text-primary-400' : 'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-100">{branch.name}</h3>
                    {branch.is_primary && (
                      <span className="text-xs text-primary-400">Primary Branch</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenModal(branch)}
                    className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-300"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!branch.is_primary && (
                    <button
                      onClick={() => handleDelete(branch.id)}
                      disabled={deleting === branch.id}
                      className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                {branch.address && (
                  <div className="flex items-start gap-2 text-gray-400">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{branch.address}</span>
                  </div>
                )}
                {branch.phone && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>{branch.timezone?.replace('America/', '')}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>{branch.user_count || 0} team members</span>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full bg-gray-800 rounded-xl p-12 border border-gray-700 text-center"
          >
            <GitBranch className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-100 mb-2">
              No branches yet
            </h3>
            <p className="text-gray-400 mb-6">
              Create branches to organize your team by location
            </p>
            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Branch
            </button>
          </motion.div>
        )}
      </div>

      {/* Branch Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-100">
                {editingBranch ? 'Edit Branch' : 'Add Branch'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Branch Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Downtown Office"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="123 Main St, City, ST 12345"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Timezone
                </label>
                <select
                  value={formData.timezone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace('America/', '').replace('Pacific/', '')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_primary"
                  checked={formData.is_primary}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_primary: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-primary-500 focus:ring-primary-500"
                />
                <label htmlFor="is_primary" className="text-sm text-gray-300">
                  Set as primary branch
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-400 hover:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-600/50 text-white font-medium rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Branch'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
