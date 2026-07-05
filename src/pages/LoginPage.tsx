import { useForm } from 'react-hook-form';
import { FaDumbbell } from 'react-icons/fa';
import { useUserContext } from '../contexts/useUserContext';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Field';
import FormContainer from '../components/common/FormContainer';

type FormValues = {
  email: string;
  password: string;
};

function LoginPage() {
  const { login, loading } = useUserContext();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors,
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    try {
      clearErrors();
      await login(data.email, data.password);
    } catch (err) {
      console.error('Login error:', err);
      setFormError('root', {
        type: 'manual',
        message: 'Failed to login. Please check your email and password.',
      });
    }
  };

  return (
    <FormContainer
      title="Login"
      subtitle="Enter your email and password to login"
      icon={<FaDumbbell aria-hidden="true" />}
      centered
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input
          id="email"
          placeholder="Enter your email"
          invalid={!!errors.email}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address',
            },
          })}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          invalid={!!errors.password}
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
        />
      </Field>

      <Button type="submit" variant="primary" fullWidth disabled={isSubmitting || loading}>
        {isSubmitting || loading ? 'Logging in...' : 'Login'}
      </Button>
    </FormContainer>
  );
}

export default LoginPage;
