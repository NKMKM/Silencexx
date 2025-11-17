import { motion, AnimatePresence } from 'motion/react';

interface MobileBackdropProps {
  isOpen: boolean;
  onClick: () => void;
}

export function MobileBackdrop({ isOpen, onClick }: MobileBackdropProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClick}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-10 md:hidden"
        />
      )}
    </AnimatePresence>
  );
}
