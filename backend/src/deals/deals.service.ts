import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelemetryService } from '../telemetry/telemetry.service';
import { EconomyService } from '../economy/economy.service';

export interface ContractProposal {
  assets: string[];
  rentShare: number;
  buybackPrice?: number;
  buybackRounds?: number;
  trustRequired?: number;
}

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telemetry: TelemetryService,
    private readonly economy: EconomyService,
  ) {}

  async proposeContract(
    matchId: string,
    proposerId: string,
    counterpartyId: string | null,
    proposal: ContractProposal,
  ) {
    if (proposal.rentShare < 0 || proposal.rentShare > 1) {
      throw new ForbiddenException('Rent share out of bounds');
    }

    const contract = await this.prisma.contract.create({
      data: {
        matchId,
        proposerId,
        counterpartyId,
        terms: proposal as unknown as Record<string, unknown>,
      },
    });

    this.telemetry.recordGameEvent('contract_proposed', {
      matchId,
      contractId: contract.id,
      proposerId,
      counterpartyId,
      assets: proposal.assets,
    });

    return contract;
  }

  async respond(contractId: string, actorId: string, accept: boolean) {
    const contract = await this.prisma.contract.findUnique({ where: { id: contractId } });
    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.counterpartyId && contract.counterpartyId !== actorId) {
      throw new ForbiddenException('Only invited counterparty can respond');
    }

    const status = accept ? 'ACTIVE' : 'REJECTED';
    const updated = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status,
        acceptedAt: accept ? new Date() : null,
      },
    });

    this.telemetry.recordGameEvent('contract_resolved', {
      contractId,
      status,
      actorId,
    });

    return updated;
  }

  assessProposalValue(proposal: ContractProposal): number {
    const base = proposal.assets.reduce((acc, slug) => {
      const brand = this.economy.getBrand(slug);
      return acc + brand.baseCost * brand.marketPower;
    }, 0);
    const shareValue = base * proposal.rentShare;
    const buyback = proposal.buybackPrice ?? 0;
    const trustGate = proposal.trustRequired ? proposal.trustRequired * 1000 : 0;
    return Math.round(shareValue + buyback - trustGate);
  }
}
