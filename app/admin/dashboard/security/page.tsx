'use client';

import React, { useState } from 'react';

export default function SecurityPage() {
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [faStep, setFaStep] = useState<'otp' | 'success'>('otp');

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Security
          </h1>
          <p className="text-gray-500 mt-2">Manage your account security settings</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2FA Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-3xl mb-4 text-white">
              🔐
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Two-Factor Authentication</h3>
            <p className="text-sm text-gray-500 mb-6">Add an extra layer of security to your account</p>
            <button 
              onClick={() => setShow2FAModal(true)} 
              className="w-full py-3 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
            >
              Enable 2FA
            </button>
          </div>
          
          {/* Password Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-3xl mb-4 text-white">
              🔑
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Password</h3>
            <p className="text-sm text-gray-500 mb-6">Update your password regularly</p>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              Change Password
            </button>
          </div>

          {/* Active Sessions Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl mb-4 text-white">
              📱
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Active Sessions</h3>
            <p className="text-sm text-gray-500 mb-6">Manage your logged-in devices</p>
            <div className="space-y-3 mb-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Chrome on macOS</p>
                    <p className="text-xs text-gray-500">IP: 192.168.1.1 • Current session</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-600 font-medium">Active</span>
              </div>
            </div>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              View All Sessions
            </button>
          </div>

          {/* Activity Log Card */}
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-100 hover:shadow-2xl transition-all">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-3xl mb-4 text-white">
              📋
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Activity Log</h3>
            <p className="text-sm text-gray-500 mb-6">Review your account activity</p>
            <button className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl font-medium text-sm hover:border-[#33a8da] hover:text-[#33a8da] transition-all">
              View Logs
            </button>
          </div>
        </div>
      </div>

      {/* 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {faStep === 'otp' ? (
              <>
                <div className="p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-4xl mx-auto mb-6 text-white">
                    📱
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Verify Your Identity</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Enter the 6-digit code from your authenticator app
                  </p>

                  <div className="flex justify-center gap-2 mb-6">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-12 h-12 text-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#33a8da]/20 focus:border-[#33a8da]"
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setFaStep('success')}
                    className="w-full py-4 bg-gradient-to-r from-[#33a8da] to-[#2c8fc0] text-white rounded-xl font-medium hover:shadow-lg hover:shadow-[#33a8da]/25 transition-all"
                  >
                    Verify
                  </button>

                  <button className="mt-4 text-sm text-gray-500 hover:text-gray-700 transition">
                    Resend Code
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-4xl mx-auto mb-6 text-white">
                  ✅
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">2FA Enabled!</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Two-factor authentication has been successfully activated
                </p>
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="w-full py-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}