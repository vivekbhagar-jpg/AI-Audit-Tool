import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  ShieldAlert, 
  Globe, 
  LogIn 
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { authErrorDetails, clearError, signInWithGoogle, isSigningIn, openStandaloneTab } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!authErrorDetails) return null;

  const { code, title, message, suggestedAction, hostname, isIframe } = authErrorDetails;
  const isUnauthorizedDomain = code === 'auth/unauthorized-domain';
  const isPopupBlocked = code === 'auth/popup-blocked';

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isUnauthorizedDomain ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isUnauthorizedDomain ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {isUnauthorizedDomain ? <Globe className="w-4 h-4" /> : <ShieldAlert className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500 font-mono">Code: {code}</p>
            </div>
          </div>
          <button 
            onClick={clearError}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs text-slate-700">
          <p className="leading-relaxed">
            {message}
          </p>

          {/* Unauthorized Domain Special Instructions */}
          {isUnauthorizedDomain && (
            <div className="space-y-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl">
              <span className="font-semibold text-amber-950 block text-[11px] uppercase tracking-wider">
                Required Domain to Authorize in Firebase Console
              </span>
              
              <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-lg border border-amber-300">
                <code className="font-mono text-xs font-bold text-slate-900 select-all truncate">
                  {hostname}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md transition-colors cursor-pointer shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="text-[11px] text-amber-900 space-y-1">
                <span className="font-semibold block">How to fix in 30 seconds:</span>
                <ol className="list-decimal pl-4 space-y-1 leading-relaxed">
                  <li>Open your <strong>Firebase Console</strong> for project <code>nxtwave-audit-platform</code></li>
                  <li>Go to <strong>Build &gt; Authentication &gt; Settings &gt; Authorized domains</strong></li>
                  <li>Click <strong>Add domain</strong>, paste the domain above, and click <strong>Done</strong></li>
                </ol>
              </div>
            </div>
          )}

          {/* Iframe limitation explanation */}
          {isIframe && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-semibold text-[11px]">
                <ExternalLink className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span>Embedded Preview Environment Limitation</span>
              </div>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                The Google AI Studio preview is embedded in an iframe. Browsers frequently restrict OAuth popup windows and third-party storage inside iframes. Opening the application directly in its own standalone browser tab resolves this limitation.
              </p>
              <button
                onClick={openStandaloneTab}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open App in Full Browser Tab to Sign In</span>
              </button>
            </div>
          )}

          {suggestedAction && !isUnauthorizedDomain && !isIframe && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="font-semibold text-slate-800 block mb-0.5">Recommended Action:</span>
              <p className="text-slate-600 text-[11px]">{suggestedAction}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
          <button
            onClick={clearError}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => signInWithGoogle()}
            disabled={isSigningIn}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSigningIn ? 'animate-spin' : ''}`} />
            <span>{isSigningIn ? 'Opening Google Sign-in...' : 'Retry Google Sign-in'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
