import { Body, Controller, Post, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Authenticate user and get JWT',
    description: `
      Authenticates a user with their email and password.

      **Test Credentials:**
      - **Admin:**
        - email: \`admin@example.com\`
        - password: \`admin123\`
      - **User:**
        - email: \`user@example.com\`
        - password: \`user123\`
    `,
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Successfully authenticated.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Invalid credentials.' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'User successfully registered.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid registration data.' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }
} 