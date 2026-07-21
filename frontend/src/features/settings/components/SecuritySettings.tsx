import { useState } from 'react';
import { Card, CardHeader, Button, Input } from '@/components/ui';
import { userService, type UserPasswordUpdate } from '@/services';
import { toast } from '@/store/useNotificationStore';
import { ApiError } from '@/api/errors';

export function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<UserPasswordUpdate>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleChange = (field: keyof UserPasswordUpdate, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Validation rules
  const hasMinLength = formData.new_password.length >= 8;
  const hasUppercase = /[A-Z]/.test(formData.new_password);
  const hasNumber = /[0-9]/.test(formData.new_password);
  const hasSpecial = /[^A-Za-z0-9]/.test(formData.new_password);
  const passwordsMatch = formData.new_password === formData.confirm_password;
  
  const isFormValid = 
    formData.current_password.length > 0 && 
    hasMinLength && 
    hasUppercase && 
    hasNumber && 
    hasSpecial && 
    passwordsMatch;

  const strengthScore = [hasMinLength, hasUppercase, hasNumber, hasSpecial].filter(Boolean).length;
  
  const getStrengthColor = () => {
    if (strengthScore <= 1) return 'bg-red-500';
    if (strengthScore <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleSubmit = async () => {
    if (!isFormValid) return;
    
    setLoading(true);
    try {
      await userService.updatePassword(formData);
      toast.success('Password Updated', 'Your security settings have been updated.');
      
      // Clear fields
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      toast.error('Password Update Failed', ApiError.from(err).toUserMessage());
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader title="Security" description="Manage password and authentication" />
      <div className="space-y-4 mt-2 p-4 pt-0">
        <Input 
          label="Current Password" 
          type="password" 
          placeholder="••••••••" 
          value={formData.current_password}
          onChange={(e) => handleChange('current_password', e.target.value)}
          fullWidth 
        />
        
        <div className="space-y-2">
          <Input 
            label="New Password"     
            type="password" 
            placeholder="••••••••" 
            value={formData.new_password}
            onChange={(e) => handleChange('new_password', e.target.value)}
            fullWidth 
          />
          {/* Password strength meter */}
          {formData.new_password.length > 0 && (
            <div className="flex gap-1 h-1.5 mt-2">
              {[1, 2, 3, 4].map((level) => (
                <div 
                  key={level} 
                  className={`flex-1 rounded-full ${strengthScore >= level ? getStrengthColor() : 'bg-[var(--sf-border-default)]'}`} 
                />
              ))}
            </div>
          )}
          <div className="text-xs text-[var(--sf-text-tertiary)] mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span className={hasMinLength ? 'text-green-500' : ''}>• 8+ characters</span>
            <span className={hasUppercase ? 'text-green-500' : ''}>• 1 uppercase</span>
            <span className={hasNumber ? 'text-green-500' : ''}>• 1 number</span>
            <span className={hasSpecial ? 'text-green-500' : ''}>• 1 special char</span>
          </div>
        </div>

        <div className="space-y-2">
          <Input 
            label="Confirm Password" 
            type="password" 
            placeholder="••••••••" 
            value={formData.confirm_password}
            onChange={(e) => handleChange('confirm_password', e.target.value)}
            fullWidth 
          />
          {formData.confirm_password && !passwordsMatch && (
            <p className="text-xs text-red-500">Passwords do not match.</p>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-[var(--sf-border-default)]">
          <Button 
            onClick={handleSubmit}
            disabled={!isFormValid || loading}
          >
            {loading ? 'Updating...' : 'Update Password'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
