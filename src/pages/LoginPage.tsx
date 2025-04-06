import { useForm } from "react-hook-form";
import { useUserContext } from "../contexts/useUserContext";
import "./LoginPage.css";

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
      console.error("Login error:", err);
      setFormError("root", {
        type: "manual",
        message: "Failed to login. Please check your email and password.",
      });
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <p>Enter your email and password to login</p>

      {errors.root && (
        <div className="error-message">{errors.root.message}</div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            placeholder="Enter your email"
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Please enter a valid email address",
              },
            })}
          />
          {errors.email && (
            <div className="field-error">{errors.email.message}</div>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Enter your password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />
          {errors.password && (
            <div className="field-error">{errors.password.message}</div>
          )}
        </div>

        <button
          type="submit"
          className="login-button"
          disabled={isSubmitting || loading}
        >
          {isSubmitting || loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="login-note">
        <p className="login-note-link">
          After logging in, you can{" "}
          <a href="/change-password">change your password</a>.
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
