// client/src/components/generator/UserInputModal.tsx
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
// Import the type definition from the API service
import type { RequiredInputInfo } from '../../services/generatorApi'; // Use the type for props

interface UserInputModalProps {
  isOpen: boolean; // Control visibility from parent
  requiredInputs: RequiredInputInfo[]; // Array of {name, type} objects
  onSubmit: (userInputData: { [key: string]: string }) => void; // Callback with user input
  onClose: () => void; // Callback to close the modal
  isFinalizing: boolean; // Loading state for submit button
}

const UserInputModal: React.FC<UserInputModalProps> = ({
  isOpen,
  requiredInputs,
  onSubmit,
  onClose,
  isFinalizing // Receive loading state from parent
}) => {
  // State to hold the values entered by the user for each required input
  const [inputValues, setInputValues] = useState<{ [key: string]: string }>({});

  // Effect to reset the form fields whenever the modal opens
  // or the list of required inputs changes
  useEffect(() => {
    if (isOpen) {
      const initialValues: { [key: string]: string } = {};
      // Create an entry in the state for each required input, initializing as empty
      requiredInputs.forEach(inputInfo => {
        initialValues[inputInfo.name] = '';
      });
      setInputValues(initialValues);
    }
    // Dependency array includes isOpen and requiredInputs (as string for stability)
    // JSON.stringify ensures effect runs if the array *content* changes, not just reference
  }, [isOpen, JSON.stringify(requiredInputs)]);

  // Generic handler to update the state based on input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setInputValues(prev => ({ ...prev, [name]: value })); // Update state using input's 'name' attribute
  };

  // Handler for form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // Prevent default browser submission

    // Simple validation: Check if any required input field is still empty/whitespace
    const missing = requiredInputs.find(inputInfo => !inputValues[inputInfo.name]?.trim());
    if (missing) {
         // Use a simple browser alert for now; could be replaced with inline error messages
         alert(`Please fill in the field: ${missing.name}`);
         return; // Stop submission if validation fails
    }

    // If validation passes, call the onSubmit callback provided by the parent component,
    // passing the collected user input data.
    onSubmit(inputValues);
  };

  // If the modal is not supposed to be open, render nothing
  if (!isOpen) {
    return null;
  }

  // Helper to create a more suitable ID/htmlFor value from the placeholder name
  const formatNameToId = (name: string): string => {
     // Replace spaces with dashes and convert to lowercase for HTML attributes
     return name.replace(/\s+/g, '-').toLowerCase();
  }

  // Render the modal structure
  return (
    // Modal Backdrop: Covers the screen, semi-transparent background
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300 ease-in-out">
      {/* Modal Content Box: Centered, styled container */}
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md mx-4 sm:mx-0">
        <h3 className="text-lg font-medium mb-4 text-gray-800">Additional Information Required</h3>
        <p className="text-sm text-gray-600 mb-4">
          Please provide the following details to finalize your documents:
        </p>
        {/* Form element */}
        <form onSubmit={handleSubmit}>
          {/* Dynamically render input fields based on requiredInputs prop */}
          {requiredInputs.map((inputInfo) => (
            <div key={inputInfo.name} className="mb-4">
              {/* Label for the input field */}
              <label
                htmlFor={formatNameToId(inputInfo.name)}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {inputInfo.name}: {/* Display the placeholder name as the label */}
              </label>

              {/* --- Conditional Input Rendering based on inferred type --- */}
              {/* Render number input */}
              {inputInfo.type === 'number' && (
                <input
                  type="number"
                  id={formatNameToId(inputInfo.name)}
                  name={inputInfo.name} // Name must match the key in requiredInputs and inputValues state
                  value={inputValues[inputInfo.name] || ''} // Controlled input
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder={`Enter ${inputInfo.name}...`}
                  step="any" // Allow decimals if needed, or remove for integers
                />
              )}
              {/* Render date input */}
              {inputInfo.type === 'date' && (
                 <input
                   type="date" // Use browser's native date picker
                   id={formatNameToId(inputInfo.name)}
                   name={inputInfo.name}
                   value={inputValues[inputInfo.name] || ''} // Value should be in 'yyyy-mm-dd' format
                   onChange={handleChange}
                   required
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                 />
               )}
               {/* Render textarea input */}
               {inputInfo.type === 'textarea' && (
                  <textarea
                      id={formatNameToId(inputInfo.name)}
                      name={inputInfo.name}
                      rows={3}
                      value={inputValues[inputInfo.name] || ''}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder={`Enter ${inputInfo.name}...`}
                  />
               )}
               {/* Default to text input if type is 'text' or not specified */}
               {(inputInfo.type === 'text' || !inputInfo.type) && (
                  <input
                    type="text"
                    id={formatNameToId(inputInfo.name)}
                    name={inputInfo.name}
                    value={inputValues[inputInfo.name] || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder={`Enter ${inputInfo.name}...`}
                  />
               )}
            </div>
          ))}

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-3 mt-5 border-t pt-4 border-gray-200">
            <button
              type="button" // Prevent default form submission on cancel
              onClick={onClose} // Call parent's close handler
              disabled={isFinalizing} // Disable while finalizing
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-400 text-sm"
            > Cancel </button>
            <button
              type="submit"
              disabled={isFinalizing} // Disable while finalizing
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 text-sm"
            >
              {/* Show loading text on button */}
              {isFinalizing ? 'Finalizing...' : 'Submit & Generate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserInputModal;

