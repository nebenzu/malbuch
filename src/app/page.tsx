'use client';

import { useState, useCallback } from 'react';

type BookType = 'coloring' | 'paint-by-numbers' | 'both';

export default function Home() {
  const [name, setName] = useState('');
  const [bookType, setBookType] = useState<BookType>('coloring');
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhotoDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    addPhotos(files);
  }, []);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addPhotos(Array.from(e.target.files));
    }
  };

  const addPhotos = (files: File[]) => {
    const newPhotos = [...photos, ...files].slice(0, 20);
    setPhotos(newPhotos);
    
    // Create previews
    const newPreviews = newPhotos.map(f => URL.createObjectURL(f));
    setPreviews(prev => {
      prev.forEach(url => URL.revokeObjectURL(url));
      return newPreviews;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleGenerate = async () => {
    if (!name.trim()) {
      setError('Bitte gib einen Namen ein');
      return;
    }
    if (photos.length === 0) {
      setError('Bitte wähle mindestens ein Foto aus');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('type', bookType);
      photos.forEach(photo => formData.append('photos', photo));

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      // Download PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_Malbuch.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-amber-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-amber-900">🎨 Malbuch Generator</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-amber-900 mb-4">
            Dein persönliches Malbuch
          </h2>
          <p className="text-xl text-amber-700">
            Verwandle deine Fotos in einzigartige Ausmalbilder und Malen-nach-Zahlen Vorlagen
          </p>
        </section>

        {/* Main Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-amber-100">
          {/* Name Input */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-amber-800 mb-2">
              Für wen ist das Malbuch?
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Emma, Oma, Familie Müller..."
              className="w-full px-4 py-3 rounded-xl border-2 border-amber-200 focus:border-amber-500 focus:outline-none text-lg"
            />
          </div>

          {/* Book Type Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-amber-800 mb-3">
              Welche Art von Malbuch möchtest du?
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { value: 'coloring', label: '🖍️ Ausmalbuch', desc: 'Klassische Ausmalbilder' },
                { value: 'paint-by-numbers', label: '🔢 Malen nach Zahlen', desc: 'Mit Farbnummern' },
                { value: 'both', label: '✨ Beides', desc: 'Alle Varianten' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setBookType(option.value as BookType)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    bookType === option.value
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-amber-200 hover:border-amber-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">{option.label.split(' ')[0]}</span>
                  <span className="font-semibold text-amber-900 block">{option.label.split(' ').slice(1).join(' ')}</span>
                  <span className="text-sm text-amber-600">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Upload */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-amber-800 mb-3">
              Fotos hochladen (max. 20)
            </label>
            
            <div
              onDrop={handlePhotoDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed border-amber-300 rounded-xl p-8 text-center hover:border-amber-500 hover:bg-amber-50 transition-all cursor-pointer"
              onClick={() => document.getElementById('photo-input')?.click()}
            >
              <input
                id="photo-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
              />
              <div className="text-5xl mb-4">📷</div>
              <p className="text-amber-700 font-medium">
                Fotos hierher ziehen oder klicken zum Auswählen
              </p>
              <p className="text-amber-500 text-sm mt-2">
                JPG, PNG oder WEBP
              </p>
            </div>

            {/* Photo Previews */}
            {previews.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mt-4">
                {previews.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`Foto ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              {error}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !name || photos.length === 0}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-300 disabled:to-gray-300 text-white font-bold text-lg rounded-xl transition-all shadow-lg disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Wird erstellt...
              </span>
            ) : (
              `🎨 Malbuch erstellen (${photos.length} ${photos.length === 1 ? 'Foto' : 'Fotos'})`
            )}
          </button>
        </div>

        {/* Features */}
        <section className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            { emoji: '⚡', title: 'Sofort Download', desc: 'Dein Malbuch ist in Sekunden fertig zum Ausdrucken' },
            { emoji: '🎁', title: 'Perfektes Geschenk', desc: 'Überrasche Familie & Freunde mit personalisierten Malbüchern' },
            { emoji: '🖨️', title: 'Druckfertig', desc: 'A4 Format, optimiert für jeden Drucker' },
          ].map((feature, idx) => (
            <div key={idx} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 text-center">
              <div className="text-4xl mb-3">{feature.emoji}</div>
              <h3 className="font-bold text-amber-900 mb-2">{feature.title}</h3>
              <p className="text-amber-700 text-sm">{feature.desc}</p>
            </div>
          ))}
        </section>

        {/* Pricing teaser */}
        <section className="mt-16 text-center">
          <div className="inline-block bg-white rounded-2xl px-8 py-6 shadow-lg border border-amber-100">
            <p className="text-amber-600 text-sm mb-1">Einführungspreis</p>
            <p className="text-4xl font-bold text-amber-900">€4,99</p>
            <p className="text-amber-600 text-sm">pro Malbuch • Sofort-Download</p>
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="mt-24 py-8 bg-amber-100 text-center text-amber-700 text-sm">
        <p>Made with ❤️ by Nebenzu</p>
      </footer>
    </main>
  );
}
