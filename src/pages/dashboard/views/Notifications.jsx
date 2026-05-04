import React from 'react';
import EmptyState from '../../../components/dashboard-ui/EmptyState';

const Notifications = () => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 min-h-[60vh]">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900">Notifications</h2>
        <p className="text-slate-500">Alerts, announcements, and messages.</p>
      </div>
      <EmptyState 
        title="Nothing here yet" 
        message="This section is part of the prototype demo." 
      />
    </div>
  );
};

export default Notifications;
