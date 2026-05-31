/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { FamilyMember, MediaAttachment, TimelineEvent } from '../types';
import { 
  FileText, 
  Image as ImageIcon, 
  Music, 
  Video as VideoIcon, 
  Trash2, 
  Paperclip, 
  Plus, 
  X, 
  Link2, 
  Download, 
  Calendar, 
  Check, 
  Eye, 
  FileUp, 
  HelpCircle,
  Clock,
  Sparkles,
  Loader2
} from 'lucide-react';

interface MediaGalleryProps {
  member: FamilyMember;
  onUpdateMedia: (updatedMediaList: MediaAttachment[]) => void;
  readOnly?: boolean;
}

export const MediaGallery: React.FC<MediaGalleryProps> = ({
  member,
  onUpdateMedia,
  readOnly = false
}) => {
  const mediaList = member.media || [];
  const events = member.events || [];

  // Active filters
  const [filter, setFilter] = useState<'all' | 'image' | 'document' | 'audio' | 'video'>('all');
  
  // Selected attachment for preview modal
  const [activePreview, setActivePreview] = useState<MediaAttachment | null>(null);
  
  // States for adding a new upload manually or linking
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newMediaName, setNewMediaName] = useState('');
  const [newMediaType, setNewMediaType] = useState<'image' | 'document' | 'audio' | 'video'>('image');
  const [newMediaNotes, setNewMediaNotes] = useState('');
  const [newMediaEventId, setNewMediaEventId] = useState('');
  const [newMediaDataUrl, setNewMediaDataUrl] = useState('');
  const [newMediaSize, setNewMediaSize] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Filter list
  const filteredMedia = mediaList.filter(item => {
    if (filter === 'all') return true;
    return item.type === filter;
  });

  // Helper size formatter
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Convert uploaded file to base64 data-url
  const handleFileProcess = (file: File) => {
    const reader = new FileReader();
    
    // Guess type from mime
    let detectedType: 'image' | 'document' | 'audio' | 'video' = 'document';
    if (file.type.startsWith('image/')) detectedType = 'image';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';
    else if (file.type.startsWith('video/')) detectedType = 'video';
    
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setNewMediaDataUrl(result);
      setNewMediaName(file.name.split('.')[0]); // Default name without extension
      setNewMediaType(detectedType);
      setNewMediaSize(formatBytes(file.size));
      setIsUploading(true);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSketch = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: member.bio || '',
          gender: member.gender || 'Unknown',
          name: `${member.firstName} ${member.lastName}`
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate');
      }

      const newAttachment: MediaAttachment = {
        id: 'med_' + Date.now(),
        name: 'Artistic Ancestor Sketch',
        type: 'image',
        url: data.imageUrl,
        uploadedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        size: 'AI Generated',
        notes: 'Artistic sketch generated based on biographical context.'
      };

      onUpdateMedia([...mediaList, newAttachment]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Save the customized uploaded file information
  const handleCommitMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMediaDataUrl || !newMediaName.trim()) return;

    const newAttachment: MediaAttachment = {
      id: 'med_' + Date.now(),
      name: newMediaName.trim(),
      type: newMediaType,
      url: newMediaDataUrl,
      uploadedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      size: newMediaSize || 'Unknown size',
      notes: newMediaNotes.trim() || undefined,
      associatedEventId: newMediaEventId || undefined
    };

    onUpdateMedia([...mediaList, newAttachment]);
    
    // Reset uploading states
    setNewMediaName('');
    setNewMediaNotes('');
    setNewMediaEventId('');
    setNewMediaDataUrl('');
    setNewMediaSize('');
    setIsUploading(false);
  };

  // Delete attachment
  const handleDeleteMedia = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this historical media credential? This action is irreversible.')) {
      const nextList = mediaList.filter(item => item.id !== id);
      onUpdateMedia(nextList);
      if (activePreview?.id === id) {
        setActivePreview(null);
      }
    }
  };

  // Helper of associated event details
  const getEventTitle = (eventId?: string) => {
    if (!eventId) return null;
    const evt = events.find(e => e.id === eventId);
    return evt ? `${evt.year} - ${evt.title}` : 'Associated Event';
  };

  // Render media view based on type
  const renderMediaThumb = (item: MediaAttachment) => {
    const iconClass = "w-6 h-6 text-stone-500";
    switch (item.type) {
      case 'image':
        return (
          <div className="w-full h-24 bg-stone-100 flex items-center justify-center overflow-hidden relative group-hover:scale-105 transition-transform duration-300">
            <img src={item.url} alt={item.name} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
          </div>
        );
      case 'audio':
        return (
          <div className="w-full h-24 bg-[#E5E1DA]/30 flex flex-col items-center justify-center gap-1">
            <Music className={iconClass} />
            <span className="text-[10px] font-mono text-[#7A7570]">AUDIO RECORDING</span>
          </div>
        );
      case 'video':
        return (
          <div className="w-full h-24 bg-[#E5E1DA]/30 flex flex-col items-center justify-center gap-1 relative overflow-hidden">
            <VideoIcon className={iconClass} />
            <span className="text-[10px] font-mono text-[#7A7570]">FILM CLIP</span>
            {item.url.startsWith('data:video/') && (
              <video src={item.url} className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none" />
            )}
          </div>
        );
      case 'document':
      default:
        return (
          <div className="w-full h-24 bg-[#E5E1DA]/30 flex flex-col items-center justify-center gap-1">
            <FileText className={iconClass} />
            <span className="text-[10px] font-mono text-[#7A7570] uppercase">Official Certificate</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      
      {/* 1. Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E1DA] pb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#7A7570] flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-[#7A7570]" /> Family Archives & Credentials ({mediaList.length})
        </h4>

        {/* Filter items buttons */}
        <div className="flex flex-wrap gap-1">
          {(['all', 'image', 'document', 'audio', 'video'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border cursor-pointer capitalize transition-all ${
                filter === t 
                  ? 'bg-[#2D2926] text-[#FAF9F6] border-transparent'
                  : 'bg-white text-[#7A7570] border-[#E5E1DA] hover:bg-[#FAF9F6]'
              }`}
            >
              {t === 'all' ? 'All Archive' : t + 's'}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Drag & Drop Archive Drawer (Only if not readOnly) */}
      {!readOnly && !isUploading && (
        <div className="space-y-3">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              dragActive 
                ? 'border-[#2D2926] bg-[#FAF9F6]' 
                : 'border-[#E5E1DA] hover:border-[#7A7570] bg-[#FAF9F6]/20'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,application/pdf,application/msword,audio/*,video/*"
              className="hidden" 
            />
            <FileUp className="w-5 h-5 mx-auto text-[#7A7570] mb-2 animate-pulse" />
            <p className="text-[11px] font-semibold text-[#2D2926]">
              Drag & Drop or click to scan family credential
            </p>
            <p className="text-[9px] text-[#A8A29E] mt-0.5">
              Supports family images, birth certificates (PDFs), letters, old recordings & videos
            </p>
          </div>

          {!mediaList.some(m => m.type === 'image') && (
            <button
              onClick={handleGenerateSketch}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-[#E5E1DA] rounded-xl bg-amber-50 hover:bg-amber-100/50 text-amber-800 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Sketch...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Artistic Ancestor Sketch
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. Manually edit details for Newly uploaded media before committing */}
      {isUploading && (
        <form onSubmit={handleCommitMedia} className="bg-[#FAF9F6] border border-[#E5E1DA] rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#E5E1DA] pb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D2926]">
              Add Detail for Uploaded Resource
            </span>
            <button 
              type="button" 
              onClick={() => setIsUploading(false)} 
              className="text-[#7A7570] hover:text-[#2D2926]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">Resource Title *</label>
              <input
                type="text"
                value={newMediaName}
                onChange={(e) => setNewMediaName(e.target.value)}
                required
                placeholder="e.g. 1910 Wedding Certificate"
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs outline-none focus:ring-1 focus:ring-[#2D2926]"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">Archive Type</label>
              <select
                value={newMediaType}
                onChange={(e) => setNewMediaType(e.target.value as any)}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="image">Photography (Image)</option>
                <option value="document">Official Document (Certificate, Letter)</option>
                <option value="audio">Oral History (Audio Recording)</option>
                <option value="video">Historical Film (Video Clip)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">Link to Milestone Event (Optional)</label>
              <select
                value={newMediaEventId}
                onChange={(e) => setNewMediaEventId(e.target.value)}
                className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] rounded px-2.5 py-1.5 text-xs outline-none"
              >
                <option value="">-- No Direct Linkage --</option>
                {events.map(evt => (
                  <option key={evt.id} value={evt.id}>
                    {evt.year} - {evt.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">File Size Context</label>
              <input
                type="text"
                value={newMediaSize}
                disabled
                className="w-full bg-[#FAF9F6] border border-[#E5E1DA] text-[#7A7570]/70 rounded px-2.5 py-1.5 text-xs font-mono outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#7A7570] uppercase mb-1">Archival Note & Narration</label>
            <textarea
              rows={2}
              value={newMediaNotes}
              onChange={(e) => setNewMediaNotes(e.target.value)}
              placeholder="Provide background context, handwritten notes, translation, or location where raw copy is held..."
              className="w-full bg-white border border-[#E5E1DA] text-[#2D2926] text-xs rounded p-2 outline-none focus:ring-1 focus:ring-[#2D2926]"
            />
          </div>

          <div className="flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={() => setIsUploading(false)}
              className="px-3 py-1.5 border border-[#E5E1DA] bg-white text-[#2D2926] rounded font-bold hover:bg-[#FAF9F6]"
            >
              Discard File
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#2D2926] text-white rounded font-bold hover:bg-[#1C1A18]"
            >
              Commit to Family Vault
            </button>
          </div>
        </form>
      )}

      {/* 4. Archives Listing Grid */}
      {filteredMedia.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setActivePreview(item)}
              className="group border border-[#E5E1DA] bg-white rounded-lg overflow-hidden cursor-pointer hover:border-[#2D2926] transition-all flex flex-col relative text-left"
            >
              {/* Thumbnail representation */}
              {renderMediaThumb(item)}

              {/* Text metadata footer */}
              <div className="p-2 flex-grow flex flex-col justify-between space-y-1.5 bg-white">
                <div className="space-y-0.5">
                  <h5 className="text-[11px] font-bold text-[#2D2926] leading-tight truncate group-hover:underline">
                    {item.name}
                  </h5>
                  <p className="text-[9px] text-[#7A7570] font-mono leading-none">
                    {item.uploadedAt}
                  </p>
                </div>

                {item.associatedEventId && (
                  <div className="flex items-center gap-1 text-[8px] uppercase tracking-wider text-amber-700 bg-amber-50 rounded-sm py-0.5 px-1 border border-amber-100 font-bold max-w-full truncate">
                    <Link2 className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">{getEventTitle(item.associatedEventId)?.split(' - ')[1]}</span>
                  </div>
                )}
              </div>

              {/* Tiny Delete Hover Button */}
              {!readOnly && (
                <button
                  onClick={(e) => handleDeleteMedia(item.id, e)}
                  title="Remove document from vault"
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-white/95 border border-[#E5E1DA] text-stone-500 hover:text-red-500 p-1 rounded-md shadow-sm transition-all focus:opacity-100 duration-150 z-10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center p-6 text-stone-400 italic text-[11px] border border-dashed border-[#E5E1DA] rounded-xl bg-[#FAF9F6]/20">
          No {filter === 'all' ? 'uploaded documents or imagery' : filter + ' attachments'} found in this ancestor's vault files.
        </div>
      )}

      {/* 5. Custom Preview Modal Window */}
      {activePreview && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E5E1DA] shadow-lg max-w-2xl w-full text-left overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-[#E5E1DA] flex justify-between items-center bg-[#FAF9F6]">
              <div className="space-y-0.5">
                <span className="text-[9px] uppercase tracking-widest bg-stone-200 text-[#2D2926] px-1.5 py-0.5 rounded font-bold">
                  {activePreview.type} archive file
                </span>
                <h3 className="text-sm font-serif font-bold text-[#2D2926] flex items-center gap-2">
                  {activePreview.name}
                </h3>
              </div>
              <button 
                onClick={() => setActivePreview(null)}
                className="p-1.5 hover:bg-stone-200 rounded text-stone-500 hover:text-[#2D2926]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Media Showcase Container */}
            <div className="p-4 bg-stone-50 border-b border-[#E5E1DA] flex items-center justify-center overflow-y-auto min-h-[250px] max-h-[400px]">
              {activePreview.type === 'image' && (
                <img 
                  src={activePreview.url} 
                  alt={activePreview.name} 
                  className="max-w-full max-h-[350px] rounded-lg shadow-xs border border-[#E5E1DA] object-contain"
                  referrerPolicy="no-referrer" 
                />
              )}

              {activePreview.type === 'audio' && (
                <div className="bg-white px-6 py-8 rounded-xl border border-[#E5E1DA] max-w-sm w-full text-center space-y-4">
                  <div className="w-12 h-12 bg-[#E5E1DA]/30 rounded-full flex items-center justify-center mx-auto text-[#7A7570]">
                    <Music className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#2D2926]">Oral History Narration Playing</h4>
                    <p className="text-[10px] text-[#7A7570] font-mono mt-0.5">Size: {activePreview.size}</p>
                  </div>
                  <audio controls src={activePreview.url} className="w-full mt-2" />
                </div>
              )}

              {activePreview.type === 'video' && (
                <div className="w-full max-w-md bg-black rounded-lg overflow-hidden">
                  <video controls src={activePreview.url} className="w-full max-h-[300px]" />
                </div>
              )}

              {activePreview.type === 'document' && (
                <div className="bg-white p-6 rounded-xl border border-[#E5E1DA] max-w-md w-full flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg flex items-center justify-center text-amber-800 shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-[#2D2926]">{activePreview.name}</h4>
                    <p className="text-[10px] text-[#7A7570] font-mono">Format: PDF/Document Certificate</p>
                    <p className="text-[10px] text-[#7A7570] font-mono">File Size: {activePreview.size}</p>
                    <p className="text-[10px] text-[#7A7570] font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A8A29E]" /> Scanned in: {activePreview.uploadedAt}
                    </p>
                    
                    <a 
                      href={activePreview.url} 
                      download={activePreview.name}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D2926] hover:bg-[#1C1A18] text-[#FAF9F6] text-[10px] uppercase tracking-wider font-bold rounded-md"
                    >
                      <Download className="w-3 h-3" /> Download Document
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Notes Panel */}
            <div className="p-4 space-y-3 bg-white text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">Vault Record Registry</span>
                  <p className="font-semibold text-[#2D2926] font-mono">{activePreview.id}</p>
                </div>
                {activePreview.associatedEventId && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#A8A29E] uppercase tracking-wider block">Linked Historical Milestone</span>
                    <p className="font-semibold text-amber-800 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5" /> {getEventTitle(activePreview.associatedEventId)}
                    </p>
                  </div>
                )}
              </div>

              {activePreview.notes && (
                <div className="space-y-1 p-3 bg-[#FAF9F6] border border-[#E5E1DA] rounded-lg">
                  <span className="text-[10px] font-bold text-[#7A7570] uppercase tracking-wider block">Curator Notes & Translations</span>
                  <p className="text-[#2D2926] leading-relaxed pt-1 whitespace-pre-wrap font-normal italic">
                    "{activePreview.notes}"
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-[#FAF9F6]">
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="px-4 py-2 bg-[#2D2926] text-white rounded text-xs font-bold hover:bg-[#1C1A18]"
                >
                  Close Document Record
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
