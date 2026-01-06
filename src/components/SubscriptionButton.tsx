'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionModal from './SubscriptionModal';

export default function SubscriptionButton() {
  const { hasActiveSubscription } = useAuth();
  const [showModal, setShowModal] = useState(false);

  // Não mostrar se tiver assinatura ativa
  if (hasActiveSubscription) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center space-x-2"
        aria-label="Assinar agora"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="font-semibold">Assinar Agora</span>
      </button>
      <SubscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}


