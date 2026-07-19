import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input, Button, Alert } from '@/components/ui';
import { APP_NAME } from '@/constants';
import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiError } from '@/api/errors';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    try {
      await login(data.email, data.password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      setFormError(ApiError.from(err).toUserMessage());
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">Sign in</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Access your {APP_NAME} dashboard
        </p>
      </div>

      {formError && <Alert variant="danger">{formError}</Alert>}

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          fullWidth
          leftAddon={<Mail className="w-4 h-4" />}
          errorMessage={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />

        <Input
          label="Password"
          type={showPassword ? 'text' : 'password'}
          placeholder="••••••••"
          fullWidth
          leftAddon={<Lock className="w-4 h-4" />}
          rightAddon={
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="pointer-events-auto"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
          errorMessage={errors.password?.message}
          {...register('password', {
            required: 'Password is required',
            minLength: { value: 8, message: 'Password must be at least 8 characters' },
          })}
        />

        <div className="flex items-center justify-end">
          <button
            type="button"
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          fullWidth
          loading={isSubmitting}
          leftIcon={<Shield className="w-4 h-4" />}
        >
          Sign in
        </Button>
      </form>
    </div>
  );
}
