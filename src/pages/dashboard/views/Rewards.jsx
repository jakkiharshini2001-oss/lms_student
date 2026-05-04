import React from 'react';

const Rewards = () => {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Rewards & certificates</h2>
        <p className="text-slate-500">Track your progress, collected points, and certificates.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1 bg-blue-500 rounded-2xl p-8 text-white flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="z-10 relative">
            <div className="flex items-center gap-2 mb-2 text-blue-100">
              <span className="text-sm font-semibold uppercase tracking-wider">Gold Tier</span>
            </div>
            <div className="text-5xl font-bold mb-4">1,820 <span className="text-2xl text-blue-200">pts</span></div>
            <p className="text-blue-100">Hi Harshini - Keep going to reach Platinum!</p>
          </div>
          
          <div className="mt-8 flex items-center justify-between bg-blue-600/50 rounded-lg p-4 z-10 relative">
            <span className="font-semibold">Gold</span>
            <div className="flex-1 mx-4 h-2 bg-blue-400/50 rounded-full overflow-hidden">
              <div className="h-full bg-white w-3/4 rounded-full"></div>
            </div>
            <span className="font-semibold opacity-50">Platinum</span>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 right-10 -mb-10 w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-xl"></div>
        </div>

        <div className="w-full md:w-64 flex flex-col gap-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-3">
              <span className="font-bold text-xl">12</span>
            </div>
            <p className="text-slate-500 font-medium">Day streak</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-slate-200 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mb-3">
              <span className="font-bold text-xl">3</span>
            </div>
            <p className="text-slate-500 font-medium">Certificates</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold text-slate-900 mb-4">Certificates</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Certificate 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500 relative">
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30">Grade A</div>
              <div className="absolute -bottom-6 left-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                </div>
              </div>
            </div>
            <div className="p-6 pt-10 flex-1 flex flex-col">
              <h4 className="font-bold text-slate-800 mb-1">React Fundamentals</h4>
              <p className="text-sm text-slate-500 mb-4">Issued on Oct 12, 2025</p>
              <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> PDF
                </button>
                <button className="text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-1">
                  Share <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Certificate 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-32 bg-gradient-to-r from-emerald-400 to-teal-500 relative">
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30">Grade A-</div>
              <div className="absolute -bottom-6 left-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                </div>
              </div>
            </div>
            <div className="p-6 pt-10 flex-1 flex flex-col">
              <h4 className="font-bold text-slate-800 mb-1">TypeScript Essentials</h4>
              <p className="text-sm text-slate-500 mb-4">Issued on Nov 05, 2025</p>
              <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> PDF
                </button>
                <button className="text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-1">
                  Share <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Certificate 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="h-32 bg-gradient-to-r from-orange-400 to-amber-500 relative">
              <div className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/30">Grade B+</div>
              <div className="absolute -bottom-6 left-6 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
                </div>
              </div>
            </div>
            <div className="p-6 pt-10 flex-1 flex flex-col">
              <h4 className="font-bold text-slate-800 mb-1">UX Heuristics</h4>
              <p className="text-sm text-slate-500 mb-4">Issued on Dec 20, 2025</p>
              <div className="mt-auto flex justify-between items-center pt-4 border-t border-slate-100">
                <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> PDF
                </button>
                <button className="text-slate-500 text-sm font-medium hover:text-slate-700 flex items-center gap-1">
                  Share <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rewards;
