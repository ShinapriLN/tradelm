'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { VisuallyHidden } from '@/components/ui/visually-hidden';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Image as ImageIcon,
  X,
  Play,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  History,
  BarChart3,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Trash2,
  Moon,
  Sun,
  ArrowLeft,
  Activity,
  Zap,
  Target,
  DollarSign,
} from 'lucide-react';
import { useTradingStore, ImageWithId } from '@/store/trading-store';
import { ProviderType, Model, AnalysisResult, ToolCall } from '@/types/trading';
import { PROVIDER_LIST } from '@/lib/providers/config';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// Dark mode toggle component
function DarkModeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved === 'true') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('darkMode', String(newDark));
    document.documentElement.classList.toggle('dark');
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle}>
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}

// Provider Selector Component
function ProviderSelector() {
  const {
    selectedProvider,
    setSelectedProvider,
    providers,
    setApiKey,
    getApiKey,
    getSelectedModel,
    setSelectedModel,
  } = useTradingStore();

  const [models, setModels] = useState<Model[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);

  const currentApiKey = selectedProvider ? getApiKey(selectedProvider) || '' : '';
  const currentModel = selectedProvider ? getSelectedModel(selectedProvider) || '' : '';
  
  // Find the selected model object for display
  const selectedModelObj = models.find(m => m.id === currentModel);

  const fetchModels = useCallback(async (provider: ProviderType, apiKey: string) => {
    setIsLoadingModels(true);
    setModelError(null);
    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey }),
      });
      const data = await response.json();
      if (data.success) {
        setModels(data.models);
      } else {
        setModelError(data.error || 'Failed to fetch models');
        setModels([]);
      }
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'Unknown error');
      setModels([]);
    } finally {
      setIsLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProvider && currentApiKey) {
      fetchModels(selectedProvider, currentApiKey);
    }
  }, [selectedProvider, currentApiKey, fetchModels]);

  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider as ProviderType);
    setModels([]);
    setModelError(null);
  };

  const handleApiKeyChange = (apiKey: string) => {
    if (selectedProvider) {
      setApiKey(selectedProvider, apiKey);
    }
  };

  const handleModelChange = (model: string) => {
    if (selectedProvider) {
      setSelectedModel(selectedProvider, model);
    }
    setModelPopoverOpen(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          API Configuration
        </CardTitle>
        <CardDescription>
          Configure your AI provider and model
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={selectedProvider || ''} onValueChange={handleProviderChange}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_LIST.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={`Enter your ${selectedProvider || 'provider'} API key`}
              value={currentApiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          {isLoadingModels ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading models...
            </div>
          ) : modelError ? (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{modelError}</div>
          ) : models.length > 0 ? (
            <Popover open={modelPopoverOpen} onOpenChange={setModelPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={modelPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedModelObj ? (
                    <div className="flex items-center gap-2">
                      <span>{selectedModelObj.name}</span>
                      {selectedModelObj.supportsVision && (
                        <Badge variant="outline" className="text-xs">Vision</Badge>
                      )}
                      {selectedModelObj.supportsTools && (
                        <Badge variant="outline" className="text-xs">Tools</Badge>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Select a model...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command filter={(value, search) => {
                  const model = models.find(m => m.id === value);
                  if (!model) return 0;
                  const searchLower = search.toLowerCase();
                  if (model.id.toLowerCase().includes(searchLower)) return 1;
                  if (model.name.toLowerCase().includes(searchLower)) return 1;
                  return 0;
                }}>
                  <CommandInput placeholder="Search models..." />
                  <CommandList>
                    <CommandEmpty>No model found.</CommandEmpty>
                    <CommandGroup>
                      {models.map((m) => (
                        <CommandItem
                          key={m.id}
                          value={m.id}
                          onSelect={() => handleModelChange(m.id)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              currentModel === m.id ? 'opacity-100' : 'opacity-0'
                            }`}
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <span>{m.name}</span>
                            {m.supportsVision && (
                              <Badge variant="outline" className="text-xs">Vision</Badge>
                            )}
                            {m.supportsTools && (
                              <Badge variant="outline" className="text-xs">Tools</Badge>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          ) : (
            <div className="text-sm text-muted-foreground">
              {selectedProvider && currentApiKey
                ? 'No models available'
                : 'Enter an API key to load models'}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Image Input Component
function ImageInput() {
  const { images, addImage, removeImage, clearImages } = useTradingStore();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            addImage(base64);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }, [addImage]);

  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          addImage(base64);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [addImage]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const base64 = e.target?.result as string;
            addImage(base64);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Chart Images
        </CardTitle>
        <CardDescription>
          Paste, drag & drop, or click to upload chart images
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border'
          }`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <ImageIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">
            Drag & drop images here, or click to browse
          </p>
          <p className="text-xs text-muted-foreground">
            You can also paste images directly (Ctrl/Cmd + V)
          </p>
        </div>

        {images.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{images.length} image(s)</span>
              <Button variant="ghost" size="sm" onClick={clearImages}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.data}
                    alt="Chart"
                    className="w-full h-24 object-cover rounded-lg border"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeImage(img.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Trading Inputs Component
function TradingInputs() {
  const { symbol, setSymbol, context, setContext } = useTradingStore();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Trading Details
        </CardTitle>
        <CardDescription>
          Optional: Add symbol and additional context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="symbol">Symbol (Optional)</Label>
          <Input
            id="symbol"
            placeholder="e.g., BTC, ETH, AAPL, TSLA"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="context">Additional Context (Optional)</Label>
          <Textarea
            id="context"
            placeholder="Add any additional context for the analysis (e.g., your trading strategy, timeframe, risk tolerance...)"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Tool Call Log Component
function ToolCallLog({ toolCalls }: { toolCalls: ToolCall[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const getStatusIcon = (status: ToolCall['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getToolLabel = (name: string) => {
    switch (name) {
      case 'fetch_prices':
        return 'Fetching Prices';
      case 'fetch_news':
        return 'Fetching News';
      case 'calculate_indicators':
        return 'Calculating Indicators';
      default:
        return name;
    }
  };

  if (toolCalls.length === 0) return null;

  return (
    <div className="space-y-2">
      {toolCalls.map((tc) => (
        <div key={tc.id} className="border rounded-lg p-3">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setExpanded({ ...expanded, [tc.id]: !expanded[tc.id] })}
          >
            <div className="flex items-center gap-2">
              {getStatusIcon(tc.status)}
              <span className="font-medium">{getToolLabel(tc.name)}</span>
              <Badge variant="outline" className="text-xs">
                {tc.status}
              </Badge>
            </div>
            {tc.result != null && (
              expanded[tc.id]
                ? <ChevronUp className="h-4 w-4" />
                : <ChevronDown className="h-4 w-4" />
            )}
          </div>
          {tc.error && (
            <div className="mt-2 text-sm text-destructive">{String(tc.error)}</div>
          )}
          {expanded[tc.id] && tc.result != null && (
            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(tc.result, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

// Image Preview Dialog Component
function ImagePreviewDialog({ images, initialIndex, open, onOpenChange }: {
  images: string[];
  initialIndex: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-screen h-screen max-w-none max-h-none p-0 bg-black/95 border-0">
        <VisuallyHidden>
          <DialogTitle>Chart Image Preview</DialogTitle>
        </VisuallyHidden>
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={images[currentIndex]}
            alt={`Chart ${currentIndex + 1}`}
            className="w-full h-full object-contain p-4"
          />

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white h-14 w-14 rounded-full"
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))}
              >
                <ChevronDown className="h-10 w-10 rotate-90" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white h-14 w-14 rounded-full"
                onClick={() => setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))}
              >
                <ChevronDown className="h-10 w-10 -rotate-90" />
              </Button>

              {/* Image counter */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 px-6 py-3 rounded-full text-white text-lg font-medium">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Analysis Result Display Component
function AnalysisResultDisplay({ result, onBack }: { result: AnalysisResult; onBack: () => void }) {
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const openImageDialog = (index: number) => {
    setSelectedImageIndex(index);
    setImageDialogOpen(true);
  };

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return 'bg-green-500/20 text-green-600 border-green-500 dark:text-green-400';
      case 'SELL':
        return 'bg-red-500/20 text-red-600 border-red-500 dark:text-red-400';
      default:
        return 'bg-yellow-500/20 text-yellow-600 border-yellow-500 dark:text-yellow-400';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return <TrendingUp className="h-6 w-6" />;
      case 'SELL':
        return <TrendingDown className="h-6 w-6" />;
      default:
        return <Minus className="h-6 w-6" />;
    }
  };

  const hasTradingLevels = result.tradingLevels && (
    result.tradingLevels.entry ||
    result.tradingLevels.stopLoss ||
    result.tradingLevels.takeProfit1
  );

  return (
    <div className="space-y-6">
      {/* Main Recommendation */}
      <div className={`flex items-center justify-center gap-4 p-6 rounded-lg border-2 ${getRecommendationStyle(result.recommendation)}`}>
        {getRecommendationIcon(result.recommendation)}
        <div className="text-center">
          <div className="text-3xl font-bold">{result.recommendation}</div>
          <div className="text-sm opacity-80">Recommendation</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{result.confidence}%</div>
          <div className="text-sm opacity-80">Confidence</div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Trading Levels */}
        <div className="space-y-4">
          {/* Symbol */}
          {result.detectedSymbol && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Detected Symbol
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{result.detectedSymbol}</div>
              </CardContent>
            </Card>
          )}

          {/* Trading Levels */}
          {hasTradingLevels && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Trading Levels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {result.tradingLevels.entry && (
                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Entry Price</div>
                      <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                        ${result.tradingLevels.entry.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {result.tradingLevels.stopLoss && (
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Stop Loss</div>
                      <div className="text-xl font-bold text-red-600 dark:text-red-400">
                        ${result.tradingLevels.stopLoss.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {result.tradingLevels.takeProfit1 && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Take Profit 1</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${result.tradingLevels.takeProfit1.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {result.tradingLevels.takeProfit2 && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Take Profit 2</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${result.tradingLevels.takeProfit2.toLocaleString()}
                      </div>
                    </div>
                  )}
                  {result.tradingLevels.takeProfit3 && (
                    <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <div className="text-xs text-muted-foreground mb-1">Take Profit 3</div>
                      <div className="text-xl font-bold text-green-600 dark:text-green-400">
                        ${result.tradingLevels.takeProfit3.toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
                {result.riskRewardRatio && (
                  <div className="mt-4 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-center">
                    <div className="text-xs text-muted-foreground mb-1">Risk/Reward Ratio</div>
                    <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                      {result.riskRewardRatio}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Images Analyzed */}
          {result.images && result.images.length > 0 && (
            <>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Images Analyzed
                    <span className="text-xs text-muted-foreground font-normal">
                      (Click to view)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {result.images.map((img, index) => (
                      <div
                        key={index}
                        className="relative group cursor-pointer"
                        onClick={() => openImageDialog(index)}
                      >
                        <img
                          src={img}
                          alt={`Analyzed chart ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg border transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 dark:bg-black/90 rounded-full p-2">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <ImagePreviewDialog
                images={result.images}
                initialIndex={selectedImageIndex}
                open={imageDialogOpen}
                onOpenChange={setImageDialogOpen}
              />
            </>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Analysis Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Provider: {result.provider}</span>
                <span>Model: {result.model}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {new Date(result.timestamp).toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Reason & Tool Calls */}
        <div className="space-y-4">
          {/* Reason with Markdown */}
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Analysis Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>,
                    h2: ({ children }) => <h4 className="text-base font-bold mt-3 mb-2">{children}</h4>,
                    h3: ({ children }) => <h5 className="text-sm font-bold mt-2 mb-1">{children}</h5>,
                    p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                    li: ({ children }) => <li className="mb-1">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                  }}
                >
                  {result.reason}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* Tool Calls */}
          {result.toolCalls.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Tool Calls Log</CardTitle>
              </CardHeader>
              <CardContent>
                <ToolCallLog toolCalls={result.toolCalls} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Analysis History Component
function AnalysisHistory() {
  const { analysisHistory, clearHistory } = useTradingStore();
  const [selectedResult, setSelectedResult] = useState<AnalysisResult | null>(null);

  const getRecommendationStyle = (rec: string) => {
    switch (rec) {
      case 'BUY':
        return { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600 dark:text-green-400' };
      case 'SELL':
        return { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400' };
      default:
        return { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400' };
    }
  };

  if (selectedResult) {
    return (
      <AnalysisResultDisplay
        result={selectedResult}
        onBack={() => setSelectedResult(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analysis History</h2>
          <p className="text-muted-foreground">{analysisHistory.length} analyses recorded</p>
        </div>
        {analysisHistory.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearHistory}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {analysisHistory.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No analysis history yet.</p>
              <p className="text-sm mt-1">Run an analysis to see it here.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analysisHistory.map((result) => {
            const style = getRecommendationStyle(result.recommendation);
            return (
              <Card
                key={result.id}
                className={`cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] ${style.border}`}
                onClick={() => setSelectedResult(result)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge className={`${style.bg} ${style.text} border-0`}>
                      {result.recommendation}
                    </Badge>
                    <span className="text-lg font-bold">{result.confidence}%</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Symbol */}
                  <div className="flex items-center gap-2">
                    {result.detectedSymbol || result.symbol ? (
                      <Badge variant="outline" className="text-sm">
                        {result.detectedSymbol || result.symbol}
                      </Badge>
                    ) : null}
                    <Badge variant="secondary" className="text-xs">
                      {result.provider}
                    </Badge>
                  </div>

                  {/* Trading Levels Preview */}
                  {result.tradingLevels?.entry && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {result.tradingLevels.entry && (
                        <div className="text-center p-1.5 rounded bg-blue-500/10">
                          <div className="text-muted-foreground">Entry</div>
                          <div className="font-medium text-blue-600 dark:text-blue-400">
                            ${result.tradingLevels.entry.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {result.tradingLevels.stopLoss && (
                        <div className="text-center p-1.5 rounded bg-red-500/10">
                          <div className="text-muted-foreground">SL</div>
                          <div className="font-medium text-red-600 dark:text-red-400">
                            ${result.tradingLevels.stopLoss.toLocaleString()}
                          </div>
                        </div>
                      )}
                      {result.tradingLevels.takeProfit1 && (
                        <div className="text-center p-1.5 rounded bg-green-500/10">
                          <div className="text-muted-foreground">TP1</div>
                          <div className="font-medium text-green-600 dark:text-green-400">
                            ${result.tradingLevels.takeProfit1.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reason Preview */}
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                    {result.reason.substring(0, 100)}...
                  </p>

                  {/* Date */}
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main Analyze Page Component
function AnalyzePage({ onBack }: { onBack: () => void }) {
  const {
    images,
    symbol,
    context,
    selectedProvider,
    providers,
    isAnalyzing,
    setIsAnalyzing,
    currentToolCalls,
    addToolCall,
    clearToolCalls,
    addAnalysis,
    clearImages,
    setSymbol,
    setContext,
    setAbortController,
    abortController,
    wasAnalysisCancelled,
    resetCancelledFlag,
  } = useTradingStore();

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activityLog, setActivityLog] = useState<{ id: string; message: string }[]>([]);
  const activityLogRef = useRef<HTMLDivElement>(null);
  const isRunningRef = useRef(false);
  const analysisIdRef = useRef<string>(''); // Track current analysis ID

  const addActivityLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setActivityLog(prev => [...prev, { id, message: `[${timestamp}] ${message}` }]);
  };

  // Helper to add log with deduplication
  const addActivityLogOnce = (id: string, message: string) => {
    setActivityLog(prev => {
      if (prev.some(log => log.id.startsWith(id))) {
        return prev;
      }
      const timestamp = new Date().toLocaleTimeString();
      return [...prev, { id: `${id}-${Date.now()}`, message: `[${timestamp}] ${message}` }];
    });
  };

  // Auto-scroll activity log
  useEffect(() => {
    if (activityLogRef.current) {
      activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight;
    }
  }, [activityLog]);

  // Cleanup on unmount - abort any pending requests
  useEffect(() => {
    return () => {
      if (abortController) {
        abortController.abort();
      }
      setIsAnalyzing(false);
      isRunningRef.current = false;
      analysisIdRef.current = '';
    };
  }, [setIsAnalyzing]);

  // Reset cancelled flag when component mounts
  useEffect(() => {
    resetCancelledFlag();
  }, [resetCancelledFlag]);

  const runAnalysis = useCallback(async () => {
    // Prevent duplicate runs
    if (isRunningRef.current) {
      return;
    }
    
    if (selectedProvider) {
      const apiKey = providers[selectedProvider]?.apiKey;
      const model = providers[selectedProvider]?.selectedModel;

      if (!apiKey) {
        toast.error('Please enter an API key');
        return;
      }

      if (!model) {
        toast.error('Please select a model');
        return;
      }
    }

    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    // Generate unique ID for this analysis
    const currentAnalysisId = crypto.randomUUID();
    analysisIdRef.current = currentAnalysisId;
    isRunningRef.current = true;
    
    const apiKey = providers[selectedProvider]!.apiKey;
    const model = providers[selectedProvider]!.selectedModel;

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    clearToolCalls();
    setActivityLog([]);

    // Only log info that backend doesn't send
    if (symbol) {
      addActivityLog(`📊 Symbol: ${symbol}`);
    }
    if (images.length > 0) {
      addActivityLog(`🖼️ Images: ${images.length} chart(s) uploaded`);
    }

    // Create abort controller for this request and store it
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Convert images to base64 strings for API
      const imageStrings = images.map(img => img.data);
      
      const response = await fetch('/api/analyze-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: imageStrings,
          symbol,
          context,
          provider: selectedProvider,
          model,
          apiKey,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        // Check if this analysis is still the current one
        if (analysisIdRef.current !== currentAnalysisId) {
          // Analysis was cancelled, stop processing
          break;
        }
        
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // Check again if analysis is still current
          if (analysisIdRef.current !== currentAnalysisId) {
            break;
          }

          const eventMatch = line.match(/^event:\s*(\w+)\ndata:\s*([\s\S]+)$/);
          if (eventMatch) {
            const eventType = eventMatch[1];
            const eventData = JSON.parse(eventMatch[2]);

            switch (eventType) {
              case 'status':
                if (eventData.message) {
                  addActivityLogOnce(`status-${eventData.message}`, `ℹ️ ${eventData.message}`);
                }
                break;

              case 'tool_call':
                const tc = eventData as ToolCall;
                const toolLabel = tc.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const args = tc.arguments as Record<string, unknown>;
                const symbolArg = args?.symbol ? ` (${args.symbol})` : '';
                const logId = `tool-${tc.id}`;

                if (tc.status === 'running') {
                  addActivityLogOnce(logId, `🔧 Running: ${toolLabel}${symbolArg}...`);
                } else if (tc.status === 'completed') {
                  addActivityLogOnce(`${logId}-done`, `✅ Completed: ${toolLabel}`);
                } else if (tc.status === 'error') {
                  addActivityLogOnce(`${logId}-err`, `❌ Failed: ${toolLabel} - ${tc.error}`);
                }
                
                // Update tool calls in store
                addToolCall(tc);
                break;

              case 'result':
                // Only process result if this is still the current analysis
                if (analysisIdRef.current !== currentAnalysisId) {
                  break;
                }
                
                if (eventData.success) {
                  addActivityLog('✅ Analysis completed successfully!');
                  addActivityLog(`📈 Recommendation: ${eventData.data.recommendation}`);
                  addActivityLog(`🎯 Confidence: ${eventData.data.confidence}%`);
                  if (eventData.data.detectedSymbol) {
                    addActivityLog(`🏷️ Detected Symbol: ${eventData.data.detectedSymbol}`);
                  }

                  const result: AnalysisResult = {
                    id: crypto.randomUUID(),
                    recommendation: eventData.data.recommendation,
                    confidence: eventData.data.confidence,
                    reason: eventData.data.reason,
                    tradingLevels: eventData.data.tradingLevels || {},
                    riskRewardRatio: eventData.data.riskRewardRatio,
                    detectedSymbol: eventData.data.detectedSymbol,
                    detailedAnalysis: eventData.data.detailedAnalysis,
                    timestamp: eventData.data.timestamp,
                    symbol: symbol || undefined,
                    context: context || undefined,
                    images: images.length > 0 ? imageStrings : undefined,
                    model,
                    provider: selectedProvider,
                    toolCalls: eventData.data.toolCalls,
                  };

                  setAnalysisResult(result);
                  addAnalysis(result);
                  
                  // Clear inputs after successful analysis
                  clearImages();
                  setSymbol('');
                  setContext('');
                  
                  toast.success('Analysis completed!');
                }
                break;

              case 'error':
                // Only process error if this is still the current analysis
                if (analysisIdRef.current !== currentAnalysisId) {
                  break;
                }
                addActivityLog(`❌ Error: ${eventData.error}`);
                setError(eventData.error);
                toast.error(eventData.error);
                break;
            }
          }
        }
      }
    } catch (err) {
      // Don't show error if request was aborted (user went back)
      if (err instanceof Error && err.name === 'AbortError') {
        addActivityLog('⏹️ Analysis cancelled');
        return;
      }
      // Don't show error if this analysis is no longer current
      if (analysisIdRef.current !== currentAnalysisId) {
        return;
      }
      addActivityLog(`❌ Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setError(err instanceof Error ? err.message : 'Unknown error');
      toast.error('Analysis failed');
    } finally {
      // Only reset if this is still the current analysis
      if (analysisIdRef.current === currentAnalysisId) {
        setIsAnalyzing(false);
        isRunningRef.current = false;
      }
    }
  }, [images, symbol, context, selectedProvider, providers, setIsAnalyzing, clearToolCalls, addAnalysis, clearImages, setSymbol, setContext, addToolCall]);

  // Auto-start analysis only if not cancelled
  useEffect(() => {
    if (!isAnalyzing && !analysisResult && !error && !wasAnalysisCancelled) {
      runAnalysis();
    }
  }, [wasAnalysisCancelled]);

  // Show result if available
  if (analysisResult) {
    return <AnalysisResultDisplay result={analysisResult} onBack={onBack} />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left - Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  Analysis Failed
                </>
              ) : (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Starting Analysis
                </>
              )}
            </CardTitle>
            <CardDescription>
            {isAnalyzing
              ? 'AI is analyzing your charts and gathering market data...'
              : error
              ? 'An error occurred during analysis'
              : 'Preparing analysis...'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAnalyzing && currentToolCalls.length > 0 && (
            <div className="space-y-4 mb-4">
              <p className="text-sm text-muted-foreground">
                The AI is using tools to gather market data...
              </p>
              <ToolCallLog toolCalls={currentToolCalls} />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive rounded-lg p-4">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                className="mt-4"
                onClick={() => {
                  setError(null);
                  runAnalysis();
                }}
              >
                Try Again
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

        {/* Right - Activity Log */}
        <Card className="flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Real-time Activity Log
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <ScrollArea className="h-[400px] w-full" ref={activityLogRef}>
              <div className="space-y-1 font-mono text-xs">
                {activityLog.length === 0 ? (
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Waiting for activity...
                  </div>
                ) : (
                  activityLog.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-muted-foreground flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main Page Component
export default function TradingPlatform() {
  const [currentPage, setCurrentPage] = useState<'input' | 'analyze' | 'history'>('input');
  const { selectedProvider, providers, images, cancelAnalysis, isAnalyzing, resetCancelledFlag } = useTradingStore();

  const canAnalyze = selectedProvider && providers[selectedProvider]?.apiKey && providers[selectedProvider]?.selectedModel;

  // Handle navigation with cleanup
  const handleNavigateToInput = useCallback(() => {
    if (isAnalyzing) {
      cancelAnalysis();
    }
    setCurrentPage('input');
  }, [isAnalyzing, cancelAnalysis]);

  // Handle starting analysis - reset cancelled flag
  const handleStartAnalysis = useCallback(() => {
    resetCancelledFlag();
    setCurrentPage('analyze');
  }, [resetCancelledFlag]);

  // If on analyze page, show analyze component
  if (currentPage === 'analyze') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={handleNavigateToInput}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Input
              </Button>
              <h1 className="text-3xl font-bold">AI Trading Analyst</h1>
            </div>
            <DarkModeToggle />
          </div>
          <AnalyzePage onBack={handleNavigateToInput} />
        </div>
      </div>
    );
  }

  // If on history page, show history component
  if (currentPage === 'history') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">AI Trading Analyst</h1>
            <DarkModeToggle />
          </div>
          <Button variant="ghost" onClick={() => setCurrentPage('input')} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Input
          </Button>
          <AnalysisHistory />
        </div>
      </div>
    );
  }

  // Input page
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">AI Trading Analyst</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setCurrentPage('history')}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <DarkModeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <ProviderSelector />
            <TradingInputs />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <ImageInput />
          </div>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center pt-6">
          <Button
            size="lg"
            className="px-8"
            disabled={!canAnalyze}
            onClick={handleStartAnalysis}
          >
            <Play className="h-5 w-5 mr-2" />
            Analyze
          </Button>
        </div>

        {!canAnalyze && (
          <p className="text-center text-sm text-muted-foreground mt-2">
            Please configure your provider, API key, and select a model to start analysis
          </p>
        )}
      </div>
    </div>
  );
}
