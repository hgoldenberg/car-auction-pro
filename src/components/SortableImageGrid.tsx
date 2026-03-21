import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Star, Trash2, GripVertical } from 'lucide-react';
import type { VehicleImage } from '@/hooks/use-vehicle-images';
import { getVehicleImageUrl } from '@/hooks/use-vehicle-images';

function SortableItem({
  img,
  onSetMain,
  onDelete,
}: {
  img: VehicleImage;
  onSetMain: (id: string) => void;
  onDelete: (img: VehicleImage) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: img.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.7 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative rounded-md overflow-hidden border aspect-[4/3] bg-muted touch-none"
    >
      <img
        src={getVehicleImageUrl(img.storage_path)}
        alt="Vehículo"
        className="w-full h-full object-cover pointer-events-none"
      />
      {img.is_main && (
        <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded">
          Principal
        </span>
      )}

      {/* Drag handle */}
      <button
        type="button"
        className="absolute top-1 right-1 h-7 w-7 flex items-center justify-center rounded bg-black/50 text-white cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Actions - always visible on mobile */}
      <div className="absolute inset-x-0 bottom-0 p-1 flex justify-center gap-1.5 bg-gradient-to-t from-black/60 to-transparent">
        {!img.is_main && (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="h-8 w-8 sm:h-7 sm:w-7"
            onClick={() => onSetMain(img.id)}
          >
            <Star className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-8 w-8 sm:h-7 sm:w-7"
          onClick={() => onDelete(img)}
        >
          <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function SortableImageGrid({
  images,
  onSetMain,
  onDelete,
  onReorder,
}: {
  images: VehicleImage[];
  onSetMain: (id: string) => void;
  onDelete: (img: VehicleImage) => void;
  onReorder: (activeId: string, overId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {images.map((img) => (
            <SortableItem key={img.id} img={img} onSetMain={onSetMain} onDelete={onDelete} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
