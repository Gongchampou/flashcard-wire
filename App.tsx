
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateMindMapStructure } from './services/geminiService';
import { extractTextFromFile } from './services/fileParser';
import { MindMapNodeData } from './types';
import MindMap from './components/MindMap';
import { Icon } from './components/Icon';

// These will be available globally from the scripts in index.html
declare const jspdf: any;

/**
 * Convert the hierarchical mind map into a plain text outline
 * for simple PDF export. Indents increase with `depth`.
 */
const formatMindMapForPdf = (node: MindMapNodeData, depth = 0): string => {
  let result = '';
  const indent = '  '.repeat(depth);
  result += `${indent}Topic: ${node.topic}\n`;
  if(node.content) {
    result += `${indent}Content: ${node.content}\n\n`;
  }
  for (const child of node.children) {
    result += formatMindMapForPdf(child, depth + 1);
  }
  return result;
};


const App: React.FC = () => {
  const [documentText, setDocumentText] = useState('');
  const [mindMapData, setMindMapData] = useState<MindMapNodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MindMapNodeData[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Persisted theme preference (defaults to OS prefers-color-scheme)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('mind-map-theme');
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // DFS search across the tree returning nodes whose topic/content matches `query`
  const searchInMindMap = useCallback((query: string, node: MindMapNodeData | null): MindMapNodeData[] => {
    if (!node) return [];
    let matches: MindMapNodeData[] = [];
    const lowerCaseQuery = query.toLowerCase();

    if (node.topic.toLowerCase().includes(lowerCaseQuery) || node.content.toLowerCase().includes(lowerCaseQuery)) {
        matches.push(node);
    }
    for (const child of node.children) {
        matches = matches.concat(searchInMindMap(query, child));
    }
    return matches;
  }, []);

  // Apply theme class to <html> and persist to localStorage
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('mind-map-theme', theme);
  }, [theme]);

  // Recompute search results when query or data changes
  useEffect(() => {
    if (searchQuery.trim() && mindMapData) {
      const results = searchInMindMap(searchQuery, mindMapData);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, mindMapData, searchInMindMap]);


  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Call Gemini service to transform input text into mind map structure
  const handleGenerateMindMap = useCallback(async () => {
    if (!documentText.trim()) {
      setError('Please enter some text to generate a mind map.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setMindMapData(null);
    setSearchQuery('');
    try {
      const data = await generateMindMapStructure(documentText);
      setMindMapData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [documentText]);

  // Render a lightweight text outline to a multi-page PDF via jsPDF
  const handleExportPdf = useCallback(() => {
    if (!mindMapData) {
      setError('Please generate a mind map first.');
      return;
    }
    setError(null);
    try {
      const mindMapText = formatMindMapForPdf(mindMapData);
      
      const { jsPDF } = jspdf;
      const doc = new jsPDF();
      
      const margin = 15;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const usableWidth = pageWidth - margin * 2;
      const lineHeight = 7;
      let y = margin;

      doc.setFont('courier', 'normal');
      doc.setFontSize(10);

      const lines = doc.splitTextToSize(mindMapText, usableWidth);
      
      lines.forEach((line: string) => {
        if (y + lineHeight > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      doc.save('mind-map.pdf');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred while exporting PDF.');
    }
  }, [mindMapData]);

  // Programmatically open the hidden file input
  const handleFileImportClick = () => {
    fileInputRef.current?.click();
  };

  // Read the selected file and extract plain text
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (!file) return;
  
    setIsLoading(true);
    setError(null);
    setDocumentText('');
    try {
      const text = await extractTextFromFile(file);
      setDocumentText(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Quick demo content used when the user clicks "sample text"
  const sampleText = `The Solar System consists of the Sun and the objects that orbit it. The largest objects are the eight planets. The terrestrial planets are Mercury, Venus, Earth, and Mars. They are smaller and made of rock and metal. The gas giants are Jupiter and Saturn, composed mainly of hydrogen and helium. The ice giants are Uranus and Neptune, containing rock, ice, and a mixture of water, methane, and ammonia. Earth has one moon, while Jupiter has over 70, including its four largest: Io, Europa, Ganymede, and Callisto. Mars is known for its red color, caused by iron oxide on its surface.`;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex p-4 gap-4">
      {/* Controls Panel */}
      <aside className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-0' : 'w-full md:w-1/3 lg:w-1/4'}`}>
        <div className={`bg-brand-surface rounded-lg flex-1 flex flex-col h-full overflow-hidden transition-opacity duration-300 ${isSidebarCollapsed ? 'p-0 opacity-0 invisible' : 'p-4 opacity-100 visible'}`}>
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-brand-text whitespace-nowrap">AI Mind Map Generator</h1>
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-brand-accent hover:bg-brand-primary transition-colors focus:outline-none focus:ring-2 focus:ring-brand-accent"
                aria-label="Toggle theme"
            >
                {theme === 'light' ? <Icon type="moon" className="w-5 h-5"/> : <Icon type="sun" className="w-5 h-5"/>}
            </button>
          </div>
          <p className="text-sm text-brand-text/80 mb-4">Paste text below or import a file to get started.</p>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.ppt,.pptx"
          />
          <button
            type="button"
            onClick={handleFileImportClick}
            disabled={isLoading}
            className="w-full mb-4 px-4 py-2 flex items-center justify-center gap-2 bg-brand-primary border border-brand-accent text-brand-accent rounded-md hover:bg-brand-accent hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon type="upload" className="w-5 h-5"/>
            <span>Import File (.txt, .pdf, .docx)</span>
          </button>

          <textarea
            value={documentText}
            onChange={(e) => setDocumentText(e.target.value)}
            placeholder="Paste your document, article, or notes here..."
            className="w-full flex-grow bg-brand-primary p-3 rounded-md text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent transition-all resize-none"
          />
          <button
              type="button"
              onClick={() => setDocumentText(sampleText)}
              className="mt-2 text-sm text-brand-accent hover:underline self-start"
            >
              Or try with a sample text
            </button>
          {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleGenerateMindMap}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-accent text-white font-semibold rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isLoading && !mindMapData ? <Icon type="loading" /> : <Icon type="generate" />}
              <span>Generate Map</span>
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!mindMapData}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-secondary text-white font-semibold rounded-md hover:bg-opacity-90 transition-all disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              <Icon type="download" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area Wrapper */}
      <div className="flex-1 relative flex flex-col">
         <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="absolute top-1/2 -translate-y-1/2 -left-4 z-10 bg-brand-surface hover:bg-brand-primary text-brand-text rounded-full w-8 h-8 flex items-center justify-center shadow-lg border border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-accent"
          aria-label="Toggle sidebar"
        >
          <Icon type={isSidebarCollapsed ? 'sidebar-open' : 'sidebar-close'} className="w-5 h-5" />
        </button>

        {/* Mind Map Area */}
        <main className="w-full h-full flex-1 flex flex-col bg-brand-surface rounded-lg p-4 gap-4">
          {mindMapData && (
            <div className="relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-brand-primary rounded-md text-brand-text focus:outline-none focus:ring-2 focus:ring-brand-accent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Icon type="search" className="w-5 h-5 text-brand-text/60" />
                </div>
              </div>
              {searchResults.length > 0 && (
                <ul 
                    className="absolute z-10 w-full mt-1 bg-brand-surface border border-brand-primary rounded-md shadow-lg max-h-48 overflow-y-auto"
                    onMouseLeave={() => setHoveredNodeId(null)}
                >
                  {searchResults.map(node => (
                    <li 
                        key={node.id} 
                        className="px-4 py-2 text-sm text-brand-text hover:bg-brand-primary cursor-pointer"
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                    >
                      {node.topic}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className="flex-grow w-full h-full min-h-0">
            {isLoading && !mindMapData && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Icon type="loading" className="w-12 h-12 text-brand-accent mx-auto" />
                  <p className="mt-4 text-lg">Processing... this may take a moment.</p>
                </div>
              </div>
            )}
            {!isLoading && !mindMapData && (
              <div className="flex items-center justify-center h-full text-center text-brand-text/60">
                <div>
                  <h2 className="text-2xl font-semibold">Your Mind Map Will Appear Here</h2>
                  <p className="mt-2">Import a file or paste text and click "Generate Map" to begin.</p>
                </div>
              </div>
            )}
            {mindMapData && <MindMap data={mindMapData} searchQuery={searchQuery} hoveredNodeId={hoveredNodeId} />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;