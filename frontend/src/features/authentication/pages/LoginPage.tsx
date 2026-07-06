import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Input, Button, Alert } from '@/components/ui';
import { APP_NAME } from '@/constants';

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>();

  const onSubmit = (_data: LoginFormValues) => {
    // Authentication logic is intentionally omitted per requirements.
    // Wire in auth service and Zustand auth store when ready.
    return new Promise<void>((resolve) => setTimeout(resolve, 800));
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

      {/* Demo notice */}
      <Alert variant="info">
        Authentication is not yet enabled. This is a UI scaffold.
      </Alert>

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
