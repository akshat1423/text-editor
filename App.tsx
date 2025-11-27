import ReviewSidebar from './components/ReviewSidebar';
import Footer from './components/Footer';
import SettingsPanel from './components/SettingsPanel';
import useEditorController from './hooks/useEditorController';
import { HeaderSection, EditorSurface, SlashMenuOverlay, ErrorToast } from './components/EditorSections';

const App: React.FC = () => {
  const controller = useEditorController();
  const {
    settings,
    selectedFont,
    showSettings,
    setShowSettings,
    setSettings,
    setSelectedFont,
    state,
    safeCycle,
    isReviewing,
  } = controller;

  return (
    <div className={`flex flex-col h-screen overflow-auto selection:bg-indigo-100 selection:text-indigo-900 ${settings.darkMode ? 'bg-slate-900 text-slate-100 selection:bg-indigo-900 selection:text-white' : 'bg-slate-50 text-slate-900' } ${selectedFont === 'inter' ? 'font-inter' : selectedFont === 'lora' ? 'font-lora' : 'font-raleway'}`}>
      <HeaderSection controller={controller} />

      {showSettings && (
        <SettingsPanel
          settings={settings}
          setSettings={setSettings}
          selectedFont={selectedFont}
          setSelectedFont={setSelectedFont}
          onClose={() => setShowSettings(false)}
        />
      )}

      <div className="flex-1 relative flex">
        <EditorSurface controller={controller} />
        <SlashMenuOverlay controller={controller} />
        <ReviewSidebar
          isReviewing={isReviewing}
          candidatesLength={state.context.candidates.length}
          selectedIndex={state.context.selectedIndex}
          onPrev={() => safeCycle('prev')}
          onNext={() => safeCycle('next')}
        />
      </div>

      <Footer isReviewing={isReviewing} />
      <ErrorToast controller={controller} />
    </div>
  );
};

export default App;
