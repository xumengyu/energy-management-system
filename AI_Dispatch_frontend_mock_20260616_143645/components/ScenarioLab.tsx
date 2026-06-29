
import React, { useState, useRef } from 'react';
import { geminiService } from '../services/geminiService';

interface ScenarioLabProps {
  t: any;
}

const ScenarioLab: React.FC<ScenarioLabProps> = ({ t }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setEditedImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!selectedImage || !prompt) return;
    setIsProcessing(true);
    try {
      const result = await geminiService.editImage(selectedImage, prompt, 'image/jpeg');
      if (result) setEditedImage(result);
    } catch (err) {
      alert("Error editing image. Check your API settings.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-2">{t.scenarioTitle}</h3>
            <p className="text-slate-500 text-sm mb-4">
              {t.scenarioDesc}
            </p>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors border-2 border-dashed border-slate-300"
            >
              {selectedImage ? t.changePhoto : t.uploadPhoto}
            </button>
          </div>

          {selectedImage && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">{t.modInstruction}</label>
              <textarea 
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all h-32"
                placeholder={t.promptPlaceholder}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button 
                onClick={handleProcess}
                disabled={isProcessing || !prompt}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <><span className="animate-spin text-lg">🌀</span> {t.processing}</>
                ) : (
                  t.generateVis
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex-[1.5] flex flex-col gap-4">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1 min-h-[400px] flex items-center justify-center relative overflow-hidden">
            {!selectedImage ? (
              <div className="text-slate-400 text-center">
                <div className="text-4xl mb-2">🖼️</div>
                <p>No image uploaded yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full h-full">
                <div className="relative group">
                   <img src={selectedImage} alt="Original" className="w-full h-full object-cover rounded-lg border border-slate-200" />
                   <span className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded uppercase font-bold backdrop-blur-sm">{t.original}</span>
                </div>
                <div className="relative group min-h-[300px] flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
                   {editedImage ? (
                     <img src={editedImage} alt="Edited" className="w-full h-full object-cover rounded-lg" />
                   ) : (
                     <div className="text-slate-400 text-sm italic">
                       {isProcessing ? t.processing : 'Awaiting modification...'}
                     </div>
                   )}
                   <span className="absolute top-2 left-2 bg-indigo-600/80 text-white text-[10px] px-2 py-1 rounded uppercase font-bold backdrop-blur-sm">{t.aiEnhanced}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioLab;
