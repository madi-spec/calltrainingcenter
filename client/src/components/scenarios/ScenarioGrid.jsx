import { motion } from 'framer-motion';
import ScenarioCard from './ScenarioCard';

function ScenarioGrid({ scenarios }) {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
    >
      {scenarios.map((scenario) => (
        <motion.div key={scenario.id} variants={item}>
          <ScenarioCard scenario={scenario} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export default ScenarioGrid;
