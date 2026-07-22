import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { Input, Button, Alert } from '@/components/ui';

import { ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/store/useAuthStore';
import { ApiError } from '@/api/errors';

const ERROR_MESSAGES: Record<string, string> = {
  USER_NOT_FOUND: 'No account was found for this email address. Please contact your system administrator.',
  INVALID_PASSWORD: 'The password you entered is incorrect. Please try again.',
  ACCOUNT_DISABLED: 'Your account has been disabled. Please contact your administrator.',
  ACCOUNT_PENDING: 'Your account is awaiting approval. Please contact your administrator.',
  TOO_MANY_ATTEMPTS: 'Too many unsuccessful login attempts. Please wait a few minutes before trying again.',
  SERVER_ERROR: 'Something went wrong while signing you in. Please try again later.',
  NETWORK_ERROR: 'Unable to connect to the server. Please check your internet connection.',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again.',
};

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    shouldFocusError: true,
  });

  useEffect(() => {
    const subscription = watch(() => setFormError(null));
    return () => subscription.unsubscribe();
  }, [watch]);

  const onSubmit = async (data: LoginFormValues) => {
    setFormError(null);
    try {
      await login(data.email, data.password);
      const from = (location.state as { from?: Location } | null)?.from;
      navigate(from ? `${from.pathname}${from.search}` : ROUTES.DASHBOARD, { replace: true });
    } catch (err) {
      const apiError = ApiError.from(err);
      let message = apiError.toUserMessage();
      
      if (apiError.code && ERROR_MESSAGES[apiError.code]) {
        message = ERROR_MESSAGES[apiError.code];
      } else if (apiError.isNetworkError || apiError.isTimeoutError) {
        message = ERROR_MESSAGES.NETWORK_ERROR;
      } else if (apiError.isServerError) {
        message = ERROR_MESSAGES.SERVER_ERROR;
      } else if (apiError.isAuthError) {
        message = ERROR_MESSAGES.AUTH_EXPIRED;
      }
      
      setFormError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[var(--sf-text-primary)]">Sign in</h2>
        <p className="mt-1 text-sm text-[var(--sf-text-tertiary)]">
          Access your AI Command Center
        </p>
      </div>

      {formError && (
        <Alert variant="danger" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

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
          <span className="text-xs text-[var(--sf-text-tertiary)]">
            Need access? Contact your Plant Administrator
          </span>
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
