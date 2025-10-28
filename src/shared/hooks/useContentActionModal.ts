import { useCallback, useState } from "react";

/**
 * Reusable hook for managing ContentActionModal state
 * Follows the pattern used in MusicCard and other components
 */
export const useContentActionModal = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const openModal = useCallback(() => {
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
  }, []);

  const toggleModal = useCallback(() => {
    setIsModalVisible((prev) => !prev);
  }, []);

  return {
    isModalVisible,
    openModal,
    closeModal,
    toggleModal,
    setIsModalVisible,
  };
};
