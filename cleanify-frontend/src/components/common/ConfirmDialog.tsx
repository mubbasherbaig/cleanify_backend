import React from 'react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<Props> = ({ message, onConfirm, onCancel }) => (
  <div className="p-4 bg-white shadow">
    <p className="mb-2">{message}</p>
    <button onClick={onConfirm} className="mr-2">Confirm</button>
    <button onClick={onCancel}>Cancel</button>
  </div>
);

export default ConfirmDialog;