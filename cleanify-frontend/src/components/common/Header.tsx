import React from 'react';

const Header: React.FC<{ title: string }> = ({ title }) => (
  <header className="p-4 border-b text-lg font-semibold">{title}</header>
);

export default Header;