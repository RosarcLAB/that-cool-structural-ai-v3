import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getUserProfile, updateUserProfile } from '../../services/authService';

const disciplines = [
  'Structural Engineer', 'Civil Engineer', 'Architect', 'Construction Manager',
  'Project Manager', 'Mechanical Engineer', 'Electrical Engineer',
  'Geotechnical Engineer', 'Environmental Engineer', 'Other',
];
const countries = ['United Kingdom', 'New Zealand', 'United States', 'Australia', 'Canada', 'Other'];

type ProfileData = {
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  country: string;
  discipline: string;
  community: string;
  phone: string;
  bio: string;
};
interface UserProfileProps {
    isOpen: boolean;
    onClose: () => void;
 }

export const UserProfileModal: React.FC<UserProfileProps> = ({ isOpen, onClose  }) => {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState<ProfileData>({
    firstName: '', lastName: '', displayName: '', email: '',
    country: '', discipline: '', community: '', phone: '', bio: '',
  });

  const loadUserProfile = async () => {
    if (!currentUser) return;
    setLoading(true);
    setError('');
    try {
      const profile = await getUserProfile(currentUser.uid);
      if (profile) {
        setFormData({
          firstName: profile.firstName || '',
          lastName: profile.lastName || '',
          displayName: profile.displayName || '',
          email: profile.email || '',
          country: profile.country || '',
          discipline: profile.discipline || '',
          community: profile.community || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
        });
      } else {
        setFormData({
          firstName: currentUser.displayName?.split(' ')[0] || '',
          lastName: currentUser.displayName?.split(' ').slice(1).join(' ') || '',
          displayName: currentUser.displayName || '',
          email: currentUser.email || '',
          country: '', discipline: '', community: '', phone: '', bio: '',
        });
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load profile data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, [currentUser]);

  const handleInputChange = (field: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async () => {
    if (!currentUser) return;
    setError('');
    setSuccess('');
    if (!formData.firstName.trim() || !formData.lastName.trim() ||
        !formData.discipline.trim() || !formData.country) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    try {
      const updated = { ...formData, displayName: `${formData.firstName} ${formData.lastName}`.trim() };
      await updateUserProfile(currentUser.uid, updated);
      await loadUserProfile();
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    loadUserProfile();
    setError('');
    setSuccess('');
    setIsEditing(false);
  };

    //   if (!currentUser) {
    //     return <div className="text-center p-8">Please log in to view your profile.</div>;
    //   }

  if (!isOpen) return null; 


  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}  // click outside closes modal
    >
      <div
        className="relative max-w-3xl mx-auto p-6 bg-white rounded-lg shadow"
        onClick={e => e.stopPropagation()}  // prevent closing when clicking inside
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-2xl">
          {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">User Profile</h2>
          <p className="text-gray-600">{formData.displayName || 'Complete your profile'}</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isEditing && (
            <>            
              <button onClick={loadUserProfile} disabled={loading}
                className="btn btn-ghost btn-circle">
                {loading ? <span className="loading loading-spinner" /> : '⟳'}
              </button>
              <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
      {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

      <form>
        {/* Basic Information */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">First Name *</label>
              <input
                type="text" value={formData.firstName} onChange={handleInputChange('firstName')} disabled={!isEditing}
                className="input input-bordered w-full" required
              />
            </div>
            <div>
              <label className="block mb-1">Last Name *</label>
              <input
                type="text" value={formData.lastName} onChange={handleInputChange('lastName')} disabled={!isEditing}
                className="input input-bordered w-full" required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">Email</label>
              <input type="email" value={formData.email} disabled className="input input-bordered w-full bg-gray-100" />
            </div>
            <div className="md:col-span-2">
              <label className="block mb-1">Phone</label>
              <input
                type="tel" value={formData.phone} onChange={handleInputChange('phone')} disabled={!isEditing}
                className="input input-bordered w-full"
                placeholder="e.g., +44 20 7946 0958"
              />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-2">Professional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Discipline *</label>
              <input
                type="text" value={formData.discipline} onChange={handleInputChange('discipline')} disabled={!isEditing}
                className="input input-bordered w-full" required
              />
            </div>
            <div>
              <label className="block mb-1">Country *</label>
              <input
                type="text" value={formData.country} onChange={handleInputChange('country')} disabled={!isEditing}
                className="input input-bordered w-full" required
              />
            </div>
          </div>
        </div>
        </form>
        </div>
    </div>
  );
}
