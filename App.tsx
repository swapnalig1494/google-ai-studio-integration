
import React, { useState, useEffect, useRef } from 'react';
import { AppTab, Language, DiagnosisResult, ScanHistory } from './types';
import { TRANSLATIONS } from './constants';
import { analyzePlantImage, speakResult } from './services/geminiService';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.SCAN);
  const [lang, setLang] = useState<Language>('en');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  const [history, setHistory] = useState<ScanHistory[]>([]);
  const t = TRANSLATIONS[lang];

  // For camera access
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const cleanBase64 = base64.split(',')[1];
      setImage(base64);
      setLoading(true);
      try {
        const diag = await analyzePlantImage(cleanBase64, lang);
        setResult(diag);
        const newHistoryItem: ScanHistory = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          imageUrl: base64,
          result: diag
        };
        setHistory(prev => [newHistoryItem, ...prev]);
      } catch (error) {
        console.error("Diagnosis Error:", error);
        alert("Could not analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearScan = () => {
    setImage(null);
    setResult(null);
  };

  const handleSpeak = () => {
    if (!result) return;
    const textToSpeak = `${result.plantName}. ${result.diseaseName}. ${result.description}. Treatment: ${result.organicTreatment}`;
    speakResult(textToSpeak);
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return t.high;
      case 'medium': return t.medium;
      case 'low': return t.low;
      default: return severity;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-emerald-50 shadow-2xl overflow-hidden relative">
      
      {/* Header */}
      <header className="bg-emerald-700 text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <i className="fa-solid fa-leaf text-lime-400"></i>
          {t.title}
        </h1>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value as Language)}
          className="bg-emerald-800 text-sm rounded px-2 py-1 outline-none border border-emerald-600"
        >
          <option value="en">English</option>
          <option value="hi">हिंदी</option>
          <option value="mr">मराठी</option>
        </select>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24">
        
        {activeTab === AppTab.SCAN && (
          <div className="p-4 flex flex-col items-center">
            {!image ? (
              <div className="w-full flex flex-col gap-6 items-center mt-10">
                <div className="w-48 h-48 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-200 border-dashed animate-pulse">
                  <i className="fa-solid fa-camera text-6xl text-emerald-300"></i>
                </div>
                <div className="flex flex-col gap-4 w-full px-4">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 text-white py-6 rounded-2xl text-2xl font-bold shadow-lg flex items-center justify-center gap-4 active:scale-95 transition-transform"
                  >
                    <i className="fa-solid fa-camera"></i>
                    {t.capture}
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white text-emerald-700 border-2 border-emerald-600 py-4 rounded-2xl text-xl font-bold flex items-center justify-center gap-4"
                  >
                    <i className="fa-solid fa-images"></i>
                    {t.upload}
                  </button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    capture="environment"
                  />
                </div>
              </div>
            ) : (
              <div className="w-full space-y-4">
                <div className="relative rounded-2xl overflow-hidden shadow-xl border-4 border-white">
                  <img src={image} alt="Target" className="w-full h-64 object-cover" />
                  {loading && (
                    <div className="absolute inset-0 bg-emerald-900/40 flex flex-col items-center justify-center text-white p-4">
                      <div className="w-12 h-12 border-4 border-lime-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-lg font-bold">{t.analyzing}</p>
                    </div>
                  )}
                  <button 
                    onClick={clearScan}
                    className="absolute top-4 right-4 bg-red-500 text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
                  >
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>

                {result && !loading && (
                  <div className="bg-white rounded-2xl p-5 shadow-lg border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-2xl font-bold text-emerald-900">{result.plantName}</h2>
                        <p className="text-lg text-emerald-600 font-medium">{result.diseaseName}</p>
                      </div>
                      <div className="bg-lime-100 text-lime-800 px-3 py-1 rounded-full text-sm font-bold border border-lime-200">
                        {result.confidence}% {t.confidence}
                      </div>
                    </div>

                    <div className={`p-3 rounded-lg flex items-center gap-3 ${
                      result.severity === 'High' ? 'bg-red-50 text-red-700' : 
                      result.severity === 'Medium' ? 'bg-orange-50 text-orange-700' : 
                      'bg-green-50 text-green-700'
                    }`}>
                      <i className="fa-solid fa-circle-exclamation text-xl"></i>
                      <p className="font-semibold">{getSeverityLabel(result.severity)} {t.severityLevel}</p>
                    </div>

                    <p className="text-emerald-800 leading-relaxed italic">"{result.description}"</p>

                    <button 
                      onClick={handleSpeak}
                      className="w-full bg-emerald-100 text-emerald-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 transition-colors"
                    >
                      <i className="fa-solid fa-volume-high"></i>
                      {t.readAloud}
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                        <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                          <i className="fa-solid fa-flask"></i> {t.organic}
                        </h3>
                        <p className="text-sm text-orange-900">{result.organicTreatment}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                          <i className="fa-solid fa-vial"></i> {t.chemical}
                        </h3>
                        <p className="text-sm text-blue-900">{result.chemicalTreatment}</p>
                      </div>
                    </div>

                    <div className="bg-emerald-800 text-white p-4 rounded-xl">
                      <h3 className="font-bold mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-shield-halved"></i> {t.prevention}
                      </h3>
                      <ul className="text-sm space-y-2">
                        {result.preventiveMeasures.map((measure, idx) => (
                          <li key={idx} className="flex gap-2">
                            <i className="fa-solid fa-check text-lime-400 mt-1"></i>
                            {measure}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === AppTab.HISTORY && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-emerald-800 px-1">{t.history}</h2>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-emerald-300">
                <i className="fa-solid fa-clock-rotate-left text-6xl mb-4"></i>
                <p className="text-lg">{t.noHistory}</p>
              </div>
            ) : (
              history.map(item => (
                <div 
                  key={item.id} 
                  className="bg-white rounded-xl p-3 shadow-md flex gap-4 border border-emerald-50 active:scale-98 transition-transform cursor-pointer"
                  onClick={() => {
                    setImage(item.imageUrl);
                    setResult(item.result);
                    setActiveTab(AppTab.SCAN);
                  }}
                >
                  <img src={item.imageUrl} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-emerald-900 truncate">{item.result.plantName}</h3>
                    <p className="text-sm text-emerald-600 truncate">{item.result.diseaseName}</p>
                    <p className="text-xs text-emerald-400 mt-2">
                      {new Date(item.timestamp).toLocaleDateString()} at {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <i className="fa-solid fa-chevron-right text-emerald-200"></i>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === AppTab.WEATHER && (
          <div className="p-4 space-y-6">
             <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">{t.forecast}</p>
                    <h2 className="text-4xl font-black">28°C</h2>
                  </div>
                  <i className="fa-solid fa-sun-cloud text-5xl text-yellow-300"></i>
                </div>
                <p className="text-lg font-medium">{t.partlyCloudy}</p>
             </div>

             <div className="bg-red-50 border-2 border-red-100 p-5 rounded-3xl">
                <div className="flex items-center gap-3 text-red-600 mb-2">
                  <i className="fa-solid fa-triangle-exclamation text-2xl"></i>
                  <h3 className="font-black text-xl">{t.weatherAlert}</h3>
                </div>
                <p className="text-red-800">{t.weatherAlertText}</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                  <p className="text-sm text-emerald-400 font-bold mb-1">{t.humidity}</p>
                  <p className="text-xl font-bold text-emerald-900">65%</p>
                </div>
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                  <p className="text-sm text-emerald-400 font-bold mb-1">{t.windSpeed}</p>
                  <p className="text-xl font-bold text-emerald-900">12 km/h</p>
                </div>
             </div>
          </div>
        )}

        {activeTab === AppTab.EXTRAS && (
          <div className="p-4 space-y-4">
            <h2 className="text-xl font-bold text-emerald-800 px-1">{t.more}</h2>
            
            <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
              <button className="w-full flex items-center justify-between p-5 border-b border-emerald-50 active:bg-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                    <i className="fa-solid fa-store"></i>
                  </div>
                  <span className="font-bold text-lg">{t.shopsNearby}</span>
                </div>
                <i className="fa-solid fa-chevron-right text-emerald-200"></i>
              </button>
              
              <button className="w-full flex items-center justify-between p-5 border-b border-emerald-50 active:bg-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <i className="fa-solid fa-vial-circle-check"></i>
                  </div>
                  <span className="font-bold text-lg">{t.fertRecommendations}</span>
                </div>
                <i className="fa-solid fa-chevron-right text-emerald-200"></i>
              </button>

              <button className="w-full flex items-center justify-between p-5 active:bg-emerald-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <i className="fa-solid fa-headset"></i>
                  </div>
                  <span className="font-bold text-lg">{t.chatExpert}</span>
                </div>
                <i className="fa-solid fa-chevron-right text-emerald-200"></i>
              </button>
            </div>

            <div className="bg-emerald-800 text-white p-6 rounded-3xl mt-4 relative overflow-hidden shadow-xl">
               <div className="absolute top-0 right-0 p-4 opacity-10">
                 <i className="fa-solid fa-seedling text-8xl"></i>
               </div>
               <h3 className="text-xl font-bold mb-2">{t.didYouKnow}</h3>
               <p className="text-emerald-100">{t.didYouKnowText}</p>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-emerald-100 flex justify-around items-center p-2 fixed bottom-0 left-0 right-0 safe-bottom shadow-2xl z-20">
        <button 
          onClick={() => setActiveTab(AppTab.SCAN)}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${activeTab === AppTab.SCAN ? 'text-emerald-600' : 'text-emerald-300'}`}
        >
          <i className={`fa-solid fa-camera-viewfinder text-2xl ${activeTab === AppTab.SCAN ? 'scale-110' : ''}`}></i>
          <span className="text-[10px] font-bold uppercase">{t.scan}</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${activeTab === AppTab.HISTORY ? 'text-emerald-600' : 'text-emerald-300'}`}
        >
          <i className={`fa-solid fa-clock-rotate-left text-2xl ${activeTab === AppTab.HISTORY ? 'scale-110' : ''}`}></i>
          <span className="text-[10px] font-bold uppercase">{t.history}</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.WEATHER)}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${activeTab === AppTab.WEATHER ? 'text-emerald-600' : 'text-emerald-300'}`}
        >
          <i className={`fa-solid fa-cloud-sun-rain text-2xl ${activeTab === AppTab.WEATHER ? 'scale-110' : ''}`}></i>
          <span className="text-[10px] font-bold uppercase">{t.weather}</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.EXTRAS)}
          className={`flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors ${activeTab === AppTab.EXTRAS ? 'text-emerald-600' : 'text-emerald-300'}`}
        >
          <i className={`fa-solid fa-grid-2 text-2xl ${activeTab === AppTab.EXTRAS ? 'scale-110' : ''}`}></i>
          <span className="text-[10px] font-bold uppercase">{t.more}</span>
        </button>
      </nav>

    </div>
  );
};

export default App;
