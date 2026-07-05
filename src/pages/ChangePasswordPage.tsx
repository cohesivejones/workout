import { useForm } from 'react-hook-form';
import { useState } from 'react';
import axios from 'axios';
import { FaLock } from 'react-icons/fa';
import { useUserContext } from '../contexts/useUserContext';
import FormContainer from '../components/common/FormContainer';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';

type FormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

function ChangePasswordPage() {
  const { user } = useUserContext();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    try {
      clearErrors();
      setSuccessMessage(null);

      // Check if passwords match
      if (data.newPassword !== data.confirmPassword) {
        setFormError('confirmPassword', {
          type: 'manual',
          message: 'Passwords do not match',
        });
        return;
      }

      // Call change password API
      await axios.post(
        `/api/auth/change-password`,
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        { withCredentials: true }
      );

      // Reset form and show success message
      reset();
      setSuccessMessage('Password changed successfully');
    } catch (err: unknown) {
      console.error('Change password error:', err);

      // Type guard for axios error
      const axiosError = err as { response?: { data?: { error?: string } } };

      // Handle specific error messages from the API
      if (axiosError.response?.data?.error) {
        if (axiosError.response.data.error === 'Current password is incorrect') {
          setFormError('currentPassword', {
            type: 'manual',
            message: 'Current password is incorrect',
          });
        } else if (axiosError.response.data.error.includes('New password must be')) {
          setFormError('newPassword', {
            type: 'manual',
            message: axiosError.response.data.error,
          });
        } else {
          setFormError('root', {
            type: 'manual',
            message: axiosError.response.data.error,
          });
        }
      } else {
        setFormError('root', {
          type: 'manual',
          message: 'Failed to change password. Please try again.',
        });
      }
    }
  };

  if (!user) {
    return (
      <FormContainer title="Change Password" asForm={false}>
        <p>You must be logged in to change your password.</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Change Password"
      subtitle="Update your password below"
      icon={<FaLock aria-hidden="true" />}
      centered
      errorMessage={errors.root?.message}
      successMessage={successMessage}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field
        label="Current Password"
        htmlFor="currentPassword"
        error={errors.currentPassword?.message}
      >
        <Input
          id="currentPassword"
          type="password"
          placeholder="Enter your current password"
          invalid={!!errors.currentPassword}
          {...register('currentPassword', {
            required: 'Current password is required',
          })}
        />
      </Field>

      <Field label="New Password" htmlFor="newPassword" error={errors.newPassword?.message}>
        <Input
          id="newPassword"
          type="password"
          placeholder="Enter your new password"
          invalid={!!errors.newPassword}
          {...register('newPassword', {
            required: 'New password is required',
            minLength: {
              value: 6,
              message: 'New password must be at least 6 characters',
            },
          })}
        />
      </Field>

      <Field
        label="Confirm New Password"
        htmlFor="confirmPassword"
        error={errors.confirmPassword?.message}
      >
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Confirm your new password"
          invalid={!!errors.confirmPassword}
          {...register('confirmPassword', {
            required: 'Please confirm your new password',
            validate: (value) => value === watch('newPassword') || 'Passwords do not match',
          })}
        />
      </Field>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Changing Password...' : 'Change Password'}
      </Button>
    </FormContainer>
  );
}

export default ChangePasswordPage;
