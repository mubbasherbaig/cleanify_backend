import React from 'react';

const EventsLog: React.FC<{ events: any[] }> = ({ events }) => (
  <ul className="text-sm h-40 overflow-auto">
    {events.map((e, i) => (
      <li key={i}>{JSON.stringify(e)}</li>
    ))}
  </ul>
);

export default EventsLog;