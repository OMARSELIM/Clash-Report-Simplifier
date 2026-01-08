import React, { useState, useEffect } from 'react';
import { Layers, FileSpreadsheet, Activity, ChevronRight, AlertCircle, RefreshCw, Settings2, List } from 'lucide-react';
import { ClashItem, ProcessingState } from './types';
import { parseNavisworksXML } from './services/xmlParser';
import { classifyLayers } from './services/geminiService';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ClashTable from './components/ClashTable';

function App() {
  const [clashData, setClashData] = useState<ClashItem[]>([]);
  const [processState, setProcessState] = useState<ProcessingState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [customDisciplines, setCustomDisciplines] = useState<string>('');
  const [layerMappingInput, setLayerMappingInput] = useState<string>('');

  const handleFileSelect = async (file: File) => {
    setProcessState('parsing');
    setErrorMsg(null);
    setClashData([]);

    try {
      // 1. Parse XML
      const parsedItems = await parseNavisworksXML(file);
      
      if (parsedItems.length === 0) {
        throw new Error("No clashes found in the file.");
      }

      setClashData(parsedItems); // Show initial data immediately
      setProcessState('classifying');

      // 2. Extract Unique Layers for AI Classification
      const allLayers = new Set<string>();
      parsedItems.forEach(i => {
        if(i.layer1) allLayers.add(i.layer1);
        if(i.layer2) allLayers.add(i.layer2);
      });
      
      const layerList = Array.from(allLayers);
      
      // 3. Prepare Configuration
      // Parse custom disciplines
      const disciplinesList = customDisciplines
        .split(',')
        .map(d => d.trim())
        .filter(d => d.length > 0);

      // Parse layer overrides
      const overrides: Record<string, string> = {};
      if (layerMappingInput.trim()) {
        layerMappingInput.split('\n').forEach(line => {
          const separatorIdx = line.indexOf(':');
          if (separatorIdx > 0) {
            const key = line.substring(0, separatorIdx).trim();
            const val = line.substring(separatorIdx + 1).trim();
            if (key && val) {
              overrides[key] = val;
            }
          }
        });
      }

      // 4. AI Classification
      const classificationMap = await classifyLayers(layerList, disciplinesList, overrides);
      
      // 5. Merge Data
      const enrichedItems = parsedItems.map(item => ({
        ...item,
        discipline1: classificationMap[item.layer1] || 'Unclassified',
        discipline2: classificationMap[item.layer2] || 'Unclassified'
      }));

      setClashData(enrichedItems);
      setProcessState('complete');

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred processing the file.");
      setProcessState('error');
    }
  };

  const reset = () => {
    setClashData([]);
    setProcessState('idle');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <Layers size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Clash Report Simplifier</h1>
              <p className="text-xs text-slate-500 font-medium">Powered by Gemini 2.0</p>
            </div>
          </div>
          {processState === 'complete' && (
            <button 
              onClick={reset}
              className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              <RefreshCw size={14} /> Upload New Report
            </button>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* State: IDLE / Upload */}
        {processState === 'idle' && (
          <div className="max-w-xl mx-auto mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Turn Navisworks XML into Insights</h2>
              <p className="text-slate-600">
                Upload your raw XML clash report. We'll use AI to classify disciplines 
                and generate a clean, exportable Excel-ready dashboard.
              </p>
            </div>

            {/* Configuration Panel */}
            <div className="mb-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
              
              {/* Custom Disciplines */}
              <div>
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold text-sm">
                  <Settings2 size={16} />
                  <label htmlFor="disciplines">Custom Disciplines (Optional)</label>
                </div>
                <textarea 
                  id="disciplines"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                  rows={2}
                  placeholder="e.g. Structure, HVAC, Piping, Elec, Arch (Leave empty to use standard BIM disciplines)"
                  value={customDisciplines}
                  onChange={(e) => setCustomDisciplines(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Gemini will categorize your layers into these specific groups.
                </p>
              </div>

              {/* Layer Mapping Overrides */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-800 font-semibold text-sm">
                  <List size={16} />
                  <label htmlFor="overrides">Layer Mapping Overrides (Optional)</label>
                </div>
                <textarea 
                  id="overrides"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none font-mono"
                  rows={3}
                  placeholder={`A-WALL: Architectural\nS-COLS: Structural\nE-LITE: Electrical`}
                  value={layerMappingInput}
                  onChange={(e) => setLayerMappingInput(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-2">
                  Force specific layers to a discipline. Format: <code>Layer Name : Discipline</code> (one per line).
                </p>
              </div>

            </div>

            <FileUpload onFileSelect={handleFileSelect} isProcessing={false} />
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                <FileSpreadsheet className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-slate-700">Excel Export</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                <Activity className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-slate-700">Visual Dashboard</span>
              </div>
              <div className="p-4 bg-white rounded-lg border border-slate-100 shadow-sm">
                <Layers className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-slate-700">AI Sorting</span>
              </div>
            </div>
          </div>
        )}

        {/* State: Processing */}
        {(processState === 'parsing' || processState === 'classifying') && (
          <div className="max-w-xl mx-auto mt-20 text-center">
            <div className="inline-block relative">
               <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mb-6"></div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              {processState === 'parsing' ? 'Parsing XML Structure...' : 'AI Classifying Disciplines...'}
            </h3>
            <p className="text-slate-500 mt-2">
              {processState === 'parsing' 
                ? 'Reading geometric data and object names.' 
                : 'Analyzing layer names with Gemini to determine disciplines...'}
            </p>
          </div>
        )}

        {/* State: Error */}
        {processState === 'error' && (
           <div className="max-w-xl mx-auto mt-12">
             <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex flex-col items-center text-center">
               <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
               <h3 className="text-lg font-bold text-red-700">Processing Failed</h3>
               <p className="text-red-600 mt-2">{errorMsg}</p>
               <button 
                 onClick={reset}
                 className="mt-6 px-6 py-2 bg-white border border-red-300 text-red-700 font-medium rounded-lg hover:bg-red-50 transition-colors"
               >
                 Try Again
               </button>
             </div>
           </div>
        )}

        {/* State: Complete (Dashboard) */}
        {processState === 'complete' && (
          <div className="animate-fade-in-up">
            <div className="flex items-center gap-2 mb-6 text-sm text-slate-500">
              <span>Home</span>
              <ChevronRight size={14} />
              <span className="text-slate-900 font-medium">Dashboard</span>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-semibold">Total Clashes</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{clashData.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-semibold">Active</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {clashData.filter(c => c.status === 'Active').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <p className="text-xs text-slate-500 uppercase font-semibold">Resolved</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {clashData.filter(c => c.status === 'Resolved').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                 <p className="text-xs text-slate-500 uppercase font-semibold">Avg Distance</p>
                 <p className="text-2xl font-bold text-blue-600 mt-1">
                   {(clashData.reduce((acc, curr) => acc + curr.distance, 0) / clashData.length || 0).toFixed(3)}m
                 </p>
              </div>
            </div>

            <Dashboard data={clashData} />
            <ClashTable data={clashData} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;