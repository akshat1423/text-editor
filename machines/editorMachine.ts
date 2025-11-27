import { createMachine, assign } from 'xstate';
import { GenerationContext, GenerationEvent } from '../types';

export const editorMachine = createMachine({
  types: {
    context: {} as GenerationContext,
    events: {} as GenerationEvent,
  },
  id: 'editorAI',
  initial: 'idle',
  context: {
    error: null,
    candidates: [],
    selectedIndex: 0,
    generationRange: null,
  },
  states: {
    idle: {
      on: {
        GENERATE: {
          target: 'generating',
          actions: assign({
            candidates: [],
            selectedIndex: 0,
            error: null,
            generationRange: null,
          }),
        },
      },
    },
    generating: {
      on: {
        STOP: 'idle',
        SUCCESS: {
          target: 'reviewing',
          actions: assign(({ event }) => {
            if (event.type !== 'SUCCESS') {
              return {};
            }
            return {
              candidates: event.candidates ?? [],
              selectedIndex: 0,
              generationRange: event.range ?? null,
            };
          }),
        },
        ERROR: {
          target: 'error',
          actions: assign(({ event }) => ({
            error: event.type === 'ERROR' ? event.error ?? 'An unexpected error occurred.' : 'An unexpected error occurred.',
          })),
        },
      },
    },
    reviewing: {
      on: {
        ACCEPT: 'idle',
        GENERATE: {
          target: 'generating',
          actions: assign({ candidates: [], selectedIndex: 0, error: null }),
        },
        NEXT_VARIANT: {
          actions: assign(({ context }) => {
            if (!context.candidates.length) {
              return {};
            }
            const nextIdx = (context.selectedIndex + 1) % context.candidates.length;
            const nextText = context.candidates[nextIdx] ?? '';
            const newRange = context.generationRange
              ? { from: context.generationRange.from, to: context.generationRange.from + nextText.length }
              : null;
            return {
              selectedIndex: nextIdx,
              generationRange: newRange,
            };
          }),
        },
        PREV_VARIANT: {
          actions: assign(({ context }) => {
            if (!context.candidates.length) {
              return {};
            }
            const prevIdx = (context.selectedIndex - 1 + context.candidates.length) % context.candidates.length;
            const prevText = context.candidates[prevIdx] ?? '';
            const newRange = context.generationRange
              ? { from: context.generationRange.from, to: context.generationRange.from + prevText.length }
              : null;
            return {
              selectedIndex: prevIdx,
              generationRange: newRange,
            };
          }),
        },
        STOP: 'idle',
      },
    },
    error: {
      on: {
        RETRY: 'generating',
        GENERATE: 'generating',
        STOP: 'idle',
      },
    },
  },
});
