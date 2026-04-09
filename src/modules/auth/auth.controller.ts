import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import type { Response } from 'express';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  async googleLogin(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.validateGoogleToken(code);

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    const cleanResult = { ...result } as Record<string, unknown>;
    delete cleanResult['access_token'];
    delete cleanResult['google_access_token'];
    return cleanResult;
  }

  @Post('login')
  async firebaseLogin(
    @Body() body: { token: string; fullName: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.validateFirebaseToken(
      body.token,
      body.fullName,
    );

    res.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000,
    });

    const cleanResult = { ...result } as Record<string, unknown>;

    delete cleanResult['access_token'];
    return cleanResult;
  }

  @Post('google/refresh')
  async refreshGoogleToken(@Body('userId') userId: string) {
    return this.authService.refreshGoogleAccessToken(userId);
  }

  @Post('logout')
  @Public()
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('access_token', '', {
      httpOnly: true,
      secure: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      expires: new Date(0),
    });
    await Promise.resolve();
    return { message: 'Logged out successfully' };
  }
}
