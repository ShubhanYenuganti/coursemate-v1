"use client";

import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Material {
  id: number;
  material_name: string;
  file_type: string;
  file_size?: number;
}

interface MaterialSelectorProps {
  materials: Material[];
  selectedMaterialIds: number[];
  onSelectionChange: (ids: number[]) => void;
  loading?: boolean;
}

export default function MaterialSelector({
  materials,
  selectedMaterialIds,
  onSelectionChange,
  loading = false
}: MaterialSelectorProps) {
  const handleToggle = (materialId: number) => {
    const newSelection = selectedMaterialIds.includes(materialId)
      ? selectedMaterialIds.filter(id => id !== materialId)
      : [...selectedMaterialIds, materialId];
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedMaterialIds.length === materials.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(materials.map(m => m.id));
    }
  };

  if (materials.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        No materials uploaded yet. Upload materials to use them for generation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Select Materials to Use (optional)</Label>
        <button
          onClick={handleSelectAll}
          className="text-xs text-blue-600 hover:underline"
          type="button"
          disabled={loading}
        >
          {selectedMaterialIds.length === materials.length ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      
      <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-3">
        {materials.map((material) => (
          <div key={material.id} className="flex items-center gap-2">
            <Checkbox
              id={`material-${material.id}`}
              checked={selectedMaterialIds.includes(material.id)}
              onCheckedChange={() => handleToggle(material.id)}
              disabled={loading}
            />
            <Label
              htmlFor={`material-${material.id}`}
              className="flex-1 cursor-pointer flex items-center gap-2"
            >
              <span className="truncate">{material.material_name}</span>
              <Badge variant="outline" className="text-xs">
                {material.file_type || 'file'}
              </Badge>
            </Label>
          </div>
        ))}
      </div>
      
      {selectedMaterialIds.length > 0 && (
        <div className="text-xs text-gray-600">
          {selectedMaterialIds.length} of {materials.length} materials selected
        </div>
      )}
    </div>
  );
}
