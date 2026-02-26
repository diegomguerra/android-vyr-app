import { useState, useRef } from 'react';
import { Camera, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AvatarUploadProps {
  currentUrl?: string | null;
  onUploaded?: (url: string) => void;
}

const AvatarUpload = ({ currentUrl, onUploaded }: AvatarUploadProps) => {
  const { user } = useAuth();
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(url);
      onUploaded?.(url);
      toast.success('Foto atualizada');
    } catch (err) {
      console.error('[avatar] Upload failed:', err);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-20 h-20">
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border"
      >
        {preview ? (
          <img src={preview} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <User size={32} className="text-muted-foreground" />
        )}
      </button>
      <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center">
        <Camera size={14} className="text-muted-foreground" />
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
};

export default AvatarUpload;
