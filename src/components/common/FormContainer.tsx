import React, { ReactNode } from "react";
import styles from "./FormContainer.module.css";

interface FormContainerProps {
  // The form title displayed at the top
  title: string;

  // Form content (fields, buttons, etc.)
  children: ReactNode;

  // Optional error message to display
  errorMessage?: string | null;

  // Optional success message to display
  successMessage?: string | null;

  // Optional CSS class name to apply additional styling
  className?: string;

  // Whether to render as a form element or just a div
  // If true, will render as <form> and handle onSubmit
  asForm?: boolean;

  // Form submission handler (only used if asForm is true)
  onSubmit?: (e: React.FormEvent) => void;
}

const FormContainer: React.FC<FormContainerProps> = ({
  title,
  children,
  errorMessage,
  successMessage,
  className,
  asForm = true,
  onSubmit,
}) => {
  const containerClasses = className
    ? `${styles.formContainer} ${className}`
    : styles.formContainer;

  const content = (
    <>
      <h2 className={styles.formTitle}>{title}</h2>

      {errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

      {successMessage && <div className={styles.successMessage}>{successMessage}</div>}

      <div className={styles.formContent}>{children}</div>
    </>
  );

  if (asForm && onSubmit) {
    return (
      <form onSubmit={onSubmit} className={containerClasses}>
        {content}
      </form>
    );
  }

  return <div className={containerClasses}>{content}</div>;
};

export default FormContainer;
