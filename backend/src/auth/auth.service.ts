import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  playerId: string;
  displayName: string;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.jwtSecret = configService.getOrThrow('JWT_SECRET');
    this.refreshSecret = configService.get('JWT_REFRESH_SECRET', `${this.jwtSecret}-refresh`);
  }

  async register(dto: RegisterDto): Promise<AuthPayload> {
    const existing = await this.prisma.player.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new UnauthorizedException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const player = await this.prisma.player.create({
      data: {
        email: dto.email,
        displayName: dto.displayName,
        passwordHash,
        reputation: 100,
        elo: 1200,
      },
    });

    return this.createSession(player.id, player.displayName);
  }

  async login(dto: LoginDto): Promise<AuthPayload> {
    const player = await this.prisma.player.findUnique({ where: { email: dto.email } });
    if (!player) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, player.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createSession(player.id, player.displayName);
  }

  async validatePlayer(playerId: string): Promise<{ id: string; displayName: string }> {
    const player = await this.prisma.player.findUnique({ where: { id: playerId } });
    if (!player) {
      throw new UnauthorizedException('Player not found');
    }

    return { id: player.id, displayName: player.displayName };
  }

  private createSession(playerId: string, displayName: string): AuthPayload {
    const accessToken = this.jwtService.sign(
      { sub: playerId, displayName },
      { secret: this.jwtSecret, expiresIn: '30m' },
    );
    const refreshToken = this.jwtService.sign(
      { sub: playerId },
      { secret: this.refreshSecret, expiresIn: '30d' },
    );

    return { accessToken, refreshToken, playerId, displayName };
  }
}
