import React, { useRef, useState, useEffect } from 'react';
import { ArrowLeft, ExternalLink, Presentation, Palette, Eraser, RotateCcw, Download, Minus, Plus } from 'lucide-react';

interface PresentationViewProps {
  onBack: () => void;
}

export const PresentationView: React.FC<PresentationViewProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'presentation' | 'canvas'>('presentation');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushSize, setBrushSize] = useState(3);
  const [brushColor, setBrushColor] = useState('#000000');
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  // Canvas drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    
    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = brushColor;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'presentation-drawing.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match display size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Set white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [activeTab]);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'
  ];

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            title="Back to App"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <Presentation className="h-5 w-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-slate-900">Presentation Mode</h1>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('presentation')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'presentation'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Slides
          </button>
          <button
            onClick={() => setActiveTab('canvas')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'canvas'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Draw
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {activeTab === 'canvas' && (
            <>
              <button
                onClick={downloadCanvas}
                className="p-2 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors"
                title="Download Drawing"
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                onClick={clearCanvas}
                className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Clear Canvas"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </>
          )}
          <a
            href="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?utm_content=DAHAKNTfXew&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Canva
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'presentation' ? (
          /* Presentation Content */
          <div className="flex-1 p-4 md:p-6 lg:p-8">
            <div className="max-w-6xl mx-auto h-full">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 h-full overflow-hidden">
                {/* Embedded Canva Presentation */}
                <div 
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    minHeight: '500px',
                    boxShadow: '0 2px 8px 0 rgba(63,69,81,0.16)',
                    overflow: 'hidden',
                    borderRadius: '16px',
                    willChange: 'transform'
                  }}
                >
                  <iframe
                    loading="lazy"
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      top: 0,
                      left: 0,
                      border: 'none',
                      padding: 0,
                      margin: 0
                    }}
                    src="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?embed"
                    allowFullScreen
                    allow="fullscreen"
                    title="Everything Cloud Presentation"
                  />
                </div>
              </div>
              
              {/* Attribution */}
              <div className="mt-4 text-center">
                <p className="text-sm text-slate-600">
                  <a
                    href="https://www.canva.com/design/DAHAKNTfXew/GBmzRR28jPmz0P1Olbjc5A/view?utm_content=DAHAKNTfXew&utm_campaign=designshare&utm_medium=embeds&utm_source=link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Copy of LATEST Everything Cloud Presentation Complete
                  </a>
                  {' '}by Blak Frost
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Drawing Canvas */
          <div className="flex-1 flex flex-col">
            {/* Drawing Toolbar */}
            <div className="bg-white border-b border-slate-200 px-4 py-3">
              <div className="flex items-center justify-center gap-4 flex-wrap">
                {/* Tools */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTool('pen')}
                    className={`p-2 rounded-lg transition-colors ${
                      tool === 'pen'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Pen"
                  >
                    <Palette className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-lg transition-colors ${
                      tool === 'eraser'
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title="Eraser"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                </div>

                {/* Brush Size */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setBrushSize(Math.max(1, brushSize - 1))}
                    className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="text-sm font-medium text-slate-700 min-w-[3rem] text-center">
                    Size: {brushSize}
                  </span>
                  <button
                    onClick={() => setBrushSize(Math.min(20, brushSize + 1))}
                    className="p-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {/* Colors */}
                <div className="flex items-center gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        brushColor === color
                          ? 'border-slate-400 scale-110'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <input
                    type="color"
                    value={brushColor}
                    onChange={(e) => setBrushColor(e.target.value)}
                    className="w-6 h-6 rounded-full border-2 border-slate-200 cursor-pointer"
                    title="Custom Color"
                  />
                </div>
              </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 p-4 bg-slate-100">
              <div className="h-full bg-white rounded-xl shadow-lg overflow-hidden">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PresentationView;