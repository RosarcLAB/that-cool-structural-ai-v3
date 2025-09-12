import React, { useState } from 'react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  elementName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  elementName,
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() === elementName) {
      onConfirm();
      setInputValue('');
      setError('');
    } else {
      setError('Name does not match. Please type the exact element name.');
    }
  };

  if (!isOpen) return null;

  // Reset input and error when closing
  const handleClose = () => {
    setInputValue('');
    setError('');
    onCancel();
  };

  // Overlay wrapper to cover entire screen, click on backdrop to cancel
  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
      onClick={handleClose}
    >
      <div
        className="modal-box bg-white relative p-6 space-y-4 border border-gray-200 rounded-lg shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          className="btn btn-sm btn-circle absolute right-2 top-2"
          onClick={handleClose}
        >
          ✕
        </button>
  <h3 className="font-bold text-lg border-b pb-2">Confirm Deletion</h3>
        <p className="py-4">
          You sure you want to delete <strong>"{elementName}"</strong>?
          It cannot be undone. 
          Type the element name below to confirm.
        </p>
        <form onSubmit={handleSubmit} className="space-y-2">
          <input
            type="text"
            placeholder={`Type "${elementName}"`}
            className="input input-bordered w-full border-green-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="modal-action">
            
            <button type="submit" className="btn btn-error">
              Delete
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
