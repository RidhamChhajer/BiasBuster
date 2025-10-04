import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

const ModelSelector = ({ selectedModel, onModelChange }: ModelSelectorProps) => {
  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className="w-[150px] glass-card">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="gpt-4">GPT-4</SelectItem>
        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
        <SelectItem value="claude-3">Claude 3</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default ModelSelector;
