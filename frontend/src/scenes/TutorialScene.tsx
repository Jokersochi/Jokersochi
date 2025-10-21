import { TutorialPanel } from '@/components/TutorialPanel';
import { useGameStore } from '@/store/useGameStore';

export const TutorialScene = () => {
  const { tutorialStep, advanceTutorial } = useGameStore((state) => ({
    tutorialStep: state.tutorialStep,
    advanceTutorial: state.advanceTutorial,
  }));
  return <TutorialPanel step={tutorialStep} onNext={advanceTutorial} />;
};
