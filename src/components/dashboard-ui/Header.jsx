import React from 'react';
import { Search, Bell, ChevronDown } from 'lucide-react';
import avatar1 from '../../assets/avatar-1.jpg'; // We can use this as a placeholder

const Header = ({ studentName = "Harshini", studentRole = "Student" }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
      {/* Search Bar */}
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Search courses, lessons, documents..."
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-slate-600 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
        </button>

        {/* Profile Dropdown */}
        <div className="flex items-center gap-3 border border-slate-200 rounded-full py-1.5 px-2 hover:bg-slate-50 cursor-pointer transition-colors">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
            {studentName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-700 leading-none">{studentName}</span>
            <span className="text-xs text-slate-500 mt-0.5">{studentRole}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 ml-1 mr-1" />
        </div>
      </div>
    </header>
  );
};

export default Header;
