import { Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import ConsentScreen from './screens/ConsentScreen';
import CaptureScreen from './screens/CaptureScreen';
import ProcessingScreen from './screens/ProcessingScreen';
import ResultsScreen from './screens/ResultsScreen';
import HistoryScreen from './screens/HistoryScreen';

// MySkinAnalyzer — enrutado principal del MVP.
// Flujo: Home -> Consent -> Capture -> Processing -> Results
//        Home -> History (deshabilitada en el MVP, UI presente)
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/consent" element={<ConsentScreen />} />
      <Route path="/capture" element={<CaptureScreen />} />
      <Route path="/processing/:sessionId" element={<ProcessingScreen />} />
      <Route path="/results/:sessionId" element={<ResultsScreen />} />
      <Route path="/history" element={<HistoryScreen />} />
    </Routes>
  );
}
