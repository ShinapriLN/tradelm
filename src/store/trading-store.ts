'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  ProviderType, 
  AnalysisResult, 
  ProviderSettings,
  ToolCall 
} from '@/types/trading';

// Image with unique ID for proper React keys
export interface ImageWithId {
  id: string;
  data: string;
}

interface TradingState {
  // Provider settings
  providers: Partial<Record<ProviderType, ProviderSettings>>;
  selectedProvider: ProviderType | null;
  
  // Current analysis inputs
  images: ImageWithId[];
  symbol: string;
  context: string;
  
  // Analysis history
  analysisHistory: AnalysisResult[];
  
  // Current analysis state
  isAnalyzing: boolean;
  currentToolCalls: ToolCall[];
  
  // Abort controller for cancelling analysis
  abortController: AbortController | null;
  
  // Flag to track if analysis was manually cancelled
  wasAnalysisCancelled: boolean;
  
  // Actions
  setApiKey: (provider: ProviderType, apiKey: string) => void;
  getApiKey: (provider: ProviderType) => string | undefined;
  setSelectedModel: (provider: ProviderType, model: string) => void;
  getSelectedModel: (provider: ProviderType) => string | undefined;
  setSelectedProvider: (provider: ProviderType | null) => void;
  
  setImages: (images: ImageWithId[]) => void;
  addImage: (image: string) => void;
  removeImage: (id: string) => void;
  clearImages: () => void;
  
  setSymbol: (symbol: string) => void;
  setContext: (context: string) => void;
  
  addAnalysis: (analysis: AnalysisResult) => void;
  clearHistory: () => void;
  
  setIsAnalyzing: (isAnalyzing: boolean) => void;
  setAbortController: (controller: AbortController | null) => void;
  cancelAnalysis: () => void;
  resetCancelledFlag: () => void;
  addToolCall: (toolCall: ToolCall) => void;
  clearToolCalls: () => void;
}

export const useTradingStore = create<TradingState>()(
  persist(
    (set, get) => ({
      // Initial state
      providers: {},
      selectedProvider: null,
      images: [],
      symbol: '',
      context: '',
      analysisHistory: [],
      isAnalyzing: false,
      currentToolCalls: [],
      abortController: null,
      wasAnalysisCancelled: false,
      
      // Provider actions
      setApiKey: (provider, apiKey) => set((state) => ({
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            apiKey,
            selectedModel: state.providers[provider]?.selectedModel || '',
          },
        },
      })),
      
      getApiKey: (provider) => get().providers[provider]?.apiKey,
      
      setSelectedModel: (provider, model) => set((state) => ({
        providers: {
          ...state.providers,
          [provider]: {
            ...state.providers[provider],
            apiKey: state.providers[provider]?.apiKey || '',
            selectedModel: model,
          },
        },
      })),
      
      getSelectedModel: (provider) => get().providers[provider]?.selectedModel,
      
      setSelectedProvider: (provider) => set({ selectedProvider: provider }),
      
      // Image actions
      setImages: (images) => set({ images }),
      
      addImage: (image) => set((state) => ({
        images: [...state.images, { id: crypto.randomUUID(), data: image }],
      })),
      
      removeImage: (id) => set((state) => ({
        images: state.images.filter((img) => img.id !== id),
      })),
      
      clearImages: () => set({ images: [] }),
      
      // Input actions
      setSymbol: (symbol) => set({ symbol }),
      setContext: (context) => set({ context }),
      
      // History actions
      addAnalysis: (analysis) => set((state) => ({
        analysisHistory: [analysis, ...state.analysisHistory].slice(0, 50), // Keep last 50 analyses
      })),
      
      clearHistory: () => set({ analysisHistory: [] }),
      
      // Analysis state actions
      setIsAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
      
      setAbortController: (controller) => set({ abortController: controller }),
      
      cancelAnalysis: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
        }
        set({ 
          isAnalyzing: false, 
          abortController: null,
          currentToolCalls: [],
          wasAnalysisCancelled: true
        });
      },
      
      resetCancelledFlag: () => set({ wasAnalysisCancelled: false }),
      
      addToolCall: (toolCall) => set((state) => {
        // Check if tool call with same ID exists, update it instead of adding duplicate
        const existingIndex = state.currentToolCalls.findIndex((tc) => tc.id === toolCall.id);
        if (existingIndex >= 0) {
          // Update existing tool call
          const updated = [...state.currentToolCalls];
          updated[existingIndex] = toolCall;
          return { currentToolCalls: updated };
        }
        // Add new tool call
        return { currentToolCalls: [...state.currentToolCalls, toolCall] };
      }),
      
      clearToolCalls: () => set({ currentToolCalls: [] }),
    }),
    {
      name: 'trading-platform-storage',
      partialize: (state) => ({
        providers: state.providers,
        selectedProvider: state.selectedProvider,
        analysisHistory: state.analysisHistory,
      }),
    }
  )
);
