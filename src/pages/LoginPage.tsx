import { useForm } from 'react-hook-form';
import { useUserContext } from '../contexts/useUserContext';
import classNames from 'classnames';
import styles from './LoginPage.module.css';
import buttonStyles from '../styles/common/buttons.module.css';
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
      errorMessage={errors.root?.message}
      onSubmit={handleSubmit(onSubmit)}
      className={styles.loginContainer}
    >
      <p>Enter your email and password to login</p>
      <div className={styles.formGroup}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          placeholder="Enter your email"
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Please enter a valid email address',
            },
          })}
        />
        {errors.email && <div className={styles.fieldError}>{errors.email.message}</div>}
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="Enter your password"
          {...register('password', {
            required: 'Password is required',
            minLength: {
              value: 6,
              message: 'Password must be at least 6 characters',
            },
          })}
        />
        {errors.password && <div className={styles.fieldError}>{errors.password.message}</div>}
      </div>

      <button
        type="submit"
        className={classNames(styles.loginButton, buttonStyles.primaryBtn)}
        disabled={isSubmitting || loading}
      >
        {isSubmitting || loading ? 'Logging in...' : 'Login'}
      </button>
      <div className={styles.loginNote}>
        <p className={styles.loginNoteLink}>
          After logging in, you can <a href="/change-password">change your password</a>.
        </p>
      </div>
    </FormContainer>
  );
}

export default LoginPage;
