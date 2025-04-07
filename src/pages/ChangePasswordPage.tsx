import { useForm } from "react-hook-form";
import { useState } from "react";
import axios from "axios";
import { useUserContext } from "../contexts/useUserContext";
import styles from "./ChangePasswordPage.module.css";

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
        `${process.env.VITE_API_URL}/auth/change-password`,
        {
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        },
        { withCredentials: true },
      );

      // Reset form and show success message
      reset();
      setSuccessMessage("Password changed successfully");
    } catch (err: any) {
      console.error("Change password error:", err);

      // Handle specific error messages from the API
      if (err.response?.data?.error) {
        if (err.response.data.error === "Current password is incorrect") {
          setFormError("currentPassword", {
            type: "manual",
            message: "Current password is incorrect",
          });
        } else if (err.response.data.error.includes("New password must be")) {
          setFormError("newPassword", {
            type: "manual",
            message: err.response.data.error,
          });
        } else {
          setFormError("root", {
            type: "manual",
            message: err.response.data.error,
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
      <div className={styles.changePasswordContainer}>
        <h2>Change Password</h2>
        <p>You must be logged in to change your password.</p>
      </div>
    );
  }

  return (
    <div className={styles.changePasswordContainer}>
      <h2>Change Password</h2>
      <p>Update your password below</p>

      {errors.root && (
        <div className={styles.errorMessage}>{errors.root.message}</div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>{successMessage}</div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        className={styles.changePasswordForm}
      >
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
      </form>
    </div>
  );
}

export default ChangePasswordPage;
