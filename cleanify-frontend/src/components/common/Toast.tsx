import React from 'react';

interface Props {
  message: string;
}

const Toast: React.FC<Props> = ({ message }) => (
  <div className="bg-black text-white px-2 py-1 rounded shadow">{message}</div>
);

export default Toast;