import React, { createContext, useContext, useState, useCallback } from 'react';

interface AccordionState {
  [hotelId: string]: {
    [sectionKey: string]: boolean;
  };
}

interface AccordionContextType {
  accordionStates: AccordionState;
  toggleSection: (hotelId: string, sectionKey: string) => void;
  initializeHotelSections: (hotelId: string, defaultSections?: {[key: string]: boolean}) => void;
  getSectionState: (hotelId: string, sectionKey: string, defaultValue?: boolean) => boolean;
}

const AccordionContext = createContext<AccordionContextType | undefined>(undefined);

export const AccordionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accordionStates, setAccordionStates] = useState<AccordionState>({});

  const toggleSection = useCallback((hotelId: string, sectionKey: string) => {
    setAccordionStates(prev => ({
      ...prev,
      [hotelId]: {
        ...prev[hotelId],
        [sectionKey]: !prev[hotelId]?.[sectionKey]
      }
    }));
  }, []);

  const initializeHotelSections = useCallback((hotelId: string, defaultSections: {[key: string]: boolean} = {}) => {
    setAccordionStates(prev => {
      // Only initialize if this hotel doesn't already have state
      if (!prev[hotelId]) {
        return {
          ...prev,
          [hotelId]: {
            aiReason: true,  // Default: expanded
            ratings: false,  // Default: collapsed
            attractions: false,  // Default: collapsed
            ...defaultSections  // Allow override
          }
        };
      }
      return prev;
    });
  }, []);

  const getSectionState = useCallback((hotelId: string, sectionKey: string, defaultValue: boolean = false) => {
    return accordionStates[hotelId]?.[sectionKey] ?? defaultValue;
  }, [accordionStates]);

  return (
    <AccordionContext.Provider value={{
      accordionStates,
      toggleSection,
      initializeHotelSections,
      getSectionState
    }}>
      {children}
    </AccordionContext.Provider>
  );
};

export const useAccordion = () => {
  const context = useContext(AccordionContext);
  if (context === undefined) {
    throw new Error('useAccordion must be used within an AccordionProvider');
  }
  return context;
};