import { useForm } from "react-hook-form";
import { useUserContext } from "../contexts/useUserContext";
import "./LoginPage.css";

type FormValues = {
  email: string;
};

function LoginPage() {
  const { login, loading } = useUserContext();
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError: setFormError,
    clearErrors
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    try {
      clearErrors();
      await login(data.email);
    } catch (err) {
      console.error("Login error:", err);
      setFormError("root", { 
        type: "manual", 
        message: "Failed to login. Please try again." 
      });
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <p>Enter your email to login or create an account</p>
      
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
                message: "Please enter a valid email address"
              }
            })}
          />
          {errors.email && (
            <div className="field-error">{errors.email.message}</div>
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
    </div>
  );
}

export default LoginPage;
