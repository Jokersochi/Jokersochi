import { ContractPanel } from '@/components/ContractPanel';
import { useGameStore } from '@/store/useGameStore';

export const DealsScene = () => {
  const { match } = useGameStore((state) => ({ match: state.match }));
  if (!match) {
    return null;
  }
  return (
    <ContractPanel
      onSubmit={(proposal) =>
        window.dispatchEvent(
          new CustomEvent('contract:offer', {
            detail: proposal,
          }),
        )
      }
    />
  );
};
