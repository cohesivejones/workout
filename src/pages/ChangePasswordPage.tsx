import { useForm } from "react-hook-form";
import { useState } from "react";
import axios from "axios";
import { useUserContext } from "../contexts/useUserContext";
import styles from "./ChangePasswordPage.module.css";
import FormContainer from "../components/common/FormContainer";

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
        setFormError("confirmPassword", {
          type: "manual",
          message: "Passwords do not match",
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
        { withCredentials: true },
      );

      // Reset form and show success message
      reset();
      setSuccessMessage("Password changed successfully");
    } catch (err: unknown) {
      console.error("Change password error:", err);
      
      // Type guard for axios error
      const axiosError = err as { response?: { data?: { error?: string } } };

      // Handle specific error messages from the API
      if (axiosError.response?.data?.error) {
        if (axiosError.response.data.error === "Current password is incorrect") {
          setFormError("currentPassword", {
            type: "manual",
            message: "Current password is incorrect",
          });
        } else if (axiosError.response.data.error.includes("New password must be")) {
          setFormError("newPassword", {
            type: "manual",
            message: axiosError.response.data.error,
          });
        } else {
          setFormError("root", {
            type: "manual",
            message: axiosError.response.data.error,
          });
        }
      } else {
        setFormError("root", {
          type: "manual",
          message: "Failed to change password. Please try again.",
        });
      }
    }
  };

  if (!user) {
    return (
      <FormContainer
        title="Change Password"
        className={styles.changePasswordContainer}
        asForm={false}
      >
        <p>You must be logged in to change your password.</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Change Password"
      errorMessage={errors.root?.message}
      successMessage={successMessage}
      onSubmit={handleSubmit(onSubmit)}
      className={styles.changePasswordContainer}
    >
      <p>Update your password below</p>
        <div className={styles.formGroup}>
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            placeholder="Enter your current password"
            {...register("currentPassword", {
              required: "Current password is required",
            })}
          />
          {errors.currentPassword && (
            <div className={styles.fieldError}>
              {errors.currentPassword.message}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            placeholder="Enter your new password"
            {...register("newPassword", {
              required: "New password is required",
              minLength: {
                value: 6,
                message: "New password must be at least 6 characters",
              },
            })}
          />
          {errors.newPassword && (
            <div className={styles.fieldError}>
              {errors.newPassword.message}
            </div>
          )}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            {...register("confirmPassword", {
              required: "Please confirm your new password",
              validate: (value) =>
                value === watch("newPassword") || "Passwords do not match",
            })}
          />
          {errors.confirmPassword && (
            <div className={styles.fieldError}>
              {errors.confirmPassword.message}
            </div>
          )}
        </div>

        <button
          type="submit"
          className={styles.changePasswordButton}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Changing Password..." : "Change Password"}
        </button>
    </FormContainer>
  );
}

export default ChangePasswordPage;
