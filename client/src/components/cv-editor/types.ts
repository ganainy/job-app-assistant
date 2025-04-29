import { JsonResumeSchema } from '../../../../server/src/types/jsonresume'; // Adjust path if needed

export type CvData = JsonResumeSchema | any; // Use a more specific type if possible

export interface EditorProps<T> {
    data: T;
    onChange: (newData: T) => void;
}

export interface ArrayEditorProps<T> {
    items: T[];
    onChange: (newItems: T[]) => void;
    renderItem: (item: T, index: number, onChange: (index: number, newItem: T) => void, onDelete: (index: number) => void) => React.ReactNode;
    newItemFactory: () => T;
    addButtonLabel: string;
}
