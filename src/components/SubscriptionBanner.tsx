'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionModal from './SubscriptionModal';

export default function SubscriptionBanner() {
  const { hasActiveSubscription } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Não mostrar se tiver assinatura ativa
  if (hasActiveSubscription) {
    return null;
  }

  return (
    <>
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm font-medium">
                Assine agora e tenha acesso completo a todas as funcionalidades!
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="ml-4 flex-shrink-0 bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-blue-50 transition-colors duration-200 shadow-sm"
            >
              Assinar Agora
            </button>
          </div>
        </div>
      </div>
      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}



