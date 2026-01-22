import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import PreCall from './pages/PreCall';
import Training from './pages/Training';
import Results from './pages/Results';
import Admin from './pages/Admin';
import Builder from './pages/Builder';

function App() {
  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scenario/:id" element={<PreCall />} />
          <Route path="/training" element={<Training />} />
          <Route path="/results" element={<Results />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/builder" element={<Builder />} />
        </Routes>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
