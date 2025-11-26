import toast from 'react-hot-toast';

export const showToast = {
  // Success - Green checkmark
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
    });
  },

  // Error - Red X
  error: (message: string) => {
    toast.error(message, {
      duration: 4000, // Errors stay longer
    });
  },

  // Warning - Yellow warning icon
  warning: (message: string) => {
    toast(message, {
      icon: '⚠️',
      duration: 3500,
      style: {
        background: '#151821',
        color: '#f5f7ff',
        border: '1px solid #ffa726',
      },
    });
  },

  // Info - Blue info icon
  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      duration: 3000,
    });
  },

  // Loading - Spinner (returns toast ID for updating later)
  loading: (message: string) => {
    return toast.loading(message);
  },

  // Dismiss a specific toast by ID
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },

  // Promise-based toast (loading -> success/error)
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    });
  },
};