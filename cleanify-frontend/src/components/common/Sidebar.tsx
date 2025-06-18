import React from 'react';

const Sidebar: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
  <aside className="w-60 bg-gray-50 border-r h-full p-4">{children}</aside>
);

export default Sidebar;