import { useState, useEffect } from 'react';
import { Card, CardHeader, Button, Input } from '@/components/ui';
import { userService, type UserProfileUpdate } from '@/services';
import { useAuthStore } from '@/store';
import { toast } from '@/store/useNotificationStore';
import { ApiError } from '@/api/errors';

export function ProfileSettings() {
  const { user, updateUser } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserProfileUpdate>({
    full_name: '',
    email: '',
    department: '',
    phone_number: '',
  });
  const [initialData, setInitialData] = useState<UserProfileUpdate | null>(null);

  useEffect(() => {
    if (user) {
      const initData = {
        full_name: user.full_name || '',
        email: user.email || '',
        department: user.department || '',
        phone_number: user.phone_number || '',
      };
      setFormData(initData);
      setInitialData(initData);
    }
  }, [user]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleChange = (field: keyof UserProfileUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!isDirty) return;
    
    setLoading(true);
    try {
      const updatedProfile = await userService.updateProfile(formData);
      updateUser(updatedProfile);
      setInitialData(formData);
      toast.success('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (err) {
      toast.error('Failed to update profile', ApiError.from(err).toUserMessage());
    } finally {
      setLoading(false);
    }
  };

  if (!user) return <div className="p-4">Loading profile...</div>;

  return (
    <Card>
      <CardHeader title="Profile" description="Update your personal details" />
      <div className="space-y-4 mt-2 p-4 pt-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Full Name" 
            placeholder="John Doe" 
            value={formData.full_name}
            onChange={(e) => handleChange('full_name', e.target.value)}
            fullWidth 
          />
          <Input 
            label="Email" 
            type="email" 
            placeholder="john.doe@company.com" 
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            fullWidth 
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Department" 
            placeholder="Safety & Compliance" 
            value={formData.department}
            onChange={(e) => handleChange('department', e.target.value)}
            fullWidth 
          />
          <Input 
            label="Phone Number" 
            placeholder="+1 (555) 000-0000" 
            value={formData.phone_number}
            onChange={(e) => handleChange('phone_number', e.target.value)}
            fullWidth 
          />
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t border-[var(--sf-border-default)] pt-4">
           <Input 
            label="Employee ID" 
            value={user.employee_id || 'Not Assigned'}
            disabled
            fullWidth 
          />
          <Input 
            label="Role" 
            value={user.role || 'Unknown'}
            disabled
            fullWidth 
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button 
            onClick={handleSubmit} 
            disabled={!isDirty || loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
