// client/src/components/UserInputModal.tsx
import React, { useState, useEffect, FormEvent } from 'react';

interface UserInputModalProps {
  isOpen: boolean; // Control visibility from parent
  requiredInputs: string[]; // Array of field names needed (e.g., ["Salary Expectation", "Earliest Start Date"])
  onSubmit: (userInputData: { [key: string]: string }) => void; // Callback with user input
  onClose: () => void; // Callback to close the modal
  isFinalizing: boolean; // Loading state for submit button
}

const UserInputModal: React.FC<UserInputModalProps> = ({
  isOpen,
  requiredInputs,
  onSubmit,
  onClose,
  isFinalizing
}) => {
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  // Reset form when required inputs change (e.g., when modal opens for different job)
  useEffect(() => {
    if (isOpen) {
      const initialValues: { [key: string]: string } = {};
      requiredInputs.forEach(inputName => {
        initialValues[inputName] = ''; // Initialize all required fields as empty strings
      });
      setInputValues(initialValues);
    }
  }, [isOpen, requiredInputs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInputValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Basic check: Ensure all required fields are filled (can add more validation)
    const missing = requiredInputs.find(key => !inputValues[key]?.trim());
    if (missing) {
         alert(`Please fill in the field: ${missing}`); // Simple validation feedback
         return;
    }
    onSubmit(inputValues); // Pass the collected data back to the parent
  };

  if (!isOpen) {
    return null; // Don't render anything if not open
  }

  // Helper to format label from field name (e.g., "Salary Expectation" -> "salaryExpectation")
  const formatNameToId = (name: string): string => {
     return name.replace(/\s+/g, '-').toLowerCase();
  }

  // Helper to format ID to Label
   const formatIdToLabel = (id: string): string => {
     // Simple conversion back for display - might need adjustment
     return id.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
   }


  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 sm:mx-0">
        <h3 className="text-lg font-medium mb-4 text-gray-800">Additional Information Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          The AI needs the following details to finalize your documents:
        </p>
        <form onSubmit={handleSubmit}>
          {requiredInputs.map((inputName) => (
            <div key={inputName} className="mb-4">
              <label
                htmlFor={formatNameToId(inputName)} // Generate unique ID
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {formatIdToLabel(inputName)}: {/* Use formatted name for label */}
              </label>
              <input
                type="text" // Use text for simplicity, could change based on inputName
                id={formatNameToId(inputName)}
                name={inputName} // Use the original name for state key
                value={inputValues[inputName] || ''}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder={`Enter ${inputName}...`}
              />
            </div>
          ))}

          <div className="flex justify-end gap-3 mt-5 border-t pt-4 border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isFinalizing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            > Cancel </button>
            <button
              type="submit"
              disabled={isFinalizing}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 text-sm"
            >
              {isFinalizing ? 'Finalizing...' : 'Submit & Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInputModal;