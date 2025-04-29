import React from 'react';

interface ArrayItemControlsProps {
    index: number;
    onDelete: (index: number) => void;
    // Add onMoveUp/onMoveDown later if needed
}

const ArrayItemControls: React.FC<ArrayItemControlsProps> = ({ index, onDelete }) => {
    return (
        <div className="flex justify-end space-x-2 mt-1">
            <button
                type="button"
                onClick={() => onDelete(index)}
                className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                title="Delete item"
            >
                Delete
            </button>
            {/* Add Move Up/Down buttons here later */}
        </div>
    );
};

export default ArrayItemControls;
