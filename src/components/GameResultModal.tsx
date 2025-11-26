// src/components/GameResultModal.tsx
import React from "react";

interface Props {
  visible: boolean;
  resultText: string;
  onClose: () => void;
}

const GameResultModal: React.FC<Props> = ({ visible, resultText, onClose }) => {
  if (!visible) return null;

  return (
    <div 
      className="modal-overlay"
      onClick={onClose} // Click outside to close
    >
      <div 
        className="modal-content"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal
      >
        <h2 className="text-3xl font-bold mb-4 text-text-primary">
          🏁 Game Over
        </h2>

        <p className="text-xl text-text-primary mb-6 font-semibold">
          {resultText}
        </p>

        <button
          className="w-full py-3 bg-[#49c85f] hover:bg-[#3fb556] rounded-lg text-[#0a0e0c] font-bold text-lg transition shadow-lg"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default GameResultModal;