'use client';

import React from 'react';
import { Camera, PlusCircle } from 'lucide-react';

interface UserAvatarPickerProps {
  imagePreview: string | null;
  existingAvatar?: string | null;
  profilePictureLabel: string;
  profilePreviewLabel: string;
  imageFormatLimitLabel: string;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function UserAvatarPicker({
  imagePreview,
  existingAvatar,
  profilePictureLabel,
  profilePreviewLabel,
  imageFormatLimitLabel,
  fileInputRef,
  onImageChange,
}: UserAvatarPickerProps) {
  const imageSource = imagePreview || existingAvatar || null;

  return (
    <div className="mb-8 flex flex-col items-center gap-4">
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageChange}
        className="hidden"
        accept="image/jpeg, image/png, image/*"
      />
      <div className="group relative cursor-pointer" onClick={() => fileInputRef.current?.click()}>
        <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-surface-muted text-text-muted transition-all group-hover:border-brand-primary">
          {imageSource ? (
            <img src={imageSource} alt={profilePreviewLabel} className="h-full w-full object-cover" />
          ) : (
            <>
              <Camera size={32} className="mb-2" />
              <span className="text-xs font-bold">{profilePictureLabel}</span>
            </>
          )}
        </div>
        <div className="absolute bottom-0 right-0 rounded-full bg-brand-primary p-2 text-white shadow-lg">
          <PlusCircle size={16} />
        </div>
      </div>
      <p className="text-xs text-text-muted">{imageFormatLimitLabel}</p>
    </div>
  );
}
